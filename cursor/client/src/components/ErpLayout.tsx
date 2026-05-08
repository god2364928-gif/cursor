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
      {/* Top bar — 토글 + 언어 */}
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

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
        <div className="px-5 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800 tracking-wider">HOTSELLER ERP</h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('erp_user_page')}</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
              {user?.name?.[0] || '?'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {user?.team && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                    {user.team}
                  </span>
                )}
                {(user as any)?.position && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                    {(user as any).position}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href
            const paddingClass = item.nested ? 'pl-8 pr-3 py-2' : 'px-3 py-2.5'
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 ${paddingClass} text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <item.icon className={`${item.nested ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} />
                <span>{t(item.labelKey)}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </div>

      <div className="pl-64 pt-16">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
