/**
 * JST (Japan Standard Time, UTC+9) 날짜/시간 변환 유틸리티
 * 서버의 타임존에 관계없이 항상 일본 시간 기준으로 처리
 */
export declare const toJSTTimestampString: (input: Date) => string;
export declare const toJSTDateString: (input: Date) => string;
export declare const toJSTTimeString: (input: Date) => string;
export declare const getJSTNow: () => Date;
export declare const getJSTTodayString: () => string;
export declare const getJSTNowString: () => string;
export declare const parseJSTDateString: (dateStr: string) => Date;
export declare const toJSTMonthFirstDay: (yearMonth: string) => string;
export declare const isoToJSTDateString: (isoString: string) => string;
export declare const isoToJSTTimestampString: (isoString: string) => string;
//# sourceMappingURL=jstDateHelper.d.ts.map