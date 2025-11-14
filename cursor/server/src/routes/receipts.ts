import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { createReceipt, downloadReceiptPdf, FreeeReceiptRequest } from '../integrations/freeeClient'

const router = Router()

/**
 * POST /api/receipts - 영수증 생성
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  
  try {
    let {
      company_id,
      partner_id,
      partner_name,
      partner_title,
      receipt_title,
      receipt_date,
      issue_date,  // 영수일
      tax_entry_method,
      payment_bank_info,
      receipt_contents,
    } = req.body

    // 필수 필드 검증
    if (!company_id || !partner_name || !receipt_date || !issue_date || !receipt_contents || receipt_contents.length === 0) {
      return res.status(400).json({
        message: 'Missing required fields: company_id, partner_name, receipt_date, issue_date, receipt_contents',
      })
    }

    // 날짜 형식 정리 (YYYY-MM-DD만 추출)
    if (receipt_date.includes('T')) {
      receipt_date = receipt_date.split('T')[0]
    }
    if (issue_date.includes('T')) {
      issue_date = issue_date.split('T')[0]
    }

    console.log(`📝 [USER ${userId}] Creating receipt...`)
    console.log(`📅 Receipt date: ${receipt_date}, Issue date: ${issue_date}`)

    // freee請求書 API 호출
    const receiptData: FreeeReceiptRequest = {
      company_id,
      partner_id,
      partner_name,
      partner_title,
      receipt_title,
      receipt_date,
      issue_date,
      tax_entry_method,
      payment_bank_info,
      receipt_contents,
    }

    const result = await createReceipt(receiptData)

    if (!result.success) {
      return res.status(500).json({ message: 'Failed to create receipt in freee' })
    }

    // DB에 영수증 정보 저장
    const receiptNumber = result.receipt.receipt_number || result.receipt.id
    const freeeReceiptId = result.receipt.id
    const totalAmount = result.receipt.total_amount || 0
    const taxAmount = result.receipt.amount_tax || 0

    const insertQuery = `
      INSERT INTO receipts (
        user_id, company_id, partner_id, partner_name,
        receipt_number, freee_receipt_id, receipt_date, issue_date,
        total_amount, tax_amount, tax_entry_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `
    const values = [
      userId,
      company_id,
      partner_id,
      partner_name,
      receiptNumber,
      freeeReceiptId,
      receipt_date,
      issue_date,
      totalAmount,
      taxAmount,
      tax_entry_method,
    ]

    const insertResult = await pool.query(insertQuery, values)

    console.log(`✅ Receipt created: freee_id=${freeeReceiptId}, db_id=${insertResult.rows[0].id}`)

    res.json({
      success: true,
      receipt: insertResult.rows[0],
      freee_receipt: result.receipt,
    })
  } catch (error: any) {
    console.error('❌ Error creating receipt:', error)
    res.status(500).json({ message: 'Error creating receipt', error: error.message })
  }
})

/**
 * POST /api/receipts/from-invoice - 청구서 기반 영수증 생성
 */
