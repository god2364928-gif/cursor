import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getCompanies,
  getPartners,
  createPartner,
  createInvoice,
  downloadInvoicePdf,
  isAuthenticated,
  clearTokenCache,
  FreeeInvoiceRequest,
} from '../integrations/freeeClient'
import { pool } from '../db'
import { sendInvoiceCancelNotification, sendPaypalInvoiceNotification } from '../utils/slackClient'

const router = Router()

/**
 * OAuth 인증 URL 반환
 */
router.get('/auth-url', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const authUrl = getAuthorizationUrl()
    res.json({ authUrl })
  } catch (error) {
    console.error('Error generating auth URL:', error)
    res.status(500).json({ error: 'Failed to generate authorization URL' })
  }
})

/**
 * OAuth 콜백 - 인증 코드를 토큰으로 교환
 */
router.post('/auth-callback', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' })
    }

    const result = await exchangeCodeForToken(code)

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Token exchange failed' })
    }

    res.json({ success: true, message: 'Authentication successful' })
  } catch (error) {
    console.error('Error in auth callback:', error)
    res.status(500).json({ error: 'Failed to exchange authorization code' })
  }
})

/**
 * 인증 상태 확인
 */
router.get('/auth-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const authenticated = await isAuthenticated()
    res.json({ authenticated })
  } catch (error) {
    console.error('Error checking auth status:', error)
    res.status(500).json({ error: 'Failed to check authentication status' })
  }
})

/**
 * OAuth 토큰 삭제 (재인증용)
 */
router.post('/reset-auth', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await pool.query('DELETE FROM freee_tokens')
    clearTokenCache()  // 캐시도 초기화
    console.log('🗑️ freee tokens deleted and cache cleared - ready for re-authentication')
    res.json({ success: true, message: 'Authentication reset. Please authenticate again.' })
  } catch (error) {
    console.error('Error resetting auth:', error)
    res.status(500).json({ error: 'Failed to reset authentication' })
  }
})

/**
 * 사업소 목록 조회
 */
router.get('/companies', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const companies = await getCompanies()
    res.json(companies)
  } catch (error: any) {
    console.error('Error fetching companies:', error)
    
    if (error.message?.includes('No valid access token')) {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' })
    }
    
    res.status(500).json({ error: 'Failed to fetch companies' })
  }
})

/**
 * 거래처 목록 조회
 */
router.get('/partners', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, keyword } = req.query
    
    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' })
    }

    const partners = await getPartners(Number(company_id), keyword as string | undefined)
    res.json(partners)
  } catch (error: any) {
    console.error('Error fetching partners:', error)
    
    if (error.message?.includes('No valid access token')) {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' })
    }
    
    res.status(500).json({ error: 'Failed to fetch partners' })
  }
})

/**
 * 거래처 생성
 */
router.post('/partners', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { company_id, partner_name } = req.body
    
    if (!company_id || !partner_name) {
      return res.status(400).json({ error: 'company_id and partner_name are required' })
    }

    const partner = await createPartner(Number(company_id), partner_name)
    res.json(partner)
  } catch (error: any) {
    console.error('Error creating partner:', error)
    
    if (error.message?.includes('No valid access token')) {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' })
    }
    
    res.status(500).json({ error: 'Failed to create partner' })
  }
})

