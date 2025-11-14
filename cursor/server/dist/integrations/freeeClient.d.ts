export interface FreeeInvoiceLineItem {
    name: string;
    quantity: number;
    unit_price: number;
    tax: number;
}
export interface FreeeInvoiceRequest {
    company_id: number;
    partner_name: string;
    partner_zipcode?: string;
    partner_address?: string;
    invoice_date: string;
    due_date: string;
    invoice_contents: FreeeInvoiceLineItem[];
}
/**
 * OAuth 인증 URL 생성
 */
export declare function getAuthorizationUrl(): string;
/**
 * 인증 코드로 액세스 토큰 교환
 */
export declare function exchangeCodeForToken(code: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * 사업소 목록 조회
 */
export declare function getCompanies(): Promise<any>;
/**
 * 청구서 생성
 */
export declare function createInvoice(invoiceData: FreeeInvoiceRequest): Promise<any>;
/**
 * 청구서 PDF 다운로드
 */
export declare function downloadInvoicePdf(companyId: number, invoiceId: number): Promise<Buffer>;
/**
 * 인증 상태 확인
 */
export declare function isAuthenticated(): boolean;
//# sourceMappingURL=freeeClient.d.ts.map