router.post('/from-invoice', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id
  
  try {
    let { invoice_id, issue_date } = req.body

    if (!invoice_id || !issue_date) {
      return res.status(400).json({
        message: 'Missing required fields: invoice_id, issue_date',
      })
    }

    // 날짜 형식 정리 (YYYY-MM-DD만 추출)
    if (issue_date.includes('T')) {
      issue_date = issue_date.split('T')[0]
    }

    console.log(`📝 [USER ${userId}] Creating receipt from invoice ${invoice_id}...`)
    console.log(`📅 Issue date: ${issue_date}`)

    // 청구서 조회
    const invoiceQuery = await pool.query('SELECT * FROM invoices WHERE id = $1', [invoice_id])
    
    if (invoiceQuery.rows.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' })
    }

    const invoice = invoiceQuery.rows[0]

    // 이미 영수증이 발급되었는지 확인
    const existingReceipt = await pool.query(
      'SELECT id FROM receipts WHERE invoice_id = $1',
      [invoice_id]
    )

    if (existingReceipt.rows.length > 0) {
      return res.status(400).json({ 
        message: 'Receipt already exists for this invoice',
        receipt_id: existingReceipt.rows[0].id
      })
    }

    // 청구서의 품목 정보를 조회 (DB에 저장되어 있다면)
    // 현재는 freee에서 직접 조회
    // 간단하게 청구서 정보만으로 영수증 생성
    const receiptData: FreeeReceiptRequest = {
      company_id: invoice.company_id,
      partner_id: invoice.partner_id,
      partner_name: invoice.partner_name,
      partner_title: '様',
      receipt_title: 'COCOマーケご利用料 領収書',
      receipt_date: invoice.invoice_date,
      issue_date: issue_date,
      tax_entry_method: invoice.tax_entry_method,
      payment_bank_info: 'PayPay銀行\nビジネス営業部支店（005）\n普通　7136331\nカブシキガイシャホットセラー',
      receipt_contents: [
        {
          name: 'COCOマーケご利用料',
          quantity: 1,
          unit_price: invoice.tax_entry_method === 'inclusive' 
            ? invoice.total_amount 
            : invoice.total_amount - invoice.tax_amount,
          tax: invoice.tax_amount,
          tax_rate: 10,
        }
      ],
    }

    const result = await createReceipt(receiptData)

    if (!result.success) {
      return res.status(500).json({ message: 'Failed to create receipt in freee' })
    }

    // DB에 영수증 정보 저장
    const receiptNumber = result.receipt.receipt_number || result.receipt.id
    const freeeReceiptId = result.receipt.id
    const totalAmount = result.receipt.total_amount || invoice.total_amount
    const taxAmount = result.receipt.amount_tax || invoice.tax_amount

    const insertQuery = `
      INSERT INTO receipts (
        user_id, company_id, partner_id, partner_name,
        receipt_number, freee_receipt_id, receipt_date, issue_date,
        total_amount, tax_amount, tax_entry_method, invoice_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `
    const values = [
      userId,
      invoice.company_id,
      invoice.partner_id,
      invoice.partner_name,
      receiptNumber,
      freeeReceiptId,
      invoice.invoice_date,
      issue_date,
      totalAmount,
      taxAmount,
      invoice.tax_entry_method,
      invoice_id,
    ]

    const insertResult = await pool.query(insertQuery, values)

    // 청구서 테이블에 영수증 ID 업데이트
    await pool.query(
      'UPDATE invoices SET receipt_id = $1 WHERE id = $2',
      [insertResult.rows[0].id, invoice_id]
    )

    console.log(`✅ Receipt created from invoice: freee_id=${freeeReceiptId}, db_id=${insertResult.rows[0].id}`)

    res.json({
      success: true,
      receipt: insertResult.rows[0],
      freee_receipt: result.receipt,
    })
  } catch (error: any) {
    console.error('❌ Error creating receipt from invoice:', error)
    res.status(500).json({ message: 'Error creating receipt', error: error.message })
  }
})

/**
 * GET /api/receipts - 영수증 목록 조회
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const query = `
      SELECT r.*, u.name as user_name
      FROM receipts r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `
    const result = await pool.query(query)

    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ Error fetching receipts:', error)
    res.status(500).json({ message: 'Error fetching receipts', error: error.message })
  }
})

/**
 * GET /api/receipts/:id/pdf - 영수증 PDF 다운로드
 */
router.get('/:id/pdf', authMiddleware, async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    // DB에서 영수증 조회
    const result = await pool.query('SELECT * FROM receipts WHERE id = $1', [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Receipt not found' })
    }

    const receipt = result.rows[0]
    const companyId = receipt.company_id
    const freeeReceiptId = receipt.freee_receipt_id

    if (!freeeReceiptId) {
      return res.status(400).json({ message: 'freee receipt ID not found' })
    }

    // freee請求書 API에서 PDF 다운로드
    const pdfBuffer = await downloadReceiptPdf(companyId, freeeReceiptId)

    // PDF 파일로 응답
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${receipt.receipt_number}.pdf"`)
    res.send(pdfBuffer)
  } catch (error: any) {
    console.error('❌ Error downloading receipt PDF:', error)
    res.status(500).json({ message: 'Error downloading receipt PDF', error: error.message })
  }
})

export default router

