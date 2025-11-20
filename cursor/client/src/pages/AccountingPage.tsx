import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Trash2,
  Upload,
  Pencil,
  X,
  FileText,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts'

interface DashboardData {
  fiscalYear: number
  totalSales: number
  totalExpenses: number
  netProfit: number
  salesByCategory: Record<string, number>
  expensesByCategory: Record<string, number>
  accounts: Array<{
    accountName: string
    accountType: string
    balance: number
  }>
  monthlySales: Array<{
    month: string
    amount: number
  }>
  monthlyData?: Array<{
    month: string
    sales: number
    expenses: number
    profit: number
  }>
  monthlyExpensesByCategory?: Record<string, Record<string, number>>
  monthlySalesByCategory?: Record<string, Record<string, number>>
}

interface Transaction {
  id: string
  transactionDate: string
  transactionTime?: string
  fiscalYear: number
  transactionType: string
  category: string
  paymentMethod: string
  itemName: string
  amount: number
  employeeName?: string
  accountName?: string
  assignedUserId?: string | null
  assignedUserName?: string | null
  memo?: string | null
  createdAt: string
}

interface SimpleUser {
  id: string
  name: string
}

interface Employee {
  id: string
  name: string
  email: string
  hireDate?: string // 입사일
  hire_date?: string // snake_case from API
  department?: string
  position?: string
  employmentStatus?: string
  employment_status?: string // snake_case from API
  baseSalary?: number
  base_salary?: number // snake_case from API
  contractStartDate?: string
  contract_start_date?: string // snake_case from API
  contractEndDate?: string
  contract_end_date?: string // snake_case from API
  martId?: string
  mart_id?: string // snake_case from API
  transportationRoute?: string
  transportation_route?: string // snake_case from API
  monthlyTransportationCost?: number
  monthly_transportation_cost?: number // snake_case from API
  transportationStartDate?: string
  transportation_start_date?: string // snake_case from API
  transportationDetails?: string
  transportation_details?: string // snake_case from API
  // Legacy fields
  incentiveRate?: number
}

interface Payroll {
  id: string
  paymentMonth: string
  employeeId: string
  employeeName: string
  position: string
  baseSalary: number
  incentive: number
  otherPayments: number
  totalAmount: number
  paymentStatus: string
  incentiveRate: number
}

interface RecurringExpense {
  id: string
  itemName: string
  monthlyAmount: number
  paymentDay: number
  paymentMethod: string
  isActive: boolean
}

interface CapitalBalance {
  id: string
  balance_date: string
  amount: number
  note?: string
  created_at: string
  updated_at: string
}

interface Deposit {
  id: string
  item_name: string
  amount: number
  note?: string
  created_at: string
  updated_at: string
}

const CATEGORY_OPTIONS = [
  { value: '지정없음', labelJa: '指定なし', labelKo: '지정없음' },
  { value: '셀마플', labelJa: 'セルマプ', labelKo: '셀마플' },
  { value: '코코마케', labelJa: 'ココマケ', labelKo: '코코마케' },
  { value: '운영비', labelJa: '運営費', labelKo: '운영비' },
  { value: '급여', labelJa: '給与', labelKo: '급여' },
  { value: '월세', labelJa: '家賃', labelKo: '월세' },
  { value: '세금', labelJa: '税金', labelKo: '세금' },
  { value: '기타', labelJa: 'その他', labelKo: '기타' },
]

