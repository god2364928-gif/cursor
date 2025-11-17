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
 * 슬랙 연결 테스트
 */
export declare function testSlackConnection(): Promise<boolean>;
//# sourceMappingURL=slackClient.d.ts.map