/**
 * 청구서 발급 내역 목록 조회 (CRM에서 발급한 것만)
 */
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        i.id,
        i.freee_invoice_id,
        i.company_id as freee_company_id,
        i.partner_name,
        i.invoice_date,
        i.due_date,
        i.total_amount,
        i.tax_amount,
        i.tax_entry_method,
        i.user_id as issued_by_user_id,
        u.name as issued_by_user_name,
        i.receipt_id,
        i.is_cancelled,
        i.cancelled_at,
        cu.name as cancelled_by_user_name,
        i.created_at
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.id
      LEFT JOIN users cu ON i.cancelled_by_user_id = cu.id
      ORDER BY i.created_at DESC
    `)

    res.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

/**
 * 청구서 생성
 */
router.post('/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      company_id,
      partner_id,  // 추가: 선택된 거래처 ID
      partner_name,
      partner_title,
      invoice_title,
      invoice_date,
      due_date,
      tax_entry_method,
      line_items,
      payment_bank_info,
      payment_method,  // 추가: 결제 방식 (bank/paypay/paypal)
      memo,  // 추가: 비고
    } = req.body

    // 입력 유효성 검사
    if (!company_id || !partner_name || !invoice_date || !due_date || !line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (line_items.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 line items allowed' })
    }

    // 각 품목 입력 유효성 검사 (freee 호출 전에 차단)
    for (const item of line_items) {
      const quantity = Number(item?.quantity)
      const unitPrice = Number(item?.unit_price)

      if (!item?.name || typeof item.name !== 'string' || item.name.trim().length === 0) {
        return res.status(400).json({ error: '품목명이 비어 있습니다 / 品目名が空です' })
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: '수량은 0보다 큰 숫자여야 합니다 / 数量は0より大きい数値である必要があります' })
      }
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return res.status(400).json({ error: '단가는 0 이상의 숫자여야 합니다 / 単価は0以上の数値である必要があります' })
      }
      if (item.tax_rate !== undefined && item.tax_rate !== null && !Number.isFinite(Number(item.tax_rate))) {
        return res.status(400).json({ error: '세율이 올바르지 않습니다 / 税率が正しくありません' })
      }
      if (item.tax !== undefined && item.tax !== null && !Number.isFinite(Number(item.tax))) {
        return res.status(400).json({ error: '세액이 올바르지 않습니다 / 税額が正しくありません' })
      }
    }

    // tax_entry_method 유효성 검사
    if (tax_entry_method !== undefined && tax_entry_method !== null && tax_entry_method !== 'inclusive' && tax_entry_method !== 'exclusive') {
      return res.status(400).json({ error: "tax_entry_method must be 'inclusive' or 'exclusive'" })
    }

    // freee API 형식으로 변환
    const invoiceData: FreeeInvoiceRequest = {
      company_id: Number(company_id),
      partner_id: partner_id ? Number(partner_id) : undefined,  // 추가: 거래처 ID
      partner_name,
      partner_title,
      invoice_title,
      invoice_date,
      due_date,
      tax_entry_method,
      payment_bank_info,
      memo,  // 추가: 비고
      invoice_contents: line_items.map((item: any) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        tax_rate: Number(item.tax_rate || 10),  // 추가: 세율
        tax: Number(item.tax || 0),
      })),
    }

    const result = await createInvoice(invoiceData)
    
    if (!result.success || !result.invoice) {
      throw new Error('Failed to create invoice in freee')
    }

    const invoiceId = result.invoice.id
    
    // 프론트엔드와 동일한 방식으로 금액 계산 (Math.floor 사용)
    const subtotal = line_items.reduce((sum: number, item: any) => {
      const unitPrice = Number(item.unit_price) || 0
      const quantity = Number(item.quantity) || 0
      return sum + (unitPrice * quantity)
    }, 0)
    
    const taxAmount = line_items.reduce((sum: number, item: any) => {
      return sum + (Number(item.tax) || 0)  // 프론트엔드에서 이미 Math.floor로 계산된 값
    }, 0)
    
    const totalAmount = tax_entry_method === 'inclusive' ? subtotal : subtotal + taxAmount

    // ⚠️ freee 청구서는 이미 생성됨. 아래 DB 작업 실패 시 고아(orphan)가 되므로 보상 처리 필요.
    let dbInvoiceId: number
    let userName: string
    try {
      // 사용자 정보 조회
      const userResult = await pool.query(
        'SELECT name FROM users WHERE id = $1',
        [req.user!.id]
      )
      userName = userResult.rows[0]?.name || '알 수 없음'

      // DB에 청구서 정보 저장
      const insertResult = await pool.query(
        `INSERT INTO invoices (
          user_id,
          company_id,
          partner_id,
          partner_name,
          invoice_number,
          freee_invoice_id,
          invoice_date,
          due_date,
          total_amount,
          tax_amount,
          tax_entry_method,
          memo,
          payment_bank_info,
          line_items
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
        [
          req.user!.id,
          company_id,
          partner_id ? Number(partner_id) : null,  // freee에 보낸 값과 동일하게 강제 변환
          partner_name + (partner_title || ''),
          result.invoice.invoice_number || invoiceId,
          invoiceId,
          invoice_date,
          due_date,
          totalAmount,
          taxAmount,
          tax_entry_method || 'exclusive',
          memo,  // 추가: 비고
          payment_bank_info,  // 추가: 입금처 정보
          JSON.stringify(line_items),  // 추가: PDF 폴백용 품목 (JSONB)
        ]
      )

      dbInvoiceId = insertResult.rows[0].id
    } catch (dbError: any) {
      // freee 청구서는 이미 발행되었으나 CRM DB 기록에 실패 → 고아 청구서. 재발행 금지.
      const orphanNumber = result.invoice.invoice_number || invoiceId
      console.error(`❌ ORPHAN: freee invoice ${invoiceId} created but DB insert failed`, dbError)
      return res.status(500).json({
        error: `청구서가 freee에 발행(번호: ${orphanNumber}, freee ID: ${invoiceId})되었으나 CRM에 기록하지 못했습니다. 절대 재시도하지 마시고 관리자에게 문의하세요. / 請求書はfreeeで発行済み（番号: ${orphanNumber}、freee ID: ${invoiceId}）ですが、CRMへの記録に失敗しました。再試行せず、管理者にお問い合わせください。`,
        freee_invoice_id: invoiceId,
        freee_invoice_number: orphanNumber,
        orphaned: true,
      })
    }

    console.log(`✅ Invoice created: freee_id=${invoiceId}, db_id=${dbInvoiceId}, partner=${partner_name}, user=${userName}, payment_method=${payment_method}`)

    // 카드결제(PayPal) 청구서인 경우 日本_領収書 슬랙 채널에 알림 전송
    if (payment_method === 'paypal') {
      sendPaypalInvoiceNotification({
        invoice_number: result.invoice.invoice_number || String(invoiceId),
        partner_name: partner_name + (partner_title || ''),
        invoice_date,
        due_date,
        total_amount: totalAmount,
        tax_amount: taxAmount,
        user_name: userName,
        line_items: line_items.map((item: any) => ({
          name: item.name,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
        })),
      }).catch(error => {
        console.error('⚠️ Slack notification failed, but invoice was created successfully:', error)
      })
    }
    
    res.json({
      success: true,
      invoice_id: invoiceId,
      invoice: result.invoice,
      db_id: dbInvoiceId,
    })
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    
    if (error.message?.includes('No valid access token')) {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' })
    }
    
    res.status(500).json({ error: error.message || 'Failed to create invoice' })
  }
})

