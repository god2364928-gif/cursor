import { Router, Response } from 'express'
import { AuthRequest, authMiddleware } from '../middleware/auth'
import { pool } from '../db'

const router = Router()

// 관리자 전용 미들웨어
const adminOnly = (req: AuthRequest, res: Response, next: any) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'owner') {
    return res.status(403).json({ message: '권한이 없습니다' })
  }
  next()
}

// 특정 연도/월의 급여 데이터 및 히스토리 조회
router.get('/:fiscalYear/:month', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, month } = req.params
    
    // 급여 데이터 조회
    const payrollResult = await pool.query(
      `SELECT * FROM monthly_payroll 
       WHERE fiscal_year = $1 AND month = $2
       ORDER BY employee_name`,
      [fiscalYear, month]
    )
    
    // 히스토리 조회
    const historyResult = await pool.query(
      `SELECT history_text FROM monthly_payroll_history 
       WHERE fiscal_year = $1 AND month = $2`,
      [fiscalYear, month]
    )
    
    res.json({
      payrollData: payrollResult.rows,
      history: historyResult.rows[0]?.history_text || ''
    })
  } catch (error) {
    console.error('Monthly payroll fetch error:', error)
    res.status(500).json({ message: '급여 데이터 조회에 실패했습니다' })
  }
})

// 단일 셀 업데이트
router.put('/update', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id, field, value } = req.body
    
    if (!id || !field) {
      return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' })
    }
    
    // 허용된 필드만 업데이트
    const allowedFields = ['base_salary', 'coconala', 'bonus', 'incentive', 'business_trip', 'other', 'notes']
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: '허용되지 않은 필드입니다' })
    }
    
    // 금액 필드인 경우 합계 자동 계산
    if (field !== 'notes') {
      // 먼저 필드를 업데이트하고, 그 다음 합계를 계산
      await pool.query(
        `UPDATE monthly_payroll 
         SET ${field} = $1,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [value || 0, id]
      )
      
      // 업데이트된 값을 포함하여 합계 재계산
      await pool.query(
        `UPDATE monthly_payroll 
         SET total = COALESCE(base_salary, 0) + COALESCE(coconala, 0) + COALESCE(bonus, 0) + COALESCE(incentive, 0) + COALESCE(business_trip, 0) + COALESCE(other, 0)
         WHERE id = $1`,
        [id]
      )
    } else {
      await pool.query(
        `UPDATE monthly_payroll 
         SET ${field} = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [value, id]
      )
    }
    
    res.json({ success: true, message: '업데이트되었습니다' })
  } catch (error) {
    console.error('Payroll update error:', error)
    res.status(500).json({ message: '업데이트에 실패했습니다' })
  }
})

// 직원 추가
router.post('/add-employee', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, month, employeeName } = req.body
    
    if (!fiscalYear || !month || !employeeName) {
      return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' })
    }
    
    await pool.query(
      `INSERT INTO monthly_payroll 
       (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total)
       VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (fiscal_year, month, employee_name) DO NOTHING`,
      [fiscalYear, month, employeeName]
    )
    
    res.json({ success: true, message: '직원이 추가되었습니다' })
  } catch (error) {
    console.error('Add employee error:', error)
    res.status(500).json({ message: '직원 추가에 실패했습니다' })
  }
})

// 직원 삭제
router.delete('/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    await pool.query('DELETE FROM monthly_payroll WHERE id = $1', [id])
    
    res.json({ success: true, message: '삭제되었습니다' })
  } catch (error) {
    console.error('Delete employee error:', error)
    res.status(500).json({ message: '삭제에 실패했습니다' })
  }
})

// 히스토리 저장
router.put('/history', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, month, historyText } = req.body
    
    if (!fiscalYear || !month) {
      return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' })
    }
    
    await pool.query(
      `INSERT INTO monthly_payroll_history (fiscal_year, month, history_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (fiscal_year, month) DO UPDATE SET
       history_text = EXCLUDED.history_text, updated_at = CURRENT_TIMESTAMP`,
      [fiscalYear, month, historyText || '']
    )
    
    res.json({ success: true, message: '히스토리가 저장되었습니다' })
  } catch (error) {
    console.error('History update error:', error)
    res.status(500).json({ message: '히스토리 저장에 실패했습니다' })
  }
})

