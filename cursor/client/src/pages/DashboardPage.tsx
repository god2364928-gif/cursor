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
  ArrowDownRight
} from 'lucide-react'
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

export default function DashboardPage() {
  const { t } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [managerFilter, setManagerFilter] = useState<string>('all')
  const [users, setUsers] = useState<User[]>([])
  const [performanceData, setPerformanceData] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

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

  // 저성과자 지원 핸들러
  const handleSupport = (managerName: string) => {
    // 문의 배정 페이지로 이동하거나 알림 보내기
    alert(`${managerName}님에게 피드백을 전송하거나 미배정 문의를 할당하세요.`)
    // 실제 구현: window.location.href = '/inquiry-leads'
  }

  if (loading && !performanceData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    )
  }

  if (!performanceData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">데이터를 불러올 수 없습니다</div>
      </div>
    )
  }

  // 활동량 차트 데이터
  const activityChartData = [
    { name: '신규 영업', value: performanceData.activities.newSales, color: COLORS.newSales },
    { name: '리타겟팅', value: performanceData.activities.retargeting, color: COLORS.retargeting },
    { name: '기존 관리', value: performanceData.activities.existingCustomer, color: COLORS.existing }
  ]

  // 매출 구성비 차트 데이터
  const salesChartData = [
    { name: '신규 매출', value: performanceData.salesBreakdown.newSales, color: COLORS.newRevenue },
    { name: '연장 매출', value: performanceData.salesBreakdown.renewalSales, color: COLORS.renewalRevenue }
  ]

  // 리타겟팅 연락 주기 차트 데이터
  const retargetingCycleData = [
    { name: '주기 미도래', value: performanceData.retargetingAlert.upcoming, fill: '#10b981' },
    { name: '이번 주 예정', value: performanceData.retargetingAlert.dueThisWeek, fill: '#f59e0b' },
    { name: '연락 지연', value: performanceData.retargetingAlert.overdue, fill: '#ef4444' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">성과 분석 대시보드</h1>
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
                  주간 통계
                </Button>
                <Button
                  variant={periodType === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('monthly')}
                >
                  월간 통계
                </Button>
                <Button
                  variant={periodType === 'custom' ? 'default' : 'outline'}
                  onClick={() => setPeriodType('custom')}
                >
                  기간 선택
                </Button>
              </div>

              {/* 날짜 선택 및 빠른 선택 */}
              <div className="flex gap-4 items-center flex-wrap">
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">시작일:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2 items-center">
                  <label className="text-sm font-medium">종료일:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="border rounded px-3 py-2"
                  />
                </div>
                <Button onClick={handlePreviousPeriod} variant="outline">
                  이전 {periodType === 'weekly' ? '주' : '달'}
                </Button>
                <Button onClick={handleCurrentPeriod}>
                  이번 {periodType === 'weekly' ? '주' : '달'}
                </Button>
                <Button onClick={handleNextPeriod} variant="outline">
                  다음 {periodType === 'weekly' ? '주' : '달'}
                </Button>
                
                {/* 담당자 필터 */}
                <div className="flex gap-2 items-center ml-auto">
                  <label className="text-sm font-medium">담당자:</label>
                  <select
                    value={managerFilter}
                    onChange={e => setManagerFilter(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="all">전체</option>
                    {user && <option value={user.name}>{user.name} (나)</option>}
                    {users.filter(u => u.name !== user?.name).map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* 총 매출액 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 매출액</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(performanceData.summary.totalSales)}원
              </div>
              <div className="flex items-center text-xs mt-1">
                {performanceData.summary.comparedToPrevious.salesChange >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">
                      +{performanceData.summary.comparedToPrevious.salesChange.toFixed(1)}%
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">
                      {performanceData.summary.comparedToPrevious.salesChange.toFixed(1)}%
                    </span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">전 기간 대비</span>
              </div>
            </CardContent>
          </Card>

          {/* 예상 파이프라인 (신규) */}
          <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">예상 파이프라인</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {formatNumber(performanceData.summary.potentialRevenue)}원
              </div>
              <p className="text-xs text-blue-600 mt-1">현재 진행 중인 상담 기준</p>
              </CardContent>
            </Card>

          {/* 계약률 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">계약률</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
              <div className="text-2xl font-bold">
                {performanceData.summary.contractRate.toFixed(1)}%
              </div>
              <div className="flex items-center text-xs mt-1">
                {performanceData.summary.comparedToPrevious.contractRateChange >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    <span className="text-green-500">
                      +{performanceData.summary.comparedToPrevious.contractRateChange.toFixed(1)}%p
                    </span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-red-500">
                      {performanceData.summary.comparedToPrevious.contractRateChange.toFixed(1)}%p
                    </span>
                  </>
                )}
                <span className="text-muted-foreground ml-1">전 기간 대비</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                계약 {performanceData.summary.contractCount}건 / 활동 {performanceData.summary.totalActivities}건
              </p>
              </CardContent>
            </Card>

          {/* 총 활동량 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">총 활동량</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(performanceData.summary.totalActivities)}건
              </div>
              <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                <div>신규: {performanceData.activities.newSales}건</div>
                <div>리타겟: {performanceData.activities.retargeting}건</div>
                <div>기존: {performanceData.activities.existingCustomer}건</div>
              </div>
            </CardContent>
          </Card>

          {/* 연락 주기 도래 (신규) */}
          <Card className={performanceData.retargetingAlert.overdue > 0 ? 'border-orange-300 bg-orange-50' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">연락 주기 도래</CardTitle>
              <Users className={`h-4 w-4 ${performanceData.retargetingAlert.overdue > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceData.retargetingAlert.overdue + performanceData.retargetingAlert.dueThisWeek}건
              </div>
              <p className="text-xs text-orange-600 mt-1">
                지연 {performanceData.retargetingAlert.overdue}건 / 이번 주 {performanceData.retargetingAlert.dueThisWeek}건
              </p>
            </CardContent>
          </Card>

          {/* 미배정 문의 */}
          <Card className={performanceData.summary.unassignedInquiries > 0 ? 'border-red-300 bg-red-50' : ''}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">미배정 문의</CardTitle>
              <AlertCircle className={`h-4 w-4 ${performanceData.summary.unassignedInquiries > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
              </CardHeader>
              <CardContent>
              <div className={`text-2xl font-bold ${performanceData.summary.unassignedInquiries > 0 ? 'text-red-600' : ''}`}>
                {formatNumber(performanceData.summary.unassignedInquiries)}건
                  </div>
              {performanceData.summary.unassignedInquiries > 0 && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                  확인 필요
                </p>
              )}
              </CardContent>
            </Card>
          </div>

        {/* Middle Charts */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* 활동량 비교 막대 차트 */}
          <Card>
            <CardHeader>
              <CardTitle>활동량 비교</CardTitle>
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
              <CardTitle>매출 구성비</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => 
                      `${name}: ${formatNumber(value)}원 (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {salesChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatNumber(value) + '원'} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center text-sm text-muted-foreground">
                <div>총 매출: {formatNumber(performanceData.summary.totalSales)}원</div>
              </div>
            </CardContent>
          </Card>

          {/* 리타겟팅 연락 주기 현황 (신규) */}
          <Card>
            <CardHeader>
              <CardTitle>리타겟팅 연락 주기</CardTitle>
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
                  {performanceData.retargetingAlert.overdue > 0 
                    ? `⚠️ ${performanceData.retargetingAlert.overdue}명에게 즉시 연락 필요` 
                    : '✓ 모든 고객 관리 중'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 담당자별 성과 테이블 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              담당자별 성과
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">담당자</th>
                    <th className="px-4 py-3 text-right font-medium">신규 연락</th>
                    <th className="px-4 py-3 text-right font-medium">리타겟 연락</th>
                    <th className="px-4 py-3 text-right font-medium">기존 관리</th>
                    <th className="px-4 py-3 text-right font-medium">계약 건수</th>
                    <th className="px-4 py-3 text-right font-medium">매출 합계</th>
                    <th className="px-4 py-3 text-right font-medium">계약률</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {performanceData.managerStats.map((stat) => {
                    const isLowPerformance = stat.contractRate < 5
                    const totalContacts = stat.newContacts + stat.retargetingContacts + stat.existingContacts
                    return (
                      <tr 
                        key={stat.managerName}
                        className={isLowPerformance ? 'bg-red-50' : 'hover:bg-gray-50'}
                      >
                        <td className="px-4 py-3 font-medium">{stat.managerName}</td>
                        <td className="px-4 py-3 text-right">{stat.newContacts}</td>
                        <td className="px-4 py-3 text-right">{stat.retargetingContacts}</td>
                        <td className="px-4 py-3 text-right">{stat.existingContacts}</td>
                        <td className="px-4 py-3 text-right font-medium">{stat.contractCount}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatNumber(stat.totalSales)}원</td>
                        <td className={`px-4 py-3 text-right font-bold ${isLowPerformance ? 'text-red-600' : 'text-green-600'}`}>
                          <div className="flex items-center justify-end gap-2">
                            <span>{stat.contractRate.toFixed(1)}%</span>
                            {isLowPerformance && totalContacts > 0 && (
                              <button
                                onClick={() => handleSupport(stat.managerName)}
                                className="h-6 w-6 flex items-center justify-center rounded hover:bg-red-100 transition-colors"
                                title="피드백 보내기 또는 지원"
                              >
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {performanceData.managerStats.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  선택한 기간에 데이터가 없습니다
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