/**
 * 청구서 취소
 */
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    console.log(`🗑️ [Cancel Invoice] Request for invoice ID: ${id} by user: ${userId}`)

    // 1. 청구서 조회
    const result = await pool.query(
      `SELECT i.*, u.name as user_name 
       FROM invoices i 
       LEFT JOIN users u ON i.user_id = u.id 
       WHERE i.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      console.error(`❌ Invoice not found: ${id}`)
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const invoice = result.rows[0]

    // 2. 발급자 확인
    if (invoice.user_id !== userId) {
      console.error(`❌ Unauthorized: User ${userId} attempted to cancel invoice created by ${invoice.user_id}`)
      return res.status(403).json({ error: 'Only the invoice issuer can cancel the invoice' })
    }

    // 3. 이미 취소되었는지 확인
    if (invoice.is_cancelled) {
      console.error(`❌ Invoice already cancelled: ${id}`)
      return res.status(400).json({ error: 'Invoice is already cancelled' })
    }

    // 4. 영수증이 발급되었는지 확인
    if (invoice.receipt_id) {
      console.error(`❌ Cannot cancel invoice with receipt: ${id}`)
      return res.status(400).json({ error: 'Cannot cancel invoice that has a receipt issued' })
    }

    // 5. DB 업데이트
    const cancelledAt = new Date()
    await pool.query(
      `UPDATE invoices 
       SET is_cancelled = true, 
           cancelled_at = $1, 
           cancelled_by_user_id = $2 
       WHERE id = $3`,
      [cancelledAt, userId, id]
    )

    console.log(`✅ Invoice cancelled: ${id} by user ${userId}`)

    // 6. 사용자 이름 조회
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId])
    const userName = userResult.rows[0]?.name || '알 수 없음'

    // 7. 슬랙 알림 전송 (비동기, 실패해도 취소에는 영향 없음)
    sendInvoiceCancelNotification({
      invoice_number: invoice.invoice_number || String(invoice.freee_invoice_id),
      partner_name: invoice.partner_name,
      invoice_date: invoice.invoice_date,
      total_amount: invoice.total_amount,
      tax_amount: invoice.tax_amount,
      user_name: userName,
      cancelled_at: cancelledAt.toISOString(),
    }).catch(error => {
      console.error('⚠️ Slack notification failed, but invoice was cancelled successfully:', error)
    })

    // 8. 성공 응답
    res.json({
      success: true,
      message: 'Invoice cancelled successfully',
      cancelled_at: cancelledAt.toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Error cancelling invoice:', error)
    res.status(500).json({ error: error.message || 'Failed to cancel invoice' })
  }
})

/**
 * 청구서 PDF 다운로드
 */
router.get('/:id/pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    console.log(`📥 [PDF Download] Request for invoice ID: ${id} by user: ${userId}`)

    // DB에서 청구서 조회. freee 조회 실패 시 PDF를 DB 값만으로 생성하기 위해
    // partner_name/invoice_number/invoice_date/total_amount/tax_amount도 함께 가져온다.
    const result = await pool.query('SELECT freee_invoice_id, company_id, due_date, memo, payment_bank_info, tax_entry_method, line_items, partner_name, invoice_number, invoice_date, total_amount, tax_amount FROM invoices WHERE id = $1', [id])

    if (result.rows.length === 0) {
      console.error(`❌ Invoice not found in DB: ${id}`)
      return res.status(404).json({ error: 'Invoice not found' })
    }

    const { freee_invoice_id, company_id, due_date, memo, payment_bank_info, tax_entry_method, line_items, partner_name, invoice_number, invoice_date, total_amount, tax_amount } = result.rows[0]

    console.log(`📋 Invoice details: freee_id=${freee_invoice_id}, company_id=${company_id}, due_date=${due_date}, payment_info=${payment_bank_info ? 'present' : 'default'}, tax_entry_method=${tax_entry_method}`)

    if (!freee_invoice_id || !company_id) {
      console.error(`❌ Missing freee information: freee_id=${freee_invoice_id}, company_id=${company_id}`)
      return res.status(400).json({ error: 'Invoice missing freee information' })
    }

    console.log(`📥 Calling downloadInvoicePdf with company_id=${company_id}, invoice_id=${freee_invoice_id}, memo=${memo ? 'present' : 'none'}, payment_info=${payment_bank_info ? 'custom' : 'default'}, tax_entry_method=${tax_entry_method}`)

    const pdfBuffer = await downloadInvoicePdf(Number(company_id), Number(freee_invoice_id), due_date, memo, payment_bank_info, tax_entry_method, line_items || undefined, {
      partner_name,
      invoice_number,
      billing_date: invoice_date || undefined,  // due_date와 동일하게 pg 원본값 전달 (generateInvoicePdf가 포맷) — toISOString 변환은 타임존 하루 밀림 위험
      total_amount: total_amount != null ? Number(total_amount) : undefined,
      amount_tax: tax_amount != null ? Number(tax_amount) : undefined,
    })
    
    if (!pdfBuffer || pdfBuffer.length === 0) {
      console.error(`❌ PDF buffer is empty`)
      return res.status(500).json({ error: 'PDF download returned empty data' })
    }

    console.log(`✅ PDF downloaded successfully: ${pdfBuffer.length} bytes`)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${freee_invoice_id}.pdf"`)
    res.send(pdfBuffer)
  } catch (error: any) {
    console.error('❌ Error downloading PDF:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    if (error.message?.includes('No valid access token')) {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' })
    }

    if (error.message?.includes('FREEE_REAUTH_REQUIRED')) {
      return res.status(401).json({ error: 'freee re-authentication required. Please authenticate again.' })
    }

    // freeeClient가 실제로 던지는 문자열: "Failed to fetch invoice: <status>"
    const fetchMatch = error.message?.match(/Failed to fetch invoice: (\d+)/)
    if (fetchMatch) {
      const status = parseInt(fetchMatch[1], 10)
      return res.status(status).json({ error: error.message })
    }

    res.status(500).json({ error: error.message || 'Failed to download PDF' })
  }
})

export default router

