import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { createReceipt, downloadReceiptPdf, FreeeReceiptRequest } from '../integrations/freeeClient'

const router = Router()

/**
 * POST /api/receipts - 영수증 생성
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId
  
  try {
    const {
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

    console.log(`📝 [USER ${userId}] Creating receipt...`)

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

