import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
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
  Calculator,
} from 'lucide-react'
import { Button } from './ui/button'

const navigation = [
  { name: 'dashboard', href: '/', icon: LayoutDashboard },
  { name: 'customers', href: '/customers', icon: Users },
  { name: 'retargeting', href: '/retargeting', icon: Target },
  { name: 'salesTracking', href: '/sales-tracking', icon: History },
  { name: 'sales', href: '/sales', icon: BarChart3 },
  { name: 'settings', href: '/settings', icon: Settings },
  { name: 'accountOptimization', href: '/settings/account-optimization', icon: Gauge, nested: true },
  { name: 'keywordAnalysisMenu', href: '/settings/keyword-analysis', icon: TrendingUp, nested: true },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const { language, setLanguage, t } = useI18nStore()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // 언어 변경 시 HTML lang 속성 업데이트
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const toggleLanguage = () => {
    setLanguage(language === 'ja' ? 'ko' : 'ja')
  }

  const handleAccountingClick = () => {
    if (user?.role === 'admin') {
      setShowPasswordModal(true)
      setPassword('')
      setPasswordError('')
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    try {
      const response = await api.post('/accounting/verify-password', { password })
      if (response.data.success) {
        setShowPasswordModal(false)
        navigate('/accounting')
      } else {
        setPasswordError(response.data.error || '비밀번호가 일치하지 않습니다')
      }
    } catch (error: any) {
      setPasswordError(error.response?.data?.error || '인증에 실패했습니다')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar with accounting button and language switcher */}
      <div className="fixed top-0 right-0 left-64 h-16 bg-white border-b border-gray-200 flex items-center justify-end px-6 z-10 gap-3">
        {user?.role === 'admin' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleAccountingClick}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            {language === 'ja' ? '会計' : '회계'}
          </Button>
        )}
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

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">{language === 'ja' ? '会計パスワード' : '회계 비밀번호'}</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ja' ? 'パスワード' : '비밀번호'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-red-600 mt-1">{passwordError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {language === 'ja' ? '確認' : '확인'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowPasswordModal(false)}>
                  {language === 'ja' ? 'キャンセル' : '취소'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col">
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
      <div className="pl-64 pt-16">
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
