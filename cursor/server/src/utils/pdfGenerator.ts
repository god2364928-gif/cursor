import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'fs'

async function launchBrowser() {
  const localChromePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ]
  const localPath = localChromePaths.find(p => fs.existsSync(p))

  if (localPath) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }

  const executablePath = await chromium.executablePath()
  return puppeteer.launch({
    args: chromium.args,
    executablePath,
    headless: chromium.headless,
  })
}

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
  memo?: string  // 추가: 비고
  tax_entry_method?: 'inclusive' | 'exclusive'  // 추가: 내세/외세
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
  memo?: string  // 추가: 비고
}

/**
 * 영수증 HTML 생성 (청구서와 동일한 스타일)
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

  const emptyRows = Math.max(0, 10 - data.lines.length)
  const emptyRowsHtml = Array(emptyRows)
    .fill('<tr><td style="height: 18px;">&nbsp;</td><td></td><td></td><td></td></tr>')
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
    <div class="remarks-box">${data.memo ? data.memo.replace(/\n/g, '<br>') : ''}</div>
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

  // 내세/외세 모드 확인
  const isInclusive = data.tax_entry_method === 'inclusive'
  
  // 세율별 금액 계산
  const taxRateGroups: { [key: number]: { subtotal: number; tax: number; taxExcluding: number } } = {}
  
  data.lines.forEach((line) => {
    const lineSubtotal = line.quantity * line.unit_price
    const taxRate = line.tax_rate || 10  // 기본값 10%
    
    let lineTax: number
    let lineTaxExcluding: number
    
    if (isInclusive) {
      // 내세: 입력 금액에서 세금을 역산 (세금 포함 가격 / 1.1 * 0.1)
      lineTax = Math.floor(lineSubtotal * taxRate / (100 + taxRate))
      lineTaxExcluding = lineSubtotal - lineTax
    } else {
      // 외세: 세금을 별도 계산
      lineTax = Math.floor(lineSubtotal * taxRate / 100)
      lineTaxExcluding = lineSubtotal
    }
    
    if (!taxRateGroups[taxRate]) {
      taxRateGroups[taxRate] = { subtotal: 0, tax: 0, taxExcluding: 0 }
    }
    taxRateGroups[taxRate].subtotal += lineSubtotal
    taxRateGroups[taxRate].tax += lineTax
    taxRateGroups[taxRate].taxExcluding += lineTaxExcluding
  })

  // 총 금액 계산
  const calculatedSubtotal = Object.values(taxRateGroups).reduce((sum, g) => sum + g.subtotal, 0)
  const calculatedTax = Object.values(taxRateGroups).reduce((sum, g) => sum + g.tax, 0)
  const calculatedTaxExcluding = Object.values(taxRateGroups).reduce((sum, g) => sum + g.taxExcluding, 0)
  
  // 내세: 합계 = 소계 (세금 이미 포함), 외세: 합계 = 소계 + 세금
  const calculatedTotal = isInclusive ? calculatedSubtotal : calculatedSubtotal + calculatedTax

  // 세율별 내역 HTML 생성 (10%, 8% 순서)
  const taxRates = Object.keys(taxRateGroups).map(Number).sort((a, b) => b - a)  // 내림차순
  const summaryRowsHtml = taxRates.map((rate, index) => {
    const group = taxRateGroups[rate]
    const prefix = index === 0 ? '内訳　　' : '　　　　'
    // 내세: taxExcluding (세전 금액) 표시, 외세: subtotal (세전 금액) 표시
    const displaySubtotal = isInclusive ? group.taxExcluding : group.subtotal
    return `
    <div class="summary-row">
      <span class="label">${prefix}${rate}%対象(税抜)</span>
      <span class="value">${displaySubtotal.toLocaleString()}円</span>
    </div>
    <div class="summary-row">
      <span class="label">　　　　${rate}%消費税</span>
      <span class="value">${group.tax.toLocaleString()}円</span>
    </div>`
  }).join('')

  const emptyRows = Math.max(0, 10 - data.lines.length)
  const emptyRowsHtml = Array(emptyRows)
    .fill('<tr><td style="height: 18px;">&nbsp;</td><td></td><td></td><td></td></tr>')
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
    ${summaryRowsHtml}
  </div>

  <div class="remarks">
    <div class="remarks-header">備考</div>
    <div class="remarks-box">${data.memo ? data.memo.replace(/\n/g, '<br>') : ''}</div>
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

  const browser = await launchBrowser()

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

interface QuoteData {
  quote_number: string
  company_name: string
  company_address: string
  company_tel: string
  contact_person: string
  partner_name: string
  partner_title: string
  quote_date: string
  quote_title: string
  delivery_date?: string
  quote_expiry?: string
  total_amount: number
  amount_tax: number
  amount_excluding_tax: number
  lines: Array<{
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
  }>
  memo?: string
  tax_entry_method?: 'inclusive' | 'exclusive'
  invoice_registration_number?: string
}

/**
 * 見積書 HTML 生成
 */
