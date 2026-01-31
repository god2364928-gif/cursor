// 회계 관련 공통 타입 정의

export interface DashboardData {
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

export interface Transaction {
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
  bankName?: string
  createdAt: string
}

export interface SimpleUser {
  id: string
  name: string
}

export interface Employee {
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

export interface Payroll {
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

export interface RecurringExpense {
  id: string
  itemName: string
  monthlyAmount: number
  paymentDay: number
  paymentMethod: string
  isActive: boolean
}

export interface CapitalBalance {
  id: string
  balance_date: string
  amount: number
  note?: string
  created_at: string
  updated_at: string
}

export interface Deposit {
  id: string
  item_name: string
  amount: number
  note?: string
  created_at: string
  updated_at: string
}

export interface AutoMatchRule {
  id: string
  keyword: string
  category?: string | null
  assigned_user_id?: string | null
  assigned_user_name?: string | null
  payment_method?: string | null
  priority: number
}

export type ActiveTab = 'dashboard' | 'transactions' | 'paypay' | 'totalsales' | 'employees' | 'payroll' | 'recurring' | 'capital'

