"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * 청구서 HTML 생성
 */
function generateInvoiceHtml(data) {
    const emptyRows = Math.max(0, 10 - data.lines.length);
    const emptyRowsHtml = Array(emptyRows).fill('<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>').join('');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    body {
      font-family: "Noto Sans JP", sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
    }
    .title {
      text-align: center;
      font-size: 18pt;
      font-weight: bold;
      margin: 20px 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .header-left {
      flex: 1;
    }
    .header-right {
      flex: 1;
      text-align: right;
      font-size: 9pt;
    }
    .partner-name {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .company-info {
      margin-top: 10px;
      line-height: 1.4;
    }
    .greeting {
      margin: 20px 0;
    }
    .subject {
      margin: 10px 0;
    }
    .amount-box {
      border: 1px solid #000;
      padding: 10px;
      width: 200px;
      margin: 20px 0;
    }
    .amount-row {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
    }
    .amount-total {
      font-size: 11pt;
      font-weight: bold;
      border-top: 1px solid #000;
      padding-top: 5px;
      margin-top: 5px;
    }
    .bank-info {
      margin: 20px 0;
      font-size: 9pt;
    }
    .bank-title {
      font-weight: bold;
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #000;
      padding: 8px 5px;
      text-align: left;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
    }
    .col-item { width: 50%; }
    .col-qty { width: 10%; text-align: center; }
    .col-price { width: 20%; text-align: right; }
    .col-amount { width: 20%; text-align: right; }
    .total-row {
      font-weight: bold;
    }
    .remarks {
      margin: 20px 0;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 60px;
      padding: 10px;
    }
    .page-number {
      text-align: center;
      margin-top: 20px;
      font-size: 9pt;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">請求書</div>
    
    <div class="header">
      <div class="header-left">
        <div class="partner-name">${data.partner_name} ${data.partner_title}</div>
      </div>
      <div class="header-right">
        <div>請求日: ${data.billing_date}</div>
        <div>請求書番号: ${data.invoice_number}</div>
        ${data.due_date ? `<div>支払期限: ${data.due_date}</div>` : ''}
        <div class="company-info">
          <div style="font-weight: bold; margin-top: 15px;">${data.company_name}</div>
          <div>${data.company_address.replace(/\n/g, '<br>')}</div>
          ${data.invoice_registration_number ? `<div style="margin-top: 5px;">登録番号: ${data.invoice_registration_number}</div>` : ''}
        </div>
      </div>
    </div>

    <div class="greeting">下記の通りご請求申し上げます。</div>

    <div class="subject">
      <strong>件名:</strong> COCOマーケご利用料
    </div>

    <div class="amount-box">
      <div class="amount-row">
        <span>小計</span>
        <span>¥${data.amount_excluding_tax.toLocaleString()}</span>
      </div>
      <div class="amount-row">
        <span>消費税</span>
        <span>¥${data.amount_tax.toLocaleString()}</span>
      </div>
      <div class="amount-row amount-total">
        <span>合計</span>
        <span>¥${data.total_amount.toLocaleString()}</span>
      </div>
    </div>

    ${data.payment_bank_info ? `
    <div class="bank-info">
      <div class="bank-title">入金先口座</div>
      <div>${data.payment_bank_info.replace(/\n/g, '<br>')}</div>
    </div>
    ` : ''}

    <table>
      <thead>
        <tr>
          <th class="col-item">品目</th>
          <th class="col-qty">数量</th>
          <th class="col-price">単価</th>
          <th class="col-amount">税抜金額</th>
        </tr>
      </thead>
      <tbody>
        ${data.lines.map(line => `
        <tr>
          <td class="col-item">${line.description}</td>
          <td class="col-qty">${line.quantity}</td>
          <td class="col-price">¥${line.unit_price.toLocaleString()}</td>
          <td class="col-amount">¥${(line.quantity * line.unit_price).toLocaleString()}</td>
        </tr>
        `).join('')}
        ${emptyRowsHtml}
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">小計</td>
          <td class="col-amount">¥${data.amount_excluding_tax.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3" style="text-align: right;">消費税</td>
          <td class="col-amount">¥${data.amount_tax.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="remarks">
      <div class="bank-title">備考</div>
      <div class="remarks-box"></div>
    </div>

    <div class="page-number">1 / 1</div>
  </div>
</body>
</html>
  `;
}
/**
 * 청구서 PDF 생성 (Puppeteer 사용)
 */
async function generateInvoicePdf(invoiceData) {
    const html = generateInvoiceHtml(invoiceData);
    const browser = await puppeteer_1.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        // 폰트 로딩 대기
        await page.evaluateHandle('document.fonts.ready');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm',
            },
        });
        return Buffer.from(pdfBuffer);
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=pdfGenerator.js.map