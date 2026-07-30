/**
 * 사용자 관련 유틸리티 함수
 */

// 재직 판정 기준은 서버 `lib/employment.ts` 와 일치시킨다.
// - 미설정(null / 빈 문자열)은 재직으로 간주 (어드민 화면 표시와 동일)
// - '퇴사'류와 '입사전'(아직 입사하지 않음)은 어떤 담당자/매니저 옵션에도 노출하지 않는다
const RESIGNED_STATUSES = new Set(['퇴사', '퇴직', '退社', '退職'])
const PRE_HIRE_STATUSES = new Set(['입사전', '入社前'])

function isActive(u: any): boolean {
  const status = (u?.employment_status ?? u?.employmentStatus ?? '').toString().trim()
  if (!status) return true
  return !RESIGNED_STATUSES.has(status) && !PRE_HIRE_STATUSES.has(status)
}

/**
 * 마케터 역할의 사용자만 필터링 (퇴사자 제외)
 */
export function getMarketerNames(users: any[]): string[] {
  return users
    .filter((u: any) => {
      if (!isActive(u)) return false
      const normalizedRole = (u.role || '').toLowerCase().trim()
      return normalizedRole === 'marketer'
    })
    .map((u: any) => u.name)
    .sort()
}

/**
 * 마케터 역할의 사용자 객체 배열 (퇴사자 제외)
 */
export function getMarketers(users: any[]): any[] {
  return users.filter((u: any) => {
    if (!isActive(u)) return false
    const normalizedRole = (u.role || '').toLowerCase().trim()
    return normalizedRole === 'marketer'
  })
}

/**
 * 주어진 이름이 마케터(현직)인지 확인
 */
export function isMarketer(name: string, users: any[]): boolean {
  const user = users.find((u: any) => u.name === name)
  if (!user) return false
  if (!isActive(user)) return false
  const normalizedRole = (user.role || '').toLowerCase().trim()
  return normalizedRole === 'marketer'
}

// 실무 담당자 역할 — 영업이력/문의/핫페퍼 페이지에서 "본인이 담당한 건" 필터 옵션으로 노출된다.
// 사무보조(office_assistant)뿐 아니라 **어드민도 포함**한다: 어드민 역할이 관리자 전용이 아니라
// 실제로 문의 배정 등 실무를 직접 담당하고 있어서, 배제하면 승진과 동시에 본인 업무 데이터에
// 접근할 수 없게 된다.
const OPERATOR_ROLES = new Set(['admin', 'marketer', 'office_assistant'])

export function getOperatorNames(users: any[]): string[] {
  return users
    .filter((u: any) => isActive(u) && OPERATOR_ROLES.has((u.role || '').toLowerCase().trim()))
    .map((u: any) => u.name)
    .sort()
}

export function getOperators(users: any[]): any[] {
  return users.filter(
    (u: any) => isActive(u) && OPERATOR_ROLES.has((u.role || '').toLowerCase().trim())
  )
}
