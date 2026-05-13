/**
 * 간식 구매 신청 — JST(Asia/Tokyo) 주차 계산 유틸리티
 *
 * 비즈니스 룰:
 * - 신청 마감: 매주 금요일 24:00 JST (= 토요일 00:00 JST)
 * - 마감 전: 그 주 월요일이 week_start
 * - 마감 후 (토~일): 다음 주 월요일이 week_start (자동 이월)
 * - 모든 시각 계산은 Asia/Tokyo 기준
 * - week_start 는 항상 'YYYY-MM-DD' 문자열 (월요일)
 *
 * 구현 메모:
 * - JavaScript Date 는 내부적으로 UTC. JST = UTC+9.
 * - 시각을 JST 로 보려면 (d.getTime() + 9h) 한 뒤 getUTC* 사용.
 * - 외부 라이브러리(date-fns, dayjs) 의존성 없음.
 */

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** 내부: UTC Date → JST 기준 시각 부품 (Date 객체로 wrap, getUTC* 로 읽음) */
function toJstParts(d: Date): {
  year: number
  month: number // 1-12
  day: number
  dow: number // 0=일, 1=월, ..., 6=토
  hour: number
  minute: number
  second: number
} {
  const j = new Date(d.getTime() + JST_OFFSET_MS)
  return {
    year: j.getUTCFullYear(),
    month: j.getUTCMonth() + 1,
    day: j.getUTCDate(),
    dow: j.getUTCDay(),
    hour: j.getUTCHours(),
    minute: j.getUTCMinutes(),
    second: j.getUTCSeconds(),
  }
}

/** 내부: 'YYYY-MM-DD' 포맷 */
function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}
function fmtYMD(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

/** 내부: JST 자정 (해당 날짜 00:00 JST) 의 UTC 타임스탬프 */
function jstMidnightUtcMs(year: number, month: number, day: number): number {
  // 00:00 JST = (전날) 15:00 UTC
  // Date.UTC(year, month-1, day, 0, 0, 0) 은 UTC 자정 → 9시간 빼면 JST 자정
  return Date.UTC(year, month - 1, day, 0, 0, 0) - JST_OFFSET_MS
}

/** 임의 시각을 JST로 변환한 'YYYY-MM-DD' (그날의 날짜) */
export function jstDateString(d?: Date): string {
  const base = d ?? new Date()
  const { year, month, day } = toJstParts(base)
  return fmtYMD(year, month, day)
}

/**
 * 주어진 시각이 속한 "신청 대상 주"의 월요일 (YYYY-MM-DD)
 * - 마감(금요일 24:00 JST = 토요일 00:00 JST) 전: 그 주 월요일
 * - 마감 후 (토~일): 다음 주 월요일
 */
export function calcWeekStart(now?: Date): string {
  const base = now ?? new Date()
  const { year, month, day, dow } = toJstParts(base)

  // dow: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
  // 마감 후(토/일)면 다음 주 월요일로 이월
  // 그 외(월~금)면 그 주 월요일
  // 월요일까지 더해야 할 일수 계산:
  //   월(1)→0, 화(2)→-1, 수(3)→-2, 목(4)→-3, 금(5)→-4 (이번주 월)
  //   토(6)→+2,  일(0)→+1                              (다음주 월)
  let deltaDays: number
  if (dow === 0) {
    deltaDays = 1 // 일 → 다음주 월
  } else if (dow === 6) {
    deltaDays = 2 // 토 → 다음주 월
  } else {
    deltaDays = 1 - dow // 월~금 → 그 주 월
  }

  // JST 자정 기준으로 일수 가산
  const baseMidnightJstUtcMs = jstMidnightUtcMs(year, month, day)
  const targetMs = baseMidnightJstUtcMs + deltaDays * DAY_MS
  // 다시 JST 부품으로 환산
  const target = new Date(targetMs)
  const t = toJstParts(target)
  return fmtYMD(t.year, t.month, t.day)
}

/** 임의 날짜('YYYY-MM-DD' 또는 Date)를 그 주의 월요일('YYYY-MM-DD')로 정규화 */
export function normalizeToMonday(date: string | Date): string {
  let year: number, month: number, day: number
  if (typeof date === 'string') {
    // 'YYYY-MM-DD' 는 캘린더 날짜로 해석 (JST 자정으로 간주)
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
    if (!m) {
      throw new Error(`Invalid date string: ${date}`)
    }
    year = Number(m[1])
    month = Number(m[2])
    day = Number(m[3])
  } else {
    const p = toJstParts(date)
    year = p.year
    month = p.month
    day = p.day
  }

  // dow 계산을 위해 JST 자정 시각으로 만들어 다시 부품 추출
  const midnightUtcMs = jstMidnightUtcMs(year, month, day)
  const { dow } = toJstParts(new Date(midnightUtcMs))

  // 월요일로 되돌릴 일수: 월(1)→0, 화(2)→-1, ..., 일(0)→-6, 토(6)→-5
  // 즉 dow===0(일) → -6, 그 외 → 1 - dow
  const deltaDays = dow === 0 ? -6 : 1 - dow

  const targetMs = midnightUtcMs + deltaDays * DAY_MS
  const t = toJstParts(new Date(targetMs))
  return fmtYMD(t.year, t.month, t.day)
}

/**
 * calcWeekStart 결과 주의 마감 시각 ISO (UTC).
 * = 그 주 금요일 24:00 JST = 그 주 토요일 00:00 JST = 그 주 금요일 15:00 UTC
 */
export function deadlineISO(now?: Date): string {
  const base = now ?? new Date()
  const weekStartYmd = calcWeekStart(base)
  // weekStartYmd 는 월요일. 금요일 24:00 JST = 월요일 + 5일의 00:00 JST = 토요일 00:00 JST
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartYmd)!
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const monMidnightUtcMs = jstMidnightUtcMs(y, mo, d)
  const deadlineUtcMs = monMidnightUtcMs + 5 * DAY_MS // 토요일 00:00 JST
  return new Date(deadlineUtcMs).toISOString()
}

