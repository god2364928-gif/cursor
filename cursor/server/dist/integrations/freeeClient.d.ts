export interface FreeeInvoiceLineItem {
    name: string;
    quantity: number;
    unit_price: number;
    tax: number;
    tax_rate?: number;
}
export interface FreeeInvoiceRequest {
    company_id: number;
    partner_id?: number;
    partner_name: string;
    partner_title?: '御中' | '様' | '';
    invoice_title?: string;
    invoice_date: string;
    due_date: string;
    tax_entry_method?: 'inclusive' | 'exclusive';
    invoice_contents: FreeeInvoiceLineItem[];
    payment_bank_info?: string;
    memo?: string;
}
export interface FreeeReceiptRequest {
    company_id: number;
    partner_id?: number;
    partner_name: string;
    partner_title?: '御中' | '様' | '';
    receipt_title?: string;
    issue_date: string;
    receipt_date: string;
    tax_entry_method?: 'inclusive' | 'exclusive';
    receipt_contents: FreeeInvoiceLineItem[];
    payment_bank_info?: string;
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
 * 사업소 목록 조회 (회계 API 사용)
 */
export declare function getCompanies(): Promise<any>;
/**
 * 청구서 템플릿 목록 조회 (freee請求書 API)
 */
export declare function getInvoiceTemplates(companyId: number): Promise<any>;
/**
 * 거래처 목록 조회 (freee会計 API)
 */
export declare function getPartners(companyId: number, keyword?: string): Promise<any>;
/**
 * 거래처 생성 (freee会計 API)
 */
export declare function createPartner(companyId: number, partnerName: string): Promise<any>;
/**
 * 청구書 생성 (freee請求書 API 사용)
 */
export declare function createInvoice(invoiceData: FreeeInvoiceRequest): Promise<any>;
/**
 * 청구서 PDF 다운로드 (freee請求書 API)
 * freee 請求書 API는 /reports/ 경로를 사용
 */
export declare function downloadInvoicePdf(companyId: number, invoiceId: number, dueDateFromDb?: string, memoFromDb?: string): Promise<Buffer>;
/**
 * 인증 상태 확인
 */
export declare function isAuthenticated(): Promise<boolean>;
/**
 * 캐시 초기화 (재인증 시 사용)
 */
export declare function clearTokenCache(): void;
/**
 * 영수증 생성 (freee請求書 API - 청구서를 영수증으로 생성)
 * freee에는 별도의 영수증 API가 없으므로 청구서(invoice)를 "領収書" 타이틀로 생성
 */
export declare function createReceipt(receiptData: FreeeReceiptRequest): Promise<any>;
/**
 * 영수증 PDF 다운로드 (청구서 API 사용)
 */
export declare function downloadReceiptPdf(companyId: number, receiptId: number): Promise<Buffer>;
//# sourceMappingURL=freeeClient.d.ts.map