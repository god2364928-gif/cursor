"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
exports.generateReceiptPdf = generateReceiptPdf;
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
/**
 * 영수증 HTML 생성 (청구서와 동일한 스타일)
 */
function generateReceiptHtml(data) {
    // 날짜 포맷팅 함수
    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        catch {
            return dateStr;
        }
    };
    const emptyRows = Math.max(0, 10 - data.lines.length);
    const emptyRowsHtml = Array(emptyRows)
        .fill('<tr><td style="height: 18px;">&nbsp;</td><td></td><td></td><td></td></tr>')
        .join('');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
      font-size: 10pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
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
      margin-bottom: 18px;
    }
    .partner-name {
      font-size: 12pt;
      font-weight: bold;
    }
    .header-right {
      text-align: right;
      font-size: 9pt;
      line-height: 1.6;
    }
    .header-right-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 3px 0;
    }
    .header-right-label {
      text-align: left;
      font-size: 8pt;
    }
    .header-right-value {
      text-align: right;
      font-size: 9pt;
    }
    .company-info {
      margin-top: 20px;
      font-size: 9pt;
      text-align: left;
    }
    .subject-line {
      margin: 8px 0;
      font-size: 9pt;
    }
    
    /* 금액 테이블 */
    table.amount-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9pt;
    }
    table.amount-table td {
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
    }
    table.amount-table .label {
      background-color: #f5f5f5;
      font-weight: normal;
    }
    table.amount-table .total-label {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    table.amount-table .total-value {
      font-size: 13pt;
      font-weight: bold;
    }
    
    /* 품목 테이블 */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8pt;
    }
    table.items th,
    table.items td {
      border: 1px solid #000;
      padding: 6px 8px;
    }
    table.items th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    table.items .col-item {
      width: 50%;
      text-align: left;
    }
    table.items .col-qty {
      width: 15%;
      text-align: center;
    }
    table.items .col-price {
      width: 15%;
      text-align: right;
    }
    table.items .col-amount {
      width: 20%;
      text-align: right;
    }
    
    /* 내역 박스 */
    .summary-box {
      float: right;
      width: 280px;
      border: 1px solid #000;
      margin: 10px 0;
      font-size: 8pt;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #000;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-row .label {
      font-weight: normal;
    }
    .summary-row .value {
      text-align: right;
    }
    
    /* 비고 */
    .remarks {
      clear: both;
      margin: 15px 0;
    }
    .remarks-header {
      padding: 6px 10px;
      font-weight: bold;
      border: 1px solid #000;
      border-bottom: none;
      background-color: #f5f5f5;
      font-size: 9pt;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 50px;
      padding: 8px 10px;
    }
    
    .page-number {
      text-align: center;
      margin-top: 12px;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <div class="title">領収書</div>
  
  <div class="header">
    <div class="partner-name">${data.partner_name}</div>
    <div class="header-right">
      <div class="header-right-row">
        <span class="header-right-label">領収日</span>
        <span class="header-right-value">${formatDate(data.issue_date)}</span>
      </div>
      <div class="header-right-row">
        <span class="header-right-label">領収書番号</span>
        <span class="header-right-value">${data.receipt_number}</span>
      </div>
      <div class="header-right-row">
        <span class="header-right-label">登録番号</span>
        <span class="header-right-value">${data.invoice_registration_number || 'T5013301050765'}</span>
      </div>
      <div class="company-info">
        <div style="font-weight: bold; margin-top: 20px;">${data.company_name}</div>
        <div style="margin-top: 10px;">${data.company_address.replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  </div>

  <div class="subject-line">
    <strong>件名</strong>　　COCOマーケご利用料
  </div>

  <table class="amount-table">
    <tr>
      <td class="label" style="width: 25%;">小計</td>
      <td class="label" style="width: 25%;">消費税</td>
      <td class="total-label" style="width: 50%;">合計金額</td>
    </tr>
    <tr>
      <td>${data.amount_excluding_tax.toLocaleString()}円</td>
      <td>${data.amount_tax.toLocaleString()}円</td>
      <td class="total-value">${data.total_amount.toLocaleString()}円</td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th class="col-item">摘要</th>
        <th class="col-qty">数量</th>
        <th class="col-price">単価</th>
        <th class="col-amount">明細金額</th>
      </tr>
    </thead>
    <tbody>
      ${data.lines
        .map((line) => `
      <tr>
        <td class="col-item">${line.description}</td>
        <td class="col-qty">${line.quantity}</td>
        <td class="col-price">${line.unit_price.toLocaleString()}</td>
        <td class="col-amount">${(line.quantity * line.unit_price).toLocaleString()}</td>
      </tr>
      `)
        .join('')}
      ${emptyRowsHtml}
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-row">
      <span class="label">内訳　　10%対象(税抜)</span>
      <span class="value">${data.amount_excluding_tax.toLocaleString()}円</span>
    </div>
    <div class="summary-row">
      <span class="label">　　　　10%消費税</span>
      <span class="value">${data.amount_tax.toLocaleString()}円</span>
    </div>
  </div>

  <div class="remarks">
    <div class="remarks-header">備考</div>
    <div class="remarks-box">${data.memo ? data.memo.replace(/\n/g, '<br>') : ''}</div>
  </div>

  <div class="page-number">1 / 1</div>
</body>
</html>
  `;
}
/**
 * 청구서 HTML 생성 (freee 스타일 완전 동일)
 */
function generateInvoiceHtml(data) {
    // 날짜 포맷팅 함수
    const formatDate = (dateStr) => {
        if (!dateStr)
            return '';
        try {
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        catch {
            return dateStr;
        }
    };
    // 내세/외세 모드 확인
    const isInclusive = data.tax_entry_method === 'inclusive';
    // 세율별 금액 계산
    const taxRateGroups = {};
    data.lines.forEach((line) => {
        const lineSubtotal = line.quantity * line.unit_price;
        const taxRate = line.tax_rate || 10; // 기본값 10%
        let lineTax;
        let lineTaxExcluding;
        if (isInclusive) {
            // 내세: 입력 금액에서 세금을 역산 (세금 포함 가격 / 1.1 * 0.1)
            lineTax = Math.floor(lineSubtotal * taxRate / (100 + taxRate));
            lineTaxExcluding = lineSubtotal - lineTax;
        }
        else {
            // 외세: 세금을 별도 계산
            lineTax = Math.floor(lineSubtotal * taxRate / 100);
            lineTaxExcluding = lineSubtotal;
        }
        if (!taxRateGroups[taxRate]) {
            taxRateGroups[taxRate] = { subtotal: 0, tax: 0, taxExcluding: 0 };
        }
        taxRateGroups[taxRate].subtotal += lineSubtotal;
        taxRateGroups[taxRate].tax += lineTax;
        taxRateGroups[taxRate].taxExcluding += lineTaxExcluding;
    });
    // 총 금액 계산
    const calculatedSubtotal = Object.values(taxRateGroups).reduce((sum, g) => sum + g.subtotal, 0);
    const calculatedTax = Object.values(taxRateGroups).reduce((sum, g) => sum + g.tax, 0);
    const calculatedTaxExcluding = Object.values(taxRateGroups).reduce((sum, g) => sum + g.taxExcluding, 0);
    // 내세: 합계 = 소계 (세금 이미 포함), 외세: 합계 = 소계 + 세금
    const calculatedTotal = isInclusive ? calculatedSubtotal : calculatedSubtotal + calculatedTax;
    // 세율별 내역 HTML 생성 (10%, 8% 순서)
    const taxRates = Object.keys(taxRateGroups).map(Number).sort((a, b) => b - a); // 내림차순
    const summaryRowsHtml = taxRates.map((rate, index) => {
        const group = taxRateGroups[rate];
        const prefix = index === 0 ? '内訳　　' : '　　　　';
        // 내세: taxExcluding (세전 금액) 표시, 외세: subtotal (세전 금액) 표시
        const displaySubtotal = isInclusive ? group.taxExcluding : group.subtotal;
        return `
    <div class="summary-row">
      <span class="label">${prefix}${rate}%対象(税抜)</span>
      <span class="value">${displaySubtotal.toLocaleString()}円</span>
    </div>
    <div class="summary-row">
      <span class="label">　　　　${rate}%消費税</span>
      <span class="value">${group.tax.toLocaleString()}円</span>
    </div>`;
    }).join('');
    const emptyRows = Math.max(0, 10 - data.lines.length);
    const emptyRowsHtml = Array(emptyRows)
        .fill('<tr><td style="height: 18px;">&nbsp;</td><td></td><td></td><td></td></tr>')
        .join('');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
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
      font-size: 10pt;
      line-height: 1.4;
      margin: 0;
      padding: 0;
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
      margin-bottom: 18px;
    }
    .partner-name {
      font-size: 12pt;
      font-weight: bold;
    }
    .header-right {
      text-align: right;
      font-size: 9pt;
      line-height: 1.6;
    }
    .header-right-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 3px 0;
    }
    .header-right-label {
      text-align: left;
      font-size: 8pt;
    }
    .header-right-value {
      text-align: right;
      font-size: 9pt;
    }
    .company-info {
      margin-top: 20px;
      font-size: 9pt;
      text-align: left;
    }
    .greeting {
      margin: 15px 0 8px 0;
      font-size: 9pt;
    }
    .subject-line {
      margin: 8px 0;
      font-size: 9pt;
    }
    
    /* 금액 테이블 */
    table.amount-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9pt;
    }
    table.amount-table td {
      border: 1px solid #000;
      padding: 6px 10px;
      text-align: center;
    }
    table.amount-table .label {
      background-color: #f5f5f5;
      font-weight: normal;
    }
    table.amount-table .total-label {
      background-color: #f5f5f5;
      font-weight: bold;
    }
    table.amount-table .total-value {
      font-size: 13pt;
      font-weight: bold;
    }
    
    /* 입금 테이블 */
    table.payment-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8pt;
    }
    table.payment-table td {
      border: 1px solid #000;
      padding: 6px 10px;
    }
    table.payment-table .label {
      background-color: #f5f5f5;
      font-weight: normal;
      text-align: center;
    }
    table.payment-table .content {
      line-height: 1.4;
      text-align: left;
    }
    
    /* 품목 테이블 */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 8pt;
    }
    table.items th,
    table.items td {
      border: 1px solid #000;
      padding: 6px 8px;
    }
    table.items th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    table.items .col-item {
      width: 50%;
      text-align: left;
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
    
    /* 내역 박스 */
    .summary-box {
      float: right;
      width: 280px;
      border: 1px solid #000;
      margin: 10px 0;
      font-size: 8pt;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #000;
    }
    .summary-row:last-child {
      border-bottom: none;
    }
    .summary-row .label {
      font-weight: normal;
    }
    .summary-row .value {
      text-align: right;
    }
    
    /* 비고 */
    .remarks {
      clear: both;
      margin: 15px 0;
    }
    .remarks-header {
      padding: 6px 10px;
      font-weight: bold;
      border: 1px solid #000;
      border-bottom: none;
      background-color: #f5f5f5;
      font-size: 9pt;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 50px;
      padding: 8px 10px;
    }
    
    .page-number {
      text-align: center;
      margin-top: 12px;
      font-size: 8pt;
    }
  </style>
</head>
<body>
  <div class="title">請求書</div>
  
  <div class="header">
    <div class="partner-name">${data.partner_name} ${data.partner_title}</div>
    <div class="header-right">
      <div class="header-right-row">
        <span class="header-right-label">請求日</span>
        <span class="header-right-value">${formatDate(data.billing_date)}</span>
      </div>
      <div class="header-right-row">
        <span class="header-right-label">請求書番号</span>
        <span class="header-right-value">${data.invoice_number}</span>
      </div>
      <div class="header-right-row">
        <span class="header-right-label">登録番号</span>
        <span class="header-right-value">${data.invoice_registration_number || 'T5013301050765'}</span>
      </div>
      <div class="company-info">
        <div style="font-weight: bold; margin-top: 20px;">${data.company_name}</div>
        <div style="margin-top: 10px;">${data.company_address.replace(/\n/g, '<br>')}</div>
      </div>
    </div>
  </div>

  <div class="greeting">下記の通りご請求申し上げます。</div>
  
  <div class="subject-line">
    <strong>件名</strong>　　COCOマーケご利用料
  </div>

  <table class="amount-table">
    <tr>
      <td class="label" style="width: 25%;">小計</td>
      <td class="label" style="width: 25%;">消費税</td>
      <td class="total-label" style="width: 50%;">請求金額</td>
    </tr>
    <tr>
      <td>${(isInclusive ? calculatedTaxExcluding : calculatedSubtotal).toLocaleString()}円</td>
      <td>${calculatedTax.toLocaleString()}円</td>
      <td class="total-value">${calculatedTotal.toLocaleString()}円</td>
    </tr>
  </table>

  <table class="payment-table">
    <tr>
      <td class="label" style="width: 12%;">入金期日</td>
      <td class="content" style="width: 38%;">${formatDate(data.due_date) || '&nbsp;'}</td>
      <td class="label" style="width: 12%;">振込先</td>
      <td class="content" style="width: 38%;">${data.payment_bank_info ? data.payment_bank_info.replace(/\n/g, '<br>') : '&nbsp;'}</td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th class="col-item">摘要</th>
        <th class="col-qty">数量</th>
        <th class="col-price">単価</th>
        <th class="col-amount">明細金額</th>
      </tr>
    </thead>
    <tbody>
      ${data.lines
        .map((line) => `
      <tr>
        <td class="col-item">${line.description}</td>
        <td class="col-qty">${line.quantity}</td>
        <td class="col-price">${line.unit_price.toLocaleString()}</td>
        <td class="col-amount">${(line.quantity * line.unit_price).toLocaleString()}</td>
      </tr>
      `)
        .join('')}
      ${emptyRowsHtml}
    </tbody>
  </table>

  <div class="summary-box">
    ${summaryRowsHtml}
  </div>

  <div class="remarks">
    <div class="remarks-header">備考</div>
    <div class="remarks-box">${data.memo ? data.memo.replace(/\n/g, '<br>') : ''}</div>
  </div>

  <div class="page-number">1 / 1</div>
</body>
</html>
  `;
}
/**
 * 청구서 PDF 생성 (Puppeteer 사용)
 */
async function generateInvoicePdf(invoiceData) {
    const html = generateInvoiceHtml(invoiceData);
    const executablePath = await chromium_1.default.executablePath();
    const browser = await puppeteer_core_1.default.launch({
        args: chromium_1.default.args,
        executablePath,
        headless: chromium_1.default.headless,
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
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
/**
 * 영수증 PDF 생성 (Puppeteer 사용)
 */
async function generateReceiptPdf(receiptData) {
    const html = generateReceiptHtml(receiptData);
    const executablePath = await chromium_1.default.executablePath();
    const browser = await puppeteer_core_1.default.launch({
        args: chromium_1.default.args,
        executablePath,
        headless: chromium_1.default.headless,
    });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
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