import puppeteer from 'puppeteer'

interface InvoiceData {
  invoice_number: string
  company_name: string
  company_address: string
  partner_name: string
  partner_title: string
  billing_date: string
  due_date?: string
  total_amount: number
  amount_tax: number
  amount_excluding_tax: number
  lines: Array<{
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
  }>
  payment_bank_info?: string
  invoice_registration_number?: string
}

interface ReceiptData {
  receipt_number: string
  partner_name: string
  issue_date: string
  company_name: string
  company_address: string
  total_amount: number
  amount_tax: number
  amount_excluding_tax: number
  lines: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
  invoice_registration_number?: string
}

/**
 * 영수증 HTML 생성 (제공된 이미지와 완전 동일)
 */
function generateReceiptHtml(data: ReceiptData): string {
  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  const emptyRows = Math.max(0, 15 - data.lines.length)
  const emptyRowsHtml = Array(emptyRows)
    .fill('<tr><td style="height: 25px;">&nbsp;</td><td></td><td></td><td></td></tr>')
    .join('')

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
      font-size: 20pt;
      font-weight: bold;
      margin: 20px 0 40px 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    .partner-name {
      font-size: 14pt;
      font-weight: normal;
    }
    .header-right {
      text-align: right;
      font-size: 10pt;
      line-height: 1.8;
    }
    .header-right-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 5px 0;
      min-width: 300px;
    }
    .header-right-label {
      text-align: left;
    }
    .header-right-value {
      text-align: right;
    }
    .company-info {
      margin-top: 30px;
      font-size: 11pt;
      text-align: right;
    }
    .subject-line {
      margin: 20px 0;
      font-size: 11pt;
    }
    
    /* 금액 테이블 */
    table.amount-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 10pt;
    }
    table.amount-table td {
      border: 1px solid #000;
      padding: 8px 12px;
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
      font-size: 16pt;
      font-weight: bold;
    }
    
    /* 품목 테이블 */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 9pt;
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
      width: 300px;
      border: 1px solid #000;
      margin: 15px 0;
      font-size: 9pt;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
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
      margin: 30px 0;
    }
    .remarks-header {
      padding: 8px 12px;
      font-weight: bold;
      border: 1px solid #000;
      border-bottom: none;
      background-color: #f5f5f5;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 100px;
      padding: 10px 12px;
    }
    
    .page-number {
      text-align: center;
      margin-top: 30px;
      font-size: 9pt;
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
        .map(
          (line) => `
      <tr>
        <td class="col-item">${line.description}</td>
        <td class="col-qty">${line.quantity}</td>
        <td class="col-price">${line.unit_price.toLocaleString()}</td>
        <td class="col-amount">${(line.quantity * line.unit_price).toLocaleString()}</td>
      </tr>
      `
        )
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
    <div class="remarks-box"></div>
  </div>

  <div class="page-number">1 / 1</div>
</body>
</html>
  `
}

/**
 * 청구서 HTML 생성 (freee 스타일 완전 동일)
 */
function generateInvoiceHtml(data: InvoiceData): string {
  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch {
      return dateStr
    }
  }

  const emptyRows = Math.max(0, 4 - data.lines.length)
  const emptyRowsHtml = Array(emptyRows)
    .fill('<tr><td style="height: 25px;">&nbsp;</td><td></td><td></td><td></td></tr>')
    .join('')

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
      font-size: 18pt;
      font-weight: bold;
      margin: 15px 0 25px 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 25px;
    }
    .partner-name {
      font-size: 13pt;
      font-weight: bold;
    }
    .header-right {
      text-align: right;
      font-size: 10pt;
      line-height: 1.8;
    }
    .header-right-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 5px 0;
    }
    .header-right-label {
      text-align: left;
    }
    .header-right-value {
      text-align: right;
    }
    .company-info {
      margin-top: 30px;
      font-size: 11pt;
      text-align: left;
    }
    .greeting {
      margin: 20px 0 10px 0;
    }
    .subject-line {
      margin: 10px 0;
      font-size: 10pt;
    }
    
    /* 금액 테이블 */
    table.amount-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }
    table.amount-table td {
      border: 1px solid #000;
      padding: 8px 12px;
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
      font-size: 14pt;
      font-weight: bold;
    }
    
    /* 입금 테이블 */
    table.payment-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
    }
    table.payment-table td {
      border: 1px solid #000;
      padding: 8px 12px;
    }
    table.payment-table .label {
      background-color: #f5f5f5;
      font-weight: normal;
      text-align: center;
    }
    table.payment-table .content {
      line-height: 1.5;
      text-align: left;
    }
    
    /* 품목 테이블 */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
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
      width: 300px;
      border: 1px solid #000;
      margin: 10px 0;
      font-size: 9pt;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 12px;
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
      margin: 20px 0;
    }
    .remarks-header {
      padding: 6px 12px;
      font-weight: bold;
      border: 1px solid #000;
      border-bottom: none;
      background-color: #f5f5f5;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 80px;
      padding: 10px 12px;
    }
    
    .page-number {
      text-align: center;
      margin-top: 20px;
      font-size: 9pt;
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
      <td>${data.amount_excluding_tax.toLocaleString()}円</td>
      <td>${data.amount_tax.toLocaleString()}円</td>
      <td class="total-value">${data.total_amount.toLocaleString()}円</td>
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
        .map(
          (line) => `
      <tr>
        <td class="col-item">${line.description}</td>
        <td class="col-qty">${line.quantity}</td>
        <td class="col-price">${line.unit_price.toLocaleString()}</td>
        <td class="col-amount">${(line.quantity * line.unit_price).toLocaleString()}</td>
      </tr>
      `
        )
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
    <div class="remarks-box"></div>
  </div>

  <div class="page-number">1 / 1</div>
</body>
</html>
  `
}

/**
 * 청구서 PDF 생성 (Puppeteer 사용)
 */
export async function generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer> {
  const html = generateInvoiceHtml(invoiceData)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.evaluateHandle('document.fonts.ready')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '20mm',
        bottom: '15mm',
        left: '20mm',
      },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}

/**
 * 영수증 PDF 생성 (Puppeteer 사용)
 */
export async function generateReceiptPdf(receiptData: ReceiptData): Promise<Buffer> {
  const html = generateReceiptHtml(receiptData)

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    await page.evaluateHandle('document.fonts.ready')

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '20mm',
        bottom: '15mm',
        left: '20mm',
      },
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}
