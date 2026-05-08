import { Outlet, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import {
  LayoutDashboard,
  Users,
  Target,
  History,
  BarChart3,
  Settings,
  Gauge,
  TrendingUp,
  LogOut,
  Languages,
  FileText,
  ClipboardCheck,
  UtensilsCrossed,
  ClipboardList,
  Sparkles,
  Hash,
  ShieldQuestion,
} from 'lucide-react'
import { Button } from './ui/button'
import AppSwitcher from './AppSwitcher'

const navigation = [
  { name: 'dashboard', href: '/', icon: LayoutDashboard },
  { name: 'customers', href: '/customers', icon: Users },
  { name: 'retargeting', href: '/retargeting', icon: Target },
  { name: 'salesTracking', href: '/sales-tracking', icon: History },
  { name: 'inquiryLeads', href: '/inquiry-leads', icon: ClipboardList },
  { name: 'hotpepper', href: '/hotpepper', icon: UtensilsCrossed },
  { name: 'sales', href: '/sales', icon: BarChart3 },
  { name: 'invoices', href: '/invoices', icon: FileText },
  { name: 'quotes', href: '/quotes', icon: ClipboardCheck },
  { name: 'settings', href: '/settings', icon: Settings },
  { name: 'accountOptimization', href: '/settings/account-optimization', icon: Gauge, nested: true },
  { name: 'accountOptimization2', href: '/settings/account-optimization-2', icon: Sparkles, nested: true },
  { name: 'hashtagAnalysis', href: '/settings/hashtag-analysis', icon: Hash, nested: true },
  { name: 'hashtagBulk', href: '/settings/hashtag-bulk', icon: Hash, nested: true },
  { name: 'keywordAnalysisMenu', href: '/settings/keyword-analysis', icon: TrendingUp, nested: true },
  { name: 'flagCheck', href: '/settings/flag-check', icon: ShieldQuestion, nested: true },
]

export default function Layout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { language, setLanguage, t } = useI18nStore()

  // 언어 변경 시 HTML lang 속성 업데이트
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => {
    setLanguage(language === 'ja' ? 'ko' : 'ja')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with app switcher + language switcher */}
      <div className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 flex items-center justify-end gap-3 px-6 z-10 print:hidden hide-on-pdf">
        <AppSwitcher current="crm" />
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="flex items-center gap-2"
        >
          <Languages className="h-4 w-4" />
          {language === 'ja' ? t('korean') : t('japanese')}
        </Button>
      </div>

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col print:hidden hide-on-pdf">
        {/* Logo & User Name */}
        <div className="h-20 flex flex-col items-center justify-center border-b border-gray-200 p-3">
          <h1 className="text-xl font-bold text-blue-600">マーケティング CRM</h1>
          <p className="text-sm text-gray-600 mt-1">{user?.name} 様</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            const paddingClass = item.nested ? 'pl-8 pr-4 py-2.5' : 'px-4 py-3'
            const iconSize = item.nested ? 'h-4 w-4' : 'h-5 w-5'
            const textSize = item.nested ? 'text-sm' : 'text-sm'
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center ${paddingClass} ${textSize} font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`mr-3 ${iconSize} ${item.nested ? 'text-blue-400' : ''}`} />
                {t(item.name)}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64 pt-16 print:pl-0 print:pt-0">
        <main className="p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
