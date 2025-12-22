// 회계 관련 유틸리티 함수

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)
}

export const formatDateOnly = (dateString: string | null | undefined): string => {
  if (!dateString) return ''
  // ISO 8601 형식에서 날짜 부분만 추출 (YYYY-MM-DD)
  return dateString.split('T')[0]
}

export const isValidDate = (dateStr: string): boolean => {
  if (!dateStr) return false
  
  const parts = dateStr.split('-')
  if (parts.length !== 3) return false
  
  const [year, month, day] = parts.map(Number)
  
  // 기본 범위 체크
  if (year < 1900 || year > 2100) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  
  // 실제 날짜 유효성 검증
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  )
}

/**
 * Date 객체를 YYYY-MM-DD 형식으로 변환 (타임존 영향 없음)
 * toISOString()은 UTC로 변환되어 날짜가 하루 밀릴 수 있으므로 사용 금지
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * 현재 월의 시작일과 종료일(오늘)을 반환
 */
export const getCurrentMonthRange = (): { startDate: string; endDate: string } => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = formatLocalDate(now)
  
  return { startDate, endDate }
}

/**
 * 지정된 월의 마지막 날을 반환
 */
export const getLastDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate()
}
