"use strict";
/**
 * null-safe utility functions
 * 절대 null이나 undefined가 반환되지 않도록 보장하는 유틸리티 함수들
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeString = safeString;
exports.safeStringWithLength = safeStringWithLength;
exports.firstValidString = firstValidString;
exports.validateInsertValues = validateInsertValues;
exports.sanitizeObject = sanitizeObject;
/**
 * 안전하게 문자열로 변환하고 null/undefined를 기본값으로 대체
 * @param value - 변환할 값
 * @param defaultValue - value가 null/undefined/빈 문자열일 때 사용할 기본값
 * @returns 절대 null/undefined/빈 문자열이 아닌 문자열
 */
function safeString(value, defaultValue = '未設定') {
    // null/undefined 체크
    if (value === null || value === undefined) {
        return defaultValue;
    }
    // 문자열이 아닌 경우 문자열로 변환
    if (typeof value !== 'string') {
        const str = String(value);
        // "null", "undefined" 문자열도 기본값으로 대체
        if (str === 'null' || str === 'undefined' || str === '') {
            return defaultValue;
        }
        return str.trim() || defaultValue;
    }
    // 문자열인 경우 trim 후 빈 문자열 체크
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
        return defaultValue;
    }
    return trimmed;
}
/**
 * 안전하게 문자열을 생성하고 최대 길이 제한 적용
 * @param value - 변환할 값
 * @param defaultValue - value가 null/undefined/빈 문자열일 때 사용할 기본값
 * @param maxLength - 최대 길이 (기본값: Infinity)
 * @returns 절대 null/undefined/빈 문자열이 아닌 문자열 (최대 길이 제한 적용)
 */
function safeStringWithLength(value, defaultValue = '未設定', maxLength = Infinity) {
    const safe = safeString(value, defaultValue);
    if (safe.length > maxLength) {
        return safe.substring(0, maxLength);
    }
    return safe;
}
/**
 * 여러 값 중 첫 번째 유효한 값 반환 (fallback 체인)
 * @param values - 확인할 값들의 배열
 * @param defaultValue - 모든 값이 유효하지 않을 때 사용할 기본값
 * @returns 첫 번째 유효한 값 또는 기본값
 */
function firstValidString(values, defaultValue = '未設定') {
    for (const value of values) {
        const safe = safeString(value, '');
        if (safe !== '') {
            return safe;
        }
    }
    return defaultValue;
}
/**
 * INSERT 값 배열에 null이 들어가지 않도록 보장하는 검증 함수
 * @param values - 검증할 값 배열
 * @param notNullIndices - NOT NULL이어야 하는 인덱스 배열
 * @param defaultValues - 각 인덱스에 대한 기본값 배열
 * @throws Error - NOT NULL 필드가 null이거나 빈 문자열인 경우
 */
function validateInsertValues(values, notNullIndices, defaultValues = {}) {
    for (const index of notNullIndices) {
        const value = values[index];
        if (value === null || value === undefined || value === '') {
            const defaultValue = defaultValues[index] || '未設定';
            console.error(`[NULL-SAFE] CRITICAL: Value at index ${index} is null/undefined/empty, using default: ${defaultValue}`);
            values[index] = defaultValue;
        }
        else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
                const defaultValue = defaultValues[index] || '未設定';
                console.error(`[NULL-SAFE] CRITICAL: Value at index ${index} is invalid string, using default: ${defaultValue}`);
                values[index] = defaultValue;
            }
            else {
                // 유효한 문자열인 경우 재할당하여 참조 보장
                values[index] = trimmed;
            }
        }
        else {
            // 문자열이 아닌 경우 문자열로 변환
            const str = String(value);
            const trimmed = str.trim();
            if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
                const defaultValue = defaultValues[index] || '未設定';
                console.error(`[NULL-SAFE] CRITICAL: Value at index ${index} cannot be converted to valid string, using default: ${defaultValue}`);
                values[index] = defaultValue;
            }
            else {
                values[index] = trimmed;
            }
        }
    }
}
/**
 * 객체의 필드들이 null/undefined가 아닌지 확인하고 기본값으로 대체
 * @param obj - 검증할 객체
 * @param fields - 검증할 필드명 배열
 * @param defaultValues - 각 필드에 대한 기본값 객체
 * @returns 모든 필드가 유효한 값으로 채워진 객체
 */
function sanitizeObject(obj, fields, defaultValues = {}) {
    const sanitized = { ...obj };
    for (const field of fields) {
        const value = sanitized[field];
        if (value === null || value === undefined || value === '') {
            const defaultValue = defaultValues[field] || '未設定';
            console.warn(`[NULL-SAFE] Field ${String(field)} is null/undefined/empty, using default: ${defaultValue}`);
            sanitized[field] = defaultValue;
        }
        else if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
                const defaultValue = defaultValues[field] || '未設定';
                console.warn(`[NULL-SAFE] Field ${String(field)} is invalid string, using default: ${defaultValue}`);
                sanitized[field] = defaultValue;
            }
            else {
                sanitized[field] = trimmed;
            }
        }
    }
    return sanitized;
}
//# sourceMappingURL=nullSafe.js.map