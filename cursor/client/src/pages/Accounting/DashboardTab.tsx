import React, { useState, useEffect, useMemo, useCallback } from 'react'
import api from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, X } from 'lucide-react'
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
import { DatePickerInput } from '@/components/ui/date-picker-input'

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
  latestCapitalBalance?: number
  latestCapitalDate?: string | null
  totalDeposits?: number
  totalAssets?: number
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
  const [loading, setLoading] = useState(false)
  const [showSalesModal, setShowSalesModal] = useState(false)
  const [showExpensesModal, setShowExpensesModal] = useState(false)
  const [showProfitModal, setShowProfitModal] = useState(false)

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }, [fiscalYear, startDate, endDate])

  useEffect(() => {
    if (isAdmin) {
      fetchDashboard()
    }
  }, [isAdmin, fetchDashboard])

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

  // 차트 데이터 준비 (useMemo로 최적화) - early return 이전에 모든 hooks 호출
  const monthlyChartData = useMemo(() => {
    if (!dashboard) return null
    return {
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
  }, [dashboard, language])

  const salesByCategoryData = useMemo(() => {
    if (!dashboard) return null
    return {
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
  }, [dashboard, language])

  const expensesByCategoryData = useMemo(() => {
    if (!dashboard) return null
    return {
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
  }, [dashboard, language])

  if (!dashboard) {
    return (
      <div className="p-6 text-center">
        <p>{language === 'ja' ? '読み込み中...' : '로딩 중...'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="fixed top-20 right-6 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50">
          {language === 'ja' ? '読み込み中...' : '로딩 중...'}
        </div>
      )}
      {/* 날짜 필터 & 회계연도 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center flex-wrap justify-between">
            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">
                  {language === 'ja' ? '開始日' : '시작일'}:
                </label>
                <DatePickerInput
                  value={startDate}
                  onChange={handleStartDateChange}
                />
              </div>
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium">
                  {language === 'ja' ? '終了日' : '종료일'}:
                </label>
                <DatePickerInput
                  value={endDate}
                  onChange={handleEndDateChange}
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
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => setShowSalesModal(true)}
        >
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

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => setShowExpensesModal(true)}
        >
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

        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
          onClick={() => setShowProfitModal(true)}
        >
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

      {/* 총자산 카드 */}
      {dashboard.totalAssets !== undefined && (
        <Card className="bg-gradient-to-br from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ja' ? '総資産' : '총자산'}
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {language === 'ja' ? '口座残高（最新）' : '계좌잔액 (최신)'}
                </span>
                <span className="text-lg font-semibold text-blue-600">
                  {formatCurrency(dashboard.latestCapitalBalance || 0)}
                </span>
              </div>
              {dashboard.latestCapitalDate && (
                <p className="text-xs text-gray-500">
                  {new Date(dashboard.latestCapitalDate).toLocaleDateString('ko-KR', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit' 
                  }).replace(/\. /g, '-').replace('.', '')} {language === 'ja' ? '基準' : '기준'}
                </p>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {language === 'ja' ? '保証金合計' : '보증금 합계'}
                </span>
                <span className="text-lg font-semibold text-green-600">
                  {formatCurrency(dashboard.totalDeposits || 0)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-base font-semibold">
                    {language === 'ja' ? '合計' : '합계'}
                  </span>
                  <span className="text-2xl font-bold text-purple-600">
                    {formatCurrency(dashboard.totalAssets)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 월별 추이 차트 */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'ja' ? '月別推移' : '월별 추이'}
          </h3>
          <div style={{ height: '300px' }}>
            {monthlyChartData && <Bar data={monthlyChartData} options={{ responsive: true, maintainAspectRatio: false }} />}
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
              {salesByCategoryData && <Bar data={salesByCategoryData} options={{ responsive: true, maintainAspectRatio: false }} />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'ja' ? 'カテゴリー別支出' : '카테고리별 지출'}
            </h3>
            <div style={{ height: '250px' }}>
              {expensesByCategoryData && <Bar data={expensesByCategoryData} options={{ responsive: true, maintainAspectRatio: false }} />}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 월별 매출 추이 모달 */}
      {showSalesModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSalesModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {language === 'ja' ? '月別売上推移' : '월별 매출 추이'}
                </h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {language === 'ja' ? '最近12ヶ月間' : '최근 12개월간'}
                </p>
              </div>
              <button
                onClick={() => setShowSalesModal(false)}
                className="hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="p-6 space-y-6">
              {/* 그래프 */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-sm">
                <div style={{ height: '400px' }}>
                  {monthlyChartData && (
                    <Line 
                      data={{
                        labels: dashboard.monthlyData.map((d) => d.month),
                        datasets: [
                          {
                            label: language === 'ja' ? '月別売上' : '월별 매출',
                            data: dashboard.monthlyData.map((d) => d.sales),
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            pointBackgroundColor: 'rgb(16, 185, 129)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                          },
                        ],
                      }} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              padding: 20,
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                              size: 14,
                            },
                            bodyFont: {
                              size: 13,
                            },
                            callbacks: {
                              label: function(context) {
                                return ' ' + formatCurrency(context.parsed.y)
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value as number)
                              },
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            }
                          },
                          x: {
                            ticks: {
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              display: false,
                            }
                          }
                        }
                      }} 
                    />
                  )}
                </div>
              </div>

              {/* 월별 데이터 테이블 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {language === 'ja' ? '月別詳細データ' : '월별 상세 데이터'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {language === 'ja' ? '月' : '월'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {language === 'ja' ? '売上' : '매출'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dashboard.monthlyData.map((item, index) => (
                        <tr 
                          key={item.month}
                          className={`hover:bg-emerald-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-600">
                            {formatCurrency(item.sales)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-emerald-50 to-teal-50 border-t-2 border-emerald-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {language === 'ja' ? '合計' : '합계'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-emerald-700">
                          {formatCurrency(dashboard.monthlyData.reduce((sum, item) => sum + item.sales, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 월별 지출 추이 모달 */}
      {showExpensesModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowExpensesModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-orange-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {language === 'ja' ? '月別支出推移' : '월별 지출 추이'}
                </h2>
                <p className="text-red-100 text-sm mt-1">
                  {language === 'ja' ? '最近12ヶ月間' : '최근 12개월간'}
                </p>
              </div>
              <button
                onClick={() => setShowExpensesModal(false)}
                className="hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="p-6 space-y-6">
              {/* 그래프 */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-sm">
                <div style={{ height: '400px' }}>
                  {monthlyChartData && (
                    <Line 
                      data={{
                        labels: dashboard.monthlyData.map((d) => d.month),
                        datasets: [
                          {
                            label: language === 'ja' ? '月別支出' : '월별 지출',
                            data: dashboard.monthlyData.map((d) => d.expenses),
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            pointBackgroundColor: 'rgb(239, 68, 68)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                          },
                        ],
                      }} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              padding: 20,
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                              size: 14,
                            },
                            bodyFont: {
                              size: 13,
                            },
                            callbacks: {
                              label: function(context) {
                                return ' ' + formatCurrency(context.parsed.y)
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value as number)
                              },
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            }
                          },
                          x: {
                            ticks: {
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              display: false,
                            }
                          }
                        }
                      }} 
                    />
                  )}
                </div>
              </div>

              {/* 월별 데이터 테이블 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {language === 'ja' ? '月別詳細データ' : '월별 상세 데이터'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {language === 'ja' ? '月' : '월'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {language === 'ja' ? '支出' : '지출'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dashboard.monthlyData.map((item, index) => (
                        <tr 
                          key={item.month}
                          className={`hover:bg-red-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-600">
                            {formatCurrency(item.expenses)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-red-50 to-orange-50 border-t-2 border-red-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {language === 'ja' ? '合計' : '합계'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-700">
                          {formatCurrency(dashboard.monthlyData.reduce((sum, item) => sum + item.expenses, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 월별 순이익 추이 모달 */}
      {showProfitModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowProfitModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">
                  {language === 'ja' ? '月別純利益推移' : '월별 순이익 추이'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {language === 'ja' ? '最近12ヶ月間' : '최근 12개월간'}
                </p>
              </div>
              <button
                onClick={() => setShowProfitModal(false)}
                className="hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 모달 콘텐츠 */}
            <div className="p-6 space-y-6">
              {/* 그래프 */}
              <div className="bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl shadow-sm">
                <div style={{ height: '400px' }}>
                  {monthlyChartData && (
                    <Line 
                      data={{
                        labels: dashboard.monthlyData.map((d) => d.month),
                        datasets: [
                          {
                            label: language === 'ja' ? '月別純利益' : '월별 순이익',
                            data: dashboard.monthlyData.map((d) => d.profit),
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 6,
                            pointHoverRadius: 8,
                            pointBackgroundColor: 'rgb(59, 130, 246)',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 2,
                          },
                        ],
                      }} 
                      options={{ 
                        responsive: true, 
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: true,
                            position: 'top',
                            labels: {
                              font: {
                                size: 14,
                                weight: 'bold'
                              },
                              padding: 20,
                            }
                          },
                          tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                              size: 14,
                            },
                            bodyFont: {
                              size: 13,
                            },
                            callbacks: {
                              label: function(context) {
                                return ' ' + formatCurrency(context.parsed.y)
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: function(value) {
                                return formatCurrency(value as number)
                              },
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              color: 'rgba(0, 0, 0, 0.05)',
                            }
                          },
                          x: {
                            ticks: {
                              font: {
                                size: 12
                              }
                            },
                            grid: {
                              display: false,
                            }
                          }
                        }
                      }} 
                    />
                  )}
                </div>
              </div>

              {/* 월별 데이터 테이블 */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {language === 'ja' ? '月別詳細データ' : '월별 상세 데이터'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {language === 'ja' ? '月' : '월'}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          {language === 'ja' ? '純利益' : '순이익'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {dashboard.monthlyData.map((item, index) => (
                        <tr 
                          key={item.month}
                          className={`hover:bg-blue-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.month}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${
                            item.profit >= 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(item.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                      <tr>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {language === 'ja' ? '合計' : '합계'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                          dashboard.monthlyData.reduce((sum, item) => sum + item.profit, 0) >= 0 
                            ? 'text-blue-700' 
                            : 'text-red-700'
                        }`}>
                          {formatCurrency(dashboard.monthlyData.reduce((sum, item) => sum + item.profit, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default DashboardTab

