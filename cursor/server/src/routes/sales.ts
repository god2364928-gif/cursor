import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Get all sales with date filtering
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query
    
    // payments 테이블 존재 여부 확인 (없으면 payer_name은 NULL 반환)
    const existsPayments = await pool.query("SELECT to_regclass('public.payments') AS t")
    const hasPayments = !!existsPayments.rows[0]?.t

    let query = `
      SELECT
        s.*, to_char(s.contract_date, 'YYYY-MM-DD') AS contract_date_str,
        u.name as user_name,
        ${hasPayments ? `(
          SELECT p.payer_name
          FROM payments p
          WHERE p.payer_name IS NOT NULL
            AND (
              (p.customer_id IS NOT NULL AND p.customer_id = s.customer_id)
              OR (
                p.company_name IS NOT NULL AND s.company_name IS NOT NULL AND p.company_name = s.company_name
              )
            )
            AND (
              p.paid_at::date BETWEEN s.contract_date - INTERVAL '7 days' AND s.contract_date + INTERVAL '7 days'
            )
          ORDER BY p.paid_at DESC NULLS LAST
          LIMIT 1
        )` : 'NULL'} as payer_name
      FROM sales s
      JOIN users u ON s.user_id = u.id
    `
    const params: any[] = []
    
    if (startDate && endDate) {
      query += ` WHERE s.contract_date >= $1 AND s.contract_date <= $2`
      params.push(startDate, endDate)
    }
    
    query += ` ORDER BY s.contract_date DESC`
    
    const result = await pool.query(query, params)
    
    // Convert snake_case to camelCase
    const sales = result.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      userId: row.user_id,
      userName: row.user_name,
      companyName: row.company_name,
      payerName: row.payer_name,
      salesType: row.sales_type,
      sourceType: row.source_type,
      amount: row.amount,
      contractDate: row.contract_date_str || row.contract_date,
      marketingContent: row.marketing_content,
      note: row.note,
      createdAt: row.created_at
    }))
    
    res.json(sales)
  } catch (error) {
    console.error('Error fetching sales:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Create new sale
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, salesType, sourceType, amount, contractDate, marketingContent } = req.body
    
    if (!companyName || !salesType || !sourceType || !amount || !contractDate || !marketingContent) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    
    const result = await pool.query(
      `INSERT INTO sales (user_id, company_name, sales_type, source_type, amount, contract_date, marketing_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user?.id, companyName, salesType, sourceType, amount, contractDate, marketingContent]
    )
    
    const sale = result.rows[0]
    const camelCaseSale = {
      id: sale.id,
      customerId: sale.customer_id,
      userId: sale.user_id,
      userName: req.user?.name || '',
      companyName: sale.company_name,
      salesType: sale.sales_type,
      sourceType: sale.source_type,
      amount: sale.amount,
      contractDate: sale.contract_date,
      marketingContent: sale.marketing_content,
      note: sale.note,
      createdAt: sale.created_at
    }
    
    res.json(camelCaseSale)
  } catch (error) {
    console.error('Error creating sale:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update sale
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { companyName, salesType, sourceType, amount, contractDate, marketingContent } = req.body
    
    // Check if sale exists and get user_id
    const saleResult = await pool.query('SELECT user_id FROM sales WHERE id = $1', [id])
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' })
    }
    
    const sale = saleResult.rows[0]
    
    // Check if user is the owner of this sale (or admin)
    if (req.user?.role !== 'admin' && sale.user_id !== req.user?.id) {
      return res.status(403).json({ message: 'You can only edit your own sales' })
    }
    
    await pool.query(
      `UPDATE sales SET company_name = $1, sales_type = $2, source_type = $3, amount = $4, contract_date = $5, marketing_content = $6 WHERE id = $7`,
      [companyName, salesType, sourceType, amount, contractDate, marketingContent, id]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating sale:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete sale
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // Check if sale exists and get user_id
    const saleResult = await pool.query('SELECT user_id FROM sales WHERE id = $1', [id])
    
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sale not found' })
    }
    
    const sale = saleResult.rows[0]
    
    // Check if user is the owner of this sale (or admin)
    if (req.user?.role !== 'admin' && sale.user_id !== req.user?.id) {
      return res.status(403).json({ message: 'You can only delete your own sales' })
    }
    
    await pool.query('DELETE FROM sales WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting sale:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router


