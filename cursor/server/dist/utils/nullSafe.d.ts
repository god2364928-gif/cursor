/**
 * null-safe utility functions
 * 절대 null이나 undefined가 반환되지 않도록 보장하는 유틸리티 함수들
 */
/**
 * 안전하게 문자열로 변환하고 null/undefined를 기본값으로 대체
 * @param value - 변환할 값
 * @param defaultValue - value가 null/undefined/빈 문자열일 때 사용할 기본값
 * @returns 절대 null/undefined/빈 문자열이 아닌 문자열
 */
export declare function safeString(value: any, defaultValue?: string): string;
/**
 * 안전하게 문자열을 생성하고 최대 길이 제한 적용
 * @param value - 변환할 값
 * @param defaultValue - value가 null/undefined/빈 문자열일 때 사용할 기본값
 * @param maxLength - 최대 길이 (기본값: Infinity)
 * @returns 절대 null/undefined/빈 문자열이 아닌 문자열 (최대 길이 제한 적용)
 */
export declare function safeStringWithLength(value: any, defaultValue?: string, maxLength?: number): string;
/**
 * 여러 값 중 첫 번째 유효한 값 반환 (fallback 체인)
 * @param values - 확인할 값들의 배열
 * @param defaultValue - 모든 값이 유효하지 않을 때 사용할 기본값
 * @returns 첫 번째 유효한 값 또는 기본값
 */
export declare function firstValidString(values: any[], defaultValue?: string): string;
/**
 * INSERT 값 배열에 null이 들어가지 않도록 보장하는 검증 함수
 * @param values - 검증할 값 배열
 * @param notNullIndices - NOT NULL이어야 하는 인덱스 배열
 * @param defaultValues - 각 인덱스에 대한 기본값 배열
 * @throws Error - NOT NULL 필드가 null이거나 빈 문자열인 경우
 */
export declare function validateInsertValues(values: any[], notNullIndices: number[], defaultValues?: {
    [key: number]: string;
}): void;
/**
 * 객체의 필드들이 null/undefined가 아닌지 확인하고 기본값으로 대체
 * @param obj - 검증할 객체
 * @param fields - 검증할 필드명 배열
 * @param defaultValues - 각 필드에 대한 기본값 객체
 * @returns 모든 필드가 유효한 값으로 채워진 객체
 */
export declare function sanitizeObject<T extends Record<string, any>>(obj: T, fields: (keyof T)[], defaultValues?: Partial<Record<keyof T, string>>): T;
//# sourceMappingURL=nullSafe.d.ts.map