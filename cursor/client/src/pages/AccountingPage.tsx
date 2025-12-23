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
