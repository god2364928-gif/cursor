import { useState } from 'react'
import { X, Target, Calendar, Save } from 'lucide-react'
import { useI18nStore } from '../i18n'

interface BulkTargetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (targets: any, weeks: number) => Promise<void>
  type: 'weekly' | 'monthly'
  currentWeek: number
  currentMonth: number
  currentYear: number
}

export default function BulkTargetModal({ 
  isOpen, 
  onClose, 
  onSave, 
  type,
  currentWeek,
  currentMonth,
  currentYear 
}: BulkTargetModalProps) {
  const { t } = useI18nStore()
  const [isSaving, setIsSaving] = useState(false)
  const [numberOfPeriods, setNumberOfPeriods] = useState(4) // 기본 4주 또는 4개월

  // 주간 목표
  const [targetForm, setTargetForm] = useState(0)
  const [targetDm, setTargetDm] = useState(0)
  const [targetLine, setTargetLine] = useState(0)
  const [targetPhone, setTargetPhone] = useState(0)
  const [targetEmail, setTargetEmail] = useState(0)
  const [targetRetargeting, setTargetRetargeting] = useState(0)
  const [targetExisting, setTargetExisting] = useState(0)
  const [targetRetargetingCustomers, setTargetRetargetingCustomers] = useState(0)

  // 월간 목표 (총매출, 신규매출, 총건수, 신규건수만)
  const [targetRevenue, setTargetRevenue] = useState(0)
  const [targetNewRevenue, setTargetNewRevenue] = useState(0)
  const [targetContracts, setTargetContracts] = useState(0)
  const [targetNewContracts, setTargetNewContracts] = useState(0)

  // 숫자 포맷팅 함수 (1,000 단위로 쉼표 추가)
  const formatNumberWithCommas = (value: number | string): string => {
    if (value === 0 || value === '' || value === '0') return ''
    const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) : value
    if (isNaN(numValue)) return ''
    return numValue.toLocaleString('en-US')
  }

  // 포맷된 문자열에서 숫자만 추출
  const parseFormattedNumber = (value: string): number => {
    const cleaned = value.replace(/,/g, '')
    const parsed = parseInt(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  // 주차와 월을 계산하는 헬퍼 함수
  const getWeekOfMonth = (year: number, week: number): { year: number, month: number, weekInMonth: number } => {
    // ISO week를 날짜로 변환 (연도 첫 번째 목요일이 속한 주가 1주차)
    const jan4 = new Date(year, 0, 4)
    const jan4Day = jan4.getDay() || 7
    const firstMonday = new Date(year, 0, 4 - jan4Day + 1)
    const targetDate = new Date(firstMonday)
    targetDate.setDate(firstMonday.getDate() + (week - 1) * 7)
    
    const targetYear = targetDate.getFullYear()
    const targetMonth = targetDate.getMonth() + 1
    
    // 해당 월의 1일 찾기
    const firstDayOfMonth = new Date(targetYear, targetMonth - 1, 1)
    const firstDayWeekday = firstDayOfMonth.getDay()
    
    // 해당 월의 첫 번째 월요일 찾기
    let daysToFirstMonday = 0
    if (firstDayWeekday === 0) { // 일요일
      daysToFirstMonday = 1
    } else if (firstDayWeekday === 1) { // 월요일
      daysToFirstMonday = 0
    } else { // 화~토
      daysToFirstMonday = 8 - firstDayWeekday
    }
    
    const firstMondayOfMonth = new Date(targetYear, targetMonth - 1, 1 + daysToFirstMonday)
    
    // 타겟 날짜가 첫 번째 월요일보다 이전이면 이전 달의 마지막 주차로 처리
    if (targetDate < firstMondayOfMonth) {
      // 이전 달 정보 가져오기
      const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1
      const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear
      
      // 이전 달의 첫 번째 월요일 찾기
      const firstDayOfPrevMonth = new Date(prevYear, prevMonth - 1, 1)
      const firstDayOfPrevMonthWeekday = firstDayOfPrevMonth.getDay()
      let daysToFirstMondayPrev = 0
      if (firstDayOfPrevMonthWeekday === 0) {
        daysToFirstMondayPrev = 1
      } else if (firstDayOfPrevMonthWeekday === 1) {
        daysToFirstMondayPrev = 0
      } else {
        daysToFirstMondayPrev = 8 - firstDayOfPrevMonthWeekday
      }
      const firstMondayOfPrevMonth = new Date(prevYear, prevMonth - 1, 1 + daysToFirstMondayPrev)
      
      // 마지막 날 찾기
      const lastDayOfPrevMonth = new Date(targetYear, targetMonth - 1, 0)
      
      // 주차 계산
      let weekCount = 1
      const tempDate = new Date(firstMondayOfPrevMonth)
      while (tempDate <= lastDayOfPrevMonth) {
        if (targetDate >= tempDate && targetDate < new Date(tempDate.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          return { year: prevYear, month: prevMonth, weekInMonth: weekCount }
        }
        tempDate.setDate(tempDate.getDate() + 7)
        weekCount++
      }
      
      return { year: prevYear, month: prevMonth, weekInMonth: weekCount - 1 }
    }
    
    // 타겟 날짜와 첫 번째 월요일 사이의 주 차이 계산
    const daysDiff = Math.floor((targetDate.getTime() - firstMondayOfMonth.getTime()) / (1000 * 60 * 60 * 24))
    const weekInMonth = Math.floor(daysDiff / 7) + 1
    
    return { year: targetYear, month: targetMonth, weekInMonth: Math.max(1, weekInMonth) }
  }

  const getMonthYear = (year: number, month: number): { year: number, month: number } => {
    const totalMonths = year * 12 + month
    const resultYear = Math.floor((totalMonths - 1) / 12)
    const resultMonth = ((totalMonths - 1) % 12) + 1
    return { year: resultYear, month: resultMonth }
  }

  // 기간 옵션 생성
  const generatePeriodOptions = () => {
    const options = []
    
    if (type === 'weekly') {
      for (let i = 1; i <= 8; i++) {
        const startInfo = getWeekOfMonth(currentYear, currentWeek)
        const endInfo = getWeekOfMonth(currentYear, currentWeek + i - 1)
        
        let label = ''
        if (startInfo.year === endInfo.year && startInfo.month === endInfo.month) {
          // 같은 년월: "2025년 12월 3주차 ~ 5주차"
          label = `${startInfo.year}${t('year')} ${startInfo.month}월 ${startInfo.weekInMonth}주차 ~ ${endInfo.weekInMonth}주차 (${i}${t('weeksTotal')})`
        } else if (startInfo.year === endInfo.year) {
          // 같은 년도, 다른 월: "2025년 12월 3주차 ~ 1월 2주차"
          label = `${startInfo.year}${t('year')} ${startInfo.month}월 ${startInfo.weekInMonth}주차 ~ ${endInfo.month}월 ${endInfo.weekInMonth}주차 (${i}${t('weeksTotal')})`
        } else {
          // 다른 년도: "2025년 12월 4주차 ~ 2026년 1월 2주차"
          label = `${startInfo.year}${t('year')} ${startInfo.month}월 ${startInfo.weekInMonth}주차 ~ ${endInfo.year}${t('year')} ${endInfo.month}월 ${endInfo.weekInMonth}주차 (${i}${t('weeksTotal')})`
        }
        
        options.push({ value: i, label })
      }
    } else {
      // 월간
      for (let i = 1; i <= 8; i++) {
        const startInfo = getMonthYear(currentYear, currentMonth)
        const endInfo = getMonthYear(currentYear, currentMonth + i - 1)
        
        let label = ''
        if (startInfo.year === endInfo.year) {
          // 같은 년도: "2025년 12월 ~ 3월"
          label = `${startInfo.year}${t('year')} ${startInfo.month}월 ~ ${endInfo.month}월 (${i}${t('monthsTotal')})`
        } else {
          // 다른 년도: "2025년 12월 ~ 2026년 3월"
          label = `${startInfo.year}${t('year')} ${startInfo.month}월 ~ ${endInfo.year}${t('year')} ${endInfo.month}월 (${i}${t('monthsTotal')})`
        }
        
        options.push({ value: i, label })
      }
    }
    
    return options
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const targets = type === 'weekly' ? {
        targetForm,
        targetDm,
        targetLine,
        targetPhone,
        targetEmail,
        targetRetargeting,
        targetExisting,
        targetRetargetingCustomers
      } : {
        targetRevenue,
        targetNewRevenue,
        targetContracts,
        targetNewContracts
      }

      await onSave(targets, numberOfPeriods)
      onClose()
    } catch (error) {
      console.error('Failed to save bulk targets:', error)
      alert(t('saveFailedMeeting'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">
              {type === 'weekly' ? t('bulkWeeklyTargetSetting') : t('bulkMonthlyTargetSetting')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 기간 선택 */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <label className="font-bold text-blue-900">
                {type === 'weekly' ? t('setWeeksAhead') : t('setMonthsAhead')}
              </label>
            </div>
            <select
              value={numberOfPeriods}
              onChange={(e) => setNumberOfPeriods(parseInt(e.target.value))}
              className="w-full border rounded-lg px-4 py-2 text-lg font-medium"
            >
              {generatePeriodOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-blue-600 mt-2">
              {type === 'weekly' 
                ? `💡 ${t('sameTargetAppliedToWeeks')}`
                : `💡 ${t('sameTargetAppliedToMonths')}`
              }
            </p>
          </div>

          {/* 주간 목표 입력 */}
          {type === 'weekly' && (
            <>
              {/* 5대 수단 */}
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  📊 {t('newSalesActivities')} ({t('fiveMethodBreakdown')})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">📝 {t('form')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetForm)}
                    onChange={(e) => setTargetForm(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">📧 {t('contactDM')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetDm)}
                    onChange={(e) => setTargetDm(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">💬 {t('line')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetLine)}
                    onChange={(e) => setTargetLine(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">📞 {t('contactPhone')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetPhone)}
                    onChange={(e) => setTargetPhone(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">✉️ {t('contactMail')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetEmail)}
                    onChange={(e) => setTargetEmail(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                </div>
              </div>

              {/* 리타겟팅 & 기존 고객 */}
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  ✨ {t('otherActivities')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('retargetingContactTarget')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetRetargeting)}
                    onChange={(e) => setTargetRetargeting(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('existingCustomerManagement')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetExisting)}
                    onChange={(e) => setTargetExisting(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">👥 {t('targetCustomerCount')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetRetargetingCustomers)}
                    onChange={(e) => setTargetRetargetingCustomers(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                </div>
                </div>
              </div>
            </>
          )}

          {/* 월간 목표 입력 (총매출, 신규매출, 총건수, 신규건수만) */}
          {type === 'monthly' && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                💰 {t('monthlyRevenueTarget')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalRevenueTarget')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetRevenue)}
                    onChange={(e) => setTargetRevenue(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('yen')}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalNewRevenueTarget')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetNewRevenue)}
                    onChange={(e) => setTargetNewRevenue(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('yen')}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalContractsTarget')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetContracts)}
                    onChange={(e) => setTargetContracts(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('contracts')}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalNewContractsTarget')}</label>
                  <input
                    type="text"
                    value={formatNumberWithCommas(targetNewContracts)}
                    onChange={(e) => setTargetNewContracts(parseFormattedNumber(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('contracts')}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ℹ️ {t('monthlyTargetInfo')}
              </p>
            </div>
          )}

          {/* 주의사항 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ {type === 'weekly' ? t('bulkTargetWeeklyWarning') : t('bulkTargetMonthlyWarning')}
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? t('savingMeeting') : t('saveTargets')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

