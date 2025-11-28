/**
 * JST (Japan Standard Time, UTC+9) 날짜/시간 변환 유틸리티
 * 서버의 타임존에 관계없이 항상 일본 시간 기준으로 처리
 */

// UTC 시간을 JST TIMESTAMP 문자열로 변환 (YYYY-MM-DD HH:mm:ss)
export const toJSTTimestampString = (input: Date): string => {
  const utc = input.getTime() + input.getTimezoneOffset() * 60000
  const jst = new Date(utc + 9 * 60 * 60 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`
}

// UTC 시간을 JST DATE 문자열로 변환 (YYYY-MM-DD)
export const toJSTDateString = (input: Date): string => {
  const utc = input.getTime() + input.getTimezoneOffset() * 60000
  const jst = new Date(utc + 9 * 60 * 60 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}`
}

// UTC 시간을 JST TIME 문자열로 변환 (HH:mm:ss)
export const toJSTTimeString = (input: Date): string => {
  const utc = input.getTime() + input.getTimezoneOffset() * 60000
  const jst = new Date(utc + 9 * 60 * 60 * 1000)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`
}

// 현재 JST 시간을 Date 객체로 반환
export const getJSTNow = (): Date => {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 9 * 60 * 60 * 1000)
}

// 현재 JST 날짜 문자열 (YYYY-MM-DD)
export const getJSTTodayString = (): string => {
  return toJSTDateString(new Date())
}

// 현재 JST 타임스탬프 문자열 (YYYY-MM-DD HH:mm:ss)
export const getJSTNowString = (): string => {
  return toJSTTimestampString(new Date())
}

// 날짜 문자열을 JST 기준으로 파싱 (입력이 JST라고 가정)
export const parseJSTDateString = (dateStr: string): Date => {
  // YYYY-MM-DD 또는 YYYY-MM-DD HH:mm:ss 형식
  const parts = dateStr.split(/[- :T]/)
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  const hour = parts[3] ? parseInt(parts[3], 10) : 0
  const minute = parts[4] ? parseInt(parts[4], 10) : 0
  const second = parts[5] ? parseInt(parts[5], 10) : 0
  
  // JST를 UTC로 변환 (-9시간)
  const jstDate = new Date(Date.UTC(year, month, day, hour - 9, minute, second))
  return jstDate
}

// YYYY-MM 형식의 문자열을 JST 기준 해당 월 첫째 날로 변환
export const toJSTMonthFirstDay = (yearMonth: string): string => {
  return `${yearMonth}-01`
}

// ISO 문자열을 JST 날짜 문자열로 변환
export const isoToJSTDateString = (isoString: string): string => {
  const date = new Date(isoString)
  return toJSTDateString(date)
}

// ISO 문자열을 JST 타임스탬프 문자열로 변환
export const isoToJSTTimestampString = (isoString: string): string => {
  const date = new Date(isoString)
  return toJSTTimestampString(date)
}

