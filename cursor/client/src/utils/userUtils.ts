/**
 * 사용자 관련 유틸리티 함수
 */

// 퇴사자는 어떤 담당자/매니저 옵션에도 노출되지 않아야 한다.
// employment_status 가 '퇴사' 면 제외. null/undefined/'입사중' 등은 현직으로 간주.
function isActive(u: any): boolean {
  const status = (u?.employment_status ?? u?.employmentStatus ?? '').toString().trim()
  return status !== '퇴사'
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

// 영업 담당 + 사무보조(office_assistant) — 사무보조도 영업이력/문의/핫페퍼 페이지에 접근해서
// 본인이 담당한 건을 필터링할 필요가 있으므로 마케터와 동일하게 옵션으로 노출한다.
// 퇴사자는 제외.
const OPERATOR_ROLES = new Set(['marketer', 'office_assistant'])

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
