import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'

const router = Router()

router.get('/payroll', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMonth } = req.query
    
    let query = `
      SELECT 
        p.id, p.payment_month, p.base_salary, p.incentive, p.other_payments, p.total_amount, p.payment_status,
        e.id as employee_id, e.name as employee_name, e.position, e.incentive_rate
      FROM accounting_payroll p
      JOIN accounting_employees e ON p.employee_id = e.id
    `
    const params: any[] = []
    
    if (paymentMonth) {
      query += ` WHERE p.payment_month = $1`
      params.push(paymentMonth)
    }
    
    query += ` ORDER BY p.payment_month DESC, e.name`
    
    const result = await pool.query(query, params)
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      paymentMonth: r.payment_month,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      position: r.position,
      baseSalary: Number(r.base_salary),
      incentive: Number(r.incentive),
      otherPayments: Number(r.other_payments),
      totalAmount: Number(r.total_amount),
      paymentStatus: r.payment_status,
      incentiveRate: Number(r.incentive_rate),
    })))
  } catch (error) {
    console.error('Payroll fetch error:', error)
    res.status(500).json({ error: '급여 목록을 불러오지 못했습니다' })
  }
})

// 급여 자동 생성 (특정 월의 모든 재직 직원)
router.post('/payroll/generate', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMonth } = req.body // YYYY-MM-01 형식
    
    if (!paymentMonth) {
      return res.status(400).json({ error: '지급월을 입력해 주세요' })
    }

    // 재직 중인 직원 목록
    const employeesResult = await pool.query(
      `SELECT id, name, base_salary, incentive_rate FROM accounting_employees WHERE employment_status = '재직'`
    )

    // 해당 월 매출 합계
    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_sales
       FROM accounting_transactions
       WHERE TO_CHAR(transaction_date, 'YYYY-MM') = $1 AND category IN ('셀마플', '코코마케')`,
      [paymentMonth.slice(0, 7)]
    )
    const totalSales = Number(salesResult.rows[0]?.total_sales || 0)

    const created: any[] = []
    for (const emp of employeesResult.rows) {
      const baseSalary = Number(emp.base_salary)
      const incentive = Math.round(totalSales * (Number(emp.incentive_rate) / 100))

      // 중복 방지
      const existing = await pool.query(
        `SELECT id FROM accounting_payroll WHERE employee_id = $1 AND payment_month = $2`,
        [emp.id, paymentMonth]
      )

      if (existing.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO accounting_payroll (employee_id, payment_month, base_salary, incentive, other_payments, payment_status)
           VALUES ($1, $2, $3, $4, 0, '미지급')
           RETURNING *`,
          [emp.id, paymentMonth, baseSalary, incentive]
        )
        created.push(insertResult.rows[0])
      }
    }

    res.json({ success: true, count: created.length, payrolls: created })
  } catch (error) {
    console.error('Payroll generate error:', error)
    res.status(500).json({ error: '급여 자동 생성에 실패했습니다' })
  }
})

router.put('/payroll/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { baseSalary, incentive, otherPayments, paymentStatus } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_payroll
       SET base_salary = $1, incentive = $2, other_payments = $3, payment_status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [baseSalary, incentive, otherPayments, paymentStatus, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '급여 내역을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, payroll: result.rows[0] })
  } catch (error) {
    console.error('Payroll update error:', error)
    res.status(500).json({ error: '급여 수정에 실패했습니다' })
  }
})

router.delete('/payroll/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_payroll WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Payroll delete error:', error)
    res.status(500).json({ error: '급여 삭제에 실패했습니다' })
  }
})

// ========== 정기지출 (Recurring Expenses) ==========

export default router
