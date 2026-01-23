"use strict";
/**
 * JST (Japan Standard Time, UTC+9) 날짜/시간 변환 유틸리티
 * 서버의 타임존에 관계없이 항상 일본 시간 기준으로 처리
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isoToJSTTimestampString = exports.isoToJSTDateString = exports.toJSTMonthFirstDay = exports.parseJSTDateString = exports.getJSTNowString = exports.getJSTTodayString = exports.getJSTNow = exports.toJSTTimeString = exports.toJSTDateString = exports.toJSTTimestampString = void 0;
// UTC 시간을 JST TIMESTAMP 문자열로 변환 (YYYY-MM-DD HH:mm:ss)
const toJSTTimestampString = (input) => {
    const utc = input.getTime() + input.getTimezoneOffset() * 60000;
    const jst = new Date(utc + 9 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`;
};
exports.toJSTTimestampString = toJSTTimestampString;
// UTC 시간을 JST DATE 문자열로 변환 (YYYY-MM-DD)
const toJSTDateString = (input) => {
    const utc = input.getTime() + input.getTimezoneOffset() * 60000;
    const jst = new Date(utc + 9 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`;
};
exports.toJSTDateString = toJSTDateString;
// UTC 시간을 JST TIME 문자열로 변환 (HH:mm:ss)
const toJSTTimeString = (input) => {
    const utc = input.getTime() + input.getTimezoneOffset() * 60000;
    const jst = new Date(utc + 9 * 60 * 60 * 1000);
    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`;
};
exports.toJSTTimeString = toJSTTimeString;
// 현재 JST 시간을 Date 객체로 반환
const getJSTNow = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + 9 * 60 * 60 * 1000);
};
exports.getJSTNow = getJSTNow;
// 현재 JST 날짜 문자열 (YYYY-MM-DD)
const getJSTTodayString = () => {
    return (0, exports.toJSTDateString)(new Date());
};
exports.getJSTTodayString = getJSTTodayString;
// 현재 JST 타임스탬프 문자열 (YYYY-MM-DD HH:mm:ss)
const getJSTNowString = () => {
    return (0, exports.toJSTTimestampString)(new Date());
};
exports.getJSTNowString = getJSTNowString;
// 날짜 문자열을 JST 기준으로 파싱 (입력이 JST라고 가정)
const parseJSTDateString = (dateStr) => {
    // YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss 형식
    const parts = dateStr.split(/[- :T]/);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hour = parts[3] ? parseInt(parts[3], 10) : 0;
    const minute = parts[4] ? parseInt(parts[4], 10) : 0;
    const second = parts[5] ? parseInt(parts[5], 10) : 0;
    // JST를 UTC로 변환 (-9시간)
    const jstDate = new Date(Date.UTC(year, month, day, hour - 9, minute, second));
    return jstDate;
};
exports.parseJSTDateString = parseJSTDateString;
// YYYY-MM 형식의 문자열을 JST 기준 해당 월 첫째 날로 변환
const toJSTMonthFirstDay = (yearMonth) => {
    return `${yearMonth}-01`;
};
exports.toJSTMonthFirstDay = toJSTMonthFirstDay;
// ISO 문자열을 JST 날짜 문자열로 변환
const isoToJSTDateString = (isoString) => {
    const date = new Date(isoString);
    return (0, exports.toJSTDateString)(date);
};
exports.isoToJSTDateString = isoToJSTDateString;
// ISO 문자열을 JST 타임스탬프 문자열로 변환
const isoToJSTTimestampString = (isoString) => {
    const date = new Date(isoString);
    return (0, exports.toJSTTimestampString)(date);
};
exports.isoToJSTTimestampString = isoToJSTTimestampString;
//# sourceMappingURL=jstDateHelper.js.map