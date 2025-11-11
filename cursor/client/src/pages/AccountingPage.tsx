import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  Calendar,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'

interface DashboardData {
  fiscalYear: number
  totalSales: number
  totalExpenses: number
  netProfit: number
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
  memo?: string
  createdAt: string
}

interface Employee {
  id: string
  name: string
  position: string
  hireDate: string
  baseSalary: number
  incentiveRate: number
  employmentStatus: string
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

interface Account {
  id: string
  accountName: string
  accountType: string
  initialBalance: number
  currentBalance: number
  lastUpdated: string
}

export default function AccountingPage() {
  const { language } = useI18nStore()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'employees' | 'payroll' | 'recurring' | 'capital'>('dashboard')
  const [fiscalYear, setFiscalYear] = useState<number>(
    new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()
  )
  
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])

  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [showEmployeeForm, setShowEmployeeForm] = useState(false)
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [uploadingCsv, setUploadingCsv] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [fiscalYear])

  useEffect(() => {
    if (activeTab === 'transactions') fetchTransactions()
    if (activeTab === 'employees') fetchEmployees()
    if (activeTab === 'payroll') fetchPayrolls()
    if (activeTab === 'recurring') fetchRecurringExpenses()
    if (activeTab === 'capital') fetchAccounts()
  }, [activeTab])

  const fetchDashboard = async () => {
    try {
      const response = await api.get('/accounting/dashboard', { params: { fiscalYear } })
      setDashboard(response.data)
    } catch (error) {
      console.error('Dashboard fetch error:', error)
    }
  }

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/accounting/transactions', { params: { fiscalYear, limit: 500 } })
      setTransactions(response.data)
    } catch (error) {
      console.error('Transactions fetch error:', error)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/accounting/employees')
      setEmployees(response.data)
    } catch (error) {
      console.error('Employees fetch error:', error)
    }
  }

  const fetchPayrolls = async () => {
    try {
      const response = await api.get('/accounting/payroll')
      setPayrolls(response.data)
    } catch (error) {
      console.error('Payrolls fetch error:', error)
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

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounting/capital')
      setAccounts(response.data)
    } catch (error) {
      console.error('Accounts fetch error:', error)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await api.post('/accounting/transactions', {
        transactionDate: formData.get('transactionDate'),
        transactionType: formData.get('transactionType'),
        category: formData.get('category'),
        paymentMethod: formData.get('paymentMethod'),
        itemName: formData.get('itemName'),
        amount: Number(formData.get('amount')),
        memo: formData.get('memo'),
      })
      
      setShowTransactionForm(false)
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
      fetchTransactions()
      fetchDashboard()
    } catch (error) {
      console.error('Transaction delete error:', error)
    }
  }

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingCsv(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/accounting/transactions/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      
      alert(
        language === 'ja'
          ? `${response.data.imported}件のデータをインポートしました`
          : `${response.data.imported}건의 데이터를 가져왔습니다`
      )
      
      fetchTransactions()
      fetchDashboard()
    } catch (error: any) {
      console.error('CSV upload error:', error)
      alert(
        error.response?.data?.error ||
          (language === 'ja' ? 'アップロードに失敗しました' : '업로드에 실패했습니다')
      )
    } finally {
      setUploadingCsv(false)
      e.target.value = ''
    }
  }

  const handleAddEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await api.post('/accounting/employees', {
        name: formData.get('name'),
        position: formData.get('position'),
        hireDate: formData.get('hireDate'),
        baseSalary: Number(formData.get('baseSalary')),
        incentiveRate: Number(formData.get('incentiveRate')),
      })
      
      setShowEmployeeForm(false)
      fetchEmployees()
    } catch (error) {
      console.error('Employee create error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleGeneratePayroll = async () => {
    const month = prompt(language === 'ja' ? '対象月 (YYYY-MM-01)' : '대상 월 (YYYY-MM-01)', new Date().toISOString().slice(0, 7) + '-01')
    if (!month) return
    
    try {
      await api.post('/accounting/payroll/generate', { paymentMonth: month })
      fetchPayrolls()
      alert(language === 'ja' ? '給与を生成しました' : '급여를 생성했습니다')
    } catch (error) {
      console.error('Payroll generate error:', error)
      alert(language === 'ja' ? '生成に失敗しました' : '생성에 실패했습니다')
    }
  }

  const handleAddRecurring = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await api.post('/accounting/recurring-expenses', {
        itemName: formData.get('itemName'),
        monthlyAmount: Number(formData.get('monthlyAmount')),
        paymentDay: Number(formData.get('paymentDay')),
        paymentMethod: formData.get('paymentMethod'),
      })
      
      setShowRecurringForm(false)
      fetchRecurringExpenses()
    } catch (error) {
      console.error('Recurring create error:', error)
      alert(language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다')
    }
  }

  const handleAddAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    try {
      await api.post('/accounting/capital', {
        accountName: formData.get('accountName'),
        accountType: formData.get('accountType'),
        initialBalance: Number(formData.get('initialBalance')),
      })
      
      setShowAccountForm(false)
      fetchAccounts()
    } catch (error: any) {
      console.error('Account create error:', error)
      alert(error.response?.data?.error || (language === 'ja' ? '追加に失敗しました' : '추가에 실패했습니다'))
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value)
  }

  const tabs = [
    { key: 'dashboard', label: language === 'ja' ? 'ダッシュボード' : '대시보드' },
    { key: 'transactions', label: language === 'ja' ? '取引履歴' : '거래내역' },
    { key: 'employees', label: language === 'ja' ? '従業員' : '직원' },
    { key: 'payroll', label: language === 'ja' ? '給与' : '급여' },
    { key: 'recurring', label: language === 'ja' ? '定期支出' : '정기지출' },
    { key: 'capital', label: language === 'ja' ? '口座' : '계좌' },
  ]

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-3xl font-bold mb-2">
          {language === 'ja' ? '会計ソフト' : '회계 소프트'}
        </h1>
        <p className="text-emerald-50">
          {language === 'ja' ? '財務管理システム（決算: 10月基準）' : '재무 관리 시스템 (결산: 10월 기준)'}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">
              {language === 'ja' ? '会計年度' : '회계연도'}:
            </label>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="border rounded px-3 py-2"
            >
              {[2024, 2025, 2026, 2027].map((year) => (
                <option key={year} value={year}>
                  {year} ({year - 1}.10 ~ {year}.09)
                </option>
              ))}
            </select>
          </div>

          {dashboard && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {language === 'ja' ? '総売上' : '총 매출'}
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
                          {language === 'ja' ? '総支出' : '총 지출'}
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
                        <p className={`text-2xl font-bold mt-1 ${dashboard.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {formatCurrency(dashboard.netProfit)}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Sales Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{language === 'ja' ? '月別売上推移' : '월별 매출 추이'}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboard.monthlySales}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ja' ? 'カテゴリ別支出' : '카테고리별 지출'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(dashboard.expensesByCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{category}</span>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>{language === 'ja' ? '口座残高' : '계좌 잔액'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.accounts.map((account) => (
                        <div key={account.accountName} className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{account.accountName}</p>
                            <p className="text-xs text-gray-500">{account.accountType}</p>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{formatCurrency(account.balance)}</span>
                        </div>
                      ))}
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '取引履歴' : '거래내역'}</h2>
            <div className="flex gap-2">
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
              <Button onClick={() => setShowTransactionForm(!showTransactionForm)}>
                <Plus className="h-4 w-4 mr-2" />
                {language === 'ja' ? '追加' : '추가'}
              </Button>
            </div>
          </div>

          {showTransactionForm && (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleAddTransaction} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '日付' : '날짜'}</label>
                    <Input type="date" name="transactionDate" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '区分' : '구분'}</label>
                    <select name="transactionType" className="w-full border rounded px-3 py-2" required>
                      <option value="입금">{language === 'ja' ? '入金' : '입금'}</option>
                      <option value="출금">{language === 'ja' ? '出金' : '출금'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'カテゴリ' : '카테고리'}</label>
                    <select name="category" className="w-full border rounded px-3 py-2" required>
                      <option value="매출">{language === 'ja' ? '売上' : '매출'}</option>
                      <option value="급여">{language === 'ja' ? '給与' : '급여'}</option>
                      <option value="정기지출">{language === 'ja' ? '定期支出' : '정기지출'}</option>
                      <option value="자본금">{language === 'ja' ? '資本金' : '자본금'}</option>
                      <option value="기타">{language === 'ja' ? 'その他' : '기타'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済手段' : '결제수단'}</label>
                    <select name="paymentMethod" className="w-full border rounded px-3 py-2" required>
                      <option value="PayPay">PayPay</option>
                      <option value="Stripe">Stripe</option>
                      <option value="현금">{language === 'ja' ? '現金' : '현금'}</option>
                      <option value="은행">{language === 'ja' ? '銀行' : '은행'}</option>
                      <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                    <Input type="text" name="itemName" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '金額' : '금액'}</label>
                    <Input type="number" name="amount" required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'メモ' : '메모'}</label>
                    <Input type="text" name="memo" />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">{language === 'ja' ? '保存' : '저장'}</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowTransactionForm(false)}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left" style={{ width: '140px' }}>{language === 'ja' ? '日時' : '날짜/시간'}</th>
                      <th className="px-3 py-3 text-center" style={{ width: '60px' }}>{language === 'ja' ? '区分' : '구분'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '280px' }}>{language === 'ja' ? '項目' : '항목'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '80px' }}>{language === 'ja' ? 'カテゴリ' : '카테고리'}</th>
                      <th className="px-3 py-3 text-right" style={{ width: '120px' }}>{language === 'ja' ? '金額' : '금액'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '80px' }}>{language === 'ja' ? '決済' : '결제'}</th>
                      <th className="px-3 py-3 text-left" style={{ width: '150px' }}>{language === 'ja' ? 'メモ' : '메모'}</th>
                      <th className="px-3 py-3 text-center" style={{ width: '60px' }}>{language === 'ja' ? '操作' : '조작'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm">
                          {tx.transactionTime ? (
                            <>
                              <div>{tx.transactionDate}</div>
                              <div className="text-xs text-gray-500">{tx.transactionTime.slice(0, 5)}</div>
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
                        <td className="px-3 py-2 text-sm group relative" style={{ maxWidth: '280px' }}>
                          <div className="truncate cursor-help">{tx.itemName}</div>
                          <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 left-0 top-full mt-1 shadow-lg max-w-md whitespace-normal">
                            {tx.itemName}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm">{tx.category}</td>
                        <td className="px-3 py-2 text-right font-semibold text-sm">{formatCurrency(tx.amount)}</td>
                        <td className="px-3 py-2 text-sm">{tx.paymentMethod}</td>
                        <td className="px-3 py-2 text-gray-600 text-xs group relative" style={{ maxWidth: '150px' }}>
                          <div className="truncate cursor-help">{tx.memo || '-'}</div>
                          {tx.memo && (
                            <div className="hidden group-hover:block absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 left-0 top-full mt-1 shadow-lg max-w-md whitespace-normal">
                              {tx.memo}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteTransaction(tx.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '従業員管理' : '직원 관리'}</h2>
            <Button onClick={() => setShowEmployeeForm(!showEmployeeForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ja' ? '追加' : '추가'}
            </Button>
          </div>

          {showEmployeeForm && (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleAddEmployee} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '名前' : '이름'}</label>
                    <Input type="text" name="name" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '職級' : '직급'}</label>
                    <select name="position" className="w-full border rounded px-3 py-2" required>
                      <option value="매니저">{language === 'ja' ? 'マネージャー' : '매니저'}</option>
                      <option value="스태프">{language === 'ja' ? 'スタッフ' : '스태프'}</option>
                      <option value="알바">{language === 'ja' ? 'アルバイト' : '알바'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '入社日' : '입사일'}</label>
                    <Input type="date" name="hireDate" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '基本給' : '기본급'}</label>
                    <Input type="number" name="baseSalary" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? 'インセンティブ率(%)' : '인센티브율(%)'}</label>
                    <Input type="number" step="0.01" name="incentiveRate" defaultValue="0" />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">{language === 'ja' ? '保存' : '저장'}</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowEmployeeForm(false)}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map((emp) => (
              <Card key={emp.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{emp.name}</h3>
                      <p className="text-sm text-gray-600">{emp.position}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'ja' ? '入社' : '입사'}: {emp.hireDate}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      emp.employmentStatus === '재직' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {emp.employmentStatus}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-600">{language === 'ja' ? '基本給' : '기본급'}</p>
                      <p className="font-bold">{formatCurrency(emp.baseSalary)}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">{language === 'ja' ? 'インセンティブ率' : '인센티브율'}</p>
                      <p className="font-bold">{emp.incentiveRate}%</p>
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
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '給与管理' : '급여 관리'}</h2>
            <Button onClick={handleGeneratePayroll}>
              <Calendar className="h-4 w-4 mr-2" />
              {language === 'ja' ? '給与生成' : '급여 생성'}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left">{language === 'ja' ? '支給月' : '지급월'}</th>
                      <th className="px-4 py-3 text-left">{language === 'ja' ? '従業員' : '직원'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? '基本給' : '기본급'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? 'インセンティブ' : '인센티브'}</th>
                      <th className="px-4 py-3 text-right">{language === 'ja' ? '合計' : '합계'}</th>
                      <th className="px-4 py-3 text-center">{language === 'ja' ? '状態' : '상태'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payrolls.map((pay) => (
                      <tr key={pay.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3">{pay.paymentMonth.slice(0, 7)}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{pay.employeeName}</p>
                            <p className="text-xs text-gray-500">{pay.position}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(pay.baseSalary)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600 font-medium">{formatCurrency(pay.incentive)}</td>
                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(pay.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            pay.paymentStatus === '지급완료' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {pay.paymentStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recurring Expenses Tab */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '定期支出' : '정기지출'}</h2>
            <Button onClick={() => setShowRecurringForm(!showRecurringForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ja' ? '追加' : '추가'}
            </Button>
          </div>

          {showRecurringForm && (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleAddRecurring} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '項目名' : '항목명'}</label>
                    <Input type="text" name="itemName" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '月額' : '월액'}</label>
                    <Input type="number" name="monthlyAmount" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '支払日' : '지급일'}</label>
                    <Input type="number" name="paymentDay" min="1" max="31" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '決済手段' : '결제수단'}</label>
                    <select name="paymentMethod" className="w-full border rounded px-3 py-2" required>
                      <option value="계좌">{language === 'ja' ? '口座' : '계좌'}</option>
                      <option value="PayPay">PayPay</option>
                      <option value="카드">{language === 'ja' ? 'カード' : '카드'}</option>
                    </select>
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">{language === 'ja' ? '保存' : '저장'}</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowRecurringForm(false)}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recurringExpenses.map((exp) => (
              <Card key={exp.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">{exp.itemName}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {language === 'ja' ? '毎月' : '매월'} {exp.paymentDay}{language === 'ja' ? '日' : '일'} / {exp.paymentMethod}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(exp.monthlyAmount)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Capital Tab */}
      {activeTab === 'capital' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{language === 'ja' ? '口座管理' : '계좌 관리'}</h2>
            <Button onClick={() => setShowAccountForm(!showAccountForm)}>
              <Plus className="h-4 w-4 mr-2" />
              {language === 'ja' ? '追加' : '추가'}
            </Button>
          </div>

          {showAccountForm && (
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleAddAccount} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '口座名' : '계좌명'}</label>
                    <Input type="text" name="accountName" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '種類' : '종류'}</label>
                    <select name="accountType" className="w-full border rounded px-3 py-2" required>
                      <option value="자본금">{language === 'ja' ? '資本金' : '자본금'}</option>
                      <option value="예금">{language === 'ja' ? '預金' : '예금'}</option>
                      <option value="고정자산">{language === 'ja' ? '固定資産' : '고정자산'}</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">{language === 'ja' ? '初期残高' : '초기 잔액'}</label>
                    <Input type="number" name="initialBalance" required />
                  </div>
                  <div className="col-span-2 flex gap-2">
                    <Button type="submit">{language === 'ja' ? '保存' : '저장'}</Button>
                    <Button type="button" variant="ghost" onClick={() => setShowAccountForm(false)}>
                      {language === 'ja' ? 'キャンセル' : '취소'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accounts.map((acc) => (
              <Card key={acc.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{acc.accountName}</h3>
                      <p className="text-xs text-gray-500">{acc.accountType}</p>
                    </div>
                    <Wallet className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">{language === 'ja' ? '初期残高' : '초기 잔액'}</p>
                        <p className="font-medium">{formatCurrency(acc.initialBalance)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{language === 'ja' ? '現在残高' : '현재 잔액'}</p>
                        <p className="font-bold text-emerald-600">{formatCurrency(acc.currentBalance)}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