// 월별 급여 자동 생성 (직원 테이블의 기본급만 업데이트, 인센티브 등은 유지)
router.post('/generate', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, month } = req.body
    
    if (!fiscalYear || !month) {
      return res.status(400).json({ message: '연도와 월을 입력해주세요' })
    }
    
    // 2025년 11월 1일 이전에는 자동 생성 불가
    const targetDate = new Date(fiscalYear, month - 1, 1)
    const cutoffDate = new Date(2025, 10, 1) // 2025년 11월 1일
    
    if (targetDate < cutoffDate) {
      return res.status(400).json({ 
        message: '2025년 11월 1일부터 자동 생성이 가능합니다. 이전 데이터는 수동으로 입력해주세요.' 
      })
    }
    
    // 입사중인 직원들의 기본급 가져오기
    // users 테이블의 기본급을 우선적으로 사용 (직원관리에서 변경한 값 반영)
    const employeesResult = await pool.query(
      `SELECT 
         COALESCE(u.name, ae.name) as name,
         CASE 
           WHEN u.base_salary IS NOT NULL AND u.base_salary > 0 THEN u.base_salary
           ELSE COALESCE(ae.base_salary, 0)
         END as base_salary
       FROM accounting_employees ae
       LEFT JOIN users u ON u.name = ae.name 
       WHERE ae.employment_status = '입사중'
       ORDER BY COALESCE(u.name, ae.name)`
    )
    
    if (employeesResult.rows.length === 0) {
      return res.status(400).json({ message: '등록된 직원이 없습니다' })
    }
    
    console.log(`[급여 자동생성] 직원 ${employeesResult.rows.length}명 조회 완료`)
    
    // 각 직원에 대해 급여 데이터 생성 또는 기본급만 업데이트
    let createdCount = 0
    let updatedCount = 0
    
    for (const employee of employeesResult.rows) {
      // base_salary를 숫자로 변환 (null이면 0)
      const baseSalary = Number(employee.base_salary) || 0
      
      console.log(`[급여 자동생성] 직원: ${employee.name}, 기본급: ${baseSalary}`)
      
      // 기존 데이터가 있는지 확인
      const existingResult = await pool.query(
        `SELECT id, base_salary FROM monthly_payroll 
         WHERE fiscal_year = $1 AND month = $2 AND employee_name = $3`,
        [fiscalYear, month, employee.name]
      )
      
      if (existingResult.rows.length > 0) {
        // 기존 데이터가 있으면 기본급만 업데이트하고 합계 재계산
        const oldBaseSalary = Number(existingResult.rows[0].base_salary) || 0
        console.log(`[급여 자동생성] 기존 데이터 업데이트: ${employee.name} (${oldBaseSalary} -> ${baseSalary})`)
        
        await pool.query(
          `UPDATE monthly_payroll 
           SET base_salary = $1, 
               total = $1 + COALESCE(coconala, 0) + COALESCE(bonus, 0) + COALESCE(incentive, 0) + COALESCE(business_trip, 0) + COALESCE(other, 0),
               updated_at = CURRENT_TIMESTAMP
           WHERE fiscal_year = $2 AND month = $3 AND employee_name = $4`,
          [baseSalary, fiscalYear, month, employee.name]
        )
        updatedCount++
      } else {
        // 기존 데이터가 없으면 새로 생성
        console.log(`[급여 자동생성] 신규 생성: ${employee.name} (기본급: ${baseSalary})`)
        
        await pool.query(
          `INSERT INTO monthly_payroll 
           (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total)
           VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, $4)`,
          [fiscalYear, month, employee.name, baseSalary]
        )
        createdCount++
      }
    }
    
    res.json({ 
      success: true, 
      message: `${createdCount}명 신규 생성, ${updatedCount}명 기본급 업데이트 완료`,
      createdCount,
      updatedCount
    })
  } catch (error) {
    console.error('Payroll generation error:', error)
    res.status(500).json({ message: '급여 생성에 실패했습니다' })
  }
})

// 2026년 1월 이후 데이터의 기본급 일괄 업데이트
router.post('/fix-base-salary', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, month } = req.body
    
    if (!fiscalYear || !month) {
      return res.status(400).json({ message: '연도와 월을 입력해주세요' })
    }
    
    // 입사중인 직원들의 기본급 가져오기
    const employeesResult = await pool.query(
      `SELECT name, base_salary 
       FROM accounting_employees 
       WHERE employment_status = '입사중' 
       ORDER BY name`
    )
    
    if (employeesResult.rows.length === 0) {
      return res.status(400).json({ message: '등록된 직원이 없습니다' })
    }
    
    let updatedCount = 0
    
    for (const employee of employeesResult.rows) {
      const baseSalary = Number(employee.base_salary) || 0
      
      // 해당 연도/월의 데이터가 있고 기본급이 0이거나 잘못된 경우 업데이트
      const result = await pool.query(
        `UPDATE monthly_payroll 
         SET base_salary = $1,
             total = $1 + COALESCE(coconala, 0) + COALESCE(bonus, 0) + COALESCE(incentive, 0) + COALESCE(business_trip, 0) + COALESCE(other, 0),
             updated_at = CURRENT_TIMESTAMP
         WHERE fiscal_year = $2 AND month = $3 AND employee_name = $4
           AND (base_salary IS NULL OR base_salary = 0 OR base_salary != $1)`,
        [baseSalary, fiscalYear, month, employee.name]
      )
      
      if (result.rowCount && result.rowCount > 0) {
        updatedCount++
        console.log(`[기본급 수정] ${employee.name}: ${baseSalary}로 업데이트`)
      }
    }
    
    res.json({ 
      success: true, 
      message: `${updatedCount}명의 기본급이 업데이트되었습니다`,
      updatedCount
    })
  } catch (error) {
    console.error('Base salary fix error:', error)
    res.status(500).json({ message: '기본급 수정에 실패했습니다' })
  }
})

export default router

