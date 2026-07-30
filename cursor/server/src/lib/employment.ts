/**
 * 재직 상태(users.employment_status / accounting_employees.employment_status) 판정 표준.
 *
 * 배경: 같은 "재직 중" 판정이 라우트마다 다르게 구현돼 있어(8종) 동일 인물이 어떤
 * 화면에서는 보이고 어떤 화면에서는 사라지는 사고가 반복됐다. 판정은 반드시 이 모듈을
 * 경유한다.
 *
 * 표준값: UI 드롭다운(회원관리 / 직원관리)이 저장하는 값은 '입사중' | '입사전' | '퇴사' 뿐이다.
 * 다만 노션 이관·일본어 직접입력으로 아래 동의어가 DB에 남아 있어 함께 인식한다.
 *
 * 미설정(NULL / 빈 문자열)은 **재직으로 간주**한다. 어드민 회원관리 화면이 이미
 * `employment_status || '입사중'` 으로 렌더링해 왔으므로 화면과 판정을 일치시키는 쪽이 안전하고,
 * 값이 비었다는 이유로 급여·연차 대상에서 조용히 빠지는 것이 더 큰 사고다.
 */

export const EMPLOYMENT_STATUS_ACTIVE = '입사중'
export const EMPLOYMENT_STATUS_PRE_HIRE = '입사전'
export const EMPLOYMENT_STATUS_RESIGNED = '퇴사'

/** 퇴사 — 모든 업무 목록에서 제외 */
export const RESIGNED_STATUSES = ['퇴사', '퇴직', '退社', '退職'] as const
/** 입사 전 — 아직 입사하지 않았으므로 모든 업무 목록에서 제외 */
export const PRE_HIRE_STATUSES = ['입사전', '入社前'] as const
/** 휴직 — 재직으로 보되, 급여·담당자 배정처럼 실무 참여가 전제인 곳에서는 제외 */
export const ON_LEAVE_STATUSES = ['휴직', '休職'] as const

export interface EmploymentFilterOptions {
  /** 휴직자도 제외한다 (급여 생성, 담당자 배정 등 실무 참여가 전제인 목록) */
  excludeOnLeave?: boolean
}

function excludedStatuses(opts: EmploymentFilterOptions): string[] {
  const excluded: string[] = [...RESIGNED_STATUSES, ...PRE_HIRE_STATUSES]
  if (opts.excludeOnLeave) excluded.push(...ON_LEAVE_STATUSES)
  return excluded
}

/** TypeScript 측 판정 */
export function isActiveEmployment(
  status: string | null | undefined,
  opts: EmploymentFilterOptions = {}
): boolean {
  const normalized = (status ?? '').toString().trim() || EMPLOYMENT_STATUS_ACTIVE
  return !excludedStatuses(opts).includes(normalized)
}

/**
 * SQL WHERE 절 조각. `column` 은 호출부가 넘기는 컬럼 식별자(예: 'u.employment_status').
 * 비교값은 모두 이 모듈의 상수이므로 외부 입력이 섞이지 않는다.
 *
 *   WHERE ${activeEmploymentSql('u.employment_status')}
 */
export function activeEmploymentSql(
  column: string,
  opts: EmploymentFilterOptions = {}
): string {
  const list = excludedStatuses(opts)
    .map(v => `'${v.replace(/'/g, "''")}'`)
    .join(', ')
  return `(COALESCE(NULLIF(TRIM(${column}), ''), '${EMPLOYMENT_STATUS_ACTIVE}') NOT IN (${list}))`
}

/**
 * 입사일 정본. `hire_date` 가 실제 입사일이고 `contract_start_date` 는 계약직 계약 시작일이다.
 * 과거에 한쪽만 채워진 계정이 있어 연차·건강검진 판정에서는 폴백이 필요하다.
 */
export const HIRE_DATE_SQL = 'COALESCE(hire_date, contract_start_date)'

export function hireDateSql(alias?: string): string {
  const p = alias ? `${alias}.` : ''
  return `COALESCE(${p}hire_date, ${p}contract_start_date)`
}
