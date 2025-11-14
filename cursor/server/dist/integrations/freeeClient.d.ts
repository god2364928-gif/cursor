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
 */
export declare function downloadInvoicePdf(companyId: number, invoiceId: number): Promise<Buffer>;
/**
 * 인증 상태 확인
 */
export declare function isAuthenticated(): Promise<boolean>;
/**
 * 캐시 초기화 (재인증 시 사용)
 */
export declare function clearTokenCache(): void;
//# sourceMappingURL=freeeClient.d.ts.map