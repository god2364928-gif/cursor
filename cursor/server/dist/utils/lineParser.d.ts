/**
 * LINE 대화 텍스트 파일 파싱 유틸리티
 *
 * LINE에서 내보낸 TXT 파일을 파싱하여 구조화된 데이터로 변환
 */
interface LineMessage {
    date: string;
    time: string;
    sender: string;
    message: string;
}
interface ParsedLineChat {
    messages: LineMessage[];
    participants: string[];
    dateRange: {
        start: string;
        end: string;
    };
    summary: string;
    extractedCompanyName: string | null;
    extractedCustomerName: string | null;
    extractedPhone: string | null;
}
/**
 * LINE 대화 텍스트 파싱
 */
export declare function parseLineChat(text: string): ParsedLineChat;
/**
 * 전체 대화 내용을 히스토리용 텍스트로 변환
 */
export declare function formatChatForHistory(parsed: ParsedLineChat): string;
export {};
//# sourceMappingURL=lineParser.d.ts.map