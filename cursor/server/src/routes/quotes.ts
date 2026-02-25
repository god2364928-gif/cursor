import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { pool } from '../db'
import { generateQuotePdf } from '../utils/pdfGenerator'

const router = Router()

/**
 * 견적서 목록 조회
 */
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.id,
        q.quote_number,
        q.partner_name,
        q.partner_title,
        q.quote_title,
        q.quote_date,
        q.delivery_date,
        q.delivery_place,
        q.payment_terms,
        q.quote_expiry,
        q.total_amount,
        q.tax_amount,
        q.tax_entry_method,
        q.memo,
        q.user_id as issued_by_user_id,
        u.name as issued_by_user_name,
        q.is_cancelled,
        q.cancelled_at,
        cu.name as cancelled_by_user_name,
        q.created_at
      FROM quotes q
      LEFT JOIN users u ON q.user_id = u.id
      LEFT JOIN users cu ON q.cancelled_by_user_id = cu.id
      ORDER BY q.created_at DESC
    `)

    const quotes = await Promise.all(result.rows.map(async (quote: any) => {
      const itemsResult = await pool.query(
        'SELECT id, item_name, quantity, unit_price, tax_rate FROM quote_items WHERE quote_id = $1 ORDER BY id',
        [quote.id]
      )
      return { ...quote, items: itemsResult.rows }
    }))

    res.json(quotes)
  } catch (error: any) {
    console.error('Error fetching quotes:', error)
    res.status(500).json({ error: 'Failed to fetch quotes' })
  }
})

/**
 * 견적서 번호 자동 채번 (Q-YYYYMMDD-NNN)
 */
async function generateQuoteNumber(quoteDate: string): Promise<string> {
  const dateStr = quoteDate.replace(/-/g, '')
  const prefix = `Q-${dateStr}`

  const result = await pool.query(
    "SELECT quote_number FROM quotes WHERE quote_number LIKE $1 ORDER BY quote_number DESC LIMIT 1",
    [`${prefix}-%`]
  )

  let seq = 1
  if (result.rows.length > 0) {
    const lastNum = result.rows[0].quote_number
    const lastSeq = parseInt(lastNum.split('-').pop() || '0', 10)
    seq = lastSeq + 1
  }

  return `${prefix}-${String(seq).padStart(3, '0')}`
}

/**
 * 견적서 생성
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      partner_name,
      partner_title,
      quote_title,
      quote_date,
      delivery_date,
      quote_expiry,
      tax_entry_method,
      line_items,
      memo,
      contact_tel,
      contact_person,
    } = req.body

    if (!partner_name || !quote_date || !line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (line_items.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 line items allowed' })
    }

    const quoteNumber = await generateQuoteNumber(quote_date)

    const subtotal = line_items.reduce((sum: number, item: any) => {
      return sum + (Number(item.unit_price) || 0) * (Number(item.quantity) || 0)
    }, 0)

    const taxAmount = line_items.reduce((sum: number, item: any) => {
      return sum + (Number(item.tax) || 0)
    }, 0)

    const totalAmount = tax_entry_method === 'inclusive' ? subtotal : subtotal + taxAmount

    const insertResult = await pool.query(
      `INSERT INTO quotes (
        user_id, quote_number, partner_name, partner_title,
        quote_title, quote_date, delivery_date,
        quote_expiry, total_amount, tax_amount,
        tax_entry_method, memo, contact_tel, contact_person
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
      [
        req.user!.id,
        quoteNumber,
        partner_name,
        partner_title || '御中',
        quote_title || 'COCOマーケ利用料',
        quote_date,
        delivery_date || null,
        quote_expiry || '発行日より2週間',
        totalAmount,
        taxAmount,
        tax_entry_method || 'exclusive',
        memo || null,
        contact_tel || null,
        contact_person || null,
      ]
    )

    const quoteId = insertResult.rows[0].id

    for (const item of line_items) {
      await pool.query(
        `INSERT INTO quote_items (quote_id, item_name, quantity, unit_price, tax_rate)
         VALUES ($1, $2, $3, $4, $5)`,
        [quoteId, item.name, Number(item.quantity), Number(item.unit_price), Number(item.tax_rate || 10)]
      )
    }

    const userName = (await pool.query('SELECT name FROM users WHERE id = $1', [req.user!.id])).rows[0]?.name || ''
    console.log(`✅ Quote created: ${quoteNumber}, partner=${partner_name}, user=${userName}`)

    res.json({
      success: true,
      quote_id: quoteId,
      quote_number: quoteNumber,
    })
  } catch (error: any) {
    console.error('Error creating quote:', error)
    res.status(500).json({ error: error.message || 'Failed to create quote' })
  }
})

/**
 * 견적서 PDF 다운로드
 */
router.get('/:id/pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT q.*, u.name as user_name FROM quotes q LEFT JOIN users u ON q.user_id = u.id WHERE q.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const quote = result.rows[0]

    const itemsResult = await pool.query(
      'SELECT item_name, quantity, unit_price, tax_rate FROM quote_items WHERE quote_id = $1 ORDER BY id',
      [id]
    )

    const isInclusive = quote.tax_entry_method === 'inclusive'

    const pdfBuffer = await generateQuotePdf({
      quote_number: quote.quote_number,
      company_name: '株式会社ホットセラー',
      company_address: '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
      company_tel: quote.contact_tel || '080-6464-1138',
      contact_person: quote.contact_person || quote.user_name || '',
      partner_name: quote.partner_name,
      partner_title: quote.partner_title || '御中',
      quote_date: quote.quote_date,
      quote_title: quote.quote_title || 'COCOマーケ利用料',
      delivery_date: quote.delivery_date || '',
      quote_expiry: quote.quote_expiry || '発行日より2週間',
      total_amount: quote.total_amount,
      amount_tax: quote.tax_amount,
      amount_excluding_tax: quote.total_amount - quote.tax_amount,
      lines: itemsResult.rows.map((item: any) => ({
        description: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate || 10,
      })),
      memo: quote.memo || '',
      tax_entry_method: quote.tax_entry_method,
      invoice_registration_number: 'T5013301050765',
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="quote_${quote.quote_number}.pdf"`)
    res.send(pdfBuffer)
  } catch (error: any) {
    console.error('❌ Error generating quote PDF:', error.message)
    console.error('Stack:', error.stack)
    res.status(500).json({ error: error.message || 'Failed to generate PDF' })
  }
})

/**
 * 견적서 취소
 */
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    const result = await pool.query('SELECT * FROM quotes WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Quote not found' })
    }

    const quote = result.rows[0]

    if (quote.user_id !== userId) {
      return res.status(403).json({ error: 'Only the quote issuer can cancel' })
    }

    if (quote.is_cancelled) {
      return res.status(400).json({ error: 'Quote is already cancelled' })
    }

    const cancelledAt = new Date()
    await pool.query(
      `UPDATE quotes SET is_cancelled = true, cancelled_at = $1, cancelled_by_user_id = $2 WHERE id = $3`,
      [cancelledAt, userId, id]
    )

    console.log(`✅ Quote cancelled: ${quote.quote_number} by user ${userId}`)

    res.json({
      success: true,
      message: 'Quote cancelled successfully',
      cancelled_at: cancelledAt.toISOString(),
    })
  } catch (error: any) {
    console.error('Error cancelling quote:', error)
    res.status(500).json({ error: error.message || 'Failed to cancel quote' })
  }
})

export default router
