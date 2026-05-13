import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import { hasAccess } from '../lib/appAccess'
import {
  User as UserIcon,
  Network,
  Inbox,
  CheckCircle2,
  FilePlus,
  CalendarDays,
  CalendarRange,
  Cookie,
  LogOut,
  Languages,
} from 'lucide-react'
import { Button } from './ui/button'
import AppSwitcher from './AppSwitcher'

interface NavItem {
  labelKey: string
  href: string
  icon: any
  nested?: boolean
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { labelKey: 'erp_my_page', href: '/erp', icon: UserIcon },
  { labelKey: 'erp_org_chart', href: '/erp/org', icon: Network },
  { labelKey: 'erp_integrated_mgmt', href: '/erp/admin', icon: Inbox, adminOnly: true },
  { labelKey: 'erp_approvals_menu', href: '/erp/admin/approvals', icon: CheckCircle2, nested: true, adminOnly: true },
  { labelKey: 'erp_grants_mgmt', href: '/erp/admin/grants', icon: FilePlus, nested: true, adminOnly: true },
  { labelKey: 'erp_leave_mgmt', href: '/erp/leave', icon: CalendarDays },
  { labelKey: 'erp_leave_schedule', href: '/erp/leave-schedule', icon: CalendarRange, nested: true },
  { labelKey: 'erp_snack_request', href: '/erp/snack-request', icon: Cookie },
]

export default function ErpLayout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { language, setLanguage, t } = useI18nStore()

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  if (!hasAccess(user, 'erp')) {
    return <Navigate to="/" replace />
  }

  const isAdmin = user?.role === 'admin'
  const visibleNav = navigation.filter((n) => !n.adminOnly || isAdmin)

  const toggleLanguage = () => setLanguage(language === 'ja' ? 'ko' : 'ja')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar — 토글 + 언어 (CRM과 동일 위치/스타일) */}
      <div className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 flex items-center justify-end gap-3 px-6 z-10 print:hidden">
        <AppSwitcher current="erp" />
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

      {/* Sidebar — CRM Layout과 동일한 스타일 */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
        {/* Logo & User Name */}
        <div className="h-20 flex flex-col items-center justify-center border-b border-gray-200 p-3">
          <h1 className="text-xl font-bold text-blue-600">HOTSELLER ERP</h1>
          <p className="text-sm text-gray-600 mt-1">
            {user?.name} {language === 'ja' ? '様' : '님'}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href
            const paddingClass = item.nested ? 'pl-8 pr-4 py-2.5' : 'px-4 py-3'
            const iconSize = item.nested ? 'h-4 w-4' : 'h-5 w-5'
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center ${paddingClass} text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className={`mr-3 ${iconSize} ${item.nested ? 'text-blue-400' : ''}`} />
                {t(item.labelKey)}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-gray-200 p-4">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64 pt-16">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