function generateQuoteHtml(data: QuoteData): string {
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}.${month}.${day}`
    } catch {
      return dateStr
    }
  }

  const isInclusive = data.tax_entry_method === 'inclusive'

  const taxRateGroups: { [key: number]: { subtotal: number; tax: number; taxExcluding: number } } = {}
  data.lines.forEach((line) => {
    const lineSubtotal = line.quantity * line.unit_price
    const taxRate = line.tax_rate || 10
    let lineTax: number
    let lineTaxExcluding: number
    if (isInclusive) {
      lineTax = Math.floor(lineSubtotal * taxRate / (100 + taxRate))
      lineTaxExcluding = lineSubtotal - lineTax
    } else {
      lineTax = Math.floor(lineSubtotal * taxRate / 100)
      lineTaxExcluding = lineSubtotal
    }
    if (!taxRateGroups[taxRate]) {
      taxRateGroups[taxRate] = { subtotal: 0, tax: 0, taxExcluding: 0 }
    }
    taxRateGroups[taxRate].subtotal += lineSubtotal
    taxRateGroups[taxRate].tax += lineTax
    taxRateGroups[taxRate].taxExcluding += lineTaxExcluding
  })

  const calculatedSubtotal = Object.values(taxRateGroups).reduce((sum, g) => sum + g.subtotal, 0)
  const calculatedTax = Object.values(taxRateGroups).reduce((sum, g) => sum + g.tax, 0)
  const calculatedTaxExcluding = Object.values(taxRateGroups).reduce((sum, g) => sum + g.taxExcluding, 0)
  const calculatedTotal = isInclusive ? calculatedSubtotal : calculatedSubtotal + calculatedTax

  const taxRates = Object.keys(taxRateGroups).map(Number).sort((a, b) => b - a)
  const summaryRowsHtml = taxRates.map((rate, index) => {
    const group = taxRateGroups[rate]
    const prefix = index === 0 ? '内訳　　' : '　　　　'
    const displaySubtotal = isInclusive ? group.taxExcluding : group.subtotal
    return `
    <div class="summary-row">
      <span class="label">${prefix}${rate}%対象(税抜)</span>
      <span class="value">${displaySubtotal.toLocaleString()}円</span>
    </div>
    <div class="summary-row">
      <span class="label">　　　　${rate}%消費税</span>
      <span class="value">${group.tax.toLocaleString()}円</span>
    </div>`
  }).join('')

  const emptyRows = Math.max(0, 5 - data.lines.length)
  const emptyRowsHtml = Array(emptyRows)
    .fill('<tr><td style="height: 16px;">&nbsp;</td><td></td><td></td><td></td><td></td></tr>')
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
      margin: 12mm 18mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: "Noto Sans JP", sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    .title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      margin: 8px 0 14px 0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .header-left {
      width: 50%;
    }
    .partner-name {
      font-size: 12pt;
      font-weight: bold;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-bottom: 6px;
    }
    .header-right {
      width: 45%;
      text-align: right;
      font-size: 8pt;
      line-height: 1.5;
    }
    .header-right-row {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin: 2px 0;
    }
    .company-info {
      margin-top: 8px;
      font-size: 8pt;
      text-align: left;
    }
    .greeting {
      margin: 10px 0 6px 0;
      font-size: 9pt;
    }
    .total-box {
      border: 2px solid #000;
      padding: 8px 16px;
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .total-box .label {
      font-size: 10pt;
      font-weight: bold;
    }
    .total-box .amount {
      font-size: 14pt;
      font-weight: bold;
    }
    table.info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 8pt;
    }
    table.info-table td {
      border: 1px solid #000;
      padding: 5px 8px;
    }
    table.info-table .label {
      background-color: #f5f5f5;
      font-weight: normal;
      width: 15%;
      text-align: center;
    }
    table.info-table .content {
      width: 35%;
    }
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 8pt;
    }
    table.items th, table.items td {
      border: 1px solid #000;
      padding: 4px 6px;
    }
    table.items th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
    }
    table.items .col-no { width: 8%; text-align: center; }
    table.items .col-item { width: 42%; text-align: left; }
    table.items .col-qty { width: 12%; text-align: center; }
    table.items .col-price { width: 18%; text-align: right; }
    table.items .col-amount { width: 20%; text-align: right; }
    .subtotal-section {
      margin: 8px 0;
      font-size: 9pt;
    }
    .subtotal-row {
      display: flex;
      justify-content: flex-end;
      padding: 3px 0;
    }
    .subtotal-row .label { width: 120px; text-align: right; margin-right: 20px; }
    .subtotal-row .value { width: 150px; text-align: right; }
    .subtotal-row.total {
      border-top: 1px solid #000;
      font-weight: bold;
      font-size: 10pt;
      padding-top: 4px;
    }
    .summary-box {
      float: right;
      width: 260px;
      border: 1px solid #000;
      margin: 6px 0;
      font-size: 8pt;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 8px;
      border-bottom: 1px solid #000;
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-row .label { font-weight: normal; }
    .summary-row .value { text-align: right; }
    .remarks {
      clear: both;
      margin: 10px 0;
    }
    .remarks-header {
      padding: 4px 8px;
      font-weight: bold;
      border: 1px solid #000;
      border-bottom: none;
      background-color: #f5f5f5;
      font-size: 8pt;
    }
    .remarks-box {
      border: 1px solid #000;
      min-height: 30px;
      padding: 6px 8px;
      font-size: 8pt;
    }
    .page-number {
      text-align: center;
      margin-top: 8px;
      font-size: 7pt;
    }
  </style>
</head>
<body>
  <div class="title">見積書</div>

  <div class="header">
    <div class="header-left">
      <div class="partner-name">${data.partner_name} ${data.partner_title}</div>
    </div>
    <div class="header-right">
      <div class="header-right-row">
        <span>発行日　${formatDate(data.quote_date)}</span>
      </div>
      <div class="company-info">
        <div style="font-weight: bold; margin-top: 6px;">${data.company_name}</div>
        <div style="font-size: 7pt; margin-top: 2px;">登録番号: ${data.invoice_registration_number || 'T5013301050765'}</div>
        <div style="margin-top: 4px;">${data.company_address.replace(/\n/g, '<br>')}</div>
        <div style="margin-top: 3px;">TEL：${data.company_tel}</div>
        <div style="margin-top: 2px;">担当：${data.contact_person}</div>
      </div>
    </div>
  </div>

  <div class="greeting">下記の通り、お見積申し上げます。</div>

  <div class="total-box">
    <span class="label">金額</span>
    <span class="amount">¥${calculatedTotal.toLocaleString()}　<span style="font-size: 8pt; font-weight: normal;">（税込）</span></span>
  </div>

  <table class="info-table">
    <tr>
      <td class="label">件　名</td>
      <td class="content">${data.quote_title || ''}</td>
      <td class="label">納　期</td>
      <td class="content">${data.delivery_date || ''}</td>
    </tr>
    <tr>
      <td class="label">見積期限</td>
      <td class="content" colspan="3">${data.quote_expiry || '発行日より2週間'}</td>
    </tr>
  </table>

  <table class="items">
    <thead>
      <tr>
        <th class="col-no">No.</th>
        <th class="col-item">項目</th>
        <th class="col-qty">数量</th>
        <th class="col-price">単価</th>
        <th class="col-amount">金額</th>
      </tr>
    </thead>
    <tbody>
      ${data.lines.map((line, i) => `
      <tr>
        <td class="col-no">${i + 1}</td>
        <td class="col-item">${line.description}</td>
        <td class="col-qty">${line.quantity}</td>
        <td class="col-price">${line.unit_price.toLocaleString()}</td>
        <td class="col-amount">${(line.quantity * line.unit_price).toLocaleString()}</td>
      </tr>
      `).join('')}
      ${emptyRowsHtml}
    </tbody>
  </table>

  <div class="subtotal-section">
    <div class="subtotal-row">
      <span class="label">小計</span>
      <span class="value">${(isInclusive ? calculatedTaxExcluding : calculatedSubtotal).toLocaleString()}</span>
    </div>
    <div class="subtotal-row">
      <span class="label">消費税</span>
      <span class="value">${calculatedTax.toLocaleString()}</span>
    </div>
    <div class="subtotal-row total">
      <span class="label">税込合計</span>
      <span class="value">${calculatedTotal.toLocaleString()}</span>
    </div>
  </div>

  <div class="summary-box">
    ${summaryRowsHtml}
  </div>

  <div class="remarks">
    <div class="remarks-header">＜備考＞</div>
    <div class="remarks-box">${data.memo ? data.memo.replace(/\n/g, '<br>') : ''}</div>
  </div>

  <div class="page-number">1 / 1</div>
</body>
</html>
  `
}

/**
 * 見積書 PDF 生成 (Puppeteer)
 */
export async function generateQuotePdf(quoteData: QuoteData): Promise<Buffer> {
  const html = generateQuoteHtml(quoteData)

  const browser = await launchBrowser()

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

  const browser = await launchBrowser()

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
