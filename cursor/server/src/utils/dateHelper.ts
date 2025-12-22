/**
 * 아시아/서울 타임존 (UTC+9) 날짜/시간 변환 유틸리티
 * JST (Japan Standard Time)와 KST (Korea Standard Time)는 동일한 UTC+9 타임존
 * 서버의 타임존에 관계없이 항상 UTC+9 기준으로 처리
 */

const TIMEZONE_OFFSET_MS = 9 * 60 * 60 * 1000 // UTC+9

/**
 * UTC 시간을 UTC+9 타임스탬프 문자열로 변환
 * @param input Date 객체
 * @returns YYYY-MM-DD HH:mm:ss 형식의 문자열
 */
export const toKSTTimestampString = (input: Date): string => {
  const utc = input.getTime() + input.getTimezoneOffset() * 60000
  const kst = new Date(utc + TIMEZONE_OFFSET_MS)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())} ${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}`
}

/**
 * UTC 시간을 UTC+9 날짜 문자열로 변환
 * @param input Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export const toKSTDateString = (input: Date | string | null | undefined): string | null => {
  if (!input) return null
  
  const date = typeof input === 'string' ? new Date(input) : input
  if (isNaN(date.getTime())) return null
  
  const utc = date.getTime() + date.getTimezoneOffset() * 60000
  const kst = new Date(utc + TIMEZONE_OFFSET_MS)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`
}

/**
 * UTC 시간을 UTC+9 시간 문자열로 변환
 * @param input Date 객체
 * @returns HH:mm:ss 형식의 문자열
 */
export const toKSTTimeString = (input: Date): string => {
  const utc = input.getTime() + input.getTimezoneOffset() * 60000
  const kst = new Date(utc + TIMEZONE_OFFSET_MS)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}:${pad(kst.getUTCSeconds())}`
}

/**
 * 현재 UTC+9 시간을 Date 객체로 반환
 */
export const getKSTNow = (): Date => {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + TIMEZONE_OFFSET_MS)
}

/**
 * 현재 UTC+9 날짜 문자열 (YYYY-MM-DD)
 */
export const getKSTTodayString = (): string => {
  return toKSTDateString(new Date()) || ''
}

/**
 * 현재 UTC+9 타임스탬프 문자열 (YYYY-MM-DD HH:mm:ss)
 */
export const getKSTNowString = (): string => {
  return toKSTTimestampString(new Date())
}

/**
 * 날짜 문자열을 UTC+9 기준으로 파싱 (입력이 KST/JST라고 가정)
 * @param dateStr YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss 형식
 */
export const parseKSTDateString = (dateStr: string): Date => {
  const parts = dateStr.split(/[- :T]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const hour = parts[3] ? parseInt(parts[3], 10) : 0
  const minute = parts[4] ? parseInt(parts[4], 10) : 0
  const second = parts[5] ? parseInt(parts[5], 10) : 0
  
  // KST를 UTC로 변환 (-9시간)
  const kstDate = new Date(Date.UTC(year, month, day, hour - 9, minute, second))
  return kstDate
}

/**
 * YYYY-MM 형식의 문자열을 UTC+9 기준 해당 월 첫째 날로 변환
 */
export const toKSTMonthFirstDay = (yearMonth: string): string => {
  return `${yearMonth}-01`
}

/**
 * ISO 문자열을 UTC+9 날짜 문자열로 변환
 */
export const isoToKSTDateString = (isoString: string): string => {
  const date = new Date(isoString)
  return toKSTDateString(date) || ''
}

/**
 * ISO 문자열을 UTC+9 타임스탬프 문자열로 변환
 */
export const isoToKSTTimestampString = (isoString: string): string => {
  const date = new Date(isoString)
  return toKSTTimestampString(date)
}

// ===== 하위 호환성을 위한 JST 별칭 =====
// JST와 KST는 동일한 UTC+9 타임존이므로 같은 함수 사용

export const toJSTTimestampString = toKSTTimestampString
export const toJSTDateString = toKSTDateString
export const toJSTTimeString = toKSTTimeString
export const getJSTNow = getKSTNow
export const getJSTTodayString = getKSTTodayString
export const getJSTNowString = getKSTNowString
export const parseJSTDateString = parseKSTDateString
export const toJSTMonthFirstDay = toKSTMonthFirstDay
export const isoToJSTDateString = isoToKSTDateString
export const isoToJSTTimestampString = isoToKSTTimestampString

// ===== Seoul 별칭 (salesTracking.ts 호환) =====
export const toSeoulTimestampString = toKSTTimestampString

