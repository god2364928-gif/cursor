/**
 * 영수증 발급 알림을 슬랙으로 전송
 */
export declare function sendReceiptNotification(receiptData: {
    receipt_number: string;
    partner_name: string;
    issue_date: string;
    total_amount: number;
    tax_amount: number;
    user_name?: string;
}): Promise<boolean>;
/**
 * 청구서 취소 알림을 슬랙으로 전송
 */
export declare function sendInvoiceCancelNotification(invoiceData: {
    invoice_number: string;
    partner_name: string;
    invoice_date: string;
    total_amount: number;
    tax_amount: number;
    user_name?: string;
    cancelled_at: string;
}): Promise<boolean>;
/**
 * 카드결제(PayPal) 청구서 발행 알림을 日本_領収書 슬랙 채널로 전송
 */
export declare function sendPaypalInvoiceNotification(invoiceData: {
    invoice_number: string;
    partner_name: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    tax_amount: number;
    user_name?: string;
}): Promise<boolean>;
/**
 * 슬랙 연결 테스트
 */
export declare function testSlackConnection(): Promise<boolean>;
//# sourceMappingURL=slackClient.d.ts.map