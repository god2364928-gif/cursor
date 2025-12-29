import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { PerformanceStats, User } from '../types'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { formatNumber } from '../lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Activity, 
  AlertCircle,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
} from 'lucide-react'
import MeetingModal from '../components/MeetingModal'
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { format, subDays, subWeeks, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

type PeriodType = 'weekly' | 'monthly' | 'custom'

const COLORS = {
  newSales: '#3b82f6',      // 파랑
  retargeting: '#a855f7',   // 보라
  existing: '#10b981',      // 초록
  newRevenue: '#3b82f6',    // 신규 매출
  renewalRevenue: '#f59e0b' // 연장 매출
}

// 안전한 숫자 포맷팅 헬퍼 함수
const safeToFixed = (value: number | undefined | null, decimals: number = 1): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.' + '0'.repeat(decimals)
  return value.toFixed(decimals)
}

// 안전한 퍼센트 계산 함수
const safePercent = (numerator: number | undefined, denominator: number | undefined, decimals: number = 0): string => {
  if (!numerator || !denominator || denominator === 0) return '0.' + '0'.repeat(decimals)
  const result = (numerator / denominator) * 100
  if (isNaN(result)) return '0.' + '0'.repeat(decimals)
  return result.toFixed(decimals)
}

export default function DashboardPage() {
  const { t, language } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  // 마케터는 본인, admin/user는 전체가 기본값
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [users, setUsers] = useState<User[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false)

  // 날짜 초기 설정
  useEffect(() => {
    const today = new Date()
    if (periodType === 'weekly') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // 월요일 시작
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      setStartDate(format(weekStart, 'yyyy-MM-dd'))
      setEndDate(format(weekEnd, 'yyyy-MM-dd'))
    } else if (periodType === 'monthly') {
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      setStartDate(format(monthStart, 'yyyy-MM-dd'))
      setEndDate(format(monthEnd, 'yyyy-MM-dd'))
    }
  }, [periodType])

  // 사용자 목록 가져오기
  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/auth/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }, [])

  // 성과 데이터 가져오기
  const fetchPerformanceData = useCallback(async () => {
    if (!startDate || !endDate) return
    
    try {
      setLoading(true)
      const response = await api.get('/dashboard/performance-stats', {
        params: { startDate, endDate, manager: managerFilter }
      })
      setPerformanceData(response.data)
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, managerFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // user가 로드되면 기본 필터값 설정 (마케터는 본인, 나머지는 전체)
  useEffect(() => {
    if (user && managerFilter === 'all' && user.role === 'marketer') {
      setManagerFilter(user.name)
    }
  }, [user])

  useEffect(() => {
    if (startDate && endDate) {
      fetchPerformanceData()
    }
  }, [startDate, endDate, managerFilter, fetchPerformanceData])

  // 빠른 날짜 선택 핸들러
  const handlePreviousPeriod = () => {
    if (periodType === 'weekly') {
      const newStart = subWeeks(new Date(startDate), 1)
      const newEnd = subWeeks(new Date(endDate), 1)
      setStartDate(format(newStart, 'yyyy-MM-dd'))
      setEndDate(format(newEnd, 'yyyy-MM-dd'))
    } else if (periodType === 'monthly') {
      const currentStart = new Date(startDate)
      const prevMonthStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1)
      const prevMonthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0)
      setStartDate(format(prevMonthStart, 'yyyy-MM-dd'))
      setEndDate(format(prevMonthEnd, 'yyyy-MM-dd'))
    }
  }

  const handleCurrentPeriod = () => {
    const today = new Date()
    if (periodType === 'weekly') {
      const weekStart = startOfWeek(today, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
      setStartDate(format(weekStart, 'yyyy-MM-dd'))
      setEndDate(format(weekEnd, 'yyyy-MM-dd'))
    } else if (periodType === 'monthly') {
      const monthStart = startOfMonth(today)
      const monthEnd = endOfMonth(today)
      setStartDate(format(monthStart, 'yyyy-MM-dd'))
      setEndDate(format(monthEnd, 'yyyy-MM-dd'))
    }
  }

  const handleNextPeriod = () => {
    if (periodType === 'weekly') {
      const newStart = new Date(startDate)
      newStart.setDate(newStart.getDate() + 7)
      const newEnd = new Date(endDate)
      newEnd.setDate(newEnd.getDate() + 7)
      setStartDate(format(newStart, 'yyyy-MM-dd'))
      setEndDate(format(newEnd, 'yyyy-MM-dd'))
    } else if (periodType === 'monthly') {
      const currentStart = new Date(startDate)
      const nextMonthStart = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 1)
      const nextMonthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 2, 0)
      setStartDate(format(nextMonthStart, 'yyyy-MM-dd'))
      setEndDate(format(nextMonthEnd, 'yyyy-MM-dd'))
    }
  }

  // 저성과자 지엔 핸들러
  const handleSupport = (managerName: string) => {
    // 문의 배정 페이지로 이동하거나 알림 보내기
    alert(`${managerName}님에게 피드백을 전송하거나 미배정 문의를 할당하세요.`)
    // 실제 구현: window.location.href = '/inquiry-leads'
  }

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{t('loading')}</div>
      </div>
    )
  }

  if (!performanceData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{t('dataLoadFailed')}</div>
      </div>
    )
  }

  // 활동량 차트 데이터
  const activityChartData = [
    { name: t('newSalesActivity'), value: performanceData.activities.newSales, color: COLORS.newSales },
    { name: t('retargetingActivity'), value: performanceData.activities.retargeting, color: COLORS.retargeting },
    { name: t('existingManagement'), value: performanceData.activities.existingCustomer, color: COLORS.existing }
  ]

  // 매출 구성비 차트 데이터
  const salesChartData = [
    { name: t('newSales'), value: performanceData.salesBreakdown.newSales, color: COLORS.newRevenue },
    { name: t('renewalSales'), value: performanceData.salesBreakdown.renewalSales, color: COLORS.renewalRevenue }
  ]

  // 리타겟팅 연락 주기 차트 데이터 (안전한 기본값 처리)
  const retargetingCycleData = performanceData.retargetingAlert ? [
    { name: t('cycleNotDue'), value: performanceData.retargetingAlert.upcoming, fill: '#10b981' },
    { name: t('dueThisWeek'), value: performanceData.retargetingAlert.dueThisWeek, fill: '#f59e0b' },
    { name: t('contactDelayed'), value: performanceData.retargetingAlert.overdue, fill: '#ef4444' }
  ] : [
    { name: t('cycleNotDue'), value: 0, fill: '#10b981' },
    { name: t('dueThisWeek'), value: 0, fill: '#f59e0b' },
    { name: t('contactDelayed'), value: 0, fill: '#ef4444' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{t('performanceDashboard')}</h1>
          <Button
            onClick={() => setIsMeetingModalOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-6 py-3 flex items-center gap-2 shadow-lg"
          >
            <Calendar className="w-5 h-5" />
            {t('startMeetingMode')}
          </Button>
        </div>

        {/* 기간 필터 */}
          <Card>
            <CardContent className="p-4">
            <div className="space-y-4">
              {/* 탭 선택 */}
              <div className="flex gap-2">
                <Button
                  variant={periodType === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('weekly')}
                >
                  {t('weeklyStats')}
                </Button>
                <Button
                  variant={periodType === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('monthly')}
                >
                  {t('monthlyStats')}
                </Button>
                <Button
                  variant={periodType === 'custom' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('custom')}
                >
                  {t('periodSelection')}
                </Button>
              </div>

              {/* 날짜 선택 및 빠른 선택 */}
              <div className="flex gap-4 items-center flex-wrap">
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">{t('startDate')}:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">{t('endDate')}:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <Button onClick={handlePreviousPeriod} variant="outline">
                  {periodType === 'weekly' ? t('previousWeek') : t('previousMonth')}
                </Button>
                <Button onClick={handleCurrentPeriod}>
                  {periodType === 'weekly' ? t('currentWeek') : t('currentMonth')}
                </Button>
                <Button onClick={handleNextPeriod} variant="outline">
                  {periodType === 'weekly' ? t('nextWeek') : t('nextMonth')}
                </Button>
                
                {/* 담당자 필터 */}
                <div className="flex gap-2 items-center ml-auto">
                  <label className="text-sm font-medium">{t('manager')}:</label>
                  <select
                    value={managerFilter}
                    onChange={e => setManagerFilter(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="all">{t('all')}</option>
                    {/* 마케터만 표시 */}
                    {users.filter(u => u.role === 'marketer').map(u => (
                      <option key={u.id} value={u.name}>
                        {u.name}{u.id === user?.id ? ` (${t('me')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 총 매출액 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalSales')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(performanceData.summary.totalSales)}{t('yen')}
              </div>
              <div className="flex items-center text-xs mt-1">
                {(performanceData.summary.comparedToPrevious?.salesChange || 0) >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">
                      +{safeToFixed(performanceData.summary.comparedToPrevious?.salesChange)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">
                      {safeToFixed(performanceData.summary.comparedToPrevious?.salesChange)}%
                    </span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">{t('comparedToPrevious')}</span>
              </div>
            </CardContent>
          </Card>

          {/* 예상 파이프라인 (신규) */}
          <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">{t('expectedPipeline')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatNumber(performanceData.summary.potentialRevenue)}{t('yen')}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {t('start')}(5%) + {t('awareness')}(10%) + {t('interest')}(30%) + {t('desire')}(50%) × {t('averageOrderValue')}
              </p>
              </CardContent>
            </Card>

          {/* 계약률 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('contractRate')}</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">
                {safeToFixed(performanceData.summary.contractRate)}%
              </div>
              <div className="flex items-center text-xs mt-1">
                {(performanceData.summary.comparedToPrevious?.contractRateChange || 0) >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">
                      +{safeToFixed(performanceData.summary.comparedToPrevious?.contractRateChange)}%p
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">
                      {safeToFixed(performanceData.summary.comparedToPrevious?.contractRateChange)}%p
                    </span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">{t('comparedToPrevious')}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('contracts')} {performanceData.summary.contractCount}{t('cases')} / {t('totalActivity')} {performanceData.summary.totalActivities}{t('cases')}
              </p>
              </CardContent>
            </Card>

          {/* 리타 계약률 */}
          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">{t('retargetingContractRate')}</CardTitle>
              <Target className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {safeToFixed(performanceData.summary.retargetingContractRate)}%
              </div>
              <p className="text-xs text-purple-600 mt-1">{t('retargetingActivity')}</p>
            </CardContent>
          </Card>

          {/* 연장률 */}
          <Card className="bg-green-50 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">{t('renewalRate')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {safeToFixed(performanceData.summary.renewalRate)}%
              </div>
              <p className="text-xs text-green-600 mt-1">{t('previousMonth')}</p>
              <p className="text-[10px] text-green-500 mt-1 opacity-70">
                {language === 'ko' ? '당월 연장 건수 ÷ 전월 계약 건수' : '当月延長件数 ÷ 前月契約件数'}
              </p>
            </CardContent>
          </Card>

          {/* 총 활동량 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('totalActivity')}</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(performanceData.summary.totalActivities)}{t('cases')}
                  </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <div>{t('newSalesActivity')}: {performanceData.activities.newSales}{t('cases')}</div>
                <div>{t('retargetingActivity')}: {performanceData.activities.retargeting}{t('cases')}</div>
                <div>{t('existingManagement')}: {performanceData.activities.existingCustomer}{t('cases')}</div>
                </div>
              </CardContent>
            </Card>

          {/* 연락 주기 도래 (신규) */}
          <Card className={performanceData.retargetingAlert && performanceData.retargetingAlert.overdue > 0 ? 'border-orange-300 bg-orange-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('contactCycle')}</CardTitle>
              <Users className={`h-4 w-4 ${performanceData.retargetingAlert && performanceData.retargetingAlert.overdue > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceData.retargetingAlert 
                  ? performanceData.retargetingAlert.overdue + performanceData.retargetingAlert.dueThisWeek 
                  : 0}{t('cases')}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {t('contactDelayed')} {performanceData.retargetingAlert?.overdue || 0}{t('cases')} / {t('dueThisWeek')} {performanceData.retargetingAlert?.dueThisWeek || 0}{t('cases')}
              </p>
            </CardContent>
          </Card>

          {/* 평균 객단가 */}
          <Card className="bg-indigo-50 border-indigo-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-700">{t('averageOrderValue')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-indigo-900">
                {formatNumber(performanceData.summary.averageOrderValue)}{t('yen')}
                  </div>
              <p className="text-xs text-indigo-600 mt-1">
                {t('totalSales')} / {t('contracts')}
                </p>
              </CardContent>
            </Card>
          </div>

        {/* Middle Charts */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* 활동량 비교 막대 차트 */}
            <Card>
              <CardHeader>
              <CardTitle>{t('activityComparison')}</CardTitle>
              </CardHeader>
              <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={activityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8">
                    {activityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* 매출 구성비 도넛 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('salesComposition')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={false}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatNumber(value) + t('yen')} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-3">
                <div className="flex justify-center gap-8 text-base">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS.newRevenue}}></div>
                    <span className="font-medium">{t('newSales')}: {formatNumber(performanceData.salesBreakdown.newSales)}{t('yen')} 
                      ({safePercent(performanceData.salesBreakdown.newSales, performanceData.summary.totalSales, 0)}%)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: COLORS.renewalRevenue}}></div>
                    <span className="font-medium">{t('renewalSales')}: {formatNumber(performanceData.salesBreakdown.renewalSales)}{t('yen')} 
                      ({safePercent(performanceData.salesBreakdown.renewalSales, performanceData.summary.totalSales, 0)}%)
                    </span>
                  </div>
                </div>
                <div className="text-center text-base font-bold text-gray-900">
                  {t('totalSales')}: {formatNumber(performanceData.summary.totalSales)}{t('yen')}
                </div>
              </div>
              </CardContent>
            </Card>

          {/* 리타겟팅 연락 주기 현황 (신규) */}
          <Card>
            <CardHeader>
              <CardTitle>{t('retargetingContactCycle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={retargetingCycleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {retargetingCycleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center text-xs text-muted-foreground">
                <div className="text-orange-600 font-medium">
                  {performanceData.retargetingAlert && performanceData.retargetingAlert.overdue > 0 
                    ? `⚠️ ${performanceData.retargetingAlert.overdue}${t('people')} ${t('prioritizeDelayed')}` 
                    : `✓ ${t('allCustomersManaged')}`}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 리타겟팅 단계별 현황 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('retargetingStageStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 시작 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('start')}</span>
                  <span className="text-sm font-bold">{performanceData.retargetingStages?.start || 0}{t('people')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((performanceData.retargetingStages?.start || 0) / 
                        Math.max(1, (performanceData.retargetingStages?.start || 0) + 
                        (performanceData.retargetingStages?.awareness || 0) + 
                        (performanceData.retargetingStages?.interest || 0) + 
                        (performanceData.retargetingStages?.desire || 0))) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* 인지 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('awareness')}</span>
                  <span className="text-sm font-bold">{performanceData.retargetingStages?.awareness || 0}{t('people')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-yellow-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((performanceData.retargetingStages?.awareness || 0) / 
                        Math.max(1, (performanceData.retargetingStages?.start || 0) + 
                        (performanceData.retargetingStages?.awareness || 0) + 
                        (performanceData.retargetingStages?.interest || 0) + 
                        (performanceData.retargetingStages?.desire || 0))) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* 흥미 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('interest')}</span>
                  <span className="text-sm font-bold">{performanceData.retargetingStages?.interest || 0}{t('people')}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-500 h-3 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((performanceData.retargetingStages?.interest || 0) / 
                        Math.max(1, (performanceData.retargetingStages?.start || 0) + 
                        (performanceData.retargetingStages?.awareness || 0) + 
                        (performanceData.retargetingStages?.interest || 0) + 
                        (performanceData.retargetingStages?.desire || 0))) * 100)}%` 
                    }}
                  />
                </div>
              </div>

              {/* 욕망 (강조) */}
              <div className="bg-pink-50 p-3 rounded-lg border-2 border-pink-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-pink-700">{t('desire')} ⭐ ({t('highPotential')})</span>
                  <span className="text-sm font-bold text-pink-700">{performanceData.retargetingStages?.desire || 0}{t('people')}</span>
                </div>
                <div className="w-full bg-pink-200 rounded-full h-4">
                  <div
                    className="bg-pink-600 h-4 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min(100, ((performanceData.retargetingStages?.desire || 0) / 
                        Math.max(1, (performanceData.retargetingStages?.start || 0) + 
                        (performanceData.retargetingStages?.awareness || 0) + 
                        (performanceData.retargetingStages?.interest || 0) + 
                        (performanceData.retargetingStages?.desire || 0))) * 100)}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 담당자별 성과 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('managerPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium sticky left-0 bg-gray-100 z-10">{t('manager')}</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-gray-300" colSpan={5}>{t('newSalesActivities')}</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-gray-300" colSpan={3}>{t('retargetingActivity')}</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-gray-300" colSpan={7}>{t('performanceBasedOnResults')}</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-2 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 z-10"></th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('form')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('contactDM')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('line')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('contactPhone')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 border-r-2 border-gray-300">{t('contactMail')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('contacts')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('contracts')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600 border-r-2 border-gray-300">{t('contractRate')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('newContracts')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('newSalesRevenue')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('renewalContracts')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('renewalRevenue')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('terminationContracts')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('terminationRevenue')}</th>
                    <th className="px-2 py-2 text-right font-medium text-gray-600">{t('totalRevenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {performanceData.managerStats.map((stat) => {
                    return (
                      <tr 
                        key={stat.managerName}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-2 py-2 font-medium sticky left-0 bg-white z-10">{stat.managerName}</td>
                        <td className="px-2 py-2 text-right">{stat.formCount || 0}</td>
                        <td className="px-2 py-2 text-right">{stat.dmCount || 0}</td>
                        <td className="px-2 py-2 text-right">{stat.lineCount || 0}</td>
                        <td className="px-2 py-2 text-right">{stat.phoneCount || 0}</td>
                        <td className="px-2 py-2 text-right border-r-2 border-gray-300">{stat.mailCount || 0}</td>
                        <td className="px-2 py-2 text-right">{stat.retargetingContacts}</td>
                        <td className="px-2 py-2 text-right font-medium">{stat.retargetingContractCount || 0}</td>
                        <td className="px-2 py-2 text-right font-bold text-purple-600 border-r-2 border-gray-300">
                          {safeToFixed(stat.retargetingContractRate)}%
                        </td>
                        <td className="px-2 py-2 text-right font-medium">{stat.newContractCount || 0}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(stat.newSales || 0)}{t('yen')}</td>
                        <td className="px-2 py-2 text-right font-medium">{stat.renewalCount || 0}</td>
                        <td className="px-2 py-2 text-right">{formatNumber(stat.renewalSales || 0)}{t('yen')}</td>
                        <td className="px-2 py-2 text-right font-medium text-red-600">{stat.terminationCount || 0}</td>
                        <td className="px-2 py-2 text-right text-red-600">{formatNumber(stat.terminationSales || 0)}{t('yen')}</td>
                        <td className="px-2 py-2 text-right font-bold text-green-600">{formatNumber(stat.totalSales)}{t('yen')}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {performanceData.managerStats.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {t('noDataForPeriod')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 회의 모달 */}
      {performanceData && (
        <MeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          performanceData={performanceData}
          users={users}
        />
      )}
    </div>
  )
}
