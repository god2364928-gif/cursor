import { create } from 'zustand'

interface AccountingState {
  // 공유 필터 상태
  startDate: string
  endDate: string
  fiscalYear: number
  
  // 상태 업데이트 함수
  setStartDate: (date: string) => void
  setEndDate: (date: string) => void
  setFiscalYear: (year: number) => void
  setDateRange: (start: string, end: string) => void
}

// 당월 1일부터 오늘까지를 기본값으로 설정 (타임존 이슈 방지)
const getDefaultDates = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() // 0-11
  
  // 타임존 영향 없이 직접 문자열 생성
  const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  return { startDate, endDate }
}

// 현재 회계연도 계산 (10월 시작)
const getCurrentFiscalYear = () => {
  const now = new Date()
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear()
}

export const useAccountingStore = create<AccountingState>((set) => {
  const { startDate, endDate } = getDefaultDates()
  
  return {
    startDate,
    endDate,
    fiscalYear: getCurrentFiscalYear(),
    
    setStartDate: (date: string) => set({ startDate: date }),
    setEndDate: (date: string) => set({ endDate: date }),
    setFiscalYear: (year: number) => set({ fiscalYear: year }),
    setDateRange: (start: string, end: string) => 
      set({ startDate: start, endDate: end }),
  }
})

