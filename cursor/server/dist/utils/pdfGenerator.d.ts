interface InvoiceData {
    invoice_number: string;
    company_name: string;
    company_address: string;
    partner_name: string;
    partner_title: string;
    billing_date: string;
    due_date?: string;
    total_amount: number;
    amount_tax: number;
    amount_excluding_tax: number;
    lines: Array<{
        description: string;
        quantity: number;
        unit_price: number;
        tax_rate: number;
    }>;
    payment_bank_info?: string;
    invoice_registration_number?: string;
    memo?: string;
}
interface ReceiptData {
    receipt_number: string;
    partner_name: string;
    issue_date: string;
    company_name: string;
    company_address: string;
    total_amount: number;
    amount_tax: number;
    amount_excluding_tax: number;
    lines: Array<{
        description: string;
        quantity: number;
        unit_price: number;
    }>;
    invoice_registration_number?: string;
    memo?: string;
}
/**
 * 청구서 PDF 생성 (Puppeteer 사용)
 */
export declare function generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer>;
/**
 * 영수증 PDF 생성 (Puppeteer 사용)
 */
export declare function generateReceiptPdf(receiptData: ReceiptData): Promise<Buffer>;
export {};
//# sourceMappingURL=pdfGenerator.d.ts.map