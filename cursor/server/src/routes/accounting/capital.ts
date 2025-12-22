import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'
import { toJSTDateString } from '../../utils/dateHelper'

const router = Router()

router.get('/recurring-expenses', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM accounting_recurring_expenses WHERE is_active = true ORDER BY payment_day`
    )
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      itemName: r.item_name,
      monthlyAmount: Number(r.monthly_amount),
      paymentDay: r.payment_day,
      paymentMethod: r.payment_method,
      isActive: r.is_active,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Recurring expenses fetch error:', error)
    res.status(500).json({ error: '정기지출 목록을 불러오지 못했습니다' })
  }
})

router.post('/recurring-expenses', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { itemName, monthlyAmount, paymentDay, paymentMethod } = req.body
    
    const result = await pool.query(
      `INSERT INTO accounting_recurring_expenses (item_name, monthly_amount, payment_day, payment_method)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [itemName, monthlyAmount, paymentDay, paymentMethod]
    )
    
    res.json({ success: true, expense: result.rows[0] })
  } catch (error) {
    console.error('Recurring expense create error:', error)
    res.status(500).json({ error: '정기지출 추가에 실패했습니다' })
  }
})

router.put('/recurring-expenses/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { itemName, monthlyAmount, paymentDay, paymentMethod, isActive } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_recurring_expenses
       SET item_name = $1, monthly_amount = $2, payment_day = $3, payment_method = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [itemName, monthlyAmount, paymentDay, paymentMethod, isActive, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '정기지출을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, expense: result.rows[0] })
  } catch (error) {
    console.error('Recurring expense update error:', error)
    res.status(500).json({ error: '정기지출 수정에 실패했습니다' })
  }
})

router.delete('/recurring-expenses/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`UPDATE accounting_recurring_expenses SET is_active = false WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Recurring expense delete error:', error)
    res.status(500).json({ error: '정기지출 삭제에 실패했습니다' })
  }
})

// ========== 계좌 (Capital) ==========
router.get('/capital', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM accounting_capital ORDER BY account_type, account_name`
    )
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      accountName: r.account_name,
      accountType: r.account_type,
      initialBalance: Number(r.initial_balance),
      currentBalance: Number(r.current_balance),
      lastUpdated: r.last_updated,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Capital fetch error:', error)
    res.status(500).json({ error: '계좌 목록을 불러오지 못했습니다' })
  }
})

router.post('/capital', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { accountName, accountType, initialBalance } = req.body
    
    const result = await pool.query(
      `INSERT INTO accounting_capital (account_name, account_type, initial_balance, current_balance)
       VALUES ($1, $2, $3, $3)
       RETURNING *`,
      [accountName, accountType, initialBalance || 0]
    )
    
    res.json({ success: true, account: result.rows[0] })
  } catch (error: any) {
    console.error('Capital create error:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: '이미 존재하는 계좌명입니다' })
    }
    res.status(500).json({ error: '계좌 추가에 실패했습니다' })
  }
})

router.put('/capital/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { accountName, accountType, initialBalance } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_capital
       SET account_name = $1, account_type = $2, initial_balance = $3
       WHERE id = $4
       RETURNING *`,
      [accountName, accountType, initialBalance, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' })
    }
    
    res.json({ success: true, account: result.rows[0] })
  } catch (error) {
    console.error('Capital update error:', error)
    res.status(500).json({ error: '계좌 수정에 실패했습니다' })
  }
})

router.delete('/capital/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_capital WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Capital delete error:', error)
    res.status(500).json({ error: '계좌 삭제에 실패했습니다' })
  }
})

// ========== 자동 매칭 규칙 (Auto Match Rules) ==========
router.get('/auto-match-rules', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        amr.id,
        amr.keyword,
        amr.category,
        amr.assigned_user_id,
        u.name as assigned_user_name,
        amr.payment_method,
        amr.priority,
        amr.is_active,
        amr.created_at
       FROM accounting_auto_match_rules amr
       LEFT JOIN users u ON amr.assigned_user_id = u.id
       ORDER BY amr.priority DESC, amr.keyword ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Auto match rules fetch error:', error)
    res.status(500).json({ error: '자동 매칭 규칙을 불러오지 못했습니다' })
  }
})

router.post('/auto-match-rules', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, category, assignedUserId, paymentMethod, priority, isActive } = req.body
    
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ error: '키워드는 필수입니다' })
    }
    
    const result = await pool.query(
      `INSERT INTO accounting_auto_match_rules 
       (keyword, category, assigned_user_id, payment_method, priority, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [keyword.trim(), category || null, assignedUserId || null, paymentMethod || null, priority || 0, isActive !== false]
    )
    
    res.json({ success: true, rule: result.rows[0] })
  } catch (error: any) {
    console.error('Auto match rule creation error:', error)
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: '이미 존재하는 키워드입니다' })
    }
    res.status(500).json({ error: '자동 매칭 규칙 생성에 실패했습니다' })
  }
})

router.put('/auto-match-rules/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { keyword, category, assignedUserId, paymentMethod, priority, isActive } = req.body
    
    if (!keyword || keyword.trim() === '') {
      return res.status(400).json({ error: '키워드는 필수입니다' })
    }
    
    const result = await pool.query(
      `UPDATE accounting_auto_match_rules
       SET keyword = $1,
           category = $2,
           assigned_user_id = $3,
           payment_method = $4,
           priority = $5,
           is_active = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [keyword.trim(), category || null, assignedUserId || null, paymentMethod || null, priority || 0, isActive !== false, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '규칙을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, rule: result.rows[0] })
  } catch (error: any) {
    console.error('Auto match rule update error:', error)
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: '이미 존재하는 키워드입니다' })
    }
    res.status(500).json({ error: '자동 매칭 규칙 수정에 실패했습니다' })
  }
})

