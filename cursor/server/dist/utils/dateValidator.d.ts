/**
 * 날짜 유효성 검증 및 보정 유틸리티
 * 잘못된 날짜(예: 11월 31일)를 해당 월의 마지막 날로 자동 보정
 */
export declare function validateAndCorrectDate(dateStr: string | undefined): string;
/**
 * startDate와 endDate를 동시에 검증 및 보정
 */
export declare function validateDateRange(startDate: string | undefined, endDate: string | undefined): {
    validatedStartDate: string;
    validatedEndDate: string;
};
//# sourceMappingURL=dateValidator.d.ts.map