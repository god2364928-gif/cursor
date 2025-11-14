"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
/**
 * 청구서 PDF 생성
 */
function generateInvoicePdf(invoiceData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 50,
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            // 제목
            doc.fontSize(20).text('請求書', { align: 'center' });
            doc.moveDown();
            // 청구서 번호
            doc.fontSize(10).text(`請求書番号: ${invoiceData.invoice_number}`, { align: 'right' });
            doc.text(`発行日: ${invoiceData.billing_date}`, { align: 'right' });
            if (invoiceData.due_date) {
                doc.text(`支払期限: ${invoiceData.due_date}`, { align: 'right' });
            }
            doc.moveDown();
            // 宛先
            doc.fontSize(14).text(`${invoiceData.partner_name} ${invoiceData.partner_title}`);
            doc.moveDown();
            // 請求金額
            doc.fontSize(12).text('下記の通りご請求申し上げます。');
            doc.moveDown();
            doc.fontSize(16).text(`ご請求金額: ¥${invoiceData.total_amount.toLocaleString()}`, {
                align: 'center',
            });
            doc.moveDown(2);
            // 明細表
            const tableTop = doc.y;
            const col1X = 50;
            const col2X = 250;
            const col3X = 350;
            const col4X = 450;
            // ヘッダー
            doc.fontSize(10);
            doc.text('品目', col1X, tableTop);
            doc.text('数量', col2X, tableTop);
            doc.text('単価', col3X, tableTop);
            doc.text('金額', col4X, tableTop);
            doc.moveTo(col1X, tableTop + 15).lineTo(550, tableTop + 15).stroke();
            let currentY = tableTop + 25;
            // 明細行
            invoiceData.lines.forEach((line) => {
                const amount = line.quantity * line.unit_price;
                doc.text(line.description, col1X, currentY, { width: 180 });
                doc.text(line.quantity.toString(), col2X, currentY);
                doc.text(`¥${line.unit_price.toLocaleString()}`, col3X, currentY);
                doc.text(`¥${amount.toLocaleString()}`, col4X, currentY);
                currentY += 25;
            });
            doc.moveTo(col1X, currentY).lineTo(550, currentY).stroke();
            currentY += 10;
            // 小計・税・合計
            doc.text('小計', col3X, currentY);
            doc.text(`¥${invoiceData.amount_excluding_tax.toLocaleString()}`, col4X, currentY);
            currentY += 20;
            doc.text('消費税', col3X, currentY);
            doc.text(`¥${invoiceData.amount_tax.toLocaleString()}`, col4X, currentY);
            currentY += 20;
            doc.moveTo(col3X, currentY).lineTo(550, currentY).stroke();
            currentY += 10;
            doc.fontSize(12).text('合計', col3X, currentY);
            doc.text(`¥${invoiceData.total_amount.toLocaleString()}`, col4X, currentY);
            doc.moveDown(3);
            // 発行元情報
            doc.fontSize(10);
            doc.text(invoiceData.company_name);
            doc.text(invoiceData.company_address);
            if (invoiceData.payment_bank_info) {
                doc.moveDown();
                doc.text('振込先');
                doc.fontSize(9).text(invoiceData.payment_bank_info);
            }
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
}
//# sourceMappingURL=pdfGenerator.js.map