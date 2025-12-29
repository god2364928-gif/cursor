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

