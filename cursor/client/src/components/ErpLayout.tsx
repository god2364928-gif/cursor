import { Outlet, Link, useLocation, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
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
} from 'lucide-react'
import { Button } from './ui/button'
import AppSwitcher from './AppSwitcher'

interface NavItem {
  name: string
  href: string
  icon: any
  nested?: boolean
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { name: 'マイページ', href: '/erp', icon: UserIcon },
  { name: '組織図', href: '/erp/org', icon: Network },
  // 統合管理 (어드민)
  { name: '統合管理', href: '/erp/admin', icon: Inbox, adminOnly: true },
  { name: '申請処理', href: '/erp/admin/approvals', icon: CheckCircle2, nested: true, adminOnly: true },
  { name: '休暇付与管理', href: '/erp/admin/grants', icon: FilePlus, nested: true, adminOnly: true },
  // 휴가 관리 (전체)
  { name: '休暇管理', href: '/erp/leave', icon: CalendarDays },
  { name: '休暇スケジュール', href: '/erp/leave-schedule', icon: CalendarRange, nested: true },
]

export default function ErpLayout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)

  // ERP 접근 권한 체크 (admin은 항상 통과)
  if (!hasAccess(user, 'erp')) {
    return <Navigate to="/" replace />
  }

  const isAdmin = user?.role === 'admin'
  const visibleNav = navigation.filter((n) => !n.adminOnly || isAdmin)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar — 우측 토글 */}
      <div className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 z-10 print:hidden">
        <AppSwitcher current="erp" />
      </div>

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col print:hidden">
        {/* Logo & User */}
        <div className="px-5 py-5 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800 tracking-wider">HOTSELLER ERP</h1>
          <p className="text-xs text-gray-500 mt-0.5">ユーザーページ</p>
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

        {/* Navigation */}
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
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-gray-200 p-3">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
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
