"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const puppeteer_1 = __importDefault(require("puppeteer"));
/**
 * 청구서 HTML 생성 (freee 스타일 완전 동일)
 */
function generateInvoiceHtml(data) {
    const emptyRows = Math.max(0, 8 - data.lines.length);
    const emptyRowsHtml = Array(emptyRows)
        .fill('<tr><td style="height: 22px;">&nbsp;</td><td></td><td></td><td></td></tr>')
        .join('');
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
      margin: 15mm 20mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: "Noto Sans JP", sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    .container {
      width: 100%;
    }
    .title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin: 10px 0 20px 0;
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
      font-size: 8pt;
      line-height: 1.5;
    }
    .partner-name {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .company-info {
      margin-top: 10px;
    }
    .greeting {
      margin: 15px 0;
      font-size: 9pt;
    }
    
    /* 건명 + 금액 박스 */
    .info-section {
      display: flex;
      gap: 15px;
      margin: 15px 0;
    }
    .subject-box {
      flex: 1;
      border: 1px solid #000;
    }
    .subject-header {
      padding: 5px 10px;
      font-weight: bold;
      border-bottom: 1px solid #000;
      background-color: #f5f5f5;
    }
    .subject-content {
      padding: 8px 10px;
      min-height: 30px;
    }
    .amount-table {
      width: 200px;
      border: 1px solid #000;
      border-collapse: collapse;
    }
    .amount-table td {
      padding: 5px 10px;
      border: 1px solid #000;
    }
    .amount-table .label {
      width: 80px;
      background-color: #f5f5f5;
    }
    .amount-table .value {
      text-align: right;
      width: 120px;
    }
    .amount-table .total-row {
      font-weight: bold;
    }
    
    /* 입금기일 + 진금처 */
    .payment-section {
      display: flex;
      gap: 15px;
      margin: 15px 0;
    }
    .payment-box {
      flex: 1;
      border: 1px solid #000;
    }
    .payment-header {
      padding: 5px 10px;
      font-weight: bold;
      border-bottom: 1px solid #000;
      background-color: #f5f5f5;
    }
    .payment-content {
      padding: 8px 10px;
      min-height: 30px;
      font-size: 8pt;
      line-height: 1.5;
    }
    
    /* 품목 테이블 */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 8pt;
    }
    table.items th,
    table.items td {
      border: 1px solid #000;
      padding: 5px 8px;
      text-align: left;
    }
    table.items th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    table.items .col-item {
      width: 50%;
    }
    table.items .col-qty {
      width: 12%;
      text-align: center;
    }
    table.items .col-price {
      width: 18%;
      text-align: right;
    }
    table.items .col-amount {
      width: 20%;
      text-align: right;
    }
    table.items .total-row {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    table.items .total-row td {
      text-align: right;
    }
    
    /* 비고 */
    .remarks {
      margin: 15px 0;
    }
    .remarks-header {
      padding: 5px 10px;
      font-weight: bold;
      border: 1px solid #000;
      border-bottom: none;
      background-color: #f5f5f5;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 50px;
      padding: 8px 10px;
    }
    
    .page-number {
      text-align: center;
      margin-top: 15px;
      font-size: 8pt;
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
          <div style="font-weight: bold; margin-top: 10px;">${data.company_name}</div>
          <div>${data.company_address.replace(/\n/g, '<br>')}</div>
          ${data.invoice_registration_number
        ? `<div style="margin-top: 5px;">登録番号: ${data.invoice_registration_number}</div>`
        : ''}
        </div>
      </div>
    </div>

    <div class="greeting">下記の通りご請求申し上げます。</div>

    <div class="info-section">
      <div class="subject-box">
        <div class="subject-header">件名</div>
        <div class="subject-content">COCOマーケご利用料</div>
      </div>
      <table class="amount-table">
        <tr>
          <td class="label">小計</td>
          <td class="value">¥${data.amount_excluding_tax.toLocaleString()}</td>
        </tr>
        <tr>
          <td class="label">消費税</td>
          <td class="value">¥${data.amount_tax.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td class="label">合計</td>
          <td class="value">¥${data.total_amount.toLocaleString()}</td>
        </tr>
      </table>
    </div>

    <div class="payment-section">
      <div class="payment-box">
        <div class="payment-header">入金期日</div>
        <div class="payment-content">${data.due_date || ''}</div>
      </div>
      ${data.payment_bank_info
        ? `
      <div class="payment-box">
        <div class="payment-header">振込先</div>
        <div class="payment-content">${data.payment_bank_info.replace(/\n/g, '<br>')}</div>
      </div>
      `
        : ''}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th class="col-item">品目</th>
          <th class="col-qty">数量</th>
          <th class="col-price">単価</th>
          <th class="col-amount">税抜金額</th>
        </tr>
      </thead>
      <tbody>
        ${data.lines
        .map((line) => `
        <tr>
          <td class="col-item">${line.description}</td>
          <td class="col-qty">${line.quantity}</td>
          <td class="col-price">¥${line.unit_price.toLocaleString()}</td>
          <td class="col-amount">¥${(line.quantity * line.unit_price).toLocaleString()}</td>
        </tr>
        `)
        .join('')}
        ${emptyRowsHtml}
        <tr class="total-row">
          <td colspan="3">小計（税抜金額）</td>
          <td class="col-amount">¥${data.amount_excluding_tax.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
          <td colspan="3">消費税</td>
          <td class="col-amount">¥${data.amount_tax.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div class="remarks">
      <div class="remarks-header">備考</div>
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
                top: '15mm',
                right: '20mm',
                bottom: '15mm',
                left: '20mm',
            },
        });
        return Buffer.from(pdfBuffer);
    }
    finally {
        await browser.close();
    }
}
//# sourceMappingURL=pdfGenerator.js.map