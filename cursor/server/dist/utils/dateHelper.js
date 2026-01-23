"use strict";
/**
 * 아시아/서울 타임존 (UTC+9) 날짜/시간 변환 유틸리티
 * JST (Japan Standard Time)와 KST (Korea Standard Time)는 동일한 UTC+9 타임존
 * 서버의 타임존에 관계없이 항상 UTC+9 기준으로 처리
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toSeoulTimestampString = exports.isoToJSTTimestampString = exports.isoToJSTDateString = exports.toJSTMonthFirstDay = exports.parseJSTDateString = exports.getJSTNowString = exports.getJSTTodayString = exports.getJSTNow = exports.toJSTTimeString = exports.toJSTDateString = exports.toJSTTimestampString = exports.isoToKSTTimestampString = exports.isoToKSTDateString = exports.toKSTMonthFirstDay = exports.parseKSTDateString = exports.getKSTNowString = exports.getKSTTodayString = exports.getKSTNow = exports.toKSTTimeString = exports.toKSTDateString = exports.toKSTTimestampString = void 0;
const TIMEZONE_OFFSET_MS = 9 * 60 * 60 * 1000; // UTC+9
/**
 * UTC 시간을 UTC+9 타임스탬프 문자열로 변환
 * @param input Date 객체
 * @returns YYYY-MM-DD HH:mm:ss 형식의 문자열
 */
const toKSTTimestampString = (input) => {
    const utc = input.getTime() + input.getTimezoneOffset() * 60000;
    const kst = new Date(utc + TIMEZONE_OFFSET_MS);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}`;
};
exports.toKSTTimestampString = toKSTTimestampString;
/**
 * UTC 시간을 UTC+9 날짜 문자열로 변환
 * @param input Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
const toKSTDateString = (input) => {
    if (!input)
        return null;
    const date = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(date.getTime()))
        return null;
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const kst = new Date(utc + TIMEZONE_OFFSET_MS);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
};
exports.toKSTDateString = toKSTDateString;
/**
 * UTC 시간을 UTC+9 시간 문자열로 변환
 * @param input Date 객체
 * @returns HH:mm:ss 형식의 문자열
 */
const toKSTTimeString = (input) => {
    const utc = input.getTime() + input.getTimezoneOffset() * 60000;
    const kst = new Date(utc + TIMEZONE_OFFSET_MS);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}`;
};
exports.toKSTTimeString = toKSTTimeString;
/**
 * 현재 UTC+9 시간을 Date 객체로 반환
 */
const getKSTNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + TIMEZONE_OFFSET_MS);
};
exports.getKSTNow = getKSTNow;
/**
 * 현재 UTC+9 날짜 문자열 (YYYY-MM-DD)
 */
const getKSTTodayString = () => {
    return (0, exports.toKSTDateString)(new Date()) || '';
};
exports.getKSTTodayString = getKSTTodayString;
/**
 * 현재 UTC+9 타임스탬프 문자열 (YYYY-MM-DD HH:mm:ss)
 */
const getKSTNowString = () => {
    return (0, exports.toKSTTimestampString)(new Date());
};
exports.getKSTNowString = getKSTNowString;
/**
 * 날짜 문자열을 UTC+9 기준으로 파싱 (입력이 KST/JST라고 가정)
 * @param dateStr YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss 형식
 */
const parseKSTDateString = (dateStr) => {
    const parts = dateStr.split(/[- :T]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hour = parts[3] ? parseInt(parts[3], 10) : 0;
    const minute = parts[4] ? parseInt(parts[4], 10) : 0;
    const second = parts[5] ? parseInt(parts[5], 10) : 0;
    // KST를 UTC로 변환 (-9시간)
    const kstDate = new Date(Date.UTC(year, month, day, hour - 9, minute, second));
    return kstDate;
};
exports.parseKSTDateString = parseKSTDateString;
/**
 * YYYY-MM 형식의 문자열을 UTC+9 기준 해당 월 첫째 날로 변환
 */
const toKSTMonthFirstDay = (yearMonth) => {
    return `${yearMonth}-01`;
};
exports.toKSTMonthFirstDay = toKSTMonthFirstDay;
/**
 * ISO 문자열을 UTC+9 날짜 문자열로 변환
 */
const isoToKSTDateString = (isoString) => {
    const date = new Date(isoString);
    return (0, exports.toKSTDateString)(date) || '';
};
exports.isoToKSTDateString = isoToKSTDateString;
/**
 * ISO 문자열을 UTC+9 타임스탬프 문자열로 변환
 */
const isoToKSTTimestampString = (isoString) => {
    const date = new Date(isoString);
    return (0, exports.toKSTTimestampString)(date);
};
exports.isoToKSTTimestampString = isoToKSTTimestampString;
// ===== 하위 호환성을 위한 JST 별칭 =====
// JST와 KST는 동일한 UTC+9 타임존이므로 같은 함수 사용
exports.toJSTTimestampString = exports.toKSTTimestampString;
exports.toJSTDateString = exports.toKSTDateString;
exports.toJSTTimeString = exports.toKSTTimeString;
exports.getJSTNow = exports.getKSTNow;
exports.getJSTTodayString = exports.getKSTTodayString;
exports.getJSTNowString = exports.getKSTNowString;
exports.parseJSTDateString = exports.parseKSTDateString;
exports.toJSTMonthFirstDay = exports.toKSTMonthFirstDay;
exports.isoToJSTDateString = exports.isoToKSTDateString;
exports.isoToJSTTimestampString = exports.isoToKSTTimestampString;
// ===== Seoul 별칭 (salesTracking.ts 호환) =====
exports.toSeoulTimestampString = exports.toKSTTimestampString;
//# sourceMappingURL=dateHelper.js.map