import { useState, useEffect } from 'react'
import { X, TrendingUp, TrendingDown, Minus, Target, Users, CheckCircle2, AlertCircle, Activity, Zap, Link2 } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { UserTarget, MeetingLog } from '../types'
import BulkTargetModal from './BulkTargetModal'
import { getMarketers } from '../utils/userUtils'

interface MeetingModalProps {
  isOpen: boolean
  onClose: () => void
  performanceData: any
  users: any[]
}

export default function MeetingModal({ isOpen, onClose, performanceData, users }: MeetingModalProps) {
  const currentUser = useAuthStore((state) => state.user)
  const { t } = useI18nStore()
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly')
  const [selectedPeriodOffset, setSelectedPeriodOffset] = useState<number>(1) // 1 = 전주/전달(디폴트), 0 = 이번주/이번달, 2 = 2주전/2달전...
  const [targets, setTargets] = useState<Map<string, UserTarget>>(new Map())
  const [logs, setLogs] = useState<Map<string, MeetingLog>>(new Map())
  const [retargetingAlerts, setRetargetingAlerts] = useState<Map<string, any>>(new Map()) // 담당자별로 저장
  const [monthlyWeeklySum, setMonthlyWeeklySum] = useState<{
    weeks: number[]
    data: Record<string, {
      userId: string
      userName: string
      totalTarget: number
      totalActual: number
      weeklyData: { week: number, target: number, actual: number }[]
    }>
  }>({ weeks: [], data: {} }) // 월간 회의용 주간 합산 데이터
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)

  // 현재 주차/월 계산
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
  }

  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentWeek = getWeekNumber(currentDate)
  const currentMonth = currentDate.getMonth() + 1

  // 검토 대상 주차/월 계산
  const reviewWeek = currentWeek - selectedPeriodOffset <= 0 
    ? 52 + (currentWeek - selectedPeriodOffset)
    : currentWeek - selectedPeriodOffset
  const reviewMonth = currentMonth - selectedPeriodOffset <= 0
    ? 12 + (currentMonth - selectedPeriodOffset)
    : currentMonth - selectedPeriodOffset
  
  // 연도 계산
  let reviewYear = currentYear
  if (tab === 'weekly') {
    const weekDiff = currentWeek - selectedPeriodOffset
    if (weekDiff <= 0) reviewYear = currentYear - 1
  } else {
    const monthDiff = currentMonth - selectedPeriodOffset
    if (monthDiff <= 0) reviewYear = currentYear - 1
  }
  
  // 현재 사용자
  const isCurrentUserTarget = (userId: string) => currentUser?.id === userId
  
  // 수정 가능한 기간인지 확인 (현재 주/월 + 직전 주/월만 가능)
  const canEditPeriod = (() => {
    if (tab === 'weekly') {
      // 주간: 현재 주 또는 직전 주만 수정 가능
      const lastWeek = currentWeek - 1 <= 0 ? 52 : currentWeek - 1
      const lastWeekYear = currentWeek - 1 <= 0 ? currentYear - 1 : currentYear
      
      return (reviewWeek === currentWeek && reviewYear === currentYear) || 
             (reviewWeek === lastWeek && reviewYear === lastWeekYear)
    } else {
      // 월간: 현재 월 또는 직전 월만 수정 가능
      const lastMonth = currentMonth - 1 <= 0 ? 12 : currentMonth - 1
      const lastMonthYear = currentMonth - 1 <= 0 ? currentYear - 1 : currentYear
      
      return (reviewMonth === currentMonth && reviewYear === currentYear) || 
             (reviewMonth === lastMonth && reviewYear === lastMonthYear)
    }
  })()

  // 마케터만 필터링 (퇴사자 제외 — 공용 유틸 사용)
  const marketers = getMarketers(users)


  // 데이터 로드
  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, tab, selectedPeriodOffset])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const periodType = tab
      const weekOrMonth = tab === 'weekly' ? reviewWeek : reviewMonth
      const year = reviewYear

      // 주차/월의 시작일과 종료일 계산
      let startDate: string
      let endDate: string
      
      // 로컬 날짜를 YYYY-MM-DD 형식으로 변환 (UTC 변환 없이 로컬 시간 기준)
      const formatLocalDate = (d: Date) => {
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
      }

      if (tab === 'weekly') {
        // 주차의 시작일과 종료일 계산 (월요일 시작)
        const firstDayOfYear = new Date(year, 0, 1)
        const daysOffset = (weekOrMonth - 1) * 7
        const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
        // 해당 주의 월요일로 조정
        const dayOfWeek = weekStart.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        weekStart.setDate(weekStart.getDate() + mondayOffset)
        
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
        
        startDate = formatLocalDate(weekStart)
        endDate = formatLocalDate(weekEnd)
      } else {
        // 월의 시작일과 종료일
        const monthStart = new Date(year, weekOrMonth - 1, 1)
        const monthEnd = new Date(year, weekOrMonth, 0)
        startDate = formatLocalDate(monthStart)
        endDate = formatLocalDate(monthEnd)
      }

      // === 성능 최적화: 모든 API를 병렬로 호출 ===
      // 필수 API들
      const [targetsRes, logsRes, salesTrackingStatsRes] = await Promise.all([
        api.get('/meeting/targets', { params: { periodType, year, weekOrMonth } }),
        api.get('/meeting/logs', { params: { meetingType: tab, year, weekOrMonth } }),
        api.get('/meeting/sales-tracking-stats', { params: { periodType, year, weekOrMonth } })
      ])

      // 벌크 API 시도 (실패시 기존 방식으로 폴백)
      let performanceByUser: Record<string, any> = {}
      let useBulkApi = false
      
      try {
        const allPerformanceRes = await api.get('/meeting/all-marketers-performance', { params: { startDate, endDate } })
        performanceByUser = allPerformanceRes.data?.performanceByUser || {}
        useBulkApi = Object.keys(performanceByUser).length > 0
      } catch (bulkError) {
        console.warn('Bulk API failed, falling back to individual calls:', bulkError)
        useBulkApi = false
      }

      // 월간 회의용 주간 합산 데이터
      let weeklySumRes = { data: { weeks: [], data: {} } }
      if (tab === 'monthly') {
        try {
          weeklySumRes = await api.get('/meeting/weekly-sum-for-month', { params: { year, month: weekOrMonth } })
        } catch (e) {
          console.warn('Weekly sum API failed:', e)
        }
      }

      const salesTrackingStats: Record<string, number> = salesTrackingStatsRes.data?.stats || {}

      // 데이터 매핑
      const targetsMap = new Map<string, UserTarget>()
      const logsMap = new Map<string, MeetingLog>()
      const alertsMap = new Map<string, any>()

      // 벌크 API 실패 시 기존 방식으로 개별 호출
      if (!useBulkApi) {
        const performancePromises = marketers.map(user => 
          api.get('/dashboard/performance-stats', {
            params: { startDate, endDate, manager: user.name }
          }).then(res => ({ userId: user.id, userName: user.name, data: res.data }))
            .catch(() => ({ userId: user.id, userName: user.name, data: null }))
        )
        const performanceResults = await Promise.all(performancePromises)
        
        for (const { userId, userName, data } of performanceResults) {
          let stat = null
          if (data?.managerStats && data.managerStats.length > 0) {
            stat = data.managerStats.find((s: any) => s.managerName === userName)
            if (!stat) {
              const normalizedUserName = userName.replace(/﨑/g, '崎')
              stat = data.managerStats.find((s: any) => 
                s.managerName.replace(/﨑/g, '崎') === normalizedUserName
              )
            }
          }
          if (stat) {
            performanceByUser[userId] = {
              ...stat,
              retargetingAlert: data?.retargetingAlert || { dueThisWeek: 0, overdue: 0, upcoming: 0 }
            }
          }
        }
      }

      for (const user of marketers) {
        // 벌크 API 또는 폴백 결과에서 해당 담당자 데이터 추출
        const stat = performanceByUser[user.id]

        // 실제 성과 데이터 추출
        let actual = {
          actualNewSales: 0,
          actualRetargeting: 0,
          actualExisting: 0,
          actualRevenue: 0,
          actualContracts: 0,
          actualNewRevenue: 0,
          actualNewContracts: 0,
          actualRetargetingCustomers: 0,
          actualForm: 0,
          actualDm: 0,
          actualLine: 0,
          actualPhone: 0,
          actualEmail: 0
        }

        if (stat) {
          actual = {
            actualNewSales: (stat.formCount || 0) + (stat.dmCount || 0) + (stat.lineCount || 0) + (stat.phoneCount || 0) + (stat.mailCount || 0),
            actualRetargeting: stat.retargetingContacts || 0,
            actualExisting: stat.existingContacts || 0,
            actualRevenue: stat.totalSales || 0,
            actualContracts: (stat.newContractCount || 0) + (stat.renewalCount || 0) + (stat.terminationCount || 0),
            actualNewRevenue: stat.newSales || 0,
            actualNewContracts: stat.newContractCount || 0,
            actualRetargetingCustomers: 0,
            actualForm: stat.formCount || 0,
            actualDm: stat.dmCount || 0,
            actualLine: stat.lineCount || 0,
            actualPhone: stat.phoneCount || 0,
            actualEmail: stat.mailCount || 0
          }
        }

        // 담당자별 리타겟팅 알림 저장
        alertsMap.set(user.id, stat?.retargetingAlert || { dueThisWeek: 0, overdue: 0, upcoming: 0 })

        // 목표 데이터
        const targetData = targetsRes.data.find((t: any) => t.user_id === user.id)
        targetsMap.set(user.id, {
          userId: user.id,
          userName: user.name,
          targetNewSales: targetData?.target_new_sales || 0,
          targetRetargeting: targetData?.target_retargeting || 0,
          targetExisting: targetData?.target_existing || 0,
          targetRevenue: targetData?.target_revenue || 0,
          targetContracts: targetData?.target_contracts || 0,
          targetNewRevenue: targetData?.target_new_revenue || 0,
          targetNewContracts: targetData?.target_new_contracts || 0,
          targetRetargetingCustomers: targetData?.target_retargeting_customers || 0,
          targetForm: targetData?.target_form || 0,
          targetDm: targetData?.target_dm || 0,
          targetLine: targetData?.target_line || 0,
          targetPhone: targetData?.target_phone || 0,
          targetEmail: targetData?.target_email || 0,
          ...actual,
          // 영업 이력 히스토리에서 자동 집계된 고유 고객 수 (중복 제거됨)
          actualRetargetingCustomers: salesTrackingStats[user.id] || 0
        })

        // 로그 데이터
        const logData = logsRes.data.find((l: any) => l.user_id === user.id)
        logsMap.set(user.id, {
          userId: user.id,
          userName: user.name,
          reflection: logData?.reflection || '',
          actionPlan: logData?.action_plan || ''
        })
      }

      setTargets(targetsMap)
      setLogs(logsMap)
      setRetargetingAlerts(alertsMap)
      setMonthlyWeeklySum(weeklySumRes.data)
    } catch (error) {
      console.error('Failed to load meeting data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 목표 저장 (본인만, 현재 주/월 + 직전 주/월만 가능)
  const saveTarget = async (userId: string, field: string, value: number) => {
    // 권한 체크: 본인이 아니거나 수정 불가능한 기간이면 저장 불가
    if (!isCurrentUserTarget(userId) || !canEditPeriod) {
      return
    }
    
    const target = targets.get(userId)
    if (!target) return

    const updated = { ...target, [field]: value }
    setTargets(new Map(targets.set(userId, updated)))

    try {
      await api.post('/meeting/targets', {
        userId,
        periodType: tab,
        year: reviewYear,
        weekOrMonth: tab === 'weekly' ? reviewWeek : reviewMonth,
        targetNewSales: updated.targetNewSales,
        targetRetargeting: updated.targetRetargeting,
        targetExisting: updated.targetExisting,
        targetRevenue: updated.targetRevenue,
        targetContracts: updated.targetContracts,
        targetNewRevenue: updated.targetNewRevenue,
        targetNewContracts: updated.targetNewContracts,
        targetRetargetingCustomers: updated.targetRetargetingCustomers,
        actualRetargetingCustomers: updated.actualRetargetingCustomers,
        // 5개 방식별 목표 추가
        targetForm: updated.targetForm,
        targetDm: updated.targetDm,
        targetLine: updated.targetLine,
        targetPhone: updated.targetPhone,
        targetEmail: updated.targetEmail
      })
    } catch (error) {
      console.error('Failed to save target:', error)
    }
  }

  // 목표 일괄 설정 핸들러
  const handleBulkSaveTargets = async (targets: any, numberOfPeriods: number) => {
    if (!currentUser) return

    try {
      setIsSaving(true)
      
      // 현재 주차/월부터 numberOfPeriods만큼 반복 (과거는 제외)
      for (let i = 0; i < numberOfPeriods; i++) {
        let targetYear = currentYear
        let targetPeriod = 0
        
        if (tab === 'weekly') {
          targetPeriod = currentWeek + i
          // 주차가 52를 넘으면 다음 해로
          if (targetPeriod > 52) {
            targetYear++
            targetPeriod = targetPeriod - 52
          }
        } else {
          targetPeriod = currentMonth + i
          // 월이 12를 넘으면 다음 해로
          if (targetPeriod > 12) {
            targetYear++
            targetPeriod = targetPeriod - 12
          }
        }

        // API 호출
        await api.post('/meeting/targets', {
          userId: currentUser.id,
          periodType: tab,
          year: targetYear,
          weekOrMonth: targetPeriod,
          // 주간 목표
          targetNewSales: targets.targetForm + targets.targetDm + targets.targetLine + targets.targetPhone + targets.targetEmail || 0,
          targetRetargeting: targets.targetRetargeting || 0,
          targetExisting: targets.targetExisting || 0,
          targetRetargetingCustomers: targets.targetRetargetingCustomers || 0,
          targetForm: targets.targetForm || 0,
          targetDm: targets.targetDm || 0,
          targetLine: targets.targetLine || 0,
          targetPhone: targets.targetPhone || 0,
          targetEmail: targets.targetEmail || 0,
          // 월간 목표
          targetRevenue: targets.targetRevenue || 0,
          targetContracts: targets.targetContracts || 0,
          targetNewRevenue: targets.targetNewRevenue || 0,
          targetNewContracts: targets.targetNewContracts || 0,
          // 실적은 0으로 초기화
          actualRetargetingCustomers: 0
        })
      }

      alert(t('savedMeeting'))
      // 데이터 다시 로드
      await loadData()
    } catch (error) {
      console.error('Failed to save bulk targets:', error)
      alert(t('saveFailedMeeting'))
    } finally {
      setIsSaving(false)
    }
  }

  // 회의 로그 저장
  const saveLog = async (userId: string) => {
    const log = logs.get(userId)
    const target = targets.get(userId)
    if (!log) return

    setIsSaving(true)
    try {
      await api.post('/meeting/logs', {
        userId,
        meetingType: tab,
        year: reviewYear,
        weekOrMonth: tab === 'weekly' ? reviewWeek : reviewMonth,
        reflection: log.reflection,
        actionPlan: log.actionPlan,
        snapshotData: target ? {
          actualNewSales: target.actualNewSales,
          actualRetargeting: target.actualRetargeting,
          actualExisting: target.actualExisting,
          actualRevenue: target.actualRevenue,
          actualContracts: target.actualContracts
        } : {}
      })
      alert(t('savedMeeting'))
    } catch (error) {
      console.error('Failed to save log:', error)
      alert(t('saveFailedMeeting'))
    } finally {
      setIsSaving(false)
    }
  }

  // 달성률 계산 및 표시
  const getAchievementRate = (actual: number, target: number) => {
    if (target === 0) return 0
    return Math.round((actual / target) * 100)
  }

  const getStatusIcon = (rate: number) => {
    if (rate >= 100) return <CheckCircle2 className="w-5 h-5 text-green-600" />
    if (rate >= 80) return <Minus className="w-5 h-5 text-yellow-600" />
    return <AlertCircle className="w-5 h-5 text-red-600" />
  }

  const getStatusColor = (rate: number) => {
    if (rate >= 100) return 'bg-green-50 border-green-300'
    if (rate >= 80) return 'bg-yellow-50 border-yellow-300'
    return 'bg-red-50 border-red-300'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold">{t('meetingReviewMode')}</h2>
          </div>
          <div className="flex items-center gap-4">
            {/* 탭 */}
            <div className="flex gap-2 border rounded-lg p-1">
              <button
                className={`px-4 py-2 rounded ${tab === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => {
                  setTab('weekly')
                  setSelectedPeriodOffset(1) // 디폴트: 전주
                }}
              >
                {t('weeklyMeeting')}
              </button>
              <button
                className={`px-4 py-2 rounded ${tab === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}
                onClick={() => {
                  setTab('monthly')
                  setSelectedPeriodOffset(1) // 디폴트: 전달
                }}
              >
                {t('monthlyMeeting')}
              </button>
            </div>
            
            {/* 목표 일괄 설정 버튼 */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              title={t('bulkSetTargets')}
            >
              <Zap className="w-4 h-4" />
              {t('bulkSetTargets')}
            </button>

            {/* 주차/월 선택 드롭다운 */}
            <div className="flex items-center gap-2">
              <select
                value={selectedPeriodOffset}
                onChange={(e) => setSelectedPeriodOffset(parseInt(e.target.value))}
                className="border rounded-lg px-3 py-2 bg-white text-sm font-medium min-w-[140px]"
              >
                <option value={0}>
                  {tab === 'weekly' 
                    ? `${t('thisWeek')} (${currentYear}${t('year')} ${currentWeek}${t('weekPerformance')})` 
                    : `${t('thisMonth')} (${currentYear}${t('year')} ${currentMonth}${t('monthPerformance')})`
                  }
                </option>
                <option value={1}>
                  {tab === 'weekly' 
                    ? `${t('lastWeek')} (${reviewYear}${t('year')} ${reviewWeek}${t('weekPerformance')})` 
                    : `${t('lastMonth')} (${reviewYear}${t('year')} ${reviewMonth}${t('monthPerformance')})`
                  }
                </option>
                <option value={2}>
                  {tab === 'weekly' ? `2${t('weeksAgo')}` : `2${t('monthsAgo')}`}
                </option>
                <option value={3}>
                  {tab === 'weekly' ? `3${t('weeksAgo')}` : `3${t('monthsAgo')}`}
                </option>
                <option value={4}>
                  {tab === 'weekly' ? `4${t('weeksAgo')}` : `4${t('monthsAgo')}`}
                </option>
              </select>
            </div>
            
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="text-lg">{t('loadingDataMeeting')}</div>
            </div>
          ) : (
            <>
              {/* 담당자별 섹션 */}
              {marketers.map(user => {
                const target = targets.get(user.id)
                const log = logs.get(user.id)
                const canEditTarget = isCurrentUserTarget(user.id) && canEditPeriod
                // 월간 회의에서는 5대 수단, 리타겟팅, 기존 관리 목표는 자동 계산되므로 수정 불가
                const canEditMonthlyAutoTarget = tab === 'weekly' && canEditTarget
                // 월간 매출 목표는 수정 가능
                const canEditMonthlyRevenue = canEditTarget

                if (!target || !log) return null

                const newSalesRate = getAchievementRate(target.actualNewSales, target.targetNewSales)
                const retargetingRate = getAchievementRate(target.actualRetargeting, target.targetRetargeting)
                const existingRate = getAchievementRate(target.actualExisting, target.targetExisting)
                const revenueRate = getAchievementRate(target.actualRevenue, target.targetRevenue)
                const contractsRate = getAchievementRate(target.actualContracts, target.targetContracts)
                // 월간 회의용 신규 매출/계약 달성률
                const newRevenueRate = getAchievementRate(target.actualNewRevenue, target.targetNewRevenue)
                const newContractsRate = getAchievementRate(target.actualNewContracts, target.targetNewContracts)
                // 리타겟팅 고객 수 달성률
                const retargetingCustomersRate = getAchievementRate(target.actualRetargetingCustomers, target.targetRetargetingCustomers)
                // 5개 방식별 달성률
                const formRate = getAchievementRate(target.actualForm, target.targetForm)
                const dmRate = getAchievementRate(target.actualDm, target.targetDm)
                const lineRate = getAchievementRate(target.actualLine, target.targetLine)
                const phoneRate = getAchievementRate(target.actualPhone, target.targetPhone)
                const emailRate = getAchievementRate(target.actualEmail, target.targetEmail)

                return (
                  <div key={user.id} className="border-2 border-gray-200 rounded-lg p-6 space-y-6">
                    {/* 담당자 헤더 */}
                    <div className="flex items-center justify-between border-b pb-4">
                      <h3 className="text-xl font-bold">{user.name}</h3>
                      <div className="text-sm text-gray-600">
                        {tab === 'weekly' ? `${reviewYear}${t('year')} ${reviewWeek}${t('weekPerformance')}` : `${reviewYear}${t('year')} ${reviewMonth}${t('monthPerformance')}`}
                      </div>
                    </div>

                    {/* 목표 달성 현황 */}
                    <div>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        {t('newSalesActivities')} ({t('fiveMethodBreakdown')})
                        {tab === 'monthly' && (
                          <span className="text-xs text-gray-500 font-normal">{t('autoCalculatedFromWeekly')}</span>
                        )}
                      </h4>
                      <div className="grid grid-cols-5 gap-3 mb-4">
                        {/* 폼 */}
                        <div className={`border-2 rounded-lg p-3 ${getStatusColor(formRate)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">📝 {t('form')}</span>
                            {getStatusIcon(formRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetForm}
                                onChange={(e) => saveTarget(user.id, 'targetForm', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-12 px-1 border rounded text-right text-xs ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('actual')}:</span>
                              <span className="font-bold">{target.actualForm}</span>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${formRate >= 100 ? 'text-green-600' : formRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {formRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* DM */}
                        <div className={`border-2 rounded-lg p-3 ${getStatusColor(dmRate)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">📧 {t('contactDM')}</span>
                            {getStatusIcon(dmRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetDm}
                                onChange={(e) => saveTarget(user.id, 'targetDm', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-12 px-1 border rounded text-right text-xs ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('actual')}:</span>
                              <span className="font-bold">{target.actualDm}</span>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${dmRate >= 100 ? 'text-green-600' : dmRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {dmRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 라인 */}
                        <div className={`border-2 rounded-lg p-3 ${getStatusColor(lineRate)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">💬 {t('line')}</span>
                            {getStatusIcon(lineRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetLine}
                                onChange={(e) => saveTarget(user.id, 'targetLine', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-12 px-1 border rounded text-right text-xs ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('actual')}:</span>
                              <span className="font-bold">{target.actualLine}</span>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${lineRate >= 100 ? 'text-green-600' : lineRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {lineRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 전화 */}
                        <div className={`border-2 rounded-lg p-3 ${getStatusColor(phoneRate)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">📞 {t('contactPhone')}</span>
                            {getStatusIcon(phoneRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetPhone}
                                onChange={(e) => saveTarget(user.id, 'targetPhone', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-12 px-1 border rounded text-right text-xs ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('actual')}:</span>
                              <span className="font-bold">{target.actualPhone}</span>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${phoneRate >= 100 ? 'text-green-600' : phoneRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {phoneRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 메일 */}
                        <div className={`border-2 rounded-lg p-3 ${getStatusColor(emailRate)}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium">✉️ {t('contactMail')}</span>
                            {getStatusIcon(emailRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetEmail}
                                onChange={(e) => saveTarget(user.id, 'targetEmail', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-12 px-1 border rounded text-right text-xs ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">{t('actual')}:</span>
                              <span className="font-bold">{target.actualEmail}</span>
                            </div>
                            <div className="text-center">
                              <span className={`text-sm font-bold ${emailRate >= 100 ? 'text-green-600' : emailRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {emailRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 리타겟팅 및 기존 고객 관리 */}
                      <h4 className="font-bold text-lg mb-3 mt-6 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        {t('otherActivities')}
                        {tab === 'monthly' && (
                          <span className="text-xs text-gray-500 font-normal">{t('autoCalculatedFromWeekly')}</span>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">

                        {/* 리타겟팅 */}
                        <div className={`border-2 rounded-lg p-4 ${getStatusColor(retargetingRate)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{t('retargetingContactTarget')}</span>
                            {getStatusIcon(retargetingRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetRetargeting}
                                onChange={(e) => saveTarget(user.id, 'targetRetargeting', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-16 px-1 border rounded text-right ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>{t('actual')}:</span>
                              <span className="font-bold">{target.actualRetargeting}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-lg font-bold ${retargetingRate >= 100 ? 'text-green-600' : retargetingRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {retargetingRate}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 기존 관리 */}
                        <div className={`border-2 rounded-lg p-4 ${getStatusColor(existingRate)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{t('existingCustomerManagement')}</span>
                            {getStatusIcon(existingRate)}
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span>{t('target')}:</span>
                              <input
                                type="number"
                                value={target.targetExisting}
                                onChange={(e) => saveTarget(user.id, 'targetExisting', parseInt(e.target.value) || 0)}
                                readOnly={!canEditMonthlyAutoTarget}
                                className={`w-16 px-1 border rounded text-right ${!canEditMonthlyAutoTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                title={!canEditMonthlyAutoTarget ? (tab === 'monthly' ? t('autoFromWeekly') : t('cannotEditPastOrOthers')) : ''}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span>{t('actual')}:</span>
                              <span className="font-bold">{target.actualExisting}</span>
                            </div>
                            <div className="text-right">
                              <span className={`text-lg font-bold ${existingRate >= 100 ? 'text-green-600' : existingRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {existingRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 총 리타겟팅 고객 수 관리 - 주간/월간 모두 영업 이력 연동 방식 */}
                      <div className="mt-6">
                        {/* 주간/월간 모두 영업 이력 연동 자동 집계 */}
                        <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                          👥 {t('totalRetargetingCustomers')}
                          <span className="flex items-center gap-1 text-xs font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <Link2 className="w-3 h-3" />
                            {t('salesTrackingLinked') || '영업 이력 연동'}
                          </span>
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {/* 목표 리타겟팅 고객 수 */}
                          <div className={`border-2 rounded-lg p-4 ${getStatusColor(retargetingCustomersRate)}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{t('targetCustomerCount')}</span>
                              {getStatusIcon(retargetingCustomersRate)}
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{t('target')}:</span>
                                <input
                                  type="number"
                                  value={target.targetRetargetingCustomers}
                                  onChange={(e) => saveTarget(user.id, 'targetRetargetingCustomers', parseInt(e.target.value) || 0)}
                                  readOnly={!canEditTarget}
                                  className={`w-16 px-1 border rounded text-right ${!canEditTarget ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  title={!canEditTarget ? t('cannotEditPastOrOthers') : ''}
                                />
                                <span>{t('people')}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1">
                                  {t('actual')}:
                                  <Link2 className="w-3 h-3 text-blue-500" title={t('autoFromSalesTracking') || '영업 이력에서 자동 집계'} />
                                </span>
                                <span className="font-bold bg-blue-50 px-2 py-0.5 rounded text-blue-700">{target.actualRetargetingCustomers}</span>
                                <span>{t('people')}</span>
                              </div>
                              <div className="text-right">
                                <span className={`text-lg font-bold ${retargetingCustomersRate >= 100 ? 'text-green-600' : retargetingCustomersRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {retargetingCustomersRate}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* 설명 카드 - 자동 집계 안내 */}
                          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                            <div className="text-sm text-blue-800">
                              <p className="font-medium mb-2 flex items-center gap-1">
                                <Link2 className="w-4 h-4" />
                                {t('autoAggregatedFromHistory') || '영업 이력에서 자동 집계'}
                              </p>
                              <p className="text-xs">• {tab === 'weekly' 
                                ? (t('uniqueCustomersOnly') || '해당 주간 연락한 고유 고객 수')
                                : (t('uniqueCustomersMonthly') || '해당 월간 연락한 고유 고객 수')
                              }</p>
                              <p className="text-xs">• {t('duplicatesRemoved') || '같은 고객에게 여러 번 연락해도 1명으로 집계'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 월간 회의일 경우 매출 지표 추가 */}
                      {tab === 'monthly' && (
                        <>
                          <h4 className="font-bold text-lg mb-3 mt-6 flex items-center gap-2">
                            💰 {t('monthlyRevenueTarget')}
                          </h4>
                          <div className="grid grid-cols-2 gap-4">
                            {/* 총 매출 목표 */}
                            <div className={`border-2 rounded-lg p-4 ${getStatusColor(revenueRate)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{t('totalRevenueTarget')}</span>
                                {getStatusIcon(revenueRate)}
                              </div>
                              <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{t('target')}:</span>
                                <input
                                  type="number"
                                  value={target.targetRevenue}
                                  onChange={(e) => saveTarget(user.id, 'targetRevenue', parseInt(e.target.value) || 0)}
                                  readOnly={!canEditMonthlyRevenue}
                                  className={`w-24 px-1 border rounded text-right ${!canEditMonthlyRevenue ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  title={!canEditMonthlyRevenue ? t('cannotEditPastOrOthers') : ''}
                                />
                                <span>{t('yen')}</span>
                              </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span>{t('actual')}:</span>
                                  <span className="font-bold">{target.actualRevenue.toLocaleString()}{t('yen')}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-bold ${revenueRate >= 100 ? 'text-green-600' : revenueRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {revenueRate}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 총 계약 건수 목표 */}
                            <div className={`border-2 rounded-lg p-4 ${getStatusColor(contractsRate)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{t('totalContractsTarget')}</span>
                                {getStatusIcon(contractsRate)}
                              </div>
                              <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{t('target')}:</span>
                                <input
                                  type="number"
                                  value={target.targetContracts}
                                  onChange={(e) => saveTarget(user.id, 'targetContracts', parseInt(e.target.value) || 0)}
                                  readOnly={!canEditMonthlyRevenue}
                                  className={`w-16 px-1 border rounded text-right ${!canEditMonthlyRevenue ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  title={!canEditMonthlyRevenue ? t('cannotEditPastOrOthers') : ''}
                                />
                              </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span>{t('actual')}:</span>
                                  <span className="font-bold">{target.actualContracts}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-bold ${contractsRate >= 100 ? 'text-green-600' : contractsRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {contractsRate}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 신규 매출 목표 */}
                            <div className={`border-2 rounded-lg p-4 ${getStatusColor(newRevenueRate)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{t('totalNewRevenueTarget')}</span>
                                {getStatusIcon(newRevenueRate)}
                              </div>
                              <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{t('target')}:</span>
                                <input
                                  type="number"
                                  value={target.targetNewRevenue}
                                  onChange={(e) => saveTarget(user.id, 'targetNewRevenue', parseInt(e.target.value) || 0)}
                                  readOnly={!canEditMonthlyRevenue}
                                  className={`w-24 px-1 border rounded text-right ${!canEditMonthlyRevenue ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  title={!canEditMonthlyRevenue ? t('cannotEditPastOrOthers') : ''}
                                />
                                <span>{t('yen')}</span>
                              </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span>{t('actual')}:</span>
                                  <span className="font-bold">{target.actualNewRevenue.toLocaleString()}{t('yen')}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-bold ${newRevenueRate >= 100 ? 'text-green-600' : newRevenueRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {newRevenueRate}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* 신규 계약 건수 목표 */}
                            <div className={`border-2 rounded-lg p-4 ${getStatusColor(newContractsRate)}`}>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{t('totalNewContractsTarget')}</span>
                                {getStatusIcon(newContractsRate)}
                              </div>
                              <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span>{t('target')}:</span>
                                <input
                                  type="number"
                                  value={target.targetNewContracts}
                                  onChange={(e) => saveTarget(user.id, 'targetNewContracts', parseInt(e.target.value) || 0)}
                                  readOnly={!canEditMonthlyRevenue}
                                  className={`w-16 px-1 border rounded text-right ${!canEditMonthlyRevenue ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                                  title={!canEditMonthlyRevenue ? t('cannotEditPastOrOthers') : ''}
                                />
                              </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span>{t('actual')}:</span>
                                  <span className="font-bold">{target.actualNewContracts}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-bold ${newContractsRate >= 100 ? 'text-green-600' : newContractsRate >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                                    {newContractsRate}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* 리타겟팅 연락 알림 (담당자별) */}
                    {(() => {
                      const userAlert = retargetingAlerts.get(user.id)
                      return userAlert && (userAlert.dueThisWeek > 0 || userAlert.overdue > 0 || userAlert.upcoming > 0) && (
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
                          <h4 className="font-bold text-lg mb-3 text-orange-700 flex items-center gap-2">
                            ⏰ {t('retargetingAlert')}
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            {/* 주기 미도래 */}
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <div className="text-xs text-green-600 mb-1">{t('cycleNotDue')}</div>
                              <div className="text-2xl font-bold text-green-700">{userAlert.upcoming || 0}{t('people')}</div>
                            </div>
                            {/* 이번 주 예정 */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                              <div className="text-xs text-yellow-600 mb-1">{t('dueThisWeek')}</div>
                              <div className="text-2xl font-bold text-yellow-700">{userAlert.dueThisWeek || 0}{t('people')}</div>
                            </div>
                            {/* 연락 지연 */}
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <div className="text-xs text-red-600 mb-1">{t('contactDelayed')}</div>
                              <div className="text-2xl font-bold text-red-700">{userAlert.overdue || 0}{t('people')}</div>
                            </div>
                          </div>
                          {userAlert.overdue > 0 && (
                            <p className="text-xs text-orange-600 mt-3">
                              ⚠️ {t('prioritizeDelayed')}
                            </p>
                          )}
                        </div>
                      )
                    })()}

                    {/* 회고 및 계획 */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* 회고 */}
                      <div>
                        <label className="block font-medium mb-2">
                          {tab === 'weekly' ? t('lastWeekReview') : t('lastMonthReview')}
                        </label>
                        <textarea
                          value={log.reflection}
                          onChange={(e) => {
                            const updated = { ...log, reflection: e.target.value }
                            setLogs(new Map(logs.set(user.id, updated)))
                          }}
                          placeholder={t('achievementReasonPlaceholder')}
                          className="w-full h-32 border rounded-lg p-3 text-sm resize-none"
                        />
                      </div>

                      {/* 계획 */}
                      <div>
                        <label className="block font-medium mb-2">
                          {tab === 'weekly' ? t('thisWeekPlan') : t('thisMonthPlan')}
                        </label>
                        <textarea
                          value={log.actionPlan}
                          onChange={(e) => {
                            const updated = { ...log, actionPlan: e.target.value }
                            setLogs(new Map(logs.set(user.id, updated)))
                          }}
                          placeholder={t('actionPlanPlaceholder')}
                          className="w-full h-32 border rounded-lg p-3 text-sm resize-none"
                        />
                      </div>
                    </div>

                    {/* 저장 버튼 */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => saveLog(user.id)}
                        disabled={isSaving}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                      >
                        {isSaving ? t('savingMeeting') : t('saveReviewAndPlan')}
                      </button>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {/* 목표 일괄 설정 모달 */}
      <BulkTargetModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSave={handleBulkSaveTargets}
        type={tab}
        currentWeek={currentWeek}
        currentMonth={currentMonth}
        currentYear={currentYear}
      />
    </div>
  )
}

