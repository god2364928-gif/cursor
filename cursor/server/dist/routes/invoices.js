"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const freeeClient_1 = require("../integrations/freeeClient");
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
        const authenticated = (0, freeeClient_1.isAuthenticated)();
        res.json({ authenticated });
    }
    catch (error) {
        console.error('Error checking auth status:', error);
        res.status(500).json({ error: 'Failed to check authentication status' });
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
 * 청구서 생성
 */
router.post('/create', auth_1.authMiddleware, async (req, res) => {
    try {
        const { company_id, partner_name, partner_zipcode, partner_address, invoice_date, due_date, line_items, } = req.body;
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
            partner_name,
            partner_zipcode,
            partner_address,
            invoice_date,
            due_date,
            invoice_contents: line_items.map((item) => ({
                name: item.name,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                tax: Number(item.tax || 0),
            })),
        };
        const result = await (0, freeeClient_1.createInvoice)(invoiceData);
        console.log(`✅ Invoice created: ID=${result.invoice?.id}, partner=${partner_name}`);
        res.json({
            success: true,
            invoice_id: result.invoice?.id,
            invoice: result.invoice,
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
        const { company_id } = req.query;
        if (!company_id) {
            return res.status(400).json({ error: 'company_id is required' });
        }
        const pdfBuffer = await (0, freeeClient_1.downloadInvoicePdf)(Number(company_id), Number(id));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${id}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('Error downloading PDF:', error);
        if (error.message?.includes('No valid access token')) {
            return res.status(401).json({ error: 'Not authenticated. Please authenticate first.' });
        }
        res.status(500).json({ error: error.message || 'Failed to download PDF' });
    }
});
exports.default = router;
//# sourceMappingURL=invoices.js.map