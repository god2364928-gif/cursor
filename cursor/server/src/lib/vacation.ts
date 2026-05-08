/**
 * 일본 노동법 기준 연차 유급휴가 계산 로직
 *
 * 부여 규칙:
 * - 입사일 + 정확히 6개월 → 첫 부여 10일
 * - 그 후 직전 부여일 + 1년마다 부여
 * - 근속연수별 부여일수 (반차/년):
 *     6개월: 10일, 1년6개월: 11, 2년6개월: 12, 3년6개월: 14,
 *     4년6개월: 16, 5년6개월: 18, 6년6개월 이상: 20
 * - 소멸시효: 부여일 + 2년
 * - 출근율 80% 룰은 시스템 검증 X (정책상 미달자는 해고)
 */

export type LeaveType =
  | 'full'
  | 'half_am'
  | 'half_pm'
  | 'unpaid'
  | 'health_check'
  | 'condolence'

export type GrantType = 'annual' | 'special' | 'manual' | 'condolence'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** 휴가 종류별 1일당 차감일수 */
export function consumedDaysPerDay(leaveType: LeaveType): number {
  switch (leaveType) {
    case 'full':
      return 1.0
    case 'half_am':
    case 'half_pm':
      return 0.5
    case 'unpaid':
    case 'health_check':
    case 'condolence':
      return 0
  }
}

/** 시작/종료 날짜 사이 일수 (시작/종료 포함, 평일 카운트는 호출자가 별도 처리) */
export function dateRangeDays(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
}

/** 휴가 신청의 총 차감일수 계산 (반차는 1일분 0.5, 종일은 dateRange × 1) */
export function calcConsumedDays(
  leaveType: LeaveType,
  start: Date,
  end: Date
): number {
  if (leaveType === 'half_am' || leaveType === 'half_pm') {
    return 0.5
  }
  if (leaveType === 'unpaid' || leaveType === 'health_check' || leaveType === 'condolence') {
    return 0
  }
  return dateRangeDays(start, end) * consumedDaysPerDay(leaveType)
}

/** 입사일 + 6개월 시점 (정확히 6개월 후 동일 일자) */
export function firstGrantDate(hireDate: Date): Date {
  const d = new Date(hireDate)
  d.setMonth(d.getMonth() + 6)
  return d
}

/**
 * 다음 부여일 계산
 * - 부여 이력 없음: 입사일 + 6개월
 * - 있음: 가장 최근 'annual' 부여일 + 1년
 */
export function nextGrantDate(
  hireDate: Date,
  lastAnnualGrantDate: Date | null
): Date {
  if (!lastAnnualGrantDate) {
    return firstGrantDate(hireDate)
  }
  const d = new Date(lastAnnualGrantDate)
  d.setFullYear(d.getFullYear() + 1)
  return d
}

/**
 * 부여 시점 근속연수 (소수점 1자리, 부여일 - 입사일 기준)
 * 첫 부여(0.5년)는 0.5로 표기
 */
export function calcServiceYearsAtGrant(hireDate: Date, grantDate: Date): number {
  const ms = grantDate.getTime() - hireDate.getTime()
  const years = ms / (1000 * 60 * 60 * 24 * 365.25)
  return Math.round(years * 10) / 10
}

/**
 * 근속연수별 부여일수 표 (일본 노동법)
 * 입력: 부여 시점의 근속연수 (예: 0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5+)
 */
export function lookupGrantDays(serviceYearsAtGrant: number): number {
  // 부여 시점은 항상 .5 단위 (6개월 / 1년6개월 / ...)
  // 0.5 → 첫 부여 → 10
  // 1.5 → 11 / 2.5 → 12 / 3.5 → 14 / 4.5 → 16 / 5.5 → 18 / 6.5+ → 20
  if (serviceYearsAtGrant < 1.0) return 10
  if (serviceYearsAtGrant < 2.0) return 11
  if (serviceYearsAtGrant < 3.0) return 12
  if (serviceYearsAtGrant < 4.0) return 14
  if (serviceYearsAtGrant < 5.0) return 16
  if (serviceYearsAtGrant < 6.0) return 18
  return 20
}

/** 소멸시효: 부여일 + 2년 */
export function expiryDate(grantDate: Date): Date {
  const d = new Date(grantDate)
  d.setFullYear(d.getFullYear() + 2)
  return d
}

/**
 * 잔여일수 계산
 * - 미만료 부여 합계 - (승인된 신청 + 미결재 신청) 차감일수 합계
 * - pending도 차감해서 보여줌 (UI에서 미래 신청 포함 잔여)
 */
export interface Grant {
  days: number | string
  grant_date: string | Date
  expires_at: string | Date
}
export interface ConsumedRequest {
  consumed_days: number | string
  status: RequestStatus
}

export function calcBalance(
  grants: Grant[],
  requests: ConsumedRequest[],
  today: Date = new Date()
): {
  totalGranted: number   // 총 부여 (누적)
  consumed: number       // 사용 (승인됨)
  expired: number        // 만료된 부여 중 사용되지 않은 분 (FIFO)
  pending: number        // 결재대기
  remaining: number      // 잔여 (totalGranted - expired - consumed - pending)
} {
  const todayMs = startOfDay(today).getTime()

  // 사용/대기 합계
  let consumed = 0
  let pending = 0
  for (const r of requests) {
    const days = Number(r.consumed_days) || 0
    if (r.status === 'approved') consumed += days
    if (r.status === 'pending') pending += days
  }

  // 부여를 오래된 순으로 정렬 (FIFO 차감용)
  const sortedGrants = grants
    .map((g) => ({
      days: Number(g.days) || 0,
      grantTime: new Date(g.grant_date).getTime(),
      expiresMs: new Date(g.expires_at).getTime(),
    }))
    .filter((g) => !isNaN(g.grantTime))
    .sort((a, b) => a.grantTime - b.grantTime)

  // 사용량을 오래된 부여부터 차감
  let consumedRemaining = consumed
  let totalGranted = 0
  let expired = 0
  for (const g of sortedGrants) {
    totalGranted += g.days
    const usedFromThis = Math.min(consumedRemaining, g.days)
    consumedRemaining -= usedFromThis
    const unusedInThis = g.days - usedFromThis
    // 만료된 부여 중 사용되지 않은 부분만 expired로 카운트
    if (g.expiresMs < todayMs) {
      expired += unusedInThis
    }
  }

  const remaining = round1(totalGranted - expired - consumed - pending)
  return {
    totalGranted: round1(totalGranted),
    consumed: round1(consumed),
    expired: round1(expired),
    pending: round1(pending),
    remaining,
  }
}

/**
 * 年次有給休暇の年5日取得義務 (働き方改革関連法, 2019年4月施行)
 * - 연차 10日 以上 부여된 직원 → 부여일(基準日)부터 1년 이내 5日 강제 소화
 * - 미달성 시 30万円 벌금/직원
 *
 * 계산 기준일 = 가장 최근 annual 부여 (10日 이상)
 * 기간 = 기준일 ~ 기준일+1년 (마감일 = 기준일+1년-1일)
 * 사용 카운트 = 기간 내 start_date를 가진 approved 신청 중 유급 (full/half_am/half_pm) consumed_days 합계
 */
export interface MandatoryRequest {
  start_date: string | Date
  consumed_days: number | string
  status: RequestStatus
  leave_type: LeaveType
}

export function calcMandatoryStatus(
  grants: Array<{ days: number | string; grant_date: string | Date; grant_type?: string }>,
  requests: MandatoryRequest[],
  today: Date = new Date()
): {
  applicable: boolean
  required: number     // 5
  used: number
  remaining: number
  baseDate: string | null
  deadline: string | null
  daysUntilDeadline: number | null
} {
  // 기준일: 가장 최근 annual 부여 (10일 이상)
  const annualGrants = grants
    .filter((g) => (g.grant_type ?? 'annual') === 'annual' && Number(g.days) >= 10)
    .map((g) => ({ days: Number(g.days), date: new Date(g.grant_date) }))
    .filter((g) => !isNaN(g.date.getTime()))
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  if (annualGrants.length === 0) {
    return {
      applicable: false,
      required: 5,
      used: 0,
      remaining: 5,
      baseDate: null,
      deadline: null,
      daysUntilDeadline: null,
    }
  }

  const baseDate = startOfDay(annualGrants[0].date)
  const deadline = new Date(baseDate)
  deadline.setFullYear(deadline.getFullYear() + 1)
  deadline.setDate(deadline.getDate() - 1)

  const baseMs = baseDate.getTime()
  const deadlineMs = startOfDay(deadline).getTime()

  let used = 0
  for (const r of requests) {
    if (r.status !== 'approved') continue
    if (r.leave_type !== 'full' && r.leave_type !== 'half_am' && r.leave_type !== 'half_pm') continue
    const start = startOfDay(new Date(r.start_date)).getTime()
    if (start >= baseMs && start <= deadlineMs) {
      used += Number(r.consumed_days) || 0
    }
  }

  const required = 5
  const remaining = Math.max(0, round1(required - used))
  const todayMs = startOfDay(today).getTime()
  const daysUntilDeadline = Math.round((deadlineMs - todayMs) / (1000 * 60 * 60 * 24))

  return {
    applicable: true,
    required,
    used: round1(used),
    remaining,
    baseDate: baseDate.toISOString().slice(0, 10),
    deadline: deadline.toISOString().slice(0, 10),
    daysUntilDeadline,
  }
}

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** 직원 1명에 대해 오늘 부여 대상인지 판정 후 부여 정보 산출 (cron에서 사용) */
export function planAnnualGrant(
  hireDate: Date,
  lastAnnualGrantDate: Date | null,
  today: Date = new Date()
): { shouldGrant: boolean; grantDate: Date; days: number; serviceYears: number } | null {
  const next = nextGrantDate(hireDate, lastAnnualGrantDate)
  const todayStart = startOfDay(today).getTime()
  const nextStart = startOfDay(next).getTime()

  if (nextStart > todayStart) {
    return null  // 아직 부여일 안됨
  }

  // 오늘이거나 이미 지났으면 (지난 경우 보정 부여)
  const grantDate = next
  const serviceYears = calcServiceYearsAtGrant(hireDate, grantDate)
  const days = lookupGrantDays(serviceYears)
  return { shouldGrant: true, grantDate, days, serviceYears }
}
