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
        fi.id,
        fi.freee_invoice_id,
        fi.freee_company_id,
        fi.partner_name,
        fi.partner_zipcode,
        fi.partner_address,
        fi.invoice_date,
        fi.due_date,
        fi.total_amount,
        fi.tax_amount,
        fi.issued_by_user_id,
        fi.issued_by_user_name,
        fi.created_at,
        json_agg(
          json_build_object(
            'id', fii.id,
            'item_name', fii.item_name,
            'quantity', fii.quantity,
            'unit_price', fii.unit_price,
            'tax', fii.tax
          ) ORDER BY fii.id
        ) as items
      FROM freee_invoices fi
      LEFT JOIN freee_invoice_items fii ON fi.id = fii.invoice_id
      GROUP BY fi.id
      ORDER BY fi.created_at DESC
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
    } = req.body

    // 입력 유효성 검사
    if (!company_id || !partner_name || !invoice_date || !due_date || !line_items || line_items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (line_items.length > 5) {
      return res.status(400).json({ error: 'Maximum 5 line items allowed' })
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
      invoice_contents: line_items.map((item: any) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        tax: Number(item.tax || 0),
      })),
    }

    const result = await createInvoice(invoiceData)
    
    if (!result.success || !result.invoice) {
      throw new Error('Failed to create invoice in freee')
    }

    const invoiceId = result.invoice.id
    const totalAmount = result.invoice.total_amount || 0
    const taxAmount = result.invoice.tax_entry_total || 0

    // 사용자 정보 조회
    const userResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [req.user!.id]
    )
    const userName = userResult.rows[0]?.name || '알 수 없음'

    // DB에 청구서 정보 저장 (우편번호/주소 필드 제거)
    const insertResult = await pool.query(
      `INSERT INTO freee_invoices (
        freee_invoice_id, 
        freee_company_id, 
        partner_name, 
        invoice_date, 
        due_date, 
        total_amount, 
        tax_amount, 
        issued_by_user_id, 
        issued_by_user_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        invoiceId,
        company_id,
        partner_name + (partner_title || ''),
        invoice_date,
        due_date,
        totalAmount,
        taxAmount,
        req.user!.id,
        userName,
      ]
    )

    const dbInvoiceId = insertResult.rows[0].id

    // 청구서 품목 저장
    for (const item of line_items) {
      await pool.query(
        `INSERT INTO freee_invoice_items (
          invoice_id, 
          item_name, 
          quantity, 
          unit_price, 
          tax
        ) VALUES ($1, $2, $3, $4, $5)`,
        [dbInvoiceId, item.name, item.quantity, item.unit_price, item.tax || 0]
      )
    }
    
    console.log(`✅ Invoice created: ID=${invoiceId}, partner=${partner_name}, user=${userName}`)
    
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
 * 청구서 PDF 다운로드
 */
router.get('/:id/pdf', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { company_id } = req.query

    if (!company_id) {
      return res.status(400).json({ error: 'company_id is required' })
    }

    const pdfBuffer = await downloadInvoicePdf(Number(company_id), Number(id))
    
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${id}.pdf"`)
    res.send(pdfBuffer)
  } catch (error: any) {
    console.error('Error downloading PDF:', error)
    
    if (error.message?.includes('No valid access token')) {
      return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' })
    }
    
    res.status(500).json({ error: error.message || 'Failed to download PDF' })
  }
})

export default router

