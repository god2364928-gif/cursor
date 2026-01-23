/**
 * 아시아/서울 타임존 (UTC+9) 날짜/시간 변환 유틸리티
 * JST (Japan Standard Time)와 KST (Korea Standard Time)는 동일한 UTC+9 타임존
 * 서버의 타임존에 관계없이 항상 UTC+9 기준으로 처리
 */
/**
 * UTC 시간을 UTC+9 타임스탬프 문자열로 변환
 * @param input Date 객체
 * @returns YYYY-MM-DD HH:mm:ss 형식의 문자열
 */
export declare const toKSTTimestampString: (input: Date) => string;
/**
 * UTC 시간을 UTC+9 날짜 문자열로 변환
 * @param input Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export declare const toKSTDateString: (input: Date | string | null | undefined) => string | null;
/**
 * UTC 시간을 UTC+9 시간 문자열로 변환
 * @param input Date 객체
 * @returns HH:mm:ss 형식의 문자열
 */
export declare const toKSTTimeString: (input: Date) => string;
/**
 * 현재 UTC+9 시간을 Date 객체로 반환
 */
export declare const getKSTNow: () => Date;
/**
 * 현재 UTC+9 날짜 문자열 (YYYY-MM-DD)
 */
export declare const getKSTTodayString: () => string;
/**
 * 현재 UTC+9 타임스탬프 문자열 (YYYY-MM-DD HH:mm:ss)
 */
export declare const getKSTNowString: () => string;
/**
 * 날짜 문자열을 UTC+9 기준으로 파싱 (입력이 KST/JST라고 가정)
 * @param dateStr YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss 형식
 */
export declare const parseKSTDateString: (dateStr: string) => Date;
/**
 * YYYY-MM 형식의 문자열을 UTC+9 기준 해당 월 첫째 날로 변환
 */
export declare const toKSTMonthFirstDay: (yearMonth: string) => string;
/**
 * ISO 문자열을 UTC+9 날짜 문자열로 변환
 */
export declare const isoToKSTDateString: (isoString: string) => string;
/**
 * ISO 문자열을 UTC+9 타임스탬프 문자열로 변환
 */
export declare const isoToKSTTimestampString: (isoString: string) => string;
export declare const toJSTTimestampString: (input: Date) => string;
export declare const toJSTDateString: (input: Date | string | null | undefined) => string | null;
export declare const toJSTTimeString: (input: Date) => string;
export declare const getJSTNow: () => Date;
export declare const getJSTTodayString: () => string;
export declare const getJSTNowString: () => string;
export declare const parseJSTDateString: (dateStr: string) => Date;
export declare const toJSTMonthFirstDay: (yearMonth: string) => string;
export declare const isoToJSTDateString: (isoString: string) => string;
export declare const isoToJSTTimestampString: (isoString: string) => string;
export declare const toSeoulTimestampString: (input: Date) => string;
//# sourceMappingURL=dateHelper.d.ts.map