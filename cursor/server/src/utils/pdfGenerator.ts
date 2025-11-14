import PDFDocument from 'pdfkit'

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

/**
 * 청구서 PDF 생성 (freee 스타일)
 */
export function generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 60,
      })

      const chunks: Buffer[] = []

      doc.on('data', (chunk) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const pageWidth = 595.28 // A4 width in points
      const margin = 60

      // 제목 - 중앙 상단
      doc.fontSize(18)
      doc.text('請求書', margin, 80, {
        width: pageWidth - margin * 2,
        align: 'center',
      })

      // 왼쪽: 거래처 정보
      let leftY = 140
      doc.fontSize(12)
      doc.text(`${invoiceData.partner_name} ${invoiceData.partner_title}`, margin, leftY)

      // 오른쪽: 청구서 정보
      let rightY = 140
      const rightX = 350
      doc.fontSize(9)
      doc.text('請求日', rightX, rightY)
      doc.text(invoiceData.billing_date, rightX + 80, rightY)
      
      rightY += 15
      doc.text('請求書番号', rightX, rightY)
      doc.text(invoiceData.invoice_number, rightX + 80, rightY)
      
      if (invoiceData.due_date) {
        rightY += 15
        doc.text('支払期限', rightX, rightY)
        doc.text(invoiceData.due_date, rightX + 80, rightY)
      }

      // 발행원 정보 (오른쪽)
      rightY += 30
      doc.fontSize(10)
      doc.text(invoiceData.company_name, rightX, rightY)
      
      rightY += 15
      doc.fontSize(8)
      const addressLines = invoiceData.company_address.split('\n')
      addressLines.forEach((line) => {
        doc.text(line, rightX, rightY)
        rightY += 12
      })

      if (invoiceData.invoice_registration_number) {
        rightY += 5
        doc.fontSize(8)
        doc.text(`登録番号: ${invoiceData.invoice_registration_number}`, rightX, rightY)
      }

      // 인사말
      leftY = 240
      doc.fontSize(10)
      doc.text('下記の通りご請求申し上げます。', margin, leftY)

      // 청구 금액 박스
      leftY += 30
      doc.fontSize(10)
      doc.text('件名', margin, leftY)
      doc.text('COCOマーケご利用料', margin + 100, leftY)

      leftY += 20
      doc.rect(margin, leftY, 200, 60).stroke()
      
      doc.fontSize(9)
      doc.text('小計', margin + 10, leftY + 10)
      doc.text('消費税', margin + 10, leftY + 30)
      doc.fontSize(11)
      doc.text('合計', margin + 10, leftY + 50)

      doc.fontSize(9)
      doc.text(`¥${invoiceData.amount_excluding_tax.toLocaleString()}`, margin + 120, leftY + 10, { align: 'right', width: 70 })
      doc.text(`¥${invoiceData.amount_tax.toLocaleString()}`, margin + 120, leftY + 30, { align: 'right', width: 70 })
      doc.fontSize(11)
      doc.text(`¥${invoiceData.total_amount.toLocaleString()}`, margin + 120, leftY + 50, { align: 'right', width: 70 })

      // 입금처 정보
      leftY += 80
      doc.fontSize(9)
      doc.text('入金先口座', margin, leftY)
      leftY += 15
      doc.fontSize(8)
      if (invoiceData.payment_bank_info) {
        const bankLines = invoiceData.payment_bank_info.split('\n')
        bankLines.forEach((line) => {
          doc.text(line, margin, leftY)
          leftY += 12
        })
      }

      // 명세 테이블
      leftY += 20
      const tableTop = leftY
      const colWidths = [250, 60, 80, 100]
      const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]]

      // 테이블 헤더
      doc.fontSize(9)
      doc.rect(margin, tableTop, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 20).stroke()
      doc.text('品目', colX[0] + 5, tableTop + 6)
      doc.text('数量', colX[1] + 5, tableTop + 6)
      doc.text('単価', colX[2] + 5, tableTop + 6)
      doc.text('税抜金額', colX[3] + 5, tableTop + 6)

      let rowY = tableTop + 20

      // 테이블 행
      invoiceData.lines.forEach((line, index) => {
        const rowHeight = 25
        doc.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], rowHeight).stroke()
        
        doc.fontSize(8)
        doc.text(line.description, colX[0] + 5, rowY + 8, { width: colWidths[0] - 10 })
        doc.text(line.quantity.toString(), colX[1] + 5, rowY + 8)
        doc.text(`¥${line.unit_price.toLocaleString()}`, colX[2] + 5, rowY + 8)
        const amount = line.quantity * line.unit_price
        doc.text(`¥${amount.toLocaleString()}`, colX[3] + 5, rowY + 8)
        
        rowY += rowHeight
      })

      // 빈 행 추가 (최대 10행까지)
      const emptyRows = Math.max(0, 10 - invoiceData.lines.length)
      for (let i = 0; i < emptyRows; i++) {
        doc.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 25).stroke()
        rowY += 25
      }

      // 합계 행
      doc.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 20).stroke()
      doc.fontSize(9)
      doc.text('小計', colX[2] + 5, rowY + 6)
      doc.text(`¥${invoiceData.amount_excluding_tax.toLocaleString()}`, colX[3] + 5, rowY + 6)
      rowY += 20

      doc.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 20).stroke()
      doc.text('消費税', colX[2] + 5, rowY + 6)
      doc.text(`¥${invoiceData.amount_tax.toLocaleString()}`, colX[3] + 5, rowY + 6)

      // 비고
      rowY += 30
      doc.fontSize(9)
      doc.text('備考', margin, rowY)
      rowY += 15
      doc.rect(margin, rowY, colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], 60).stroke()

      // 페이지 번호
      doc.fontSize(8)
      doc.text('1 / 1', margin, 750, {
        width: pageWidth - margin * 2,
        align: 'center',
      })

      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}
