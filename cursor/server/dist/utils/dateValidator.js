"use strict";
/**
 * 날짜 유효성 검증 및 보정 유틸리티
 * 잘못된 날짜(예: 11월 31일)를 해당 월의 마지막 날로 자동 보정
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndCorrectDate = validateAndCorrectDate;
exports.validateDateRange = validateDateRange;
function validateAndCorrectDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') {
        return '';
    }
    // Date 객체로 변환 가능한지 확인
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date string:', dateStr);
        return '';
    }
    // YYYY-MM-DD 형식인지 확인
    const parts = dateStr.split('-');
    if (parts.length !== 3) {
        console.warn('Date string is not in YYYY-MM-DD format:', dateStr);
        return dateStr;
    }
    const [year, month, day] = parts.map(Number);
    // 날짜가 실제로 유효한지 확인 (예: 2023-11-31은 잘못된 날짜)
    const correctedDate = new Date(year, month - 1, day);
    if (correctedDate.getMonth() !== month - 1 || correctedDate.getDate() !== day) {
        // 잘못된 날짜를 해당 월의 마지막 날로 보정
        const lastDay = new Date(year, month, 0).getDate();
        const validatedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        console.warn(`Invalid date ${dateStr} corrected to ${validatedDate}`);
        return validatedDate;
    }
    return dateStr;
}
/**
 * startDate와 endDate를 동시에 검증 및 보정
 */
function validateDateRange(startDate, endDate) {
    return {
        validatedStartDate: validateAndCorrectDate(startDate),
        validatedEndDate: validateAndCorrectDate(endDate)
    };
}
//# sourceMappingURL=dateValidator.js.map