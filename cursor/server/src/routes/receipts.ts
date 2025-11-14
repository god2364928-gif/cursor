import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { generateReceiptPdf } from '../utils/pdfGenerator'

const router = Router()

/**
 * freee에서 청구서 상세 정보 가져오기 (품목 포함)
 */
async function getInvoiceDetailsFromFreee(companyId: number, invoiceId: number): Promise<any> {
  try {
    // freee 토큰 가져오기
    const tokenResult = await pool.query('SELECT access_token FROM freee_tokens ORDER BY id DESC LIMIT 1')
    
    if (tokenResult.rows.length === 0) {
      console.log('⚠️ No freee token found')
      return null
    }
    
    const accessToken = tokenResult.rows[0].access_token
    const url = `https://api.freee.co.jp/iv/invoices/${invoiceId}?company_id=${companyId}`
    
    console.log(`📋 Fetching invoice details from freee: ${url}`)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.log(`⚠️ Failed to fetch invoice from freee: ${response.status}`)
      return null
    }
    
    const data: any = await response.json()
    return data.invoice
  } catch (error: any) {
    console.error('⚠️ Error fetching invoice from freee:', error.message)
    return null
  }
}

/**
 * POST /api/receipts/from-invoice - 청구서 기반 영수증 생성 (freee 독립, 자체 PDF)
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

    // 영수증 번호 생성 (YYYYMMDDHHmm 형식, 한국시간 KST)
    const now = new Date()
    const kstOffset = 9 * 60
    const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000)
    const receiptNumber = kstTime.toISOString().replace(/[-:T]/g, '').slice(0, 12)

    console.log(`📋 Generated receipt number: ${receiptNumber}`)

    // freee에서 청구서 상세 정보 가져오기 (품목 포함)
    let invoiceLines: any[] = []
    
    if (invoice.freee_invoice_id) {
      const freeeInvoice = await getInvoiceDetailsFromFreee(invoice.company_id, invoice.freee_invoice_id)
      
      if (freeeInvoice && freeeInvoice.lines) {
        invoiceLines = freeeInvoice.lines.map((line: any) => ({
          description: line.description || '',
          quantity: parseFloat(line.quantity) || 1,
          unit_price: parseFloat(line.unit_price) || 0,
        }))
        console.log(`✅ Fetched ${invoiceLines.length} line items from freee`)
      }
    }
    
    // freee에서 가져오지 못했으면 기본값 사용
    if (invoiceLines.length === 0) {
      invoiceLines = [
        {
          description: 'COCOマーケご利用料',
          quantity: 1,
          unit_price: invoice.tax_entry_method === 'inclusive' 
            ? invoice.total_amount 
            : invoice.total_amount - invoice.tax_amount,
        }
      ]
    }

    // 영수증 PDF 생성
    console.log(`📄 Generating receipt PDF...`)
    
    const pdfBuffer = await generateReceiptPdf({
      receipt_number: receiptNumber,
      partner_name: invoice.partner_name,
      issue_date: issue_date,
      company_name: '株式会社ホットセラー',
      company_address: '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
      total_amount: invoice.total_amount,
      amount_tax: invoice.tax_amount,
      amount_excluding_tax: invoice.total_amount - invoice.tax_amount,
      lines: invoiceLines,
      invoice_registration_number: 'T5013301050765',
    })

    console.log(`✅ Receipt PDF generated: ${pdfBuffer.length} bytes`)

    // DB에 영수증 정보 저장
    const insertQuery = `
      INSERT INTO receipts (
        user_id, company_id, partner_id, partner_name,
        receipt_number, receipt_date, issue_date,
        total_amount, tax_amount, tax_entry_method, invoice_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `
    const values = [
      userId,
      invoice.company_id,
      invoice.partner_id,
      invoice.partner_name,
      receiptNumber,
      invoice.invoice_date,
      issue_date,
      invoice.total_amount,
      invoice.tax_amount,
      invoice.tax_entry_method,
      invoice_id,
    ]

    const insertResult = await pool.query(insertQuery, values)

    // 청구서 테이블에 영수증 ID 업데이트
    await pool.query(
      'UPDATE invoices SET receipt_id = $1 WHERE id = $2',
      [insertResult.rows[0].id, invoice_id]
    )

    console.log(`✅ Receipt created: db_id=${insertResult.rows[0].id}`)

    // PDF를 바로 반환
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${receiptNumber}.pdf"`)
    res.send(pdfBuffer)
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
 * GET /api/receipts/:id/pdf - 영수증 PDF 재생성 및 다운로드
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

    console.log(`📥 Regenerating receipt PDF: ${receipt.receipt_number}`)

    // 연결된 청구서에서 freee_invoice_id 가져오기
    let invoiceLines: any[] = []
    
    if (receipt.invoice_id) {
      const invoiceQuery = await pool.query('SELECT freee_invoice_id, company_id, tax_entry_method FROM invoices WHERE id = $1', [receipt.invoice_id])
      
      if (invoiceQuery.rows.length > 0) {
        const invoice = invoiceQuery.rows[0]
        
        if (invoice.freee_invoice_id) {
          const freeeInvoice = await getInvoiceDetailsFromFreee(invoice.company_id, invoice.freee_invoice_id)
          
          if (freeeInvoice && freeeInvoice.lines) {
            invoiceLines = freeeInvoice.lines.map((line: any) => ({
              description: line.description || '',
              quantity: parseFloat(line.quantity) || 1,
              unit_price: parseFloat(line.unit_price) || 0,
            }))
            console.log(`✅ Fetched ${invoiceLines.length} line items from freee`)
          }
        }
      }
    }
    
    // freee에서 가져오지 못했으면 기본값 사용
    if (invoiceLines.length === 0) {
      invoiceLines = [
        {
          description: 'COCOマーケご利用料',
          quantity: 1,
          unit_price: receipt.tax_entry_method === 'inclusive' 
            ? receipt.total_amount 
            : receipt.total_amount - receipt.tax_amount,
        }
      ]
    }

    // PDF 재생성
    const pdfBuffer = await generateReceiptPdf({
      receipt_number: receipt.receipt_number,
      partner_name: receipt.partner_name,
      issue_date: receipt.issue_date,
      company_name: '株式会社ホットセラー',
      company_address: '〒104-0053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
      total_amount: receipt.total_amount,
      amount_tax: receipt.tax_amount,
      amount_excluding_tax: receipt.total_amount - receipt.tax_amount,
      lines: invoiceLines,
      invoice_registration_number: 'T5013301050765',
    })

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
