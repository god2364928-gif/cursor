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
}
/**
 * 청구서 PDF 생성 (freee 스타일)
 */
export declare function generateInvoicePdf(invoiceData: InvoiceData): Promise<Buffer>;
export {};
//# sourceMappingURL=pdfGenerator.d.ts.map