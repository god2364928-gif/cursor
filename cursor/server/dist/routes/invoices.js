"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const freeeClient_1 = require("../integrations/freeeClient");
const db_1 = require("../db");
const router = (0, express_1.Router)();
/**
 * OAuth 인증 URL 반환
 */
router.get('/auth-url', auth_1.authMiddleware, async (req, res) => {
    try {
        const authUrl = (0, freeeClient_1.getAuthorizationUrl)();
        res.json({ authUrl });
    }
    catch (error) {
        console.error('Error generating auth URL:', error);
        res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
});
/**
 * OAuth 콜백 - 인증 코드를 토큰으로 교환
 */
router.post('/auth-callback', auth_1.authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
        }
        const result = await (0, freeeClient_1.exchangeCodeForToken)(code);
        if (!result.success) {
            return res.status(400).json({ error: result.error || 'Token exchange failed' });
        }
        res.json({ success: true, message: 'Authentication successful' });
    }
    catch (error) {
        console.error('Error in auth callback:', error);
        res.status(500).json({ error: 'Failed to exchange authorization code' });
    }
});
/**
 * 인증 상태 확인
 */
router.get('/auth-status', auth_1.authMiddleware, async (req, res) => {
    try {
        const authenticated = await (0, freeeClient_1.isAuthenticated)();
        res.json({ authenticated });
    }
    catch (error) {
        console.error('Error checking auth status:', error);
        res.status(500).json({ error: 'Failed to check authentication status' });
    }
});
/**
 * OAuth 토큰 삭제 (재인증용)
 */
router.post('/reset-auth', auth_1.authMiddleware, async (req, res) => {
    try {
        await db_1.pool.query('DELETE FROM freee_tokens');
        (0, freeeClient_1.clearTokenCache)(); // 캐시도 초기화
        console.log('🗑️ freee tokens deleted and cache cleared - ready for re-authentication');
        res.json({ success: true, message: 'Authentication reset. Please authenticate again.' });
    }
    catch (error) {
        console.error('Error resetting auth:', error);
        res.status(500).json({ error: 'Failed to reset authentication' });
    }
});
/**
 * 사업소 목록 조회
 */
router.get('/companies', auth_1.authMiddleware, async (req, res) => {
    try {
        const companies = await (0, freeeClient_1.getCompanies)();
        res.json(companies);
    }
    catch (error) {
        console.error('Error fetching companies:', error);
        if (error.message?.includes('No valid access token')) {
            return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
        }
        res.status(500).json({ error: 'Failed to fetch companies' });
    }
});
/**
 * 거래처 목록 조회
 */
