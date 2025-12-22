import { useState, useEffect } from 'react'
import { useI18nStore } from '../i18n'
import { useAuthStore } from '../store/authStore'
import DashboardTab from './Accounting/DashboardTab'
import TransactionsTab from './Accounting/TransactionsTab'
import EmployeesTab from './Accounting/EmployeesTab'
import PayrollTab from './Accounting/PayrollTab'
import RecurringTab from './Accounting/RecurringTab'
import CapitalTab from './Accounting/CapitalTab'
import PayPayTab from './Accounting/PayPayTab'
import TotalSalesTab from './Accounting/TotalSalesTab'

type ActiveTab = 'dashboard' | 'transactions' | 'paypay' | 'totalsales' | 'employees' | 'payroll' | 'recurring' | 'capital'

export default function AccountingPage() {
  const { language } = useI18nStore()
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'admin'
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  
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
  
  // Dashboard 새로고침 핸들러 (Transactions에서 변경 시)
  const handleTransactionChange = () => {
    // Dashboard가 자동으로 데이터를 다시 가져오도록 key를 변경할 수 있지만,
    // 여기서는 간단하게 처리합니다.
    // 필요 시 forceUpdate 로직 추가 가능
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">
          {language === 'ja' ? '会計管理' : '회계 관리'}
        </h1>
      </div>

      {/* 탭 메뉴 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? 'ダッシュボード' : '대시보드'}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'transactions'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? '取引履歴' : '거래내역'}
        </button>
        <button
          onClick={() => setActiveTab('paypay')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'paypay'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          PayPay
        </button>
        <button
          onClick={() => setActiveTab('totalsales')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'totalsales'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? '総売上' : '전체매출'}
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'employees'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? '従業員' : '직원'}
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'payroll'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? '給与' : '급여'}
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'recurring'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? '定期支出' : '정기지출'}
        </button>
        <button
          onClick={() => setActiveTab('capital')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'capital'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {language === 'ja' ? '資本金' : '자본금'}
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'dashboard' && <DashboardTab language={language} isAdmin={isAdmin} />}
      {activeTab === 'transactions' && <TransactionsTab language={language} isAdmin={isAdmin} onTransactionChange={handleTransactionChange} />}
      {activeTab === 'employees' && <EmployeesTab isAdmin={isAdmin} />}
      {activeTab === 'payroll' && <PayrollTab language={language} isAdmin={isAdmin} />}
      {activeTab === 'recurring' && <RecurringTab language={language} isAdmin={isAdmin} />}
      {activeTab === 'capital' && <CapitalTab language={language} isAdmin={isAdmin} />}
      {activeTab === 'paypay' && <PayPayTab language={language} isAdmin={isAdmin} />}
      {activeTab === 'totalsales' && <TotalSalesTab language={language} isAdmin={isAdmin} />}
    </div>
  )
}
