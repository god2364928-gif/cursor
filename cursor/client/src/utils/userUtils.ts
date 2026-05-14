/**
 * 사용자 관련 유틸리티 함수
 */

/**
 * 마케터 역할의 사용자만 필터링
 * @param users - 전체 사용자 목록
 * @returns 마케터 사용자 이름 배열 (정렬됨)
 */
export function getMarketerNames(users: any[]): string[] {
  return users
    .filter((u: any) => {
      const normalizedRole = (u.role || '').toLowerCase().trim()
      return normalizedRole === 'marketer'
    })
    .map((u: any) => u.name)
    .sort()
}

/**
 * 마케터 역할의 사용자만 필터링
 * @param users - 전체 사용자 목록
 * @returns 마케터 사용자 객체 배열
 */
export function getMarketers(users: any[]): any[] {
  return users.filter((u: any) => {
    const normalizedRole = (u.role || '').toLowerCase().trim()
    return normalizedRole === 'marketer'
  })
}

/**
 * 주어진 이름이 마케터인지 확인
 * @param name - 확인할 이름
 * @param users - 전체 사용자 목록
 * @returns 마케터 여부
 */
export function isMarketer(name: string, users: any[]): boolean {
  const user = users.find((u: any) => u.name === name)
  if (!user) return false
  const normalizedRole = (user.role || '').toLowerCase().trim()
  return normalizedRole === 'marketer'
}

// 영업 담당 + 사무보조(office_assistant) — 사무보조도 영업이력/문의/핫페퍼 페이지에 접근해서
// 본인이 담당한 건을 필터링할 필요가 있으므로 마케터와 동일하게 옵션으로 노출한다.
const OPERATOR_ROLES = new Set(['marketer', 'office_assistant'])

export function getOperatorNames(users: any[]): string[] {
  return users
    .filter((u: any) => OPERATOR_ROLES.has((u.role || '').toLowerCase().trim()))
    .map((u: any) => u.name)
    .sort()
}

export function getOperators(users: any[]): any[] {
  return users.filter((u: any) => OPERATOR_ROLES.has((u.role || '').toLowerCase().trim()))
}

