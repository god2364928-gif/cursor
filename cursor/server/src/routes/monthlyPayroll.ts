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
    const allowedFields = ['base_salary', 'coconala', 'bonus', 'incentive', 'other', 'notes']
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ message: '허용되지 않은 필드입니다' })
    }
    
    // 금액 필드인 경우 합계 자동 계산
    if (field !== 'notes') {
      await pool.query(
        `UPDATE monthly_payroll 
         SET ${field} = $1, 
             total = COALESCE(base_salary, 0) + COALESCE(coconala, 0) + COALESCE(bonus, 0) + COALESCE(incentive, 0) + COALESCE(other, 0),
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [value || 0, id]
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
       (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, other, total)
       VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0)
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

export default router