/**
 * "마감까지 남은 일수" = 마감 시각(그 주 금요일 24:00 JST)에서 now 까지 차이를 일 단위로 floor.
 * - 양수: D-N (예: 화요일이면 3, 금요일이면 0)
 * - 0: 마감 당일
 * - 음수: 마감 후 (이미 다음 주로 분류됨 → calcWeekStart 결과 주의 마감 기준이므로 일반적으로 음수가 나오진 않지만,
 *   호출 시점에 따라 0 미만이 될 수 있음 — 화면 표시 정책에 위임)
 */
export function daysUntilDeadline(now?: Date): number {
  const base = now ?? new Date()
  const deadlineMs = new Date(deadlineISO(base)).getTime()
  const diffMs = deadlineMs - base.getTime()
  return Math.floor(diffMs / DAY_MS)
}

// ---- 검증 블록 (직접 실행 시) ----
if (require.main === module) {
  const cases: [string, string][] = [
    ['2026-05-13T00:00:00Z', '2026-05-11'], // 수 09:00 JST
    ['2026-05-15T14:59:00Z', '2026-05-11'], // 금 23:59 JST
    ['2026-05-15T15:00:00Z', '2026-05-18'], // 토 00:00 JST (마감 직후)
    ['2026-05-17T14:00:00Z', '2026-05-18'], // 일 23:00 JST
  ]
  let allPass = true
  for (const [iso, expected] of cases) {
    const got = calcWeekStart(new Date(iso))
    const ok = got === expected
    if (!ok) allPass = false
    console.log(`${iso} → ${got} ${ok ? '✓' : '✗ expected ' + expected}`)
  }
  console.log(
    'normalizeToMonday(2026-05-15):',
    normalizeToMonday('2026-05-15'),
    '(expected 2026-05-11)'
  )
  console.log(
    'normalizeToMonday(2026-05-11):',
    normalizeToMonday('2026-05-11'),
    '(expected 2026-05-11)'
  )

  // 보너스: deadlineISO / daysUntilDeadline 동작 확인
  const sample = new Date('2026-05-13T00:00:00Z') // 수 09:00 JST
  console.log('deadlineISO(수 09:00 JST):', deadlineISO(sample), '(expected 2026-05-15T15:00:00.000Z)')
  console.log('daysUntilDeadline(수 09:00 JST):', daysUntilDeadline(sample))
  console.log('daysUntilDeadline(금 23:59 JST):', daysUntilDeadline(new Date('2026-05-15T14:59:00Z')))
  console.log('daysUntilDeadline(토 00:00 JST):', daysUntilDeadline(new Date('2026-05-15T15:00:00Z')))

  console.log(allPass ? '\nALL CALCWEEKSTART CASES PASSED ✓' : '\nSOME CASES FAILED ✗')
  process.exit(allPass ? 0 : 1)
}
