"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const pdfGenerator_1 = require("../utils/pdfGenerator");
const router = (0, express_1.Router)();
/**
 * POST /api/receipts/from-invoice - 청구서 기반 영수증 생성 (freee 독립, 자체 PDF)
 */
router.post('/from-invoice', auth_1.authMiddleware, async (req, res) => {
    const userId = req.user?.id;
    try {
        let { invoice_id, issue_date } = req.body;
        if (!invoice_id || !issue_date) {
            return res.status(400).json({
                message: 'Missing required fields: invoice_id, issue_date',
            });
        }
        // 날짜 형식 정리 (YYYY-MM-DD만 추출)
        if (issue_date.includes('T')) {
            issue_date = issue_date.split('T')[0];
        }
        console.log(`📝 [USER ${userId}] Creating receipt from invoice ${invoice_id}...`);
        console.log(`📅 Issue date: ${issue_date}`);
        // 청구서 조회
        const invoiceQuery = await db_1.pool.query('SELECT * FROM invoices WHERE id = $1', [invoice_id]);
        if (invoiceQuery.rows.length === 0) {
            return res.status(404).json({ message: 'Invoice not found' });
        }
        const invoice = invoiceQuery.rows[0];
        // 이미 영수증이 발급되었는지 확인
        const existingReceipt = await db_1.pool.query('SELECT id FROM receipts WHERE invoice_id = $1', [invoice_id]);
        if (existingReceipt.rows.length > 0) {
            return res.status(400).json({
                message: 'Receipt already exists for this invoice',
                receipt_id: existingReceipt.rows[0].id
            });
        }
        // 영수증 번호 생성 (YYYYMMDDHHmm 형식, 한국시간 KST)
        const now = new Date();
        const kstOffset = 9 * 60;
        const kstTime = new Date(now.getTime() + kstOffset * 60 * 1000);
        const receiptNumber = kstTime.toISOString().replace(/[-:T]/g, '').slice(0, 12);
        console.log(`📋 Generated receipt number: ${receiptNumber}`);
        // 영수증 PDF 생성
        console.log(`📄 Generating receipt PDF...`);
        const pdfBuffer = await (0, pdfGenerator_1.generateReceiptPdf)({
            receipt_number: receiptNumber,
            partner_name: invoice.partner_name,
            issue_date: issue_date,
            company_name: '株式会社ホットセラー',
            company_address: '〒1040053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
            total_amount: invoice.total_amount,
            amount_tax: invoice.tax_amount,
            amount_excluding_tax: invoice.total_amount - invoice.tax_amount,
            lines: [
                {
                    description: 'アカウント管理',
                    quantity: 1,
                    unit_price: invoice.tax_entry_method === 'inclusive'
                        ? invoice.total_amount
                        : invoice.total_amount - invoice.tax_amount,
                },
                {
                    description: 'クーポン利用済み',
                    quantity: 0,
                    unit_price: 0,
                }
            ],
            invoice_registration_number: 'T5013301050765',
        });
        console.log(`✅ Receipt PDF generated: ${pdfBuffer.length} bytes`);
        // DB에 영수증 정보 저장
        const insertQuery = `
      INSERT INTO receipts (
        user_id, company_id, partner_id, partner_name,
        receipt_number, receipt_date, issue_date,
        total_amount, tax_amount, tax_entry_method, invoice_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
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
        ];
        const insertResult = await db_1.pool.query(insertQuery, values);
        // 청구서 테이블에 영수증 ID 업데이트
        await db_1.pool.query('UPDATE invoices SET receipt_id = $1 WHERE id = $2', [insertResult.rows[0].id, invoice_id]);
        console.log(`✅ Receipt created: db_id=${insertResult.rows[0].id}`);
        // PDF를 바로 반환
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt_${receiptNumber}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('❌ Error creating receipt from invoice:', error);
        res.status(500).json({ message: 'Error creating receipt', error: error.message });
    }
});
/**
 * GET /api/receipts - 영수증 목록 조회
 */
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const query = `
      SELECT r.*, u.name as user_name
      FROM receipts r
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
    `;
        const result = await db_1.pool.query(query);
        res.json(result.rows);
    }
    catch (error) {
        console.error('❌ Error fetching receipts:', error);
        res.status(500).json({ message: 'Error fetching receipts', error: error.message });
    }
});
/**
 * GET /api/receipts/:id/pdf - 영수증 PDF 재생성 및 다운로드
 */
router.get('/:id/pdf', auth_1.authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        // DB에서 영수증 조회
        const result = await db_1.pool.query('SELECT * FROM receipts WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Receipt not found' });
        }
        const receipt = result.rows[0];
        console.log(`📥 Regenerating receipt PDF: ${receipt.receipt_number}`);
        // PDF 재생성
        const pdfBuffer = await (0, pdfGenerator_1.generateReceiptPdf)({
            receipt_number: receipt.receipt_number,
            partner_name: receipt.partner_name,
            issue_date: receipt.issue_date,
            company_name: '株式会社ホットセラー',
            company_address: '〒1040053\n東京都中央区晴海一丁目8番10号\n晴海アイランドトリトンスクエア\nオフィスタワーX棟8階',
            total_amount: receipt.total_amount,
            amount_tax: receipt.tax_amount,
            amount_excluding_tax: receipt.total_amount - receipt.tax_amount,
            lines: [
                {
                    description: 'アカウント管理',
                    quantity: 1,
                    unit_price: receipt.tax_entry_method === 'inclusive'
                        ? receipt.total_amount
                        : receipt.total_amount - receipt.tax_amount,
                },
                {
                    description: 'クーポン利用済み',
                    quantity: 0,
                    unit_price: 0,
                }
            ],
            invoice_registration_number: 'T5013301050765',
        });
        // PDF 파일로 응답
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt_${receipt.receipt_number}.pdf"`);
        res.send(pdfBuffer);
    }
    catch (error) {
        console.error('❌ Error downloading receipt PDF:', error);
        res.status(500).json({ message: 'Error downloading receipt PDF', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=receipts.js.map