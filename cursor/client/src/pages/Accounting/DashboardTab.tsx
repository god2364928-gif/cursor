import React, { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from 'chart.js'
import { useAccountingStore } from '@/store/accountingStore'
import { formatCurrency } from './utils'

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ChartTitle,
  Tooltip,
  Legend
)

interface DashboardData {
  fiscalYear: number
  totalSales: number
  totalExpenses: number
  netProfit: number
  salesByCategory: { [key: string]: number }
  expensesByCategory: { [key: string]: number }
  accounts: Array<{
    accountName: string
    accountType: string
    balance: number
  }>
  monthlyData: Array<{
    month: string
    sales: number
    expenses: number
    profit: number
  }>
  monthlyExpensesByCategory: { [month: string]: { [category: string]: number } }
  monthlySalesByCategory: { [month: string]: { [category: string]: number } }
}

interface DashboardTabProps {
  language: 'ja' | 'ko'
  isAdmin: boolean
}

const DashboardTab: React.FC<DashboardTabProps> = ({ language, isAdmin }) => {
  const { startDate, endDate, fiscalYear, setStartDate, setEndDate, setFiscalYear, setDateRange } = useAccountingStore()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  useEffect(() => {
    if (isAdmin) {
      fetchDashboard()
    }
  }, [startDate, endDate, fiscalYear, isAdmin])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/accounting/dashboard', {
        params: {
          fiscalYear,
          startDate,
          endDate
        }
      })
      setDashboard(response.data)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
  }

  const handleStartDateChange = (newDate: string) => {
    if (!newDate) return
    const endDateObj = new Date(endDate)
    const newDateObj = new Date(newDate)
    
    if (newDateObj > endDateObj) {
      alert(language === 'ja' ? '開始日は終了日より前でなければなりません' : '시작일은 종료일보다 이전이어야 합니다')
      return
    }
    setStartDate(newDate)
  }

  const handleEndDateChange = (newDate: string) => {
    if (!newDate) return
    const startDateObj = new Date(startDate)
    const newDateObj = new Date(newDate)
    
    if (newDateObj < startDateObj) {
      alert(language === 'ja' ? '終了日は開始日より後でなければなりません' : '종료일은 시작일보다 이후여야 합니다')
      return
    }
    setEndDate(newDate)
  }

  const handlePreviousMonth = () => {
    // 현재 선택된 시작일 기준으로 이전 월 계산
    const [year, month] = startDate.split('-').map(Number)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevYear = month === 1 ? year - 1 : year
    
    // 이전 월의 1일
    const startDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`
    
    // 이전 월의 마지막 날
    const lastDay = new Date(prevYear, prevMonth, 0).getDate()
    const endDateStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    setDateRange(startDateStr, endDateStr)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-11
    
    // 시작일: 현재 월의 1일 (타임존 영향 없이 직접 문자열 생성)
    const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`
    
    // 종료일: 오늘 (타임존 영향 없이 로컬 날짜 사용)
    const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    
    setDateRange(startDateStr, endDateStr)
  }

  const handleNextMonth = () => {
    // 현재 선택된 시작일 기준으로 다음 월 계산
    const [year, month] = startDate.split('-').map(Number)
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    
    // 다음 월의 1일
    const startDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    
    // 다음 월의 마지막 날
    const lastDay = new Date(nextYear, nextMonth, 0).getDate()
    const endDateStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    setDateRange(startDateStr, endDateStr)
  }

  if (!dashboard) {
    return (
      <div className="p-6 text-center">
        <p>{language === 'ja' ? '読み込み中...' : '로딩 중...'}</p>
      </div>
    )
  }

  // 차트 데이터 준비
  const monthlyChartData = {
    labels: dashboard.monthlyData.map((d) => d.month),
    datasets: [
      {
        label: language === 'ja' ? '売上' : '매출',
        data: dashboard.monthlyData.map((d) => d.sales),
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 2,
      },
      {
        label: language === 'ja' ? '支出' : '지출',
        data: dashboard.monthlyData.map((d) => d.expenses),
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
      },
      {
        label: language === 'ja' ? '純利益' : '순이익',
        data: dashboard.monthlyData.map((d) => d.profit),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
      },
    ],
  }

  const salesByCategoryData = {
    labels: Object.keys(dashboard.salesByCategory),
    datasets: [
      {
        label: language === 'ja' ? 'カテゴリー別売上' : '카테고리별 매출',
        data: Object.values(dashboard.salesByCategory),
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(16, 185, 129, 0.5)',
          'rgba(245, 158, 11, 0.5)',
          'rgba(239, 68, 68, 0.5)',
          'rgba(139, 92, 246, 0.5)',
        ],
      },
    ],
  }

  const expensesByCategoryData = {
    labels: Object.keys(dashboard.expensesByCategory),
    datasets: [
      {
        label: language === 'ja' ? 'カテゴリー別支出' : '카테고리별 지출',
        data: Object.values(dashboard.expensesByCategory),
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',
          'rgba(249, 115, 22, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(236, 72, 153, 0.5)',
        ],
      },
    ],
  }

  return (
    <div className="space-y-6">
      {/* 날짜 필터 & 회계연도 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap justify-between">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">
                  {language === 'ja' ? '開始日' : '시작일'}:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => handleStartDateChange(e.target.value)}
                  max="2099-12-31"
                  className="border rounded px-3 py-2"
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">
                  {language === 'ja' ? '終了日' : '종료일'}:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => handleEndDateChange(e.target.value)}
                  max="2099-12-31"
                  className="border rounded px-3 py-2"
                />
              </div>
              <Button onClick={handlePreviousMonth} variant="outline">
                {language === 'ja' ? '前月' : '전월'}
              </Button>
              <Button onClick={handleCurrentMonth}>
                {language === 'ja' ? '今月' : '당월'}
              </Button>
              <Button onClick={handleNextMonth} variant="outline">
                {language === 'ja' ? '来月' : '내월'}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium">
                {language === 'ja' ? '会計年度' : '회계연도'}:
              </label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="border rounded px-3 py-2"
              >
                {[2024, 2025, 2026, 2027, 2028].map((year) => (
                  <option key={year} value={year}>
                    {year} ({year - 1}.10 ~ {year}.09)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ja' ? '総売上（取引履歴基準）' : '총 매출 (거래내역 기반)'}
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  {formatCurrency(dashboard.totalSales)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ja' ? '総支出（取引履歴基準）' : '총 지출 (거래내역 기반)'}
                </p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(dashboard.totalExpenses)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {language === 'ja' ? '純利益' : '순이익'}
                </p>
                <p className="text-2xl font-bold text-blue-600 mt-1">
                  {formatCurrency(dashboard.netProfit)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월별 추이 차트 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'ja' ? '月別推移' : '월별 추이'}
          </h3>
          <div style={{ height: '300px' }}>
            <Bar data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </CardContent>
      </Card>

      {/* 카테고리별 차트 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ja' ? 'カテゴリー別売上' : '카테고리별 매출'}
            </h3>
            <div style={{ height: '250px' }}>
              <Bar data={salesByCategoryData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ja' ? 'カテゴリー別支出' : '카테고리별 지출'}
            </h3>
            <div style={{ height: '250px' }}>
              <Bar data={expensesByCategoryData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 계좌 잔액 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'ja' ? '口座残高' : '계좌 잔액'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.accounts.map((account, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <p className="text-sm text-gray-600">{account.accountName}</p>
                <p className="text-lg font-semibold">{formatCurrency(account.balance)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DashboardTab

