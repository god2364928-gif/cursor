/**
 * 로컬 날짜 유틸리티
 * toISOString().split('T')[0] 대신 사용 — UTC 변환 없이 로컬(JST/KST) 기준 날짜 문자열 생성
 */

/** Date 객체를 로컬 시간 기준 YYYY-MM-DD 문자열로 변환 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 오늘 날짜를 로컬 시간 기준 YYYY-MM-DD 문자열로 반환 */
export function getLocalToday(): string {
  return formatLocalDate(new Date())
}
