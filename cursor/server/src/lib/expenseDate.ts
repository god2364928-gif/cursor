/**
 * 経費申請・精算 — JST(Asia/Tokyo) 날짜 유틸리티
 *
 * design 02 §2.2 기준. 외부 의존성 없음.
 *
 * 구현 메모 (snackWeek.ts 패턴):
 * - JavaScript Date 는 내부적으로 UTC. JST = UTC+9.
 * - 시각을 JST 로 보려면 (d.getTime() + 9h) 한 뒤 getUTC* 사용.
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 내부: UTC Date → JST 기준 시각 부품 */
function toJstParts(d: Date): { year: number; month: number; day: number } {
  const j = new Date(d.getTime() + JST_OFFSET_MS)
  return {
    year: j.getUTCFullYear(),
    month: j.getUTCMonth() + 1, // 1-12
    day: j.getUTCDate(),
  }
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

/** 해당 연/월의 말일 (일수) — JST 캘린더 기준 (UTC 로직으로 계산해도 동일한 그레고리력) */
function daysInMonth(year: number, month: number): number {
  // month 는 1-12. Date.UTC(year, month, 0) = 해당 월의 마지막 날.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** 'YYYY-MM-DD' (JST) — 인자 없으면 지금 */
export function jstToday(): string {
  const { year, month, day } = toJstParts(new Date())
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** 'YYYY-MM' (JST) — 정기결제 초안 멱등키 */
export function jstBillingMonth(d?: Date): string {
  const { year, month } = toJstParts(d ?? new Date())
  return `${year}-${pad2(month)}`
}

/**
 * JST 오늘이 결제일인가 (말일 보정).
 * - billing_day 가 그 달 말일보다 크면 말일을 결제일로 간주.
 *   예: billing_day=31, 2월(28일) → 28일에 true.
 */
export function isBillingDayToday(billingDay: number): boolean {
  const { year, month, day } = toJstParts(new Date())
  const lastDay = daysInMonth(year, month)
  const effectiveBillingDay = billingDay > lastDay ? lastDay : billingDay
  return day === effectiveBillingDay
}
