import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'
import { DashboardStats, MonthlySales, SalesTrendData } from '../types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { formatNumber } from '../lib/utils'
import { Users, Phone, MessageSquare, DollarSign, Target } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useI18nStore } from '../i18n'
import { useAuthStore } from '../store/authStore'

export default function DashboardPage() {
  const { t } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [monthlySales, setMonthlySales] = useState<MonthlySales[] | SalesTrendData | null>(null)
  const [currentBaseMonth, setCurrentBaseMonth] = useState<number>(new Date().getMonth())
  const [personalStats, setPersonalStats] = useState<any[]>([])
  const [managerFilter, setManagerFilter] = useState<string>(user?.name || 'all')
  const [users, setUsers] = useState<any[]>([])

  // 초기 날짜 설정 (당월 1일 ~ 오늘)
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-11 (0=Jan, 9=Oct)
    
    // 현재 월의 첫째 날
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    // 오늘 날짜
    const todayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    console.log('Initial date setting:', { year, month, firstDayString, todayString })
    setStartDate(firstDayString)
    setEndDate(todayString)
    setCurrentBaseMonth(month) // Initialize base month
  }, [])

  const handlePreviousMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    
    // 현재 기준 월에서 한 달 빼기
    const newBaseMonth = currentBaseMonth - 1
    setCurrentBaseMonth(newBaseMonth)
    
    // 음수가 되면 이전 년도로 넘어가기
    let targetYear = year
    let targetMonth = newBaseMonth
    if (newBaseMonth < 0) {
      targetYear = year - 1
      targetMonth = 11 // 12월
    }
    
    // 해당 월의 첫째 날
    const prevMonthFirstDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
    
    // 해당 월의 마지막 날
    const prevMonthLastDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(new Date(targetYear, targetMonth + 1, 0).getDate()).padStart(2, '0')}`
    
    console.log('DashboardPage previous month:', { targetYear, targetMonth, prevMonthFirstDay, prevMonthLastDay })
    setStartDate(prevMonthFirstDay)
    setEndDate(prevMonthLastDay)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 기준 월을 현재 월로 리셋
    setCurrentBaseMonth(month)
    
    // 현재 월의 첫째 날
    const firstDayString = `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    // 오늘 날짜
    const todayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    console.log('DashboardPage current month:', { year, month, firstDayString, todayString })
    setStartDate(firstDayString)
    setEndDate(todayString)
  }

  const handleNextMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    
    // 현재 기준 월에서 한 달 더하기
    const newBaseMonth = currentBaseMonth + 1
    setCurrentBaseMonth(newBaseMonth)
    
    // 12를 넘으면 다음 년도로 넘어가기
    let targetYear = year
    let targetMonth = newBaseMonth
    if (newBaseMonth > 11) {
      targetYear = year + 1
      targetMonth = 0 // 1월
    }
    
    // 해당 월의 첫째 날
    const nextMonthFirstDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`
    
    // 해당 월의 마지막 날
    const nextMonthLastDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(new Date(targetYear, targetMonth + 1, 0).getDate()).padStart(2, '0')}`
    
    console.log('DashboardPage next month:', { targetYear, targetMonth, nextMonthFirstDay, nextMonthLastDay })
    setStartDate(nextMonthFirstDay)
    setEndDate(nextMonthLastDay)
  }

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await api.get(`/dashboard/stats?startDate=${startDate}&endDate=${endDate}&manager=${managerFilter}`)
      setStats(response.data)
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    }
  }, [startDate, endDate, managerFilter])

  const fetchSalesTrend = useCallback(async () => {
    try {
      const response = await api.get(`/dashboard/sales-trend?manager=${managerFilter}`)
      setMonthlySales(response.data)
    } catch (error) {
      console.error('Failed to fetch sales trend:', error)
    }
  }, [managerFilter])

  const fetchPersonalStats = useCallback(async () => {
    try {
      const response = await api.get('/retargeting/stats/personal')
      setPersonalStats(response.data)
    } catch (error) {
      console.error('Failed to fetch personal stats:', error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get('/auth/users')
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      // 병렬로 API 호출
      // 첫 번째 로드만 로딩 스피너 표시
      if (!initialLoadComplete) {
        setLoading(true)
      }
      Promise.all([
        fetchDashboardStats(),
        fetchSalesTrend(),
        fetchPersonalStats(),
        fetchUsers()
      ]).finally(() => {
        if (!initialLoadComplete) {
          setInitialLoadComplete(true)
        }
        setLoading(false)
      })
    }
  }, [startDate, endDate, managerFilter, fetchDashboardStats, fetchSalesTrend, fetchPersonalStats, fetchUsers])

  if (loading && !stats) {
    return <div>{t('loading')}</div>
  }

  if (!stats) {
    return <div>{t('loading')}</div>
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6'
    }}>
      <div className="bg-white p-6">
        <div className="space-y-6">
          {/* 날짜 필터 */}
          <Card>
            <CardContent className="p-4">
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
                <Button onClick={handlePreviousMonth} variant="outline">{t('previousMonth')}</Button>
                <Button onClick={handleCurrentMonth}>{t('currentMonth')}</Button>
                <Button onClick={handleNextMonth} variant="outline">{t('nextMonth')}</Button>
                <div className="flex gap-2 items-center ml-auto">
                  <label className="text-sm font-medium">{t('manager')}:</label>
                  <select
                    value={managerFilter}
                    onChange={e => setManagerFilter(e.target.value.trim())}
                    className="border rounded px-3 py-2"
                  >
                    <option value="all">{t('all')}</option>
                    <option value={user?.name}>{user?.name} ({t('me')})</option>
                    {users.filter(u => u.name !== user?.name).map(u => (
                      <option key={u.id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 주요 지표 */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('dailyContacts')}</CardTitle>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('totalSales')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(stats.totalSales)}{t('yen')}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('contractStatus')}</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>{t('contractCustomers')}:</span>
                    <span className="font-medium text-blue-600 text-lg">{formatNumber(stats.contractCustomers)}{t('cases')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('newCustomers')}:</span>
                    <span className="font-medium text-green-600 text-lg">{formatNumber(stats.newCustomers)}{t('cases')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('salesProgress')}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>{t('start')}:</span>
                    <span className="font-medium">{formatNumber(stats.dbStatus.salesStart)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('awareness')}:</span>
                    <span className="font-medium">{formatNumber(stats.dbStatus.awareness)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('interest')}:</span>
                    <span className="font-medium">{formatNumber(stats.dbStatus.interest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('desire')}:</span>
                    <span className="font-medium">{formatNumber(stats.dbStatus.desire)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 직원별 리타겟팅 현황 */}
          {personalStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  {t('retargetingProgress')}
                </CardTitle>
                <CardDescription>{t('employeeProgress')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 본인 현황 (크게) */}
                  {personalStats.find(stat => stat.manager === user?.name) && (
                    <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-blue-800">
                          {personalStats.find(stat => stat.manager === user?.name)?.manager}
                        </h3>
                        <span className="text-lg font-bold text-blue-600">
                          {personalStats.find(stat => stat.manager === user?.name)?.total} / 200
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                          className="bg-blue-600 h-4 rounded-full transition-all"
                          style={{ 
                            width: `${(personalStats.find(stat => stat.manager === user?.name)?.total / 200) * 100}%` 
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* 다른 직원들 현황 (작게) */}
                  <div className="grid gap-2 grid-cols-4">
                    {personalStats
                      .filter(stat => stat.manager !== user?.name)
                      .map(stat => (
                        <div key={stat.manager} className="bg-white p-3 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">{stat.manager}</span>
                            <span className="text-sm font-semibold text-gray-600">
                              {stat.total} / 200
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gray-500 h-2 rounded-full transition-all"
                              style={{ width: `${(stat.total / 200) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* 12개월 매출 추이 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('monthlySalesTrend')}</CardTitle>
              <CardDescription>{t('monthlySalesTrendSubtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={(() => {
                  if (!monthlySales) return []
                  
                  if (managerFilter === 'all' && monthlySales && 'totalSales' in monthlySales) {
                    // 전체 선택 시: 전체 매출 데이터를 기준으로 X축 생성
                    return monthlySales.totalSales
                  } else if (Array.isArray(monthlySales)) {
                    // 개별 담당자 선택 시: 해당 담당자와 전체 매출 데이터
                    return monthlySales
                  }
                  return []
                })()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => formatNumber(value)}
                    domain={[0, 'dataMax']}
                  />
                  <Tooltip 
                    formatter={(value: any, name: string) => [
                      `${formatNumber(value)}${t('yen')}`, 
                      name === 'personalSales' ? t('personalSales') : name === 'totalSales' ? t('totalSalesTrend') : name
                    ]}
                    labelFormatter={(label) => `월: ${label}`}
                  />
                  <Legend />
                  
                  {managerFilter === 'all' && monthlySales && 'userSales' in monthlySales ? (
                    // 전체 선택 시: 각 담당자별 개별 라인들
                    <>
                      {Object.keys(monthlySales.userSales || {}).map((userName, index) => (
                        <Line 
                          key={userName}
                          type="monotone" 
                          dataKey="amount" 
                          data={monthlySales.userSales[userName]}
                          stroke={`hsl(${index * 60}, 70%, 50%)`}
                          strokeWidth={2}
                          name={userName}
                          dot={{ r: 4 }}
                        />
                      ))}
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        data={monthlySales.totalSales}
                        stroke="#6b7280" 
                        strokeWidth={3}
                        name={t('totalSalesTrend')}
                        dot={{ r: 5 }}
                        strokeDasharray="5 5"
                      />
                    </>
                  ) : (
                    // 개별 담당자 선택 시: 해당 담당자와 전체 매출만
                    <>
                      <Line 
                        type="monotone" 
                        dataKey="personalSales" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name={t('personalSales')}
                        dot={{ r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="totalSales" 
                        stroke="#6b7280" 
                        strokeWidth={2}
                        name={t('totalSalesTrend')}
                        dot={{ r: 4 }}
                      />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