router.delete('/auto-match-rules/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_auto_match_rules WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Auto match rule delete error:', error)
    res.status(500).json({ error: '자동 매칭 규칙 삭제에 실패했습니다' })
  }
})

// ========== 자본금 (Capital Balance) ==========
// GET /capital-balance?limit=12&offset=0
router.get('/capital-balance', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 12
    const offset = req.query.offset ? Number(req.query.offset) : 0
    
    const result = await pool.query(
      `SELECT id, balance_date, amount, note, created_at, updated_at
       FROM capital_balance
       ORDER BY balance_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    
    const countResult = await pool.query(`SELECT COUNT(*) as total FROM capital_balance`)
    
    // Convert numeric string to number
    const balances = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0
    }))
    
    res.json({
      data: balances,
      total: parseInt(countResult.rows[0].total)
    })
  } catch (error) {
    console.error('Capital balance fetch error:', error)
    res.status(500).json({ error: '자본금 조회에 실패했습니다' })
  }
})

// POST /capital-balance
router.post('/capital-balance', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { balanceDate, amount, note } = req.body
    
    // Validate date is the 1st of the month
    const date = new Date(balanceDate)
    if (date.getDate() !== 1) {
      return res.status(400).json({ error: '날짜는 반드시 매월 1일이어야 합니다' })
    }
    
    const result = await pool.query(
      `INSERT INTO capital_balance (balance_date, amount, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [balanceDate, amount, note || null]
    )
    
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Capital balance create error:', error)
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: '해당 날짜의 데이터가 이미 존재합니다' })
    }
    res.status(500).json({ error: '자본금 생성에 실패했습니다' })
  }
})

// PUT /capital-balance/:id
router.put('/capital-balance/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { balanceDate, amount, note } = req.body
    
    // Validate date is the 1st of the month
    const date = new Date(balanceDate)
    if (date.getDate() !== 1) {
      return res.status(400).json({ error: '날짜는 반드시 매월 1일이어야 합니다' })
    }
    
    const result = await pool.query(
      `UPDATE capital_balance
       SET balance_date = $1,
           amount = $2,
           note = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [balanceDate, amount, note || null, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '데이터를 찾을 수 없습니다' })
    }
    
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Capital balance update error:', error)
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: '해당 날짜의 데이터가 이미 존재합니다' })
    }
    res.status(500).json({ error: '자본금 수정에 실패했습니다' })
  }
})

// DELETE /capital-balance/:id
router.delete('/capital-balance/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM capital_balance WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Capital balance delete error:', error)
    res.status(500).json({ error: '자본금 삭제에 실패했습니다' })
  }
})

// ========== 보증금 (Deposits) ==========
// GET /deposits
router.get('/deposits', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, item_name, amount, note, created_at, updated_at
       FROM deposits
       ORDER BY amount DESC`
    )
    
    // Convert numeric string to number
    const deposits = result.rows.map(row => ({
      ...row,
      amount: parseFloat(row.amount) || 0
    }))
    
    res.json(deposits)
  } catch (error) {
    console.error('Deposits fetch error:', error)
    res.status(500).json({ error: '보증금 조회에 실패했습니다' })
  }
})

// POST /deposits
router.post('/deposits', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { itemName, amount, note } = req.body
    
    if (!itemName || itemName.trim() === '') {
      return res.status(400).json({ error: '항목명은 필수입니다' })
    }
    
    const result = await pool.query(
      `INSERT INTO deposits (item_name, amount, note)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [itemName.trim(), amount, note || null]
    )
    
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Deposit create error:', error)
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: '이미 존재하는 항목입니다' })
    }
    res.status(500).json({ error: '보증금 생성에 실패했습니다' })
  }
})

// PUT /deposits/:id
router.put('/deposits/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { itemName, amount, note } = req.body
    
    if (!itemName || itemName.trim() === '') {
      return res.status(400).json({ error: '항목명은 필수입니다' })
    }
    
    const result = await pool.query(
      `UPDATE deposits
       SET item_name = $1,
           amount = $2,
           note = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [itemName.trim(), amount, note || null, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '데이터를 찾을 수 없습니다' })
    }
    
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Deposit update error:', error)
    if (error.code === '23505') { // unique violation
      return res.status(409).json({ error: '이미 존재하는 항목입니다' })
    }
    res.status(500).json({ error: '보증금 수정에 실패했습니다' })
  }
})

// DELETE /deposits/:id
router.delete('/deposits/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM deposits WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Deposit delete error:', error)
    res.status(500).json({ error: '보증금 삭제에 실패했습니다' })
  }
})

// ========== 직원 파일 관리 (ADMIN 전용) ==========

// Helper function to decode file name
const decodeFileName = (fileName: string): string => {
  try {
    const utf8Decoded = Buffer.from(fileName, 'latin1').toString('utf8')
    if (utf8Decoded !== fileName) {
      return utf8Decoded
    }
    return decodeURIComponent(fileName)
  } catch (e) {
    return fileName
  }
}

// POST /employees/:userId/files - 파일 업로드

export default router