export default function AccountingPage() {
  const { language } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'paypay' | 'totalsales' | 'employees' | 'payroll' | 'recurring' | 'capital'>('dashboard')
  
  // Layout의 탭 클릭 이벤트 수신
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail)
    }
    window.addEventListener('accounting-tab-change', handleTabChange as EventListener)
    return () => {
      window.removeEventListener('accounting-tab-change', handleTabChange as EventListener)
    }
  }, [])
  
  const [fiscalYear, setFiscalYear] = useState<number>(
    new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()
  )
  
  // 전월 첫날과 마지막날 계산
  const getPreviousMonthDates = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() // 0-11
    
    // 전월 계산
    let prevYear = year
    let prevMonth = month - 1
    if (prevMonth < 0) {
      prevYear = year - 1
      prevMonth = 11
    }
    
    // 전월 첫날
    const firstDay = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
    
    // 전월 마지막날
    const lastDayNum = new Date(prevYear, prevMonth + 1, 0).getDate()
    const lastDay = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDayNum).padStart(2, '0')}`
    
    return {
      start: firstDay,
      end: lastDay
    }
  }
  
  const prevMonthDates = getPreviousMonthDates()
  const [startDate, setStartDate] = useState(prevMonthDates.start)
  const [endDate, setEndDate] = useState(prevMonthDates.end)
  
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [showBulkEditDialog, setShowBulkEditDialog] = useState(false)
  const [bulkEditCategory, setBulkEditCategory] = useState<string>('')
  const [bulkEditAssignedUserId, setBulkEditAssignedUserId] = useState<string>('')
  const [employees, setEmployees] = useState<Employee[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_payrolls, _setPayrolls] = useState<Payroll[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [capitalBalances, setCapitalBalances] = useState<CapitalBalance[]>([])
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [capitalOffset, setCapitalOffset] = useState(0)
  const [capitalTotal, setCapitalTotal] = useState(0)
  const [nameOptions, setNameOptions] = useState<SimpleUser[]>([])
  const [updatingTransactionId, setUpdatingTransactionId] = useState<string | null>(null)
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null)
  const [memoDrafts, setMemoDrafts] = useState<Record<string, string>>({})
  const [showSaveToast, setShowSaveToast] = useState(false)

  // 거래내역 필터
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [nameFilter, setNameFilter] = useState<string>('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // 직원 필터
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState<string>('입사중')

  // 카테고리별 지출 필터
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState<string[]>([])
  
  // 카테고리별 매출 필터
  const [selectedSalesCategories, setSelectedSalesCategories] = useState<string[]>([])
  
  // 월별 추이 라인 선택
  const [selectedMonthlyLines, setSelectedMonthlyLines] = useState<string[]>([])
  
  // 그래프 접기/펼치기 상태
  const [expandedCharts, setExpandedCharts] = useState<{
    monthly: boolean
    salesByCategory: boolean
    expensesByCategory: boolean
  }>({
    monthly: false,
    salesByCategory: false,
    expensesByCategory: false
  })

  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_showPayrollForm, setShowPayrollForm] = useState(false)
  const [showCapitalForm, setShowCapitalForm] = useState(false)
  const [showDepositForm, setShowDepositForm] = useState(false)
  const [showEmployeeDetailModal, setShowEmployeeDetailModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [employeeFiles, setEmployeeFiles] = useState<any[]>([])
  const [selectedYearMonth, setSelectedYearMonth] = useState('')
  const [selectedFileSubcategory, setSelectedFileSubcategory] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [editingPayroll, setEditingPayroll] = useState<Payroll | null>(null)
  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null)
  const [editingCapital, setEditingCapital] = useState<CapitalBalance | null>(null)
  const [editingDeposit, setEditingDeposit] = useState<Deposit | null>(null)
  const [showAutoMatchDialog, setShowAutoMatchDialog] = useState(false)
  const [autoMatchRules, setAutoMatchRules] = useState<any[]>([])
  const [editingRule, setEditingRule] = useState<any | null>(null)
  
  // 전체매출 관련 state
  const [totalSalesData, setTotalSalesData] = useState<any[]>([])
  const [totalSalesYear, setTotalSalesYear] = useState<number>(2026)
  const [editingCell, setEditingCell] = useState<{year: number, month: number, paymentMethod: string, isFee: boolean} | null>(null)
  const [editingValue, setEditingValue] = useState<string>('')

  // 월별 급여 관련 state
  const [monthlyPayrollData, setMonthlyPayrollData] = useState<any[]>([])
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  // 급여는 실제 연도를 사용 (회계연도가 아님)
  const [selectedPayrollYear, setSelectedPayrollYear] = useState<number>(currentYear)
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<number>(currentMonth)
  const [editingPayrollCell, setEditingPayrollCell] = useState<{id: string, field: string} | null>(null)
  const [editingPayrollValue, setEditingPayrollValue] = useState<string>('')
  const [monthlyPayrollHistory, setMonthlyPayrollHistory] = useState<string>('')
  const [newEmployeeName, setNewEmployeeName] = useState<string>('')
  const [showAddEmployeeDialog, setShowAddEmployeeDialog] = useState<boolean>(false)

  useEffect(() => {
    fetchTotalSales() // 대시보드 탭에서도 전체매출 데이터 로드
    // 대시보드 탭에서도 자본금 데이터 로드
    if (activeTab === 'dashboard') {
      fetchCapitalBalances()
      fetchDeposits()
    }
    // 회계연도 변경 시 날짜 범위도 업데이트 (대시보드 탭에서만)
    if (fiscalYear && activeTab === 'dashboard') {
      // 회계연도 시작일: 전년 10월 1일
      const startYear = fiscalYear - 1
      const startDateString = `${startYear}-10-01`
      
      // 회계연도 종료일: 당해년 9월 30일
      const endDateString = `${fiscalYear}-09-30`
      
      setStartDate(startDateString)
      setEndDate(endDateString)
    }
  }, [fiscalYear, activeTab])

  // 초기 날짜 설정 (전월 1일 ~ 전월 마지막일)
  useEffect(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 전월 계산
    let prevYear = year
    let prevMonth = month - 1
    if (prevMonth < 0) {
      prevYear = year - 1
      prevMonth = 11
    }
    
    const firstDayString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-01`
    const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate()
    const lastDayString = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    
    setStartDate(firstDayString)
    setEndDate(lastDayString)
  }, [])

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboard()
    }
    if (activeTab === 'transactions') {
      fetchTransactions()
      if (nameOptions.length === 0) {
        fetchNameOptions()
      }
    }
    if (activeTab === 'employees') fetchEmployees()
    if (activeTab === 'payroll') fetchMonthlyPayroll()
    if (activeTab === 'recurring') fetchRecurringExpenses()
    if (activeTab === 'capital') {
      fetchCapitalBalances()
      fetchDeposits()
    }
    if (activeTab === 'totalsales') fetchTotalSales()
  }, [activeTab, nameOptions.length, capitalOffset, totalSalesYear, selectedPayrollYear, selectedPayrollMonth, startDate, endDate])

  // 자동 매칭 다이얼로그가 열릴 때마다 목록 새로고침
  useEffect(() => {
    if (showAutoMatchDialog) {
      fetchAutoMatchRules()
    }
  }, [showAutoMatchDialog])

  // PayPay 상태
  const [paypaySummary, setPaypaySummary] = useState<{ totalSales: number; totalExpenses: number; balance: number }>({ totalSales: 0, totalExpenses: 0, balance: 0 })
  const [paypaySales, setPaypaySales] = useState<any[]>([])
  const [paypayExpenses, setPaypayExpenses] = useState<any[]>([])
  const paypayPrevMonthDates = getPreviousMonthDates()
  const [paypayStartDate, setPaypayStartDate] = useState(paypayPrevMonthDates.start)
  const [paypayEndDate, setPaypayEndDate] = useState(paypayPrevMonthDates.end)
  const [paypayCategoryFilter, setPaypayCategoryFilter] = useState('all') // 'all', '셀마플', 'staff'
  const [paypayNameFilter, setPaypayNameFilter] = useState('')
  const [paypayActiveTab, setPaypayActiveTab] = useState<'sales' | 'expenses'>('sales') // 매출/지출 탭
  const [showPaypayExpenseForm, setShowPaypayExpenseForm] = useState(false)
  const [editingPaypayExpense, setEditingPaypayExpense] = useState<any>(null)
  const [showPaypaySaleForm, setShowPaypaySaleForm] = useState(false)
  const [showPaypayUploadDialog, setShowPaypayUploadDialog] = useState(false)
  const [paypayUploadPreview, setPaypayUploadPreview] = useState<any[]>([])
  const [showTransactionUploadDialog, setShowTransactionUploadDialog] = useState(false)
  const [transactionUploadPreview, setTransactionUploadPreview] = useState<any[]>([])

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

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/accounting/transactions', { 
        params: { 
          startDate, 
          endDate, 
          limit: 500 
        } 
      })
      setTransactions(response.data)
    } catch (error) {
      console.error('Transactions fetch error:', error)
    }
  }

  const fetchNameOptions = async () => {
    try {
      const response = await api.get('/auth/users')
      setNameOptions(
        response.data.map((user: any) => ({
          id: user.id,
          name: user.name,
        }))
      )
    } catch (error) {
      console.error('Name options fetch error:', error)
    }
  }

  // 날짜 포맷팅 함수 (타임존 제거)
  const formatDateOnly = (dateString: string | null | undefined): string => {
    if (!dateString) return ''
    // ISO 8601 형식에서 날짜 부분만 추출 (YYYY-MM-DD)
    return dateString.split('T')[0]
  }

  // 날짜 유효성 검증 함수 (잘못된 날짜는 거부)
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false
    
    const parts = dateStr.split('-')
    if (parts.length !== 3) return false
    
    const [year, month, day] = parts.map(Number)
    
    // 기본 범위 체크
    if (year < 1900 || year > 2100) return false
    if (month < 1 || month > 12) return false
    if (day < 1 || day > 31) return false
    
    // 실제 날짜가 유효한지 확인 (예: 2023-11-31은 잘못된 날짜)
    const testDate = new Date(year, month - 1, day)
    
    return testDate.getFullYear() === year && 
           testDate.getMonth() === month - 1 && 
           testDate.getDate() === day
  }

  // 날짜 변경 핸들러 (브라우저가 자동 변환한 날짜 감지)
  const handleStartDateChange = (value: string) => {
    // 브라우저가 잘못된 날짜를 자동으로 다음 달로 변환했는지 확인
    if (value && startDate) {
      const oldDate = new Date(startDate)
      const newDate = new Date(value)
      
      // 날짜를 변경했는데 월이 바뀌었다면 (예: 11월 31일 → 12월 1일)
      // 이전 월의 마지막 날로 설정
      if (oldDate.getMonth() !== newDate.getMonth() && 
          Math.abs(oldDate.getMonth() - newDate.getMonth()) === 1) {
        const lastDay = new Date(oldDate.getFullYear(), oldDate.getMonth() + 1, 0)
        const correctedDate = lastDay.toISOString().split('T')[0]
        setStartDate(correctedDate)
        return
      }
    }
    setStartDate(value)
  }

  const handleEndDateChange = (value: string) => {
    // 브라우저가 잘못된 날짜를 자동으로 다음 달로 변환했는지 확인
    if (value && endDate) {
      const oldDate = new Date(endDate)
      const newDate = new Date(value)
      
      // 날짜를 변경했는데 월이 바뀌었다면 (예: 11월 31일 → 12월 1일)
      // 이전 월의 마지막 날로 설정
      if (oldDate.getMonth() !== newDate.getMonth() && 
          Math.abs(oldDate.getMonth() - newDate.getMonth()) === 1) {
        const lastDay = new Date(oldDate.getFullYear(), oldDate.getMonth() + 1, 0)
        const correctedDate = lastDay.toISOString().split('T')[0]
        setEndDate(correctedDate)
        return
      }
    }
    setEndDate(value)
  }

  // 날짜 변경 핸들러
  const handlePreviousMonth = () => {
    // 현재 startDate를 기준으로 이전 달 계산
    const currentDate = new Date(startDate)
    currentDate.setMonth(currentDate.getMonth() - 1)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0)
    const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    setStartDate(firstDay)
    setEndDate(lastDayString)
  }

  const handleCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setStartDate(firstDay)
    setEndDate(today)
  }

  const handleNextMonth = () => {
    // 현재 startDate를 기준으로 다음 달 계산
    const currentDate = new Date(startDate)
    currentDate.setMonth(currentDate.getMonth() + 1)
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0)
    const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    setStartDate(firstDay)
    setEndDate(lastDayString)
  }

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/auth/users')
      setEmployees(response.data)
    } catch (error) {
      console.error('Employees fetch error:', error)
    }
  }

  const fetchTotalSales = async () => {
    try {
      // 대시보드에서는 최근 12개월 표시를 위해 현재와 이전 회계연도 데이터 모두 로드
      if (activeTab === 'dashboard') {
        const currentFiscalYear = fiscalYear
        const previousFiscalYear = fiscalYear - 1
        
        // 두 회계연도 데이터를 병렬로 가져오기
        const [currentData, previousData] = await Promise.all([
          api.get(`/total-sales/${currentFiscalYear}`),
          api.get(`/total-sales/${previousFiscalYear}`)
        ])
        
        // 두 데이터를 합침
        setTotalSalesData([...currentData.data, ...previousData.data])
      } else {
        // 전체매출 탭에서는 선택된 연도만
        const response = await api.get(`/total-sales/${totalSalesYear}`)
        setTotalSalesData(response.data)
      }
    } catch (error) {
      console.error('Total sales fetch error:', error)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _fetchPayrolls = async () => {
    try {
      const response = await api.get('/accounting/payroll')
      _setPayrolls(response.data)
    } catch (error) {
      console.error('Payrolls fetch error:', error)
    }
  }

  // 월별 급여 데이터 조회
  const fetchMonthlyPayroll = async () => {
    try {
      const response = await api.get(`/monthly-payroll/${selectedPayrollYear}/${selectedPayrollMonth}`)
      setMonthlyPayrollData(response.data.payrollData || [])
      setMonthlyPayrollHistory(response.data.history || '')
    } catch (error) {
      console.error('Monthly payroll fetch error:', error)
    }
  }

  // 월별 급여 셀 편집
  const handlePayrollCellClick = (id: string, field: string, currentValue: any) => {
    setEditingPayrollCell({ id, field })
    // 정수로 변환하여 표시 (소수점 제거)
    const intValue = Math.floor(parseFloat(currentValue) || 0)
    setEditingPayrollValue(intValue.toString())
  }

  const handlePayrollCellSave = async () => {
    if (!editingPayrollCell) return
    
    try {
      await api.put('/monthly-payroll/update', {
        id: editingPayrollCell.id,
        field: editingPayrollCell.field,
        value: editingPayrollValue
      })
      
      setEditingPayrollCell(null)
      setEditingPayrollValue('')
      fetchMonthlyPayroll()
    } catch (error) {
      console.error('Payroll update error:', error)
      alert(language === 'ja' ? '更新に失敗しました' : '업데이트에 실패했습니다')
    }
  }

  const handlePayrollCellCancel = () => {
    setEditingPayrollCell(null)
    setEditingPayrollValue('')
  }

  // 히스토리 저장
  const handleSavePayrollHistory = async () => {
    try {
      await api.put('/monthly-payroll/history', {
        fiscalYear: selectedPayrollYear,
        month: selectedPayrollMonth,
        historyText: monthlyPayrollHistory
      })
      alert(language === 'ja' ? '保存しました' : '저장했습니다')
    } catch (error) {
      console.error('History save error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  // 직원 추가
  const handleAddEmployee = async () => {
    if (!newEmployeeName.trim()) {
      alert(language === 'ja' ? '名前を入力してください' : '이름을 입력해주세요')
      return
    }

    try {
      await api.post('/monthly-payroll/add-employee', {
        fiscalYear: selectedPayrollYear,
        month: selectedPayrollMonth,
        employeeName: newEmployeeName.trim()
      })
      
      setNewEmployeeName('')
      setShowAddEmployeeDialog(false)
      fetchMonthlyPayroll()
      alert(language === 'ja' ? '追加しました' : '추가했습니다')
    } catch (error) {
      console.error('Add employee error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  // 직원 삭제
  const handleDeletePayrollEmployee = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) {
      return
    }

    try {
      await api.delete(`/monthly-payroll/${id}`)
      fetchMonthlyPayroll()
      alert(language === 'ja' ? '削除しました' : '삭제했습니다')
    } catch (error) {
      console.error('Delete employee error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // 급여 자동 생성 (2025년 11월부터) - 기존 데이터의 기본급만 업데이트
  const handleGeneratePayroll = async () => {
    // 2025년 11월 1일 이전인지 확인
    const targetDate = new Date(selectedPayrollYear, selectedPayrollMonth - 1, 1)
    const cutoffDate = new Date(2025, 10, 1) // 2025년 11월 1일
    
    if (targetDate < cutoffDate) {
      alert(language === 'ja' 
        ? '2025年11月1日から自動生成が可能です。それ以前のデータは手動で入力してください。' 
        : '2025년 11월 1일부터 자동 생성이 가능합니다. 이전 데이터는 수동으로 입력해주세요.')
      return
    }

    if (!confirm(language === 'ja' 
      ? `${selectedPayrollYear}年${selectedPayrollMonth}月の給与データを自動生成しますか？\n既存データがある場合は基本給のみ更新され、インセンティブなどは維持されます。`
      : `${selectedPayrollYear}년 ${selectedPayrollMonth}월의 급여 데이터를 자동 생성하시겠습니까?\n기존 데이터가 있는 경우 기본급만 업데이트되고, 인센티브 등은 유지됩니다.`)) {
      return
    }

    try {
      const response = await api.post('/monthly-payroll/generate', {
        fiscalYear: selectedPayrollYear,
        month: selectedPayrollMonth
      })
      
      alert(response.data.message)
      fetchMonthlyPayroll()
    } catch (error: any) {
      console.error('Generate payroll error:', error)
      
      // existing_data 에러는 무시 (이전 버전 호환)
      if (error.response?.data?.message === 'existing_data') {
        alert(language === 'ja' 
          ? '給与データを更新しました' 
          : '급여 데이터를 업데이트했습니다')
        fetchMonthlyPayroll()
      } else {
        alert(error.response?.data?.message || (language === 'ja' ? '生成に失敗しました' : '생성에 실패했습니다'))
      }
    }
  }

  const fetchRecurringExpenses = async () => {
    try {
      const response = await api.get('/accounting/recurring-expenses')
      setRecurringExpenses(response.data)
    } catch (error) {
      console.error('Recurring expenses fetch error:', error)
    }
  }

  const fetchCapitalBalances = async () => {
    try {
      const response = await api.get('/accounting/capital-balance', {
        params: { limit: 12, offset: capitalOffset }
      })
      setCapitalBalances(response.data.data)
      setCapitalTotal(response.data.total)
    } catch (error) {
      console.error('Capital balances fetch error:', error)
    }
  }

  const fetchDeposits = async () => {
    try {
      const response = await api.get('/accounting/deposits')
      setDeposits(response.data)
    } catch (error) {
      console.error('Deposits fetch error:', error)
    }
  }

  const openTransactionForm = (tx?: Transaction) => {
    if (tx) {
      setEditingTransaction(tx)
    } else {
      setEditingTransaction(null)
    }
    setShowTransactionForm(true)
  }

  const closeTransactionForm = () => {
    setShowTransactionForm(false)
    setEditingTransaction(null)
  }

  const openEmployeeForm = (emp?: Employee) => {
    if (emp) {
      setEditingEmployee(emp)
    } else {
      setEditingEmployee(null)
    }
    setShowEmployeeForm(true)
  }

  const closeEmployeeForm = () => {
    setShowEmployeeForm(false)
    setEditingEmployee(null)
  }

  const openRecurringForm = (exp?: RecurringExpense) => {
    if (exp) {
      setEditingRecurring(exp)
    } else {
      setEditingRecurring(null)
    }
    setShowRecurringForm(true)
  }

  const closeRecurringForm = () => {
    setShowRecurringForm(false)
    setEditingRecurring(null)
  }

  const openCapitalForm = (capital?: CapitalBalance) => {
    setEditingCapital(capital || null)
    setShowCapitalForm(true)
  }

  const closeCapitalForm = () => {
    setEditingCapital(null)
    setShowCapitalForm(false)
  }

  const openDepositForm = (deposit?: Deposit) => {
    setEditingDeposit(deposit || null)
    setShowDepositForm(true)
  }

  const closeDepositForm = () => {
    setEditingDeposit(null)
    setShowDepositForm(false)
  }

  const handleSubmitTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const formatTimeValue = (value: FormDataEntryValue | null) => {
      if (!value) return ''
      const str = String(value).trim()
      if (!str) return ''
      return str.length === 5 ? `${str}` : str
    }

    const assignedUserIdValue = formData.get('assignedUserId')
    const memoValue = formData.get('memo')
    const itemNameValue = formData.get('itemName')

    try {
    const payload = {
        transactionDate: formData.get('transactionDate'),
        transactionTime: formatTimeValue(formData.get('transactionTime')),
        transactionType: formData.get('transactionType'),
        category: formData.get('category'),
        paymentMethod: formData.get('paymentMethod'),
        itemName: itemNameValue ? String(itemNameValue) : '',
        amount: Number(formData.get('amount')),
      assignedUserId: assignedUserIdValue ? String(assignedUserIdValue) : null,
      memo: memoValue ? String(memoValue) : null,
      }

      if (editingTransaction) {
        await api.put(`/accounting/transactions/${editingTransaction.id}`, payload)
      } else {
        await api.post('/accounting/transactions', payload)
      }

      closeTransactionForm()
      fetchTransactions()
      fetchDashboard()
    } catch (error) {
      console.error('Transaction create error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/accounting/transactions/${id}`)
      if (editingTransaction?.id === id) {
        closeTransactionForm()
      }
      fetchTransactions()
      fetchDashboard()
    } catch (error) {
      console.error('Transaction delete error:', error)
    }
  }

  // 일괄 선택/해제
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const filteredTxs = transactions
        .filter(tx => {
          // 날짜 필터
          if (!startDate && !endDate) return true
          const txDate = tx.transactionDate
          if (startDate && txDate < startDate) return false
          if (endDate && txDate > endDate) return false
          return true
        })
        .filter(tx => {
          // 구분 필터
          if (transactionTypeFilter !== 'all' && tx.transactionType !== transactionTypeFilter) return false
          // 카테고리 필터
          if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false
          // 이름 필터
          if (nameFilter !== 'all' && tx.assignedUserId !== nameFilter) return false
          // 결제 필터
          if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) return false
          // 검색 필터 (항목명, 메모)
          if (searchQuery) {
            const query = searchQuery.toLowerCase()
            const itemMatch = tx.itemName?.toLowerCase().includes(query)
            const memoMatch = tx.memo?.toLowerCase().includes(query)
            if (!itemMatch && !memoMatch) return false
          }
          return true
        })
      const allIds = new Set(filteredTxs.map(t => t.id))
      setSelectedTransactions(allIds)
    } else {
      setSelectedTransactions(new Set())
    }
  }

  const handleSelectTransaction = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedTransactions(newSelected)
  }

  // 일괄 변경
  const handleBulkEdit = async () => {
    if (selectedTransactions.size === 0) {
      alert(language === 'ja' ? '項目を選択してください' : '항목을 선택해주세요')
      return
    }

    if (!bulkEditCategory && !bulkEditAssignedUserId) {
      alert(language === 'ja' ? 'カテゴリまたは担当者を選択してください' : '카테고리 또는 담당자를 선택해주세요')
      return
    }

    try {
      const updates: any = {}
      if (bulkEditCategory) updates.category = bulkEditCategory
      if (bulkEditAssignedUserId) updates.assignedUserId = bulkEditAssignedUserId

      await api.post('/accounting/transactions/bulk-update', {
        transactionIds: Array.from(selectedTransactions),
        updates
      })

      alert(
        language === 'ja' 
          ? `${selectedTransactions.size}件を更新しました` 
          : `${selectedTransactions.size}건을 업데이트했습니다`
      )
      
      setSelectedTransactions(new Set())
      setBulkEditCategory('')
      setBulkEditAssignedUserId('')
      setShowBulkEditDialog(false)
      fetchTransactions()
    } catch (error) {
      console.error('Bulk update error:', error)
      alert(language === 'ja' ? '更新に失敗しました' : '업데이트에 실패했습니다')
    }
  }

  // 일괄 삭제
  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) {
      alert(language === 'ja' ? '項目を選択してください' : '항목을 선택해주세요')
      return
    }

    if (!confirm(
      language === 'ja' 
        ? `選択した${selectedTransactions.size}件を削除しますか？この操作は取り消せません。` 
        : `선택한 ${selectedTransactions.size}건을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
    )) {
      return
    }

    try {
      await api.post('/accounting/transactions/bulk-delete', {
        transactionIds: Array.from(selectedTransactions)
      })

      alert(
        language === 'ja' 
          ? `${selectedTransactions.size}件を削除しました` 
          : `${selectedTransactions.size}건을 삭제했습니다`
      )
      
      setSelectedTransactions(new Set())
      fetchTransactions()
      fetchDashboard()
    } catch (error) {
      console.error('Bulk delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handleQuickUpdateTransaction = async (
    id: string,
    updates: { category?: string; assignedUserId?: string | null; memo?: string | null }
  ) => {
    if (!isAdmin) return
    const target = transactions.find((tx) => tx.id === id)
    if (!target) return

    const nextCategory = updates.category ?? target.category
    const nextAssignedUserId =
      updates.assignedUserId !== undefined ? updates.assignedUserId : target.assignedUserId ?? null
    const nextMemo =
      updates.memo !== undefined
        ? updates.memo
        : target.memo !== undefined && target.memo !== null
        ? target.memo
        : null

    const payload = {
      transactionDate: target.transactionDate,
      transactionTime: target.transactionTime || '',
      transactionType: target.transactionType,
      category: nextCategory,
      paymentMethod: target.paymentMethod,
      itemName: target.itemName,
      amount: target.amount,
      memo: nextMemo ?? null,
      assignedUserId: nextAssignedUserId,
    }

    setUpdatingTransactionId(id)
    try {
      await api.put(`/accounting/transactions/${id}`, payload)
      setTransactions((prev) =>
        prev.map((tx) => {
          if (tx.id !== id) return tx
          const assignedName =
            nextAssignedUserId != null
              ? nameOptions.length > 0
                ? nameOptions.find((opt) => opt.id === nextAssignedUserId)?.name ?? tx.assignedUserName ?? null
                : tx.assignedUserName ?? null
              : null
          return {
            ...tx,
            category: nextCategory,
            assignedUserId: nextAssignedUserId,
            assignedUserName: assignedName,
            memo: nextMemo ?? null,
          }
        })
      )
    } catch (error) {
      console.error('Transaction inline update error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
      fetchTransactions()
    } finally {
      setUpdatingTransactionId(null)
    }
  }

  const handleMemoEdit = (id: string, currentMemo: string | null) => {
    setEditingMemoId(id)
    setMemoDrafts({ ...memoDrafts, [id]: currentMemo || '' })
  }

  const handleMemoChange = (id: string, value: string) => {
    setMemoDrafts({ ...memoDrafts, [id]: value })
  }

  const handleMemoSave = async (id: string) => {
    if (!isAdmin) return
    const memoValue = memoDrafts[id]?.trim() || null
    
    setUpdatingTransactionId(id)
    try {
      await handleQuickUpdateTransaction(id, { memo: memoValue })
      setEditingMemoId(null)
      const newDrafts = { ...memoDrafts }
      delete newDrafts[id]
      setMemoDrafts(newDrafts)
      
      // 저장 완료 토스트 표시
      setShowSaveToast(true)
      setTimeout(() => setShowSaveToast(false), 2000)
    } catch (error) {
      console.error('Memo save error:', error)
    } finally {
      setUpdatingTransactionId(null)
    }
  }

  const handleMemoCancel = (id: string) => {
    setEditingMemoId(null)
    const newDrafts = { ...memoDrafts }
    delete newDrafts[id]
    setMemoDrafts(newDrafts)
  }

  // 자동 매칭 규칙 관련 함수
  const fetchAutoMatchRules = async () => {
    try {
      const response = await api.get('/accounting/auto-match-rules')
      setAutoMatchRules(response.data)
    } catch (error) {
      console.error('Auto match rules fetch error:', error)
    }
  }

  const handleSaveAutoMatchRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const keyword = formData.get('keyword') as string
    const category = formData.get('category') as string
    const assignedUserId = formData.get('assignedUserId') as string
    const paymentMethod = formData.get('paymentMethod') as string
    const priority = Number(formData.get('priority') || 0)

    let saveSuccess = false

    try {
      if (editingRule) {
        const response = await api.put(`/accounting/auto-match-rules/${editingRule.id}`, {
          keyword,
          category: category || null,
          assignedUserId: assignedUserId || null,
          paymentMethod: paymentMethod || null,
          priority,
          isActive: true
        })
        console.log('Update response:', response.data)
        saveSuccess = true
      } else {
        const response = await api.post('/accounting/auto-match-rules', {
          keyword,
          category: category || null,
          assignedUserId: assignedUserId || null,
          paymentMethod: paymentMethod || null,
          priority,
          isActive: true
        })
        console.log('Create response:', response.data)
        saveSuccess = true
      }
    } catch (error: any) {
      console.error('Auto match rule save error:', error)
      console.error('Error response:', error.response)
      alert(error.response?.data?.error || (language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다'))
      return // 저장 실패 시 여기서 종료
    }

    // 저장이 성공한 경우에만 아래 실행
    if (saveSuccess) {
      // 목록 새로고침 (await로 완료 대기)
      try {
        await fetchAutoMatchRules()
        // 성공 메시지는 목록 업데이트 후 표시
        alert(language === 'ja' ? '保存しました' : '저장되었습니다')
      } catch (fetchError) {
        console.error('목록 새로고침 실패 (저장은 성공):', fetchError)
        // 새로고침 실패해도 성공 메시지는 표시
        alert(language === 'ja' ? '保存しました' : '저장되었습니다')
      }
      
      // 폼 초기화 (fetch 후에 실행)
      setEditingRule(null)
      e.currentTarget.reset()
    }
  }

  const handleDeleteAutoMatchRule = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/auto-match-rules/${id}`)
      fetchAutoMatchRules()
    } catch (error) {
      console.error('Auto match rule delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // 전체매출 관련 함수
  const getTotalSalesValue = (month: number, paymentMethod: string, isFee: boolean, fiscalYearFilter?: number): number => {
    const record = totalSalesData.find(
      (r) => r.month === month && 
             r.payment_method === paymentMethod && 
             r.is_fee === isFee &&
             (!fiscalYearFilter || r.fiscal_year === fiscalYearFilter)
    )
    return record ? parseFloat(record.amount) : 0
  }

  // 월별 매출액 계산 (전체매출 기반 - 최근 12개월)
  const getMonthlySalesFromTotalSales = () => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1-12
    
    // 최근 12개월 생성 (현재 월부터 거꾸로 11개월)
    const recentMonths: Array<{year: number, month: number}> = []
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1)
      recentMonths.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1
      })
    }
    
    return recentMonths.map(({year, month}) => {
      const monthName = language === 'ja' 
        ? `${year}年${month}月` 
        : `${year}년 ${month}월`
      
      // 해당 월의 회계연도 계산 (10월 이후면 다음해가 회계연도)
      const fiscalYearForMonth = month >= 10 ? year + 1 : year
      
      // 해당 회계연도의 데이터를 사용하여 매출액 계산
      const revenue = getTotalSalesValue(month, '口座振込', false, fiscalYearForMonth) +
        getTotalSalesValue(month, 'PayPay', false, fiscalYearForMonth) +
        getTotalSalesValue(month, 'PayPal', false, fiscalYearForMonth) +
        getTotalSalesValue(month, 'strip', false, fiscalYearForMonth) +
        getTotalSalesValue(month, 'strip1', false, fiscalYearForMonth) +
        getTotalSalesValue(month, 'ココナラ', false, fiscalYearForMonth)
      const fees = getTotalSalesValue(month, 'PayPal', true, fiscalYearForMonth) +
        getTotalSalesValue(month, 'strip', true, fiscalYearForMonth) +
        getTotalSalesValue(month, 'strip1', true, fiscalYearForMonth)
      
      return {
        month: monthName,
        amount: revenue + fees // 売上高 = 결제수단 + 수수료
      }
    })
  }

  // 월별 데이터 가져오기 (거래내역 기반)
  const getMonthlyTransactionData = () => {
    if (!dashboard?.monthlyData) return []
    
    return dashboard.monthlyData.map((data: any) => {
      // YYYY-MM 형식을 표시용으로 변환
      const [year, month] = data.month.split('-')
      const monthName = language === 'ja' 
        ? `${year}年${parseInt(month)}月` 
        : `${year}년 ${parseInt(month)}월`
      
      return {
        month: monthName,
        sales: data.sales,
        expenses: data.expenses,
        profit: data.profit
      }
    })
  }

  // 통합 월별 데이터 (거래내역 + 전체매출)
  const getCombinedMonthlyData = () => {
    // 거래내역 기반 데이터
    const transactionData = getMonthlyTransactionData()
    
    // 전체매출 기반 데이터
    const totalSalesData = getMonthlySalesFromTotalSales()
    
    // 월별로 매칭하여 합치기
    const combined = transactionData.map(txData => {
      const matchingSales = totalSalesData.find(ts => ts.month === txData.month)
      
      return {
        month: txData.month,
        sales: txData.sales,
        expenses: txData.expenses,
        profit: txData.profit,
        totalSalesAmount: matchingSales?.amount || 0
      }
    })
    
    return combined
  }

  // 카테고리별 지출 데이터 가져오기
  const getExpensesByCategoryData = () => {
    if (!dashboard?.monthlyExpensesByCategory) return []
    
    const monthlyData = dashboard.monthlyExpensesByCategory
    const allCategories = new Set<string>()
    
    // 모든 카테고리 수집
    Object.values(monthlyData).forEach((categories: any) => {
      Object.keys(categories).forEach(category => allCategories.add(category))
    })
    
    // 선택된 카테고리가 없으면 모든 카테고리 표시
    const categoriesToShow = selectedExpenseCategories.length > 0 
      ? selectedExpenseCategories 
      : Array.from(allCategories)
    
    // 월별 데이터 구성
    return Object.entries(monthlyData).map(([month, categories]: [string, any]) => {
      const [year, monthNum] = month.split('-')
      const monthName = language === 'ja' 
        ? `${year}年${parseInt(monthNum)}月` 
        : `${year}년 ${parseInt(monthNum)}월`
      
      const data: any = { month: monthName }
      categoriesToShow.forEach(category => {
        data[category] = categories[category] || 0
      })
      
      return data
    })
  }

  // 카테고리별 매출 데이터 가져오기
  const getSalesByCategoryData = () => {
    if (!dashboard?.monthlySalesByCategory) return []
    
    const monthlyData = dashboard.monthlySalesByCategory
    const allCategories = new Set<string>()
    
    // 모든 카테고리 수집
    Object.values(monthlyData).forEach((categories: any) => {
      Object.keys(categories).forEach(category => allCategories.add(category))
    })
    
    // 선택된 카테고리가 없으면 모든 카테고리 표시
    const categoriesToShow = selectedSalesCategories.length > 0 
      ? selectedSalesCategories 
      : Array.from(allCategories)
    
    // 월별 데이터 구성
    return Object.entries(monthlyData).map(([month, categories]: [string, any]) => {
      const [year, monthNum] = month.split('-')
      const monthName = language === 'ja' 
        ? `${year}年${parseInt(monthNum)}月` 
        : `${year}년 ${parseInt(monthNum)}월`
      
      const data: any = { month: monthName }
      categoriesToShow.forEach(category => {
        data[category] = categories[category] || 0
      })
      
      return data
    })
  }

  // 사용 가능한 카테고리 목록
  const getAvailableExpenseCategories = () => {
    if (!dashboard?.monthlyExpensesByCategory) return []
    
    const categories = new Set<string>()
    Object.values(dashboard.monthlyExpensesByCategory).forEach((monthCategories: any) => {
      Object.keys(monthCategories).forEach(category => categories.add(category))
    })
    
    return Array.from(categories).sort()
  }

  const getAvailableSalesCategories = () => {
    if (!dashboard?.monthlySalesByCategory) return []
    
    const categories = new Set<string>()
    Object.values(dashboard.monthlySalesByCategory).forEach((monthCategories: any) => {
      Object.keys(monthCategories).forEach(category => categories.add(category))
    })
    
    return Array.from(categories).sort()
  }

  // 카테고리별 색상 지정
  const getCategoryColor = (category: string, index: number) => {
    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
      '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16'
    ]
    return colors[index % colors.length]
  }

  // 월별 추이에서 사용 가능한 라인 목록
  const getAvailableMonthlyLines = () => {
    return [
      { key: 'totalSalesAmount', name: language === 'ja' ? '売上高（全体売上）' : '매출액 (전체매출)' },
      { key: 'sales', name: language === 'ja' ? '総売上（取引履歴）' : '총매출 (거래내역)' },
      { key: 'expenses', name: language === 'ja' ? '総支出（取引履歴）' : '총지출 (거래내역)' },
      { key: 'profit', name: language === 'ja' ? '純利益（取引履歴）' : '순이익 (거래내역)' }
    ]
  }

  // 선택된 라인이 없으면 모든 라인 표시
  const getVisibleMonthlyLines = () => {
    if (selectedMonthlyLines.length === 0) {
      return getAvailableMonthlyLines()
    }
    return getAvailableMonthlyLines().filter(line => selectedMonthlyLines.includes(line.key))
  }

  const handleTotalSalesCellClick = (month: number, paymentMethod: string, isFee: boolean) => {
    if (!isAdmin) return
    const currentValue = getTotalSalesValue(month, paymentMethod, isFee)
    setEditingCell({ year: totalSalesYear, month, paymentMethod, isFee })
    setEditingValue(currentValue.toString())
  }

  const handleTotalSalesCellSave = async () => {
    if (!editingCell) return
    
    try {
      await api.put('/total-sales/update', {
        fiscalYear: editingCell.year,
        month: editingCell.month,
        paymentMethod: editingCell.paymentMethod,
        isFee: editingCell.isFee,
        amount: parseFloat(editingValue) || 0
      })
      
      await fetchTotalSales()
      setEditingCell(null)
      setEditingValue('')
    } catch (error) {
      console.error('Total sales update error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handleTotalSalesCellCancel = () => {
    setEditingCell(null)
    setEditingValue('')
  }

  const calculateMonthTotal = (month: number, paymentMethods: string[], includeFees: boolean = true): number => {
    let total = 0
    for (const pm of paymentMethods) {
      total += getTotalSalesValue(month, pm, false)
      if (includeFees) {
        total += getTotalSalesValue(month, pm, true)
      }
    }
    return total
  }

  const calculateYearTotal = (paymentMethod: string, isFee: boolean): number => {
    const months = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    let total = 0
    for (const month of months) {
      total += getTotalSalesValue(month, paymentMethod, isFee)
    }
    return total
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 자동매칭 규칙 가져오기
    let autoMatchRules: any[] = []
    try {
      const rulesResponse = await api.get('/accounting/auto-match-rules')
      autoMatchRules = rulesResponse.data
    } catch (error) {
      console.error('Failed to fetch auto-match rules:', error)
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      // 헤더 제거 (첫 번째 줄)
      const dataLines = lines.slice(1)
      
      const parsedData = dataLines.map(line => {
        // CSV 파싱 (쉼표로 구분하되, 따옴표 안의 쉼표는 무시)
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || []
        
        if (values.length < 12) return null
        
        // 은행 거래내역 CSV 형식:
        // 0: 年, 1: 月, 2: 日, 3: 時, 4: 分, 5: 秒, 6: 取引番号, 7: 摘要(항목명), 8: 지출, 9: 입금, 10: 잔액, 11: 메모
        const year = values[0]
        const month = values[1].padStart(2, '0')
        const day = values[2].padStart(2, '0')
        const transactionDate = `${year}-${month}-${day}`
        
        const itemName = values[7] || ''
        const expense = values[8] ? parseFloat(values[8].replace(/,/g, '')) : 0
        const income = values[9] ? parseFloat(values[9].replace(/,/g, '')) : 0
        const memo = values[11] || ''
        
        // 입금/출금 판단
        const transactionType = income > 0 ? '입금' : '출금'
        const amount = income > 0 ? income : expense
        
        // 결제수단 판단: Vデビット이 포함되어 있으면 카드, 나머지는 계좌이체
        const paymentMethod = itemName.includes('Vデビット') ? '카드' : '계좌이체'
        
        // 자동매칭 규칙 적용
        let category = '지정없음'
        let assignedUserId = null
        
        for (const rule of autoMatchRules) {
          if (itemName.toLowerCase().includes(rule.keyword.toLowerCase())) {
            if (rule.category) category = rule.category
            if (rule.assigned_user_id) assignedUserId = rule.assigned_user_id
            break
          }
        }
        
        return {
          transactionDate,
          transactionType,
          category,
          paymentMethod,
          itemName,
          amount,
          memo,
          assignedUserId
        }
      }).filter(Boolean)
      
      setTransactionUploadPreview(parsedData)
      setShowTransactionUploadDialog(true)
    }
    
    reader.readAsText(file, 'Shift-JIS')  // 은행 CSV는 Shift-JIS 인코딩
    e.target.value = ''
  }

  const handleTransactionSaveUpload = async () => {
    setUploadingCsv(true)
    try {
      const response = await api.post('/accounting/transactions/bulk', { transactions: transactionUploadPreview })
      alert(
        language === 'ja'
          ? `${response.data.imported}件のデータをインポートしました`
          : `${response.data.imported}건의 데이터를 가져왔습니다`
      )
      setShowTransactionUploadDialog(false)
      setTransactionUploadPreview([])
      fetchTransactions()
      fetchDashboard()
    } catch (error: any) {
      console.error('Transaction upload error:', error)
      alert(
        error.response?.data?.error ||
          (language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다')
      )
    } finally {
      setUploadingCsv(false)
    }
  }

  const handleSubmitEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Helper function to convert empty strings to null
    const getFormValue = (key: string): string | null => {
      const value = formData.get(key)
      if (!value) return null
      const trimmed = String(value).trim()
      return trimmed || null
    }

    const getFormNumberValue = (key: string): number | null => {
      const value = getFormValue(key)
      if (!value) return null
      const num = Number(value)
      return isNaN(num) ? null : num
    }

    try {
      const payload = {
        name: getFormValue('name'),
        email: getFormValue('email'),
        password: getFormValue('password') || undefined,
        hireDate: getFormValue('hireDate'),
        department: getFormValue('department'),
        position: getFormValue('position'),
        employmentStatus: getFormValue('employmentStatus') || '입사중',
        baseSalary: getFormNumberValue('baseSalary'),
        contractStartDate: getFormValue('contractStartDate'),
        contractEndDate: getFormValue('contractEndDate'),
        martId: getFormValue('martId'),
        transportationRoute: getFormValue('transportationRoute'),
        monthlyTransportationCost: getFormNumberValue('monthlyTransportationCost'),
        transportationStartDate: getFormValue('transportationStartDate'),
        transportationDetails: getFormValue('transportationDetails'),
      }

      if (editingEmployee) {
        await api.put(`/auth/users/${editingEmployee.id}`, payload)
        
        // 상세 모달이 열려있으면 해당 직원 정보도 업데이트
        if (selectedEmployee?.id === editingEmployee.id) {
          const response = await api.get(`/auth/users`)
          const updatedEmployee = response.data.find((emp: any) => emp.id === editingEmployee.id)
          if (updatedEmployee) {
            setSelectedEmployee(updatedEmployee)
          }
        }
      } else {
        await api.post('/auth/users', {
          ...payload,
          role: 'user',
          team: formData.get('department') || '',
        })
      }

      closeEmployeeForm()
      fetchEmployees()
    } catch (error: any) {
      console.error('Employee create error:', error)
      alert(error.response?.data?.message || (language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다'))
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/auth/users/${id}`)
      if (editingEmployee?.id === id) {
        closeEmployeeForm()
      }
      fetchEmployees()
    } catch (error) {
      console.error('Employee delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleGeneratePayroll = async () => {
    const month = prompt(language === 'ja' ? '対象月 (YYYY-MM-01)' : '대상 월 (YYYY-MM-01)', new Date().toISOString().slice(0, 7) + '-01')
    if (!month) return
    
    try {
      await api.post('/accounting/payroll/generate', { paymentMonth: month })
      // fetchPayrolls()
      alert(language === 'ja' ? '給与を生成しました' : '급여を生성했습니다')
    } catch (error) {
      console.error('Payroll generate error:', error)
      alert(language === 'ja' ? '生成に失敗しました' : '생성에 실패했습니다')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleSubmitPayroll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingPayroll) return

    const formData = new FormData(e.currentTarget)

    try {
      await api.put(`/accounting/payroll/${editingPayroll.id}`, {
        baseSalary: Number(formData.get('baseSalary')),
        incentive: Number(formData.get('incentive')),
        otherPayments: Number(formData.get('otherPayments')),
        paymentStatus: formData.get('paymentStatus'),
      })

      // closePayrollForm()
      // fetchPayrolls()
    } catch (error) {
      console.error('Payroll update error:', error)
      alert(language === 'ja' ? '修正に失敗しました' : '수정에 실패했습니다')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleDeletePayroll = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/payroll/${id}`)
      // if (editingPayroll?.id === id) {
      //   closePayrollForm()
      // }
      // fetchPayrolls()
    } catch (error) {
      console.error('Payroll delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handleSubmitRecurring = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        itemName: formData.get('itemName'),
        monthlyAmount: Number(formData.get('monthlyAmount')),
        paymentDay: Number(formData.get('paymentDay')),
        paymentMethod: formData.get('paymentMethod'),
        isActive: true,
      }

      if (editingRecurring) {
        await api.put(`/accounting/recurring-expenses/${editingRecurring.id}`, payload)
      } else {
        await api.post('/accounting/recurring-expenses', payload)
      }

      closeRecurringForm()
      fetchRecurringExpenses()
    } catch (error) {
      console.error('Recurring create error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleDeleteRecurring = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/recurring-expenses/${id}`)
      if (editingRecurring?.id === id) {
        closeRecurringForm()
      }
      fetchRecurringExpenses()
    } catch (error) {
      console.error('Recurring delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handleSubmitCapital = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        balanceDate: formData.get('balanceDate'),
        amount: Number(formData.get('amount')),
        note: formData.get('note') || null
      }

      if (editingCapital) {
        await api.put(`/accounting/capital-balance/${editingCapital.id}`, payload)
      } else {
        await api.post('/accounting/capital-balance', payload)
      }

      closeCapitalForm()
      fetchCapitalBalances()
    } catch (error: any) {
      console.error('Capital create error:', error)
      alert(error.response?.data?.error || (language === 'ja' ? '処理に失敗しました' : '처리에 실패했습니다'))
    }
  }

  const handleDeleteCapital = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/capital-balance/${id}`)
      if (editingCapital?.id === id) {
        closeCapitalForm()
      }
      fetchCapitalBalances()
    } catch (error) {
      console.error('Capital delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handleSubmitDeposit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    try {
      const payload = {
        itemName: formData.get('itemName'),
        amount: Number(formData.get('amount')),
        note: formData.get('note') || null
      }

      if (editingDeposit) {
        await api.put(`/accounting/deposits/${editingDeposit.id}`, payload)
      } else {
        await api.post('/accounting/deposits', payload)
      }

      closeDepositForm()
      fetchDeposits()
    } catch (error: any) {
      console.error('Deposit create error:', error)
      alert(error.response?.data?.error || (language === 'ja' ? '処理に失敗しました' : '처리에 실패했습니다'))
    }
  }

  const handleDeleteDeposit = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    try {
      await api.delete(`/accounting/deposits/${id}`)
      if (editingDeposit?.id === id) {
        closeDepositForm()
      }
      fetchDeposits()
    } catch (error) {
      console.error('Deposit delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // 직원 상세 모달 관련 함수들
  const openEmployeeDetail = async (employee: Employee) => {
    setSelectedEmployee(employee)
    setShowEmployeeDetailModal(true)
    try {
      const response = await api.get(`/accounting/employees/${employee.id}/files`)
      setEmployeeFiles(response.data)
    } catch (error) {
      console.error('Employee files fetch error:', error)
    }
  }

  const closeEmployeeDetail = () => {
    setShowEmployeeDetailModal(false)
    setSelectedEmployee(null)
    setEmployeeFiles([])
    setSelectedYearMonth('')
    setSelectedFileSubcategory('')
  }

  const handleUploadEmployeeFile = async (fileCategory: string, file: File, subcategory?: string, yearMonth?: string) => {
    if (!selectedEmployee) return
    
    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fileCategory', fileCategory)
      if (subcategory) formData.append('fileSubcategory', subcategory)
      if (yearMonth) formData.append('yearMonth', yearMonth)

      await api.post(`/accounting/employees/${selectedEmployee.id}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // 파일 목록 새로고침
      const response = await api.get(`/accounting/employees/${selectedEmployee.id}/files`)
      setEmployeeFiles(response.data)
      
      alert(language === 'ja' ? 'アップロードしました' : '업로드되었습니다')
    } catch (error) {
      console.error('File upload error:', error)
      alert(language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDownloadEmployeeFile = async (fileId: string, fileName: string) => {
    if (!selectedEmployee) return
    
    try {
      const response = await api.get(`/accounting/employees/${selectedEmployee.id}/files/${fileId}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('File download error:', error)
      alert(language === 'ja' ? 'ダウンロードに失敗しました' : '다운로드에 실패했습니다')
    }
  }

  const handleDeleteEmployeeFile = async (fileId: string) => {
    if (!selectedEmployee) return
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/accounting/employees/${selectedEmployee.id}/files/${fileId}`)
      
      // 파일 목록 새로고침
      const response = await api.get(`/accounting/employees/${selectedEmployee.id}/files`)
      setEmployeeFiles(response.data)
      
      alert(language === 'ja' ? '削除しました' : '삭제되었습니다')
    } catch (error) {
      console.error('File delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  // PayPay 함수들
  const fetchPaypaySummary = async () => {
    try {
      // 날짜 필터 없이 전체 기간 합계
      const response = await api.get('/paypay/summary')
      setPaypaySummary(response.data)
    } catch (error) {
      console.error('PayPay summary fetch error:', error)
    }
  }

  const fetchPaypaySales = async () => {
    try {
      let categoryParam = undefined
      if (paypayCategoryFilter !== 'all') {
        categoryParam = paypayCategoryFilter
      }
      
      const response = await api.get('/paypay/sales', {
        params: {
          startDate: paypayStartDate,
          endDate: paypayEndDate,
          category: categoryParam,
          name: paypayNameFilter || undefined
        }
      })
      setPaypaySales(response.data)
    } catch (error) {
      console.error('PayPay sales fetch error:', error)
    }
  }

  const fetchPaypayExpenses = async () => {
    try {
      const response = await api.get('/paypay/expenses', {
        params: { startDate: paypayStartDate, endDate: paypayEndDate }
      })
      setPaypayExpenses(response.data)
    } catch (error) {
      console.error('PayPay expenses fetch error:', error)
    }
  }

  // PayPay 날짜 버튼 함수
  const handlePaypayPreviousMonth = () => {
    const now = new Date()
    now.setMonth(now.getMonth() - 1)
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0)
    const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    setPaypayStartDate(firstDay)
    setPaypayEndDate(lastDayString)
  }

  const handlePaypayCurrentMonth = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const today = `${year}-${String(month + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    setPaypayStartDate(firstDay)
    setPaypayEndDate(today)
  }

  const handlePaypayNextMonth = () => {
    const now = new Date()
    now.setMonth(now.getMonth() + 1)
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0)
    const lastDayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
    setPaypayStartDate(firstDay)
    setPaypayEndDate(lastDayString)
  }

  useEffect(() => {
    if (activeTab === 'paypay') {
      fetchPaypaySummary()
      fetchPaypaySales()
      fetchPaypayExpenses()
    }
  }, [activeTab, paypayStartDate, paypayEndDate, paypayCategoryFilter, paypayNameFilter])

  // ESC 키로 자동 매칭 설정 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAutoMatchDialog) {
        setShowAutoMatchDialog(false)
        setEditingRule(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAutoMatchDialog])

  // ESC 키로 직원 추가 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddEmployeeDialog) {
        setShowAddEmployeeDialog(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showAddEmployeeDialog])

  // ESC 키로 거래내역 CSV 업로드 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTransactionUploadDialog) {
        setShowTransactionUploadDialog(false)
        setTransactionUploadPreview([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showTransactionUploadDialog])

  // ESC 키로 PayPay CSV 업로드 모달 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showPaypayUploadDialog) {
        setShowPaypayUploadDialog(false)
        setPaypayUploadPreview([])
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPaypayUploadDialog])

  const handlePaypayCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      // 헤더 제거 (첫 번째 줄)
      const dataLines = lines.slice(1)
      
      const parsedData = dataLines.map(line => {
        // CSV 파싱 (쉼표로 구분하되, 따옴표 안의 쉼표는 무시)
        const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || []
        
        if (values.length < 15) return null
        
        // 날짜 파싱 (입금일시 컬럼: 인덱스 12)
        const dateStr = values[12] || ''
        
        // 카테고리 판단 (신청 입금자명: 인덱스 2)
        const applicantName = values[2] || ''
        
        // 금액 파싱 (입금금액: 인덱스 11)
        const amountStr = values[11]?.replace(/,/g, '') || '0'
        const amount = parseFloat(amountStr)
        
        return {
          date: dateStr,
          category: applicantName,
          user_id: values[1] || '', // 유저 아이디
          name: values[6] || '', // 영수증 이름
          receipt_number: '', // 영수증번호는 CSV에 없음
          amount: amount
        }
      }).filter(Boolean)
      
      setPaypayUploadPreview(parsedData)
      setShowPaypayUploadDialog(true)
    }
    
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  const handlePaypaySaveUpload = async () => {
    try {
      await api.post('/paypay/sales/bulk', { sales: paypayUploadPreview })
      alert(language === 'ja' ? 'アップロードしました' : '업로드되었습니다')
      setShowPaypayUploadDialog(false)
      setPaypayUploadPreview([])
      fetchPaypaySummary()
      fetchPaypaySales()
    } catch (error) {
      console.error('PayPay upload error:', error)
      alert(language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다')
    }
  }

  const handlePaypayExpenseSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      const payload = {
        date: formData.get('date'),
        item: formData.get('item'),
        amount: Number(formData.get('amount')),
        memo: formData.get('memo') || ''
      }
      
      if (editingPaypayExpense) {
        await api.put(`/paypay/expenses/${editingPaypayExpense.id}`, payload)
      } else {
        await api.post('/paypay/expenses', payload)
      }
      
      setShowPaypayExpenseForm(false)
      setEditingPaypayExpense(null)
      fetchPaypaySummary()
      fetchPaypayExpenses()
    } catch (error) {
      console.error('PayPay expense save error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handlePaypayExpenseDelete = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/paypay/expenses/${id}`)
      fetchPaypaySummary()
      fetchPaypayExpenses()
    } catch (error) {
      console.error('PayPay expense delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const handlePaypaySaleMemo = async (sale: any) => {
    const memo = prompt(language === 'ja' ? 'メモを入力してください' : '메모를 입력하세요', sale.memo || '')
    if (memo === null) return // 취소
    
    try {
      await api.put(`/paypay/sales/${sale.id}`, { memo })
      fetchPaypaySales()
      alert(language === 'ja' ? '保存しました' : '저장되었습니다')
    } catch (error) {
      console.error('PayPay sale memo update error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handleSavePaypaySale = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    try {
      await api.post('/paypay/sales', {
        date: formData.get('date'),
        category: formData.get('category'),
        user_id: formData.get('user_id') || '',
        name: formData.get('name'),
        receipt_number: formData.get('receipt_number') || '',
        amount: Number(formData.get('amount')),
        memo: formData.get('memo') || ''
      })
      setShowPaypaySaleForm(false)
      fetchPaypaySummary()
      fetchPaypaySales()
      alert(language === 'ja' ? '保存しました' : '저장되었습니다')
    } catch (error) {
      console.error('PayPay sale save error:', error)
      alert(language === 'ja' ? '保存に失敗しました' : '저장에 실패했습니다')
    }
  }

  const handlePaypaySaleDelete = async (id: string) => {
    if (!confirm(language === 'ja' ? '削除しますか？' : '삭제하시겠습니까?')) return
    
    try {
      await api.delete(`/paypay/sales/${id}`)
      fetchPaypaySummary()
      fetchPaypaySales()
    } catch (error) {
      console.error('PayPay sale delete error:', error)
      alert(language === 'ja' ? '削除に失敗しました' : '삭제에 실패했습니다')
    }
  }

  const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)
    }

  return (
    <div className="min-h-screen bg-gray-100 space-y-6 p-6">
      {/* 저장 완료 토스트 */}
      {showSaveToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in-down">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{language === 'ja' ? '保存しました' : '저장되었습니다'}</span>
          </div>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
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

          {dashboard && (
            <>
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
                          {language === 'ja' ? '純利益（取引履歴基準）' : '순이익 (거래내역 기반)'}
                        </p>
                        <p className={`text-2xl font-bold mt-1 ${dashboard.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(dashboard.netProfit)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Combined Monthly Chart - Collapsible */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50" 
                  onClick={() => setExpandedCharts(prev => ({ ...prev, monthly: !prev.monthly }))}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{language === 'ja' ? '月別推移' : '월별 추이'}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {language === 'ja' ? '※最近12ヶ月' : '※ 최근 12개월'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {expandedCharts.monthly ? '▼' : '▶'}
                    </Button>
                  </div>
                </CardHeader>
                {expandedCharts.monthly && (
                  <CardContent>
                    {/* 라인 선택 */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {getAvailableMonthlyLines().map(line => (
                        <label key={line.key} className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMonthlyLines.length === 0 || selectedMonthlyLines.includes(line.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedMonthlyLines.length === 0) {
                                  setSelectedMonthlyLines([line.key])
                                } else {
                                  setSelectedMonthlyLines([...selectedMonthlyLines, line.key])
                                }
                              } else {
                                setSelectedMonthlyLines(selectedMonthlyLines.filter(l => l !== line.key))
                              }
                            }}
                            className="mr-1"
                          />
                          <span className="text-sm">{line.name}</span>
                        </label>
                      ))}
                      {selectedMonthlyLines.length > 0 && (
                        <button
                          onClick={() => setSelectedMonthlyLines([])}
                          className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                        >
                          {language === 'ja' ? '全て表示' : '전체 표시'}
                        </button>
                      )}
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart 
                        data={getCombinedMonthlyData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis 
                          width={80}
                          tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend verticalAlign="top" height={36} />
                        {getVisibleMonthlyLines().map(line => (
                          <Line 
                            key={line.key}
                            type="monotone" 
                            dataKey={line.key} 
                            name={line.name}
                            stroke={
                              line.key === 'totalSalesAmount' ? '#f59e0b' :
                              line.key === 'sales' ? '#10b981' :
                              line.key === 'expenses' ? '#ef4444' :
                              '#3b82f6'
                            }
                            strokeWidth={line.key === 'totalSalesAmount' ? 4 : 2}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                )}
              </Card>

              {/* Category Sales Chart - Collapsible */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50" 
                  onClick={() => setExpandedCharts(prev => ({ ...prev, salesByCategory: !prev.salesByCategory }))}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{language === 'ja' ? 'カテゴリ別売上推移' : '카테고리별 매출 추이'}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {language === 'ja' ? '※最近12ヶ月' : '※ 최근 12개월'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {expandedCharts.salesByCategory ? '▼' : '▶'}
                    </Button>
                  </div>
                </CardHeader>
                {expandedCharts.salesByCategory && (
                  <CardContent>
                    {/* 카테고리 선택 */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {getAvailableSalesCategories().map(category => (
                        <label key={category} className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedSalesCategories.length === 0 || selectedSalesCategories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedSalesCategories.length === 0) {
                                  setSelectedSalesCategories([category])
                                } else {
                                  setSelectedSalesCategories([...selectedSalesCategories, category])
                                }
                              } else {
                                setSelectedSalesCategories(selectedSalesCategories.filter(c => c !== category))
                              }
                            }}
                            className="mr-1"
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                      {selectedSalesCategories.length > 0 && (
                        <button
                          onClick={() => setSelectedSalesCategories([])}
                          className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                        >
                          {language === 'ja' ? '全て表示' : '전체 표시'}
                        </button>
                      )}
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart 
                        data={getSalesByCategoryData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis 
                          width={80}
                          tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        {(selectedSalesCategories.length > 0 ? selectedSalesCategories : getAvailableSalesCategories()).map((category, index) => (
                          <Line 
                            key={category} 
                            type="monotone"
                            dataKey={category} 
                            stroke={getCategoryColor(category, index)}
                            strokeWidth={2}
                            name={category}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                )}
              </Card>

              {/* Category Expenses Chart - Collapsible */}
              <Card>
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50" 
                  onClick={() => setExpandedCharts(prev => ({ ...prev, expensesByCategory: !prev.expensesByCategory }))}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{language === 'ja' ? 'カテゴリ別支出推移' : '카테고리별 지출 추이'}</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">
                        {language === 'ja' ? '※最近12ヶ月' : '※ 최근 12개월'}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      {expandedCharts.expensesByCategory ? '▼' : '▶'}
                    </Button>
                  </div>
                </CardHeader>
                {expandedCharts.expensesByCategory && (
                  <CardContent>
                    {/* 카테고리 선택 */}
                    <div className="mb-4 flex flex-wrap gap-2">
                      {getAvailableExpenseCategories().map(category => (
                        <label key={category} className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedExpenseCategories.length === 0 || selectedExpenseCategories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (selectedExpenseCategories.length === 0) {
                                  setSelectedExpenseCategories([category])
                                } else {
                                  setSelectedExpenseCategories([...selectedExpenseCategories, category])
                                }
                              } else {
                                setSelectedExpenseCategories(selectedExpenseCategories.filter(c => c !== category))
                              }
                            }}
                            className="mr-1"
                          />
                          <span className="text-sm">{category}</span>
                        </label>
                      ))}
                      {selectedExpenseCategories.length > 0 && (
                        <button
                          onClick={() => setSelectedExpenseCategories([])}
                          className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
                        >
                          {language === 'ja' ? '全て表示' : '전체 표시'}
                        </button>
                      )}
                    </div>

                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart 
                        data={getExpensesByCategoryData()}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          angle={-45}
                          textAnchor="end"
                          height={80}
                          interval={0}
                          style={{ fontSize: '11px' }}
                        />
                        <YAxis 
                          width={80}
                          tickFormatter={(value) => `¥${(value / 10000).toFixed(0)}万`}
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        {(selectedExpenseCategories.length > 0 ? selectedExpenseCategories : getAvailableExpenseCategories()).map((category, index) => (
                          <Line 
                            key={category} 
                            type="monotone"
                            dataKey={category} 
                            stroke={getCategoryColor(category, index)}
                            strokeWidth={2}
                            name={category}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                )}
              </Card>

              {/* Sales & Expense Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ja' ? 'カテゴリ別売上' : '카테고리별 매출'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.salesByCategory && Object.entries(dashboard.salesByCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{category}</span>
                          <span className="text-sm font-bold text-emerald-600">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      {(!dashboard.salesByCategory || Object.keys(dashboard.salesByCategory).length === 0) && (
                        <p className="text-sm text-gray-500">{language === 'ja' ? 'データがありません' : '데이터가 없습니다'}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ja' ? 'カテゴリ別支出' : '카테고리별 지출'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(dashboard.expensesByCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{category}</span>
                          <span className="text-sm font-bold text-red-600">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ja' ? '総資産' : '총 자산'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* 계좌잔액 (가장 최근) */}
                      {capitalBalances.length > 0 && (
                        <div className="pb-3 border-b">
                          <div className="flex justify-between items-center mb-2">
                            <p className="text-sm font-medium text-gray-700">
                              {language === 'ja' ? '口座残高（最新）' : '계좌잔액 (최신)'}
                            </p>
                            <span className="text-sm font-bold text-blue-600">
                              {formatCurrency(capitalBalances[0]?.amount || 0)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(capitalBalances[0]?.balance_date || '').toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })} {language === 'ja' ? '時点' : '기준'}
                          </p>
                        </div>
                      )}
                      
                      {/* 보증금 합계 */}
                      <div className="pb-3 border-b">
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium text-gray-700">
                            {language === 'ja' ? '保証金合計' : '보증금 합계'}
                          </p>
                          <span className="text-sm font-bold text-green-600">
                            {formatCurrency(deposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0))}
                          </span>
                        </div>
                      </div>
                      
                      {/* 총합 */}
                      <div className="pt-2">
                        <div className="flex justify-between items-center">
                          <p className="text-base font-bold text-gray-900">
                            {language === 'ja' ? '合計' : '합계'}
                          </p>
                          <span className="text-lg font-bold text-purple-600">
                            {formatCurrency(
                              (Number(capitalBalances[0]?.amount) || 0) + 
                              deposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          {/* 날짜 필터 */}
          <Card>
            <CardContent className="p-4">
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
            </CardContent>
          </Card>

          {/* 필터 & 검색 & 작업 버튼 */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'ja' ? '区分' : '구분'}</label>
                  <select
                    value={transactionTypeFilter}
                    onChange={(e) => setTransactionTypeFilter(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                    <option value="입금">{language === 'ja' ? '入金' : '입금'}</option>
                    <option value="출금">{language === 'ja' ? '出金' : '출금'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {language === 'ja' ? opt.labelJa : opt.labelKo}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                  <select
                    value={nameFilter}
                    onChange={(e) => setNameFilter(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                    {nameOptions.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済' : '결제'}</label>
                  <select
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                    <option value="계좌이체">{language === 'ja' ? '口座振替' : '계좌이체'}</option>
                    <option value="PayPay">PayPay</option>
                    <option value="페이팔">{language === 'ja' ? 'ペイパル' : '페이팔'}</option>
                    <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{language === 'ja' ? '検索' : '검색'}</label>
                  <Input
                    type="text"
                    placeholder={language === 'ja' ? '項目名、メモで検索' : '항목명, 메모 검색'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTransactionTypeFilter('all')
                      setCategoryFilter('all')
                      setNameFilter('all')
                      setPaymentMethodFilter('all')
                      setSearchQuery('')
                    }}
                    className="h-10"
                  >
                    {language === 'ja' ? 'リセット' : '초기화'}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowAutoMatchDialog(true)}
                >
                  {language === 'ja' ? '自動マッチング設定' : '자동 매칭 설정'}
                </Button>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className="hidden"
                    disabled={uploadingCsv}
                  />
                  <div className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ${uploadingCsv ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingCsv ? (language === 'ja' ? 'アップロード中...' : '업로드 중...') : (language === 'ja' ? 'CSV アップロード' : 'CSV 업로드')}
                  </div>
                </label>
                <Button
                  onClick={() => {
                    if (showTransactionForm && !editingTransaction) {
                      closeTransactionForm()
                    } else {
                      openTransactionForm()
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'ja' ? '追加' : '추가'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {showTransactionForm && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingTransaction
                    ? language === 'ja'
                      ? '取引を修正する'
                      : '거래 수정'
                    : language === 'ja'
                    ? '取引を追加する'
                    : '거래 추가'}
                </h3>
                <form
                  key={editingTransaction?.id || 'new'}
                  onSubmit={handleSubmitTransaction}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '日付' : '날짜'}</label>
                    <Input
                      type="date"
                      name="transactionDate"
                      required
                      defaultValue={editingTransaction?.transactionDate || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '時間' : '시간'}</label>
                    <Input
                      type="time"
                      name="transactionTime"
                      defaultValue={editingTransaction?.transactionTime || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '区分' : '구분'}</label>
                    <select
                      name="transactionType"
                      className="w-full border rounded px-3 py-2"
                      required
                      defaultValue={editingTransaction?.transactionType || '입금'}
                    >
                      <option value="입금">{language === 'ja' ? '入金' : '입금'}</option>
                      <option value="출금">{language === 'ja' ? '出金' : '출금'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
                    <select
                      name="category"
                      className="w-full border rounded px-3 py-2"
                      required
                      defaultValue={editingTransaction?.category || '지정없음'}
                    >
                      {CATEGORY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {language === 'ja' ? option.labelJa : option.labelKo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                    <select
                      name="assignedUserId"
                      className="w-full border rounded px-3 py-2"
                      defaultValue={editingTransaction?.assignedUserId || ''}
                    >
                      <option value="">{language === 'ja' ? '未選択' : '선택 안 함'}</option>
                      {nameOptions.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済手段' : '결제수단'}</label>
                    <select
                      name="paymentMethod"
                      className="w-full border rounded px-3 py-2"
                      required
                      defaultValue={
                        editingTransaction?.paymentMethod
                          ? (editingTransaction.paymentMethod === '현금' || editingTransaction.paymentMethod === '은행' || editingTransaction.paymentMethod === '현금/은행'
                              ? '계좌이체'
                              : editingTransaction.paymentMethod === 'Stripe'
                              ? '페이팔'
                              : editingTransaction.paymentMethod)
                          : '계좌이체'
                      }
                    >
                      <option value="계좌이체">{language === 'ja' ? '口座振替' : '계좌이체'}</option>
                      <option value="PayPay">PayPay</option>
                      <option value="페이팔">{language === 'ja' ? 'ペイパル' : '페이팔'}</option>
                      <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                    <Input
                      type="text"
                      name="itemName"
                      required
                      defaultValue={editingTransaction?.itemName || ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '金額' : '금액'}</label>
                    <Input
                      type="number"
                      name="amount"
                      required
                      defaultValue={editingTransaction ? String(editingTransaction.amount) : ''}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'メモ' : '메모'}</label>
                    <Input type="text" name="memo" defaultValue={editingTransaction?.memo || ''} />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">
                      {editingTransaction
                        ? language === 'ja'
                          ? '修正を保存'
                          : '수정 저장'
                        : language === 'ja'
                        ? '保存'
                        : '저장'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeTransactionForm}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* 선택한 항목 일괄 변경 버튼 */}
          {selectedTransactions.size > 0 && (
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {language === 'ja' 
                      ? `${selectedTransactions.size}件選択中` 
                      : `${selectedTransactions.size}건 선택됨`}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBulkEditDialog(true)}
                    >
                      {language === 'ja' ? '一括編集' : '일괄 변경'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      {language === 'ja' ? '一括削除' : '일괄 삭제'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTransactions(new Set())}
                    >
                      {language === 'ja' ? '選択解除' : '선택 해제'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-center" style={{ width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={selectedTransactions.size > 0 && transactions.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="cursor-pointer"
                        />
                      </th>
                      <th className="px-3 py-3 text-left" style={{ width: '140px' }}>{language === 'ja' ? '日時' : '날짜/시간'}</th>
                      <th className="px-3 py-3 text-center" style={{ width: '60px' }}>{language === 'ja' ? '区分' : '구분'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '280px' }}>{language === 'ja' ? '項目' : '항목'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '100px' }}>{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '120px' }}>{language === 'ja' ? '名前' : '이름'}</th>
                      <th className="px-3 py-3 text-right" style={{ width: '120px' }}>{language === 'ja' ? '金額' : '금액'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '80px' }}>{language === 'ja' ? '決済' : '결제'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '150px' }}>{language === 'ja' ? 'メモ' : '메모'}</th>
                      <th className="px-3 py-3 text-center" style={{ width: '60px' }}>{language === 'ja' ? '操作' : '조작'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filteredTransactions = transactions
                        .filter(tx => {
                          // 날짜 필터
                          if (!startDate && !endDate) return true
                          const txDate = tx.transactionDate
                          if (startDate && txDate < startDate) return false
                          if (endDate && txDate > endDate) return false
                          return true
                        })
                        .filter(tx => {
                          // 구분 필터
                          if (transactionTypeFilter !== 'all' && tx.transactionType !== transactionTypeFilter) return false
                          // 카테고리 필터
                          if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false
                          // 이름 필터
                          if (nameFilter !== 'all' && tx.assignedUserId !== nameFilter) return false
                          // 결제 필터
                          if (paymentMethodFilter !== 'all' && tx.paymentMethod !== paymentMethodFilter) return false
                          // 검색 필터 (항목명, 메모)
                          if (searchQuery) {
                            const query = searchQuery.toLowerCase()
                            const itemMatch = tx.itemName?.toLowerCase().includes(query)
                            const memoMatch = tx.memo?.toLowerCase().includes(query)
                            if (!itemMatch && !memoMatch) return false
                          }
                          return true
                        })
                      
                      return filteredTransactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.has(tx.id)}
                            onChange={(e) => handleSelectTransaction(tx.id, e.target.checked)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm">
                          {tx.transactionTime ? (
                            <>
                              <div>{tx.transactionDate}</div>
                              <div className="text-xs text-gray-500">{tx.transactionTime}</div>
                            </>
                          ) : (
                            <div>{tx.transactionDate}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                            tx.transactionType === '입금' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {tx.transactionType === '입금' ? (language === 'ja' ? '入' : '입') : (language === 'ja' ? '出' : '출')}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-sm" style={{ maxWidth: '280px' }}>
                          <div className="truncate">{tx.itemName}</div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={tx.category}
                            onChange={(e) => handleQuickUpdateTransaction(tx.id, { category: e.target.value })}
                            disabled={!isAdmin || updatingTransactionId === tx.id}
                            className={`w-full border rounded px-2 py-1 text-sm ${updatingTransactionId === tx.id ? 'opacity-60 cursor-wait' : ''}`}
                          >
                            {CATEGORY_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {language === 'ja' ? option.labelJa : option.labelKo}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={tx.assignedUserId ?? ''}
                            onChange={(e) =>
                              handleQuickUpdateTransaction(tx.id, {
                                assignedUserId: e.target.value ? e.target.value : null,
                              })
                            }
                            disabled={!isAdmin || updatingTransactionId === tx.id || nameOptions.length === 0}
                            className={`w-full border rounded px-2 py-1 text-sm ${
                              updatingTransactionId === tx.id ? 'opacity-60 cursor-wait' : ''
                            }`}
                          >
                            <option value="">{language === 'ja' ? '未選択' : '선택 안 함'}</option>
                            {nameOptions.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-sm">{formatCurrency(tx.amount)}</td>
                        <td className="px-3 py-2 text-sm">{tx.paymentMethod}</td>
                        <td className="px-3 py-2" style={{ maxWidth: '250px' }}>
                          {editingMemoId === tx.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={memoDrafts[tx.id] ?? ''}
                                placeholder={language === 'ja' ? 'メモを入力' : '메모 입력'}
                                onChange={(e) => handleMemoChange(tx.id, e.target.value)}
                                disabled={updatingTransactionId === tx.id}
                                className="text-xs flex-1"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleMemoSave(tx.id)}
                                disabled={updatingTransactionId === tx.id}
                                className="h-8 px-3 text-xs"
                              >
                                {language === 'ja' ? '保存' : '저장'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMemoCancel(tx.id)}
                                disabled={updatingTransactionId === tx.id}
                                className="h-8 px-3 text-xs"
                              >
                                {language === 'ja' ? 'キャンセル' : '취소'}
                              </Button>
                            </div>
                          ) : (
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded min-h-[28px]"
                              onClick={() => isAdmin && handleMemoEdit(tx.id, tx.memo ?? null)}
                            >
                              <span className="text-xs flex-1 truncate text-gray-600">
                                {tx.memo || ''}
                              </span>
                              {isAdmin && (
                                <Pencil className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            aria-label={language === 'ja' ? '削除' : '삭제'}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))})()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* 일괄 변경 모달 */}
          {showBulkEditDialog && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowBulkEditDialog(false)
                }
              }}
            >
              <Card className="w-96">
                <CardHeader>
                  <CardTitle>{language === 'ja' ? '一括編集' : '일괄 변경'}</CardTitle>
                  <p className="text-sm text-gray-600">
                    {language === 'ja' 
                      ? `${selectedTransactions.size}件の項目を編集します` 
                      : `${selectedTransactions.size}건의 항목을 변경합니다`}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {language === 'ja' ? 'カテゴリ' : '카테고리'}
                      </label>
                      <select
                        value={bulkEditCategory}
                        onChange={(e) => setBulkEditCategory(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">{language === 'ja' ? '変更しない' : '변경하지 않음'}</option>
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {language === 'ja' ? option.labelJa : option.labelKo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        {language === 'ja' ? '担当者' : '담당자'}
                      </label>
                      <select
                        value={bulkEditAssignedUserId}
                        onChange={(e) => setBulkEditAssignedUserId(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      >
                        <option value="">{language === 'ja' ? '変更しない' : '변경하지 않음'}</option>
                        {nameOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex gap-2 justify-end pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBulkEditDialog(false)
                          setBulkEditCategory('')
                          setBulkEditAssignedUserId('')
                        }}
                      >
                        {language === 'ja' ? 'キャンセル' : '취소'}
                      </Button>
                      <Button onClick={handleBulkEdit}>
                        {language === 'ja' ? '適用' : '적용'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 자동 매칭 설정 팝업 */}
          {showAutoMatchDialog && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAutoMatchDialog(false)
                  setEditingRule(null)
                }
              }}
            >
              <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
                <CardHeader>
                  <CardTitle>{language === 'ja' ? '自動マッチング設定' : '자동 매칭 설정'}</CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    {language === 'ja' 
                      ? 'CSV アップロード時に、項目名にキーワードが含まれていれば自動的にカテゴリと担当者を設定します。'
                      : 'CSV 업로드 시 항목명에 키워드가 포함되어 있으면 자동으로 카테고리와 담당자를 설정합니다.'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 규칙 추가/수정 폼 */}
                  <form onSubmit={handleSaveAutoMatchRule} className="border rounded p-4 space-y-3 bg-gray-50">
                    <h3 className="font-semibold">{editingRule ? (language === 'ja' ? '規則を修正' : '규칙 수정') : (language === 'ja' ? '新規規則追加' : '신규 규칙 추가')}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? 'キーワード' : '키워드'} <span className="text-red-500">*</span>
                        </label>
                        <Input
                          name="keyword"
                          required
                          placeholder={language === 'ja' ? '例: face, PayPay' : '예: face, PayPay'}
                          defaultValue={editingRule?.keyword || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? 'カテゴリ' : '카테고리'}
                        </label>
                        <select name="category" className="w-full border rounded px-3 py-2" defaultValue={editingRule?.category || ''}>
                          <option value="">{language === 'ja' ? '指定なし' : '지정 없음'}</option>
                          {CATEGORY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {language === 'ja' ? opt.labelJa : opt.labelKo}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '担当者' : '담당자'}
                        </label>
                        <select name="assignedUserId" className="w-full border rounded px-3 py-2" defaultValue={editingRule?.assigned_user_id || ''}>
                          <option value="">{language === 'ja' ? '指定なし' : '지정 없음'}</option>
                          {nameOptions.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '決済手段' : '결제수단'}
                        </label>
                        <select name="paymentMethod" className="w-full border rounded px-3 py-2" defaultValue={editingRule?.payment_method || ''}>
                          <option value="">{language === 'ja' ? '指定なし' : '지정 없음'}</option>
                          <option value="계좌이체">{language === 'ja' ? '口座振替' : '계좌이체'}</option>
                          <option value="PayPay">PayPay</option>
                          <option value="페이팔">{language === 'ja' ? 'ペイパル' : '페이팔'}</option>
                          <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '優先順位' : '우선순위'}
                        </label>
                        <Input
                          type="number"
                          name="priority"
                          defaultValue={editingRule?.priority || 0}
                          placeholder="0"
                        />
                        <p className="text-xs text-gray-500 mt-1">{language === 'ja' ? '数字が大きいほど優先' : '숫자가 클수록 우선'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      {editingRule && (
                        <Button type="button" variant="outline" onClick={() => setEditingRule(null)}>
                          {language === 'ja' ? 'キャンセル' : '취소'}
                        </Button>
                      )}
                      <Button type="submit">
                        {editingRule ? (language === 'ja' ? '修正を保存' : '수정 저장') : (language === 'ja' ? '追加' : '추가')}
                      </Button>
                    </div>
                  </form>

                  {/* 규칙 목록 */}
                  <div>
                    <h3 className="font-semibold mb-2">{language === 'ja' ? '登録されている規則' : '등록된 규칙'}</h3>
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left">{language === 'ja' ? 'キーワード' : '키워드'}</th>
                            <th className="px-3 py-2 text-left">{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                            <th className="px-3 py-2 text-left">{language === 'ja' ? '担当者' : '담당자'}</th>
                            <th className="px-3 py-2 text-left">{language === 'ja' ? '決済' : '결제'}</th>
                            <th className="px-3 py-2 text-center">{language === 'ja' ? '優先' : '우선'}</th>
                            <th className="px-3 py-2 text-center">{language === 'ja' ? '操作' : '조작'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoMatchRules.map(rule => (
                            <tr key={rule.id} className="border-t">
                              <td className="px-3 py-2 font-mono text-blue-600">{rule.keyword}</td>
                              <td className="px-3 py-2">{rule.category || '-'}</td>
                              <td className="px-3 py-2">{rule.assigned_user_name || '-'}</td>
                              <td className="px-3 py-2">{rule.payment_method || '-'}</td>
                              <td className="px-3 py-2 text-center">{rule.priority}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="flex gap-1 justify-center">
                                  <Button size="sm" variant="outline" onClick={() => setEditingRule(rule)}>
                                    {language === 'ja' ? '修正' : '수정'}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteAutoMatchRule(rule.id)}>
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {autoMatchRules.length === 0 && (
                            <tr>
                              <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                                {language === 'ja' ? '登録されている規則がありません' : '등록된 규칙이 없습니다'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => {
                      setShowAutoMatchDialog(false)
                      setEditingRule(null)
                    }}>
                      {language === 'ja' ? '閉じる' : '닫기'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '従業員管理' : '직원 관리'}</h2>
            <div className="flex gap-2 items-center">
              <select
                value={employeeStatusFilter}
                onChange={(e) => setEmployeeStatusFilter(e.target.value)}
                className="border rounded px-3 py-2"
              >
                <option value="입사중">{language === 'ja' ? '入社中' : '입사중'}</option>
                <option value="입사전">{language === 'ja' ? '入社前' : '입사전'}</option>
                <option value="퇴사">{language === 'ja' ? '退職' : '퇴사'}</option>
              </select>
              <Button
                onClick={() => {
                  if (showEmployeeForm && !editingEmployee) {
                    closeEmployeeForm()
                  } else {
                    openEmployeeForm()
                  }
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </div>

          {showEmployeeForm && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingEmployee
                    ? language === 'ja'
                      ? '従業員情報を修正'
                      : '직원 정보 수정'
                    : language === 'ja'
                    ? '従業員を追加'
                    : '직원 추가'}
                </h3>
                <form
                  key={editingEmployee?.id || 'new-employee'}
                  onSubmit={handleSubmitEmployee}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                    <Input type="text" name="name" required defaultValue={editingEmployee?.name || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'メールアドレス' : '이메일'}</label>
                    <Input type="email" name="email" required defaultValue={editingEmployee?.email || ''} />
                  </div>
                  {!editingEmployee && (
                    <div>
                      <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'パスワード' : '비밀번호'}</label>
                      <Input type="password" name="password" required />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '部署' : '부서'}</label>
                    <Input type="text" name="department" defaultValue={editingEmployee?.department || ''} placeholder={language === 'ja' ? '経営支援チーム' : '경영지원팀'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '職級' : '직급'}</label>
                    <select
                      name="position"
                      className="w-full border rounded px-3 py-2"
                      defaultValue={editingEmployee?.position || '사원'}
                    >
                      <option value="사원">{language === 'ja' ? '社員' : '사원'}</option>
                      <option value="주임">{language === 'ja' ? '主任' : '주임'}</option>
                      <option value="대리">{language === 'ja' ? '代理' : '대리'}</option>
                      <option value="팀장">{language === 'ja' ? 'チーム長' : '팀장'}</option>
                      <option value="대표">{language === 'ja' ? '代表' : '대표'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '入社現況' : '입사현황'}</label>
                    <select
                      name="employmentStatus"
                      className="w-full border rounded px-3 py-2"
                      defaultValue={editingEmployee?.employmentStatus || editingEmployee?.employment_status || '입사중'}
                    >
                      <option value="입사중">{language === 'ja' ? '入社中' : '입사중'}</option>
                      <option value="입사전">{language === 'ja' ? '入社前' : '입사전'}</option>
                      <option value="퇴사">{language === 'ja' ? '退職' : '퇴사'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '入社日' : '입사일'}</label>
                    <Input type="date" name="hireDate" defaultValue={formatDateOnly(editingEmployee?.hireDate || editingEmployee?.hire_date)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '基本給' : '기본급'}</label>
                    <Input
                      type="number"
                      name="baseSalary"
                      defaultValue={editingEmployee?.baseSalary ? String(editingEmployee.baseSalary) : editingEmployee?.base_salary ? String(editingEmployee.base_salary) : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '契約終了日' : '계약 종료일'}</label>
                    <Input type="date" name="contractEndDate" defaultValue={formatDateOnly(editingEmployee?.contractEndDate || editingEmployee?.contract_end_date)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'マートID' : '마트 아이디'}</label>
                    <Input type="text" name="martId" defaultValue={editingEmployee?.martId || editingEmployee?.mart_id || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '交通費経路' : '교통비 경로'}</label>
                    <Input type="text" name="transportationRoute" defaultValue={editingEmployee?.transportationRoute || editingEmployee?.transportation_route || ''} placeholder={language === 'ja' ? '西川口~浜松町' : '예: 西川口~浜松町'} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '月交通費' : '월 교통비'}</label>
                    <Input
                      type="number"
                      name="monthlyTransportationCost"
                      defaultValue={editingEmployee?.monthlyTransportationCost ? String(editingEmployee.monthlyTransportationCost) : editingEmployee?.monthly_transportation_cost ? String(editingEmployee.monthly_transportation_cost) : ''}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '履歴' : '히스토리'}</label>
                    <textarea
                      name="transportationDetails"
                      className="w-full border rounded px-3 py-2"
                      rows={2}
                      defaultValue={editingEmployee?.transportationDetails || editingEmployee?.transportation_details || ''}
                      placeholder=""
                    />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">
                      {editingEmployee
                        ? language === 'ja'
                          ? '修正を保存'
                          : '수정 저장'
                        : language === 'ja'
                        ? '保存'
                        : '저장'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeEmployeeForm}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees
              .filter(emp => {
                const status = emp.employmentStatus || emp.employment_status || '입사중' // NULL이나 빈 값은 입사중으로 간주
                return status === employeeStatusFilter
              })
              .map((emp) => (
              <Card key={emp.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEmployeeDetail(emp)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{emp.name}</h3>
                      <p className="text-sm text-gray-600">
                        {emp.department || '-'} • {emp.position || '-'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {emp.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          (emp.employmentStatus || emp.employment_status) === '입사중' 
                            ? 'bg-green-100 text-green-800' 
                            : (emp.employmentStatus || emp.employment_status) === '입사전'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {(emp.employmentStatus || emp.employment_status) === '입사중'
                          ? (language === 'ja' ? '入社中' : '입사중')
                          : (emp.employmentStatus || emp.employment_status) === '입사전'
                          ? (language === 'ja' ? '入社前' : '입사전')
                          : (language === 'ja' ? '退職' : '퇴사')}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEmployeeForm(emp)
                        }}
                        aria-label={language === 'ja' ? '修正' : '수정'}
                      >
                        <Pencil className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteEmployee(emp.id)
                        }}
                        aria-label={language === 'ja' ? '削除' : '삭제'}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">{language === 'ja' ? '基本給' : '기본급'}</p>
                      <p className="font-bold">{(emp.baseSalary || emp.base_salary) ? formatCurrency(emp.baseSalary || emp.base_salary || 0) : '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{language === 'ja' ? '入社日' : '입사일'}</p>
                      <p className="font-bold text-sm">
                        {formatDateOnly(emp.hireDate || emp.hire_date) || '-'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {/* 헤더 */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '給与管理' : '급여 관리'}</h2>
            <div className="flex gap-2 items-center">
              <select
                className="border rounded px-3 py-2"
                value={selectedPayrollYear}
                onChange={(e) => setSelectedPayrollYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027, 2028].map((year) => (
                  <option key={year} value={year}>
                    {year}{language === 'ja' ? '年度' : '년도'}
                  </option>
                ))}
              </select>
              <select
                className="border rounded px-3 py-2"
                value={selectedPayrollMonth}
                onChange={(e) => setSelectedPayrollMonth(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((month) => (
                  <option key={month} value={month}>
                    {month}{language === 'ja' ? '月' : '월'}
                  </option>
                ))}
              </select>
              <Button onClick={() => setShowAddEmployeeDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {language === 'ja' ? '従業員追加' : '직원 추가'}
              </Button>
              <Button 
                onClick={handleGeneratePayroll}
                variant="outline"
                className="bg-green-50 hover:bg-green-100"
              >
                {language === 'ja' ? '給与自動生成' : '급여 자동 생성'}
            </Button>
            </div>
          </div>

          {/* 히스토리 입력란 */}
            <Card>
            <CardHeader>
              <CardTitle className="text-sm">{language === 'ja' ? '履歴メモ' : '히스토리'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <textarea
                  className="flex-1 border rounded px-3 py-2 text-sm"
                  rows={3}
                  value={monthlyPayrollHistory}
                  onChange={(e) => setMonthlyPayrollHistory(e.target.value)}
                  placeholder={language === 'ja' ? '履歴を入力...' : '히스토리를 입력...'}
                />
                <Button onClick={handleSavePayrollHistory} size="sm">
                  {language === 'ja' ? '保存' : '저장'}
                    </Button>
                  </div>
              </CardContent>
            </Card>

          {/* 급여 테이블 */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">{language === 'ja' ? '従業員名' : '직원명'}</th>
                      <th className="px-4 py-3 text-right bg-blue-50">{language === 'ja' ? '基本給' : '기본급'}</th>
                      <th className="px-4 py-3 text-right border-l-2 border-gray-300">{language === 'ja' ? 'ココナラ' : '코코나라'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? '賞与金' : '상여금'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? 'インセンティブ' : '인센티브'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? '出張費' : '출장비'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? 'その他' : '기타'}</th>
                      <th className="px-4 py-3 text-right font-semibold bg-green-50">{language === 'ja' ? 'インセンティブ合計' : '인센티브 합계'}</th>
                      <th className="px-4 py-3 text-left">{language === 'ja' ? '備考' : '비고'}</th>
                      <th className="px-4 py-3 text-center" style={{ width: '60px' }}>
                        {language === 'ja' ? '操作' : '조작'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyPayrollData.map((row) => {
                      const isEditingBase = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'base_salary'
                      const isEditingCoconala = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'coconala'
                      const isEditingBonus = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'bonus'
                      const isEditingIncentive = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'incentive'
                      const isEditingBusinessTrip = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'business_trip'
                      const isEditingOther = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'other'
                      const isEditingNotes = editingPayrollCell?.id === row.id && editingPayrollCell?.field === 'notes'

                      return (
                        <tr key={row.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{row.employee_name}</td>
                          <td 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50 bg-blue-50"
                            onClick={() => handlePayrollCellClick(row.id, 'base_salary', row.base_salary)}
                          >
                            {isEditingBase ? (
                              <input
                                type="number"
                                step="1"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                  // 소수점 입력 방지
                                  if (e.key === '.' || e.key === ',') e.preventDefault()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1"
                              />
                            ) : (
                              formatCurrency(row.base_salary || 0)
                            )}
                        </td>
                          <td 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50 border-l-2 border-gray-300"
                            onClick={() => handlePayrollCellClick(row.id, 'coconala', row.coconala)}
                          >
                            {isEditingCoconala ? (
                              <input
                                type="number"
                                step="1"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                  if (e.key === '.' || e.key === ',') e.preventDefault()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1"
                              />
                            ) : (
                              formatCurrency(row.coconala || 0)
                            )}
                        </td>
                          <td 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50"
                            onClick={() => handlePayrollCellClick(row.id, 'bonus', row.bonus)}
                          >
                            {isEditingBonus ? (
                              <input
                                type="number"
                                step="1"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                  if (e.key === '.' || e.key === ',') e.preventDefault()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1"
                              />
                            ) : (
                              formatCurrency(row.bonus || 0)
                            )}
                          </td>
                          <td 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50"
                            onClick={() => handlePayrollCellClick(row.id, 'incentive', row.incentive)}
                          >
                            {isEditingIncentive ? (
                              <input
                                type="number"
                                step="1"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                  if (e.key === '.' || e.key === ',') e.preventDefault()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1"
                              />
                            ) : (
                              formatCurrency(row.incentive || 0)
                            )}
                          </td>
                          <td 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50"
                            onClick={() => handlePayrollCellClick(row.id, 'business_trip', row.business_trip)}
                          >
                            {isEditingBusinessTrip ? (
                              <input
                                type="number"
                                step="1"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                  if (e.key === '.' || e.key === ',') e.preventDefault()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1"
                              />
                            ) : (
                              formatCurrency(row.business_trip || 0)
                            )}
                          </td>
                          <td 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-blue-50"
                            onClick={() => handlePayrollCellClick(row.id, 'other', row.other)}
                          >
                            {isEditingOther ? (
                              <input
                                type="number"
                                step="1"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onFocus={(e) => e.target.select()}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                  if (e.key === '.' || e.key === ',') e.preventDefault()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1"
                              />
                            ) : (
                              formatCurrency(row.other || 0)
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold bg-green-50">
                            {formatCurrency(
                              (parseFloat(row.coconala) || 0) +
                              (parseFloat(row.bonus) || 0) +
                              (parseFloat(row.incentive) || 0) +
                              (parseFloat(row.business_trip) || 0) +
                              (parseFloat(row.other) || 0)
                            )}
                          </td>
                          <td 
                            className="px-4 py-3 text-left cursor-pointer hover:bg-blue-50"
                            onClick={() => handlePayrollCellClick(row.id, 'notes', row.notes)}
                          >
                            {isEditingNotes ? (
                              <input
                                type="text"
                                value={editingPayrollValue}
                                onChange={(e) => setEditingPayrollValue(e.target.value)}
                                onBlur={handlePayrollCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePayrollCellSave()
                                  if (e.key === 'Escape') handlePayrollCellCancel()
                                }}
                                autoFocus
                                className="w-full border rounded px-1"
                              />
                            ) : (
                              <span className="text-xs text-gray-600">{row.notes || '-'}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeletePayrollEmployee(row.id)}
                              aria-label={language === 'ja' ? '削除' : '삭제'}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                        </td>
                      </tr>
                      )
                    })}
                    
                    {/* 합계 행 */}
                    <tr className="border-t-2 bg-blue-50 font-semibold">
                      <td className="px-4 py-3">{language === 'ja' ? '合計' : '계'}</td>
                      <td className="px-4 py-3 text-right bg-blue-100">
                        {formatCurrency(monthlyPayrollData.reduce((sum, r) => sum + (parseFloat(r.base_salary) || 0), 0))}
                      </td>
                      <td className="px-4 py-3 text-right border-l-2 border-gray-300"></td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right bg-green-100">
                        {formatCurrency(
                          monthlyPayrollData.reduce((sum, r) => 
                            sum + 
                            (parseFloat(r.coconala) || 0) +
                            (parseFloat(r.bonus) || 0) +
                            (parseFloat(r.incentive) || 0) +
                            (parseFloat(r.business_trip) || 0) +
                            (parseFloat(r.other) || 0), 0
                          )
                        )}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 직원 추가 다이얼로그 */}
      {showAddEmployeeDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddEmployeeDialog(false)
            }
          }}
        >
          <Card className="w-96">
            <CardHeader>
              <CardTitle>{language === 'ja' ? '従業員追加' : '직원 추가'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {language === 'ja' ? '従業員名' : '직원명'}
                  </label>
                  <Input
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    placeholder={language === 'ja' ? '名前を入力' : '이름을 입력'}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={handleAddEmployee}>
                    {language === 'ja' ? '追加' : '추가'}
                  </Button>
                  <Button variant="ghost" onClick={() => {
                    setShowAddEmployeeDialog(false)
                    setNewEmployeeName('')
                  }}>
                    {language === 'ja' ? 'キャンセル' : '취소'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recurring Expenses Tab */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex justify-end items-center">
            <Button
              onClick={() => {
                if (showRecurringForm && !editingRecurring) {
                  closeRecurringForm()
                } else {
                  openRecurringForm()
                }
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ja' ? '追加' : '추가'}
            </Button>
          </div>

          {showRecurringForm && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingRecurring
                    ? language === 'ja'
                      ? '定期支出を修正'
                      : '정기지출 수정'
                    : language === 'ja'
                    ? '定期支出を追加'
                    : '정기지출 추가'}
                </h3>
                <form
                  key={editingRecurring?.id || 'new-recurring'}
                  onSubmit={handleSubmitRecurring}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                    <Input type="text" name="itemName" required defaultValue={editingRecurring?.itemName || ''} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '月額' : '월액'}</label>
                    <Input
                      type="number"
                      name="monthlyAmount"
                      required
                      defaultValue={editingRecurring ? String(editingRecurring.monthlyAmount) : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '支払日' : '지급일'}</label>
                    <Input
                      type="number"
                      name="paymentDay"
                      min="1"
                      max="31"
                      required
                      defaultValue={editingRecurring ? String(editingRecurring.paymentDay) : ''}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済手段' : '결제수단'}</label>
                    <select
                      name="paymentMethod"
                      className="w-full border rounded px-3 py-2"
                      required
                      defaultValue={editingRecurring?.paymentMethod || '계좌'}
                    >
                      <option value="계좌">{language === 'ja' ? '口座' : '계좌'}</option>
                      <option value="PayPay">PayPay</option>
                      <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">
                      {editingRecurring
                        ? language === 'ja'
                          ? '修正を保存'
                          : '수정 저장'
                        : language === 'ja'
                        ? '保存'
                        : '저장'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={closeRecurringForm}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                    {language === 'ja' ? '支払日' : '지급일'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/4">
                    {language === 'ja' ? '項目名' : '항목명'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                    {language === 'ja' ? '月額' : '월액'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-1/6">
                    {language === 'ja' ? '決済手段' : '결제수단'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-1/6">
                    {language === 'ja' ? '作業' : '작업'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {recurringExpenses.map((exp) => (
                  <tr key={exp.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm truncate overflow-hidden">
                      {exp.paymentDay}{language === 'ja' ? '日' : '일'}
                    </td>
                    <td className="px-4 py-3 text-sm truncate overflow-hidden">{exp.itemName}</td>
                    <td className="px-4 py-3 text-sm truncate overflow-hidden">{formatCurrency(exp.monthlyAmount)}</td>
                    <td className="px-4 py-3 text-sm truncate overflow-hidden">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openRecurringForm(exp)}
                          aria-label={language === 'ja' ? '修正' : '수정'}
                        >
                          <Pencil className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteRecurring(exp.id)}
                          aria-label={language === 'ja' ? '削除' : '삭제'}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t bg-gray-50 font-bold">
                  <td className="px-4 py-3 text-sm" colSpan={2}>
                    {language === 'ja' ? '合計' : '합계'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatCurrency(recurringExpenses.reduce((sum, exp) => sum + exp.monthlyAmount, 0))}
                  </td>
                  <td className="px-4 py-3" colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Capital Tab */}
      {activeTab === 'capital' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 자본금 (계좌 잔액) 섹션 */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{language === 'ja' ? '資本金（口座残高）' : '자본금 (계좌 잔액)'}</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => openCapitalForm()}>
                    <Plus className="h-4 w-4 mr-1" />
                    {language === 'ja' ? '追加' : '추가'}
                  </Button>
                  {capitalOffset > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCapitalOffset(Math.max(0, capitalOffset - 12))}
                    >
                      {language === 'ja' ? '前の12ヶ月' : '이전 12개월'}
                    </Button>
                  )}
                  {capitalOffset + 12 < capitalTotal && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCapitalOffset(capitalOffset + 12)}
                    >
                      {language === 'ja' ? '次の12ヶ月' : '다음 12개월'}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showCapitalForm && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingCapital
                        ? (language === 'ja' ? '残高を修正' : '잔액 수정')
                        : (language === 'ja' ? '残高を追加' : '잔액 추가')}
                    </h3>
                    <form onSubmit={handleSubmitCapital} className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '日付（毎月1日）' : '날짜 (매월 1일)'}
                        </label>
                        <Input
                          type="date"
                          name="balanceDate"
                          required
                          defaultValue={editingCapital?.balance_date || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '残高' : '잔액'}
                        </label>
                        <Input
                          type="number"
                          name="amount"
                          required
                          defaultValue={editingCapital ? String(editingCapital.amount) : ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? 'メモ' : '메모'}
                        </label>
                        <Input
                          type="text"
                          name="note"
                          defaultValue={editingCapital?.note || ''}
                        />
                      </div>
                      <div className="col-span-3 flex gap-2">
                        <Button type="submit">
                          {language === 'ja' ? '保存' : '저장'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={closeCapitalForm}>
                          {language === 'ja' ? 'キャンセル' : '취소'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '日付' : '날짜'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '残高' : '잔액'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '作業' : '작업'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {capitalBalances.map((balance) => (
                      <tr key={balance.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">
                          {new Date(balance.balance_date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatCurrency(balance.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 truncate">
                          {balance.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openCapitalForm(balance)}
                              aria-label={language === 'ja' ? '修正' : '수정'}
                            >
                              <Pencil className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCapital(balance.id)}
                              aria-label={language === 'ja' ? '削除' : '삭제'}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-sm text-gray-600 text-center">
                {language === 'ja'
                  ? `全 ${capitalTotal} 件のうち ${capitalOffset + 1} - ${Math.min(capitalOffset + 12, capitalTotal)} 件を表示中`
                  : `전체 ${capitalTotal}건 중 ${capitalOffset + 1} - ${Math.min(capitalOffset + 12, capitalTotal)}건 표시 중`}
              </div>
            </CardContent>
          </Card>

          {/* 보증금 섹션 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{language === 'ja' ? '保証金' : '보증금'}</CardTitle>
                <Button size="sm" onClick={() => openDepositForm()}>
                  <Plus className="h-4 w-4 mr-1" />
                  {language === 'ja' ? '追加' : '추가'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showDepositForm && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingDeposit
                        ? (language === 'ja' ? '保証金を修正' : '보증금 수정')
                        : (language === 'ja' ? '保証金を追加' : '보증금 추가')}
                    </h3>
                    <form onSubmit={handleSubmitDeposit} className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '項目' : '항목'}
                        </label>
                        <Input
                          type="text"
                          name="itemName"
                          required
                          defaultValue={editingDeposit?.item_name || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '金額' : '금액'}
                        </label>
                        <Input
                          type="number"
                          name="amount"
                          required
                          defaultValue={editingDeposit ? String(editingDeposit.amount) : ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? 'メモ' : '메모'}
                        </label>
                        <Input
                          type="text"
                          name="note"
                          defaultValue={editingDeposit?.note || ''}
                        />
                      </div>
                      <div className="col-span-3 flex gap-2">
                        <Button type="submit">
                          {language === 'ja' ? '保存' : '저장'}
                        </Button>
                        <Button type="button" variant="ghost" onClick={closeDepositForm}>
                          {language === 'ja' ? 'キャンセル' : '취소'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '項目' : '항목'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '金額' : '금액'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '作業' : '작업'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((deposit) => (
                      <tr key={deposit.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{deposit.item_name}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(deposit.amount)}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 truncate">
                          {deposit.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openDepositForm(deposit)}
                              aria-label={language === 'ja' ? '修正' : '수정'}
                            >
                              <Pencil className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteDeposit(deposit.id)}
                              aria-label={language === 'ja' ? '削除' : '삭제'}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t bg-gray-50 font-bold">
                      <td className="px-4 py-3 text-sm">{language === 'ja' ? '合計' : '합계'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {formatCurrency(deposits.reduce((sum, d) => sum + Number(d.amount || 0), 0))}
                      </td>
                      <td className="px-4 py-3" colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* PayPay Tab */}
      {activeTab === 'paypay' && (
        <div className="space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">{language === 'ja' ? '売上合計' : '매출 합계'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(paypaySummary.totalSales)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">{language === 'ja' ? '支出合計' : '지출 합계'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(paypaySummary.totalExpenses)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">{language === 'ja' ? '残高' : '잔액'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(paypaySummary.balance)}</p>
              </CardContent>
            </Card>
          </div>

          {/* 필터 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-3 items-end">
                {/* 필터 입력 */}
                <div className="flex-1 grid grid-cols-5 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? '開始日' : '시작일'}
                    </label>
                    <Input
                      type="date"
                      value={paypayStartDate}
                      onChange={(e) => setPaypayStartDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? '終了日' : '종료일'}
                    </label>
                    <Input
                      type="date"
                      value={paypayEndDate}
                      onChange={(e) => setPaypayEndDate(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  {/* 날짜 버튼 - 종료일 오른쪽에 배치 */}
                  <div className="flex items-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePaypayPreviousMonth}
                      className="h-9"
                    >
                      {language === 'ja' ? '前月' : '전월'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePaypayCurrentMonth}
                      className="h-9"
                    >
                      {language === 'ja' ? '当月' : '당월'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePaypayNextMonth}
                      className="h-9"
                    >
                      {language === 'ja' ? '来月' : '내월'}
                    </Button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? 'カテゴリ' : '카테고리'}
                    </label>
                    <select
                      className="w-full border rounded-md px-2 py-1.5 text-sm h-9"
                      value={paypayCategoryFilter}
                      onChange={(e) => setPaypayCategoryFilter(e.target.value)}
                    >
                      <option value="all">{language === 'ja' ? '全て' : '전체'}</option>
                      <option value="셀마플">{language === 'ja' ? 'セルマプル' : '셀마플'}</option>
                      <option value="JEYI">JEYI</option>
                      <option value="石井ひとみ">石井ひとみ</option>
                      <option value="山下南">山下南</option>
                      <option value="山﨑水優">山﨑水優</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {language === 'ja' ? '名前' : '이름'}
                    </label>
                    <Input
                      placeholder={language === 'ja' ? '名前で検索' : '이름으로 검색'}
                      value={paypayNameFilter}
                      onChange={(e) => setPaypayNameFilter(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 매출/지출 목록 */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div className="flex gap-4">
                  <button
                    className={`px-4 py-2 font-semibold transition-colors ${
                      paypayActiveTab === 'sales'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setPaypayActiveTab('sales')}
                  >
                    {language === 'ja' ? '売上' : '매출'}
                  </button>
                  <button
                    className={`px-4 py-2 font-semibold transition-colors ${
                      paypayActiveTab === 'expenses'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setPaypayActiveTab('expenses')}
                  >
                    {language === 'ja' ? '支出' : '지출'}
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  {paypayActiveTab === 'sales' && (
                    <>
                      <div className="text-sm font-semibold text-gray-700">
                        {language === 'ja' ? '合計' : '총합'}: {formatCurrency(paypaySales.reduce((sum, sale) => sum + parseFloat(sale.amount || 0), 0))}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setShowPaypaySaleForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {language === 'ja' ? '追加' : '추가'}
                      </Button>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handlePaypayCSVUpload}
                        className="hidden"
                        id="paypay-csv-upload"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById('paypay-csv-upload')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-1" />
                        CSV {language === 'ja' ? 'アップロード' : '업로드'}
                      </Button>
                    </>
                  )}
                  {paypayActiveTab === 'expenses' && (
                    <>
                      <div className="text-sm font-semibold text-gray-700">
                        {language === 'ja' ? '合計' : '총합'}: {formatCurrency(paypayExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0))}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setShowPaypayExpenseForm(true)
                          setEditingPaypayExpense(null)
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {language === 'ja' ? '追加' : '추가'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {paypayActiveTab === 'sales' ? (
              <>
              {showPaypaySaleForm && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {language === 'ja' ? '売上を追加' : '매출 추가'}
                    </h3>
                    <form onSubmit={handleSavePaypaySale} className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {language === 'ja' ? '日時' : '일시'} *
                          </label>
                          <Input
                            type="datetime-local"
                            name="date"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {language === 'ja' ? 'カテゴリ' : '카테고리'} *
                          </label>
                          <select
                            name="category"
                            className="w-full border rounded px-3 py-2"
                            required
                          >
                            <option value="셀마플">{language === 'ja' ? 'Selmafl' : '셀마플'}</option>
                            <option value="山﨑水優">山﨑水優</option>
                            <option value="石井ひとみ">石井ひとみ</option>
                            <option value="山下南">山下南</option>
                            <option value="JEYI">JEYI</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {language === 'ja' ? 'ユーザーID' : '아이디'}
                          </label>
                          <Input
                            type="text"
                            name="user_id"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {language === 'ja' ? '名前' : '이름'} *
                          </label>
                          <Input
                            type="text"
                            name="name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {language === 'ja' ? '領収書番号' : '영수증번호'}
                          </label>
                          <Input
                            type="text"
                            name="receipt_number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            {language === 'ja' ? '金額' : '금액'} *
                          </label>
                          <Input
                            type="number"
                            name="amount"
                            required
                            min="0"
                            step="1"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? 'メモ' : '메모'}
                        </label>
                        <Input
                          type="text"
                          name="memo"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowPaypaySaleForm(false)}
                        >
                          {language === 'ja' ? 'キャンセル' : '취소'}
                        </Button>
                        <Button type="submit">
                          {language === 'ja' ? '保存' : '저장'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '日時' : '일시'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'カテゴリ' : '카테고리'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'ユーザーID' : '아이디'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '名前' : '이름'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '領収書番号' : '영수증번호'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '金額' : '금액'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '操作' : '작업'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paypaySales.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          {language === 'ja' ? 'データがありません' : '데이터가 없습니다'}
                        </td>
                      </tr>
                    ) : (
                      paypaySales.map((sale, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {new Date(sale.date).toLocaleString(language === 'ja' ? 'ja-JP' : 'ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{sale.category}</td>
                          <td className="px-4 py-3 text-sm">{sale.user_id || '-'}</td>
                          <td className="px-4 py-3 text-sm">{sale.name}</td>
                          <td className="px-4 py-3 text-sm">{sale.receipt_number || '-'}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(sale.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {sale.memo || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePaypaySaleMemo(sale)}
                                aria-label={language === 'ja' ? 'メモ' : '메모'}
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handlePaypaySaleDelete(sale.id)}
                                aria-label={language === 'ja' ? '削除' : '삭제'}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
                </>
              ) : (
                <>
                  {showPaypayExpenseForm && (
                <Card className="mb-4 border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingPaypayExpense
                        ? (language === 'ja' ? '支出を修正' : '지출 수정')
                        : (language === 'ja' ? '支出を追加' : '지출 추가')}
                    </h3>
                    <form onSubmit={handlePaypayExpenseSubmit} className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '日付' : '날짜'}
                        </label>
                        <Input
                          type="date"
                          name="date"
                          required
                          defaultValue={editingPaypayExpense?.date?.slice(0, 10) || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '項目' : '항목'}
                        </label>
                        <Input
                          type="text"
                          name="item"
                          required
                          defaultValue={editingPaypayExpense?.item || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? '金額' : '금액'}
                        </label>
                        <Input
                          type="number"
                          name="amount"
                          required
                          defaultValue={editingPaypayExpense?.amount || ''}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {language === 'ja' ? 'メモ' : '메모'}
                        </label>
                        <Input
                          type="text"
                          name="memo"
                          defaultValue={editingPaypayExpense?.memo || ''}
                        />
                      </div>
                      <div className="col-span-4 flex gap-2">
                        <Button type="submit">
                          {language === 'ja' ? '保存' : '저장'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowPaypayExpenseForm(false)
                            setEditingPaypayExpense(null)
                          }}
                        >
                          {language === 'ja' ? 'キャンセル' : '취소'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '日付' : '날짜'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '項目' : '항목'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '金額' : '금액'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '作業' : '작업'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paypayExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          {language === 'ja' ? 'データがありません' : '데이터가 없습니다'}
                        </td>
                      </tr>
                    ) : (
                      paypayExpenses.map((expense) => (
                        <tr key={expense.id} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {new Date(expense.date).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium">{expense.item}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(expense.amount)}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                            {expense.memo || '-'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPaypayExpense(expense)
                                  setShowPaypayExpenseForm(true)
                                }}
                                aria-label={language === 'ja' ? '修正' : '수정'}
                              >
                                <Pencil className="h-4 w-4 text-emerald-600" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handlePaypayExpenseDelete(expense.id)}
                                aria-label={language === 'ja' ? '削除' : '삭제'}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 거래내역 CSV 업로드 미리보기 다이얼로그 */}
      {showTransactionUploadDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowTransactionUploadDialog(false)
              setTransactionUploadPreview([])
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {language === 'ja' ? 'CSV プレビュー' : 'CSV 미리보기'}
                </h2>
                <Button variant="ghost" onClick={() => setShowTransactionUploadDialog(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {language === 'ja' 
                  ? `${transactionUploadPreview.length} 件のデータが見つかりました。確認して保存してください。`
                  : `${transactionUploadPreview.length}건의 데이터가 확인되었습니다. 확인 후 저장하세요.`}
              </p>
            </div>
            
            <div className="p-6">
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '日付' : '날짜'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '区分' : '구분'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'カテゴリ' : '카테고리'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '決済手段' : '결제수단'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '項目名' : '항목명'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '金額' : '금액'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '担当者' : '담당자'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'メモ' : '메모'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactionUploadPreview.map((tx, idx) => {
                      const assignedUser = nameOptions.find(u => u.id === tx.assignedUserId)
                      return (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{tx.transactionDate}</td>
                          <td className="px-4 py-3 text-sm">{tx.transactionType}</td>
                          <td className="px-4 py-3 text-sm font-medium">{tx.category}</td>
                          <td className="px-4 py-3 text-sm">{tx.paymentMethod}</td>
                          <td className="px-4 py-3 text-sm">{tx.itemName}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(tx.amount)}</td>
                          <td className="px-4 py-3 text-sm">{assignedUser?.name || '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{tx.memo || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="flex gap-4 justify-end mt-6">
                <Button variant="ghost" onClick={() => setShowTransactionUploadDialog(false)}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
                <Button onClick={handleTransactionSaveUpload} disabled={uploadingCsv}>
                  {uploadingCsv 
                    ? (language === 'ja' ? 'アップロード中...' : '업로드 중...') 
                    : (language === 'ja' ? '保存' : '저장')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PayPay CSV 업로드 미리보기 다이얼로그 */}
      {showPaypayUploadDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPaypayUploadDialog(false)
              setPaypayUploadPreview([])
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">
                  {language === 'ja' ? 'CSV プレビュー' : 'CSV 미리보기'}
                </h2>
                <Button variant="ghost" onClick={() => setShowPaypayUploadDialog(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {language === 'ja' 
                  ? `${paypayUploadPreview.length} 件のデータが見つかりました。確認して保存してください。`
                  : `${paypayUploadPreview.length}건의 데이터가 확인되었습니다. 확인 후 저장하세요.`}
              </p>
            </div>
            
            <div className="p-6">
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '日時' : '일시'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'カテゴリ' : '카테고리'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? 'ユーザーID' : '아이디'}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '名前' : '이름'}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                        {language === 'ja' ? '金額' : '금액'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paypayUploadPreview.slice(0, 50).map((sale, idx) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{sale.date}</td>
                        <td className="px-4 py-3 text-sm font-medium">{sale.category}</td>
                        <td className="px-4 py-3 text-sm">{sale.user_id || '-'}</td>
                        <td className="px-4 py-3 text-sm">{sale.name}</td>
                        <td className="px-4 py-3 text-sm text-right">{formatCurrency(sale.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {paypayUploadPreview.length > 50 && (
                <p className="text-sm text-gray-600 text-center mt-4">
                  {language === 'ja'
                    ? `最初の 50 件のみ表示しています（全 ${paypayUploadPreview.length} 件）`
                    : `최초 50건만 표시 중 (전체 ${paypayUploadPreview.length}건)`}
                </p>
              )}
              
              <div className="flex gap-4 justify-end mt-6">
                <Button variant="ghost" onClick={() => setShowPaypayUploadDialog(false)}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
                <Button onClick={handlePaypaySaveUpload}>
                  {language === 'ja' ? '保存' : '저장'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 직원 상세 모달 */}
      {showEmployeeDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={closeEmployeeDetail}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold">{selectedEmployee.name} {language === 'ja' ? 'の詳細' : ' 상세'}</h2>
              <Button variant="ghost" onClick={closeEmployeeDetail}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ja' ? '基本情報' : '기본 정보'}</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? 'メールアドレス' : '이메일'}</p>
                    <p className="font-medium">{selectedEmployee.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '部署' : '부서'}</p>
                    <p className="font-medium">{selectedEmployee.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '職級' : '직급'}</p>
                    <p className="font-medium">{selectedEmployee.position || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '入社現況' : '입사현황'}</p>
                    <p className="font-medium">{selectedEmployee.employmentStatus || selectedEmployee.employment_status || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '入社日' : '입사일'}</p>
                    <p className="font-medium">{((selectedEmployee.hireDate || selectedEmployee.hire_date) || '').split('T')[0] || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '基本給' : '기본급'}</p>
                    <p className="font-medium">{(selectedEmployee.baseSalary || selectedEmployee.base_salary) ? formatCurrency((selectedEmployee.baseSalary || selectedEmployee.base_salary) as number) : '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? 'マートID' : '마트 아이디'}</p>
                    <p className="font-medium">{selectedEmployee.martId || selectedEmployee.mart_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '契約終了日' : '계약 종료일'}</p>
                    <p className="font-medium">{((selectedEmployee.contractEndDate || selectedEmployee.contract_end_date) || '').split('T')[0] || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '交通費経路' : '교통비 경로'}</p>
                    <p className="font-medium">{selectedEmployee.transportationRoute || selectedEmployee.transportation_route || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{language === 'ja' ? '月交通費' : '월 교통비'}</p>
                    <p className="font-medium">{(selectedEmployee.monthlyTransportationCost || selectedEmployee.monthly_transportation_cost) ? formatCurrency((selectedEmployee.monthlyTransportationCost || selectedEmployee.monthly_transportation_cost) as number) : '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-600">{language === 'ja' ? '履歴' : '히스토리'}</p>
                    <p className="font-medium whitespace-pre-line">{selectedEmployee.transportationDetails || selectedEmployee.transportation_details || '-'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* 문서 관리 */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ja' ? '書類管理' : '문서 관리'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 인사기록카드 */}
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '人事記録カード' : '인사기록카드'}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadEmployeeFile('인사기록카드', file)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="space-y-1">
                      {employeeFiles.filter(f => f.fileCategory === '인사기록카드').map(file => (
                        <div key={file.id} className="flex justify-between items-center p-2 border rounded text-sm">
                          <span className="truncate">{file.originalName}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadEmployeeFile(file.id, file.originalName)}>
                              {language === 'ja' ? 'DL' : '다운로드'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 계약서 */}
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '契約書' : '계약서'}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadEmployeeFile('계약서', file)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="space-y-1">
                      {employeeFiles.filter(f => f.fileCategory === '계약서').map(file => (
                        <div key={file.id} className="flex justify-between items-center p-2 border rounded text-sm">
                          <span className="truncate">{file.originalName}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadEmployeeFile(file.id, file.originalName)}>
                              {language === 'ja' ? 'DL' : '다운로드'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 이력서 */}
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '履歴書・自己紹介書' : '이력서/자기소개서'}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadEmployeeFile('이력서', file)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="space-y-1">
                      {employeeFiles.filter(f => f.fileCategory === '이력서').map(file => (
                        <div key={file.id} className="flex justify-between items-center p-2 border rounded text-sm">
                          <span className="truncate">{file.originalName}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadEmployeeFile(file.id, file.originalName)}>
                              {language === 'ja' ? 'DL' : '다운로드'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 병원진단서 */}
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '病院診断書' : '병원진단서'}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadEmployeeFile('병원진단서', file)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="space-y-1">
                      {employeeFiles.filter(f => f.fileCategory === '병원진단서').map(file => (
                        <div key={file.id} className="flex justify-between items-center p-2 border rounded text-sm">
                          <span className="truncate">{file.originalName}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadEmployeeFile(file.id, file.originalName)}>
                              {language === 'ja' ? 'DL' : '다운로드'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 교통비 영수증 */}
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '交通費領収書' : '교통비 영수증'}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadEmployeeFile('교통비영수증', file)
                            e.target.value = ''
                          }
                        }}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="space-y-1">
                      {employeeFiles.filter(f => f.fileCategory === '교통비영수증').map(file => (
                        <div key={file.id} className="flex justify-between items-center p-2 border rounded text-sm">
                          <span className="truncate">{file.originalName}</span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadEmployeeFile(file.id, file.originalName)}>
                              {language === 'ja' ? 'DL' : '다운로드'}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeFile(file.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 개인서류 (월별) */}
                  <div>
                    <h4 className="font-semibold mb-2">{language === 'ja' ? '個人書類（月別）' : '개인서류 (월별)'}</h4>
                    <div className="flex items-center gap-2 mb-2">
                      <Input
                        type="month"
                        value={selectedYearMonth}
                        onChange={(e) => setSelectedYearMonth(e.target.value)}
                        className="w-40"
                      />
                      <select
                        value={selectedFileSubcategory}
                        onChange={(e) => setSelectedFileSubcategory(e.target.value)}
                        className="border rounded px-3 py-2"
                      >
                        <option value="">{language === 'ja' ? '種類選択' : '종류 선택'}</option>
                        <option value="급여명세서">{language === 'ja' ? '給与明細書' : '급여명세서'}</option>
                        <option value="교통비영수증">{language === 'ja' ? '交通費領収書' : '교통비영수증'}</option>
                        <option value="진단서">{language === 'ja' ? '診断書' : '진단서'}</option>
                        <option value="기타">{language === 'ja' ? 'その他' : '기타'}</option>
                      </select>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file && selectedYearMonth && selectedFileSubcategory) {
                            handleUploadEmployeeFile('개인서류', file, selectedFileSubcategory, selectedYearMonth)
                            e.target.value = ''
                          } else {
                            alert(language === 'ja' ? '年月と種類を選択してください' : '연월과 종류를 선택하세요')
                          }
                        }}
                        disabled={uploadingFile}
                      />
                    </div>
                    <div className="space-y-2">
                      {(Object.entries(
                        employeeFiles
                          .filter(f => f.fileCategory === '개인서류')
                          .reduce((acc, file) => {
                            const key = file.yearMonth || 'No Date'
                            if (!acc[key]) acc[key] = []
                            acc[key].push(file)
                            return acc
                          }, {} as Record<string, any[]>)
                      ) as [string, any[]][]).sort(([a], [b]) => b.localeCompare(a)).map(([month, files]) => (
                        <div key={month} className="border rounded p-2">
                          <h5 className="font-medium mb-1">{month}</h5>
                          <div className="space-y-1">
                            {files.map((file: any) => (
                              <div key={file.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                                <span className="truncate">
                                  <span className="font-medium">[{file.fileSubcategory}]</span> {file.originalName}
                                </span>
                                <div className="flex gap-1">
                                  <Button size="sm" variant="outline" onClick={() => handleDownloadEmployeeFile(file.id, file.originalName)}>
                                    {language === 'ja' ? 'DL' : '다운로드'}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteEmployeeFile(file.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Total Sales Tab */}
      {activeTab === 'totalsales' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{language === 'ja' ? '全体売上' : '전체매출'}</CardTitle>
                <select
                  className="border rounded px-3 py-2"
                  value={totalSalesYear}
                  onChange={(e) => setTotalSalesYear(parseInt(e.target.value))}
                >
                  <option value={2023}>2023{language === 'ja' ? '年度（令和5年）' : '년도 (令和5年)'}</option>
                  <option value={2024}>2024{language === 'ja' ? '年度（令和6年）' : '년도 (令和6年)'}</option>
                  <option value={2025}>2025{language === 'ja' ? '年度（令和7年）' : '년도 (令和7年)'}</option>
                  <option value={2026}>2026{language === 'ja' ? '年度（令和8年）' : '년도 (令和8年)'}</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border px-2 py-1 text-left text-xs">{language === 'ja' ? '月' : '월'}</th>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => (
                        <th key={month} className="border px-2 py-1 text-right text-xs">{month}</th>
                      ))}
                      <th className="border px-2 py-1 text-right bg-yellow-50 text-xs">{language === 'ja' ? '合計' : '합계'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* 口座振込 */}
                    <tr>
                      <td className="border px-2 py-1 font-medium text-xs">{language === 'ja' ? '口座振込' : '계좌이체'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, '口座振込', false)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === '口座振込' && !editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, '口座振込', false)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('口座振込', false).toLocaleString()}
                      </td>
                    </tr>

                    {/* PayPay */}
                    <tr>
                      <td className="border px-2 py-1 font-medium text-xs">PayPay</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'PayPay', false)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'PayPay' && !editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'PayPay', false)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('PayPay', false).toLocaleString()}
                      </td>
                    </tr>

                    {/* PayPal */}
                    <tr>
                      <td className="border px-2 py-1 font-medium text-xs">PayPal</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'PayPal', false)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'PayPal' && !editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'PayPal', false)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('PayPal', false).toLocaleString()}
                      </td>
                    </tr>

                    {/* PayPal手数料 */}
                    <tr className="bg-gray-50">
                      <td className="border px-2 py-1 font-medium text-xs">{language === 'ja' ? 'PayPal手数料' : 'PayPal 수수료'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'PayPal', true)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'PayPal' && editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'PayPal', true)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('PayPal', true).toLocaleString()}
                      </td>
                    </tr>

                    {/* strip */}
                    <tr>
                      <td className="border px-2 py-1 font-medium text-xs">strip</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'strip', false)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'strip' && !editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'strip', false)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('strip', false).toLocaleString()}
                      </td>
                    </tr>

                    {/* strip手数料 */}
                    <tr className="bg-gray-50">
                      <td className="border px-2 py-1 font-medium text-xs">{language === 'ja' ? 'strip手数料' : 'strip 수수료'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'strip', true)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'strip' && editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'strip', true)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('strip', true).toLocaleString()}
                      </td>
                    </tr>

                    {/* strip1 */}
                    <tr>
                      <td className="border px-2 py-1 font-medium text-xs">strip1</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'strip1', false)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'strip1' && !editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'strip1', false)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('strip1', false).toLocaleString()}
                      </td>
                    </tr>

                    {/* strip1手数料 */}
                    <tr className="bg-gray-50">
                      <td className="border px-2 py-1 font-medium text-xs">{language === 'ja' ? 'strip1手数料' : 'strip1 수수료'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'strip1', true)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'strip1' && editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'strip1', true)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('strip1', true).toLocaleString()}
                      </td>
                    </tr>

                    {/* ココナラ */}
                    <tr>
                      <td className="border px-2 py-1 font-medium text-xs">{language === 'ja' ? 'ココナラ' : '코코나라'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const value = getTotalSalesValue(month, 'ココナラ', false)
                        const isEditing = editingCell?.month === month && editingCell?.paymentMethod === 'ココナラ' && !editingCell?.isFee
                        return (
                          <td
                            key={month}
                            className="border px-2 py-1 text-right cursor-pointer hover:bg-blue-50 text-xs"
                            onClick={() => handleTotalSalesCellClick(month, 'ココナラ', false)}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={handleTotalSalesCellSave}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleTotalSalesCellSave()
                                  if (e.key === 'Escape') handleTotalSalesCellCancel()
                                }}
                                autoFocus
                                className="w-full text-right border rounded px-1 text-xs"
                              />
                            ) : (
                              value.toLocaleString()
                            )}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-50 font-semibold text-xs">
                        {calculateYearTotal('ココナラ', false).toLocaleString()}
                      </td>
                    </tr>

                    {/* 売上高 (총 매출) */}
                    <tr className="bg-blue-100 font-bold">
                      <td className="border px-2 py-1 text-xs">{language === 'ja' ? '売上高' : '매출액'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const revenue = calculateMonthTotal(month, ['口座振込', 'PayPay', 'PayPal', 'strip', 'strip1', 'ココナラ'], false)
                        const fees = getTotalSalesValue(month, 'PayPal', true) + 
                          getTotalSalesValue(month, 'strip', true) + 
                          getTotalSalesValue(month, 'strip1', true)
                        const total = revenue + fees
                        return (
                          <td key={month} className="border px-2 py-1 text-right text-xs">
                            {total.toLocaleString()}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-100 text-xs">
                        {(() => {
                          const yearRevenue = calculateYearTotal('口座振込', false) + 
                            calculateYearTotal('PayPay', false) + 
                            calculateYearTotal('PayPal', false) + 
                            calculateYearTotal('strip', false) + 
                            calculateYearTotal('strip1', false) + 
                            calculateYearTotal('ココナラ', false)
                          const yearFees = calculateYearTotal('PayPal', true) + 
                            calculateYearTotal('strip', true) + 
                            calculateYearTotal('strip1', true)
                          return (yearRevenue + yearFees).toLocaleString()
                        })()}
                      </td>
                    </tr>

                    {/* 手数料 (총 수수료) */}
                    <tr className="bg-red-100 font-bold">
                      <td className="border px-2 py-1 text-xs">{language === 'ja' ? '手数料' : '수수료'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const total = getTotalSalesValue(month, 'PayPal', true) + 
                          getTotalSalesValue(month, 'strip', true) + 
                          getTotalSalesValue(month, 'strip1', true)
                        return (
                          <td key={month} className="border px-2 py-1 text-right text-xs">
                            {total.toLocaleString()}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-100 text-xs">
                        {(() => {
                          const yearTotal = calculateYearTotal('PayPal', true) + 
                            calculateYearTotal('strip', true) + 
                            calculateYearTotal('strip1', true)
                          return yearTotal.toLocaleString()
                        })()}
                      </td>
                    </tr>

                    {/* 売上総利益 (매출총이익) */}
                    <tr className="bg-green-100 font-bold">
                      <td className="border px-2 py-1 text-xs">{language === 'ja' ? '売上総利益' : '매출총이익'}</td>
                      {[10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(month => {
                        const revenue = calculateMonthTotal(month, ['口座振込', 'PayPay', 'PayPal', 'strip', 'strip1', 'ココナラ'], false)
                        const fees = getTotalSalesValue(month, 'PayPal', true) + 
                          getTotalSalesValue(month, 'strip', true) + 
                          getTotalSalesValue(month, 'strip1', true)
                        const profit = revenue - fees
                        return (
                          <td key={month} className="border px-2 py-1 text-right text-xs">
                            {profit.toLocaleString()}
                          </td>
                        )
                      })}
                      <td className="border px-2 py-1 text-right bg-yellow-100 text-xs">
                        {(() => {
                          const yearRevenue = calculateYearTotal('口座振込', false) + 
                            calculateYearTotal('PayPay', false) + 
                            calculateYearTotal('PayPal', false) + 
                            calculateYearTotal('strip', false) + 
                            calculateYearTotal('strip1', false) + 
                            calculateYearTotal('ココナラ', false)
                          // yearRevenue는 이미 결제수단 합계(수수료 제외)이므로 그대로 반환
                          return yearRevenue.toLocaleString()
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