router.get('/partners', auth_1.authMiddleware, async (req, res) => {
    try {
        const { company_id, keyword } = req.query;
        if (!company_id) {
            return res.status(400).json({ error: 'company_id is required' });
        }
        const partners = await (0, freeeClient_1.getPartners)(Number(company_id), keyword);
        res.json(partners);
    }
    catch (error) {
        console.error('Error fetching partners:', error);
        if (error.message?.includes('No valid access token')) {
            return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
        }
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});
/**
 * 거래처 생성
 */
router.post('/partners', auth_1.authMiddleware, async (req, res) => {
    try {
        const { company_id, partner_name } = req.body;
        if (!company_id || !partner_name) {
            return res.status(400).json({ error: 'company_id and partner_name are required' });
        }
        const partner = await (0, freeeClient_1.createPartner)(Number(company_id), partner_name);
        res.json(partner);
    }
    catch (error) {
        console.error('Error creating partner:', error);
        if (error.message?.includes('No valid access token')) {
            return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
        }
        res.status(500).json({ error: 'Failed to create partner' });
    }
});
/**
 * 청구서 발급 내역 목록 조회 (CRM에서 발급한 것만)
 */
router.get('/list', auth_1.authMiddleware, async (req, res) => {
    try {
        const result = await db_1.pool.query(`
      SELECT 
        i.id,
        i.freee_invoice_id,
        i.company_id as freee_company_id,
        i.partner_name,
        i.invoice_date,
        i.due_date,
        i.total_amount,
        i.tax_amount,
        i.user_id as issued_by_user_id,
        u.name as issued_by_user_name,
        i.receipt_id,
        i.created_at
      FROM invoices i
      LEFT JOIN users u ON i.user_id = u.id
      ORDER BY i.created_at DESC
    `);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching invoices:', error);
        res.status(500).json({ error: 'Failed to fetch invoices' });
    }
});
/**
 * 청구서 생성
 */
router.post('/create', auth_1.authMiddleware, async (req, res) => {
    try {
        const { company_id, partner_id, // 추가: 선택된 거래처 ID
        partner_name, partner_title, invoice_title, invoice_date, due_date, tax_entry_method, line_items, payment_bank_info, } = req.body;
        // 입력 유효성 검사
        if (!company_id || !partner_name || !invoice_date || !due_date || !line_items || line_items.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (line_items.length > 5) {
            return res.status(400).json({ error: 'Maximum 5 line items allowed' });
        }
        // freee API 형식으로 변환
        const invoiceData = {
            company_id: Number(company_id),
            partner_id: partner_id ? Number(partner_id) : undefined, // 추가: 거래처 ID
            partner_name,
            partner_title,
            invoice_title,
            invoice_date,
            due_date,
            tax_entry_method,
            payment_bank_info,
            invoice_contents: line_items.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                tax_rate: Number(item.tax_rate || 10), // 추가: 세율
                tax: Number(item.tax || 0),
            })),
        };
        const result = await (0, freeeClient_1.createInvoice)(invoiceData);
        if (!result.success || !result.invoice) {
            throw new Error('Failed to create invoice in freee');
        }
        const invoiceId = result.invoice.id;
        const totalAmount = result.invoice.total_amount || 0;
        const taxAmount = result.invoice.amount_tax || 0; // freee請求書 API는 amount_tax 사용
        // 사용자 정보 조회
        const userResult = await db_1.pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
        const userName = userResult.rows[0]?.name || '알 수 없음';
        // DB에 청구서 정보 저장
        const insertResult = await db_1.pool.query(`INSERT INTO invoices (
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
        tax_entry_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`, [
            req.user.id,
            company_id,
            partner_id,
            partner_name + (partner_title || ''),
            result.invoice.invoice_number || invoiceId,
            invoiceId,
            invoice_date,
            due_date,
            totalAmount,
            taxAmount,
            tax_entry_method || 'exclusive',
        ]);
        const dbInvoiceId = insertResult.rows[0].id;
        console.log(`✅ Invoice created: freee_id=${invoiceId}, db_id=${dbInvoiceId}, partner=${partner_name}, user=${userName}`);
        res.json({
            success: true,
            invoice_id: invoiceId,
            invoice: result.invoice,
            db_id: dbInvoiceId,
        });
    }
    catch (error) {
        console.error('Error creating invoice:', error);
        if (error.message?.includes('No valid access token')) {
            return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
        }
        res.status(500).json({ error: error.message || 'Failed to create invoice' });
    }
});
/**
 * 청구서 PDF 다운로드
 */
router.get('/:id/pdf', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // DB에서 청구서 조회하여 freee_invoice_id와 company_id 가져오기
        const result = await db_1.pool.query('SELECT freee_invoice_id, company_id FROM invoices WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        const { freee_invoice_id, company_id } = result.rows[0];
        if (!freee_invoice_id || !company_id) {
            return res.status(400).json({ error: 'Invoice missing freee information' });
        }
        console.log(`📥 Downloading PDF for invoice ${id}, freee_id: ${freee_invoice_id}, company_id: ${company_id}`);
        const pdfBuffer = await (0, freeeClient_1.downloadInvoicePdf)(Number(company_id), Number(freee_invoice_id));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${freee_invoice_id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('❌ Error downloading PDF:', error);
        if (error.message?.includes('No valid access token')) {
            return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
        }
        res.status(500).json({ error: error.message || 'Failed to download PDF' });
    }
});
exports.default = router;
//# sourceMappingURL=invoices.js.map