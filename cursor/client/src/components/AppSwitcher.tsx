import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { hasAccess } from '../lib/appAccess'
import { Briefcase, Building2, ShieldCheck } from 'lucide-react'

type AppArea = 'crm' | 'erp' | 'admin'

interface AppSwitcherProps {
  current: AppArea
}

const labels: Record<AppArea, { ja: string; ko: string; icon: any; path: string }> = {
  crm: { ja: 'CRM', ko: 'CRM', icon: Briefcase, path: '/' },
  erp: { ja: 'ERP', ko: 'ERP', icon: Building2, path: '/erp' },
  admin: { ja: 'Admin', ko: 'Admin', icon: ShieldCheck, path: '/admin' },
}

export default function AppSwitcher({ current }: AppSwitcherProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)

  // admin 페이지에선 별도 admin 인증으로 들어오므로, 일반 user 정보가 없어도
  // 토글을 보여주어 다른 영역으로 이동할 수 있게 함
  const isAdminContext = current === 'admin'
  const areas: AppArea[] =
    isAdminContext && !user
      ? (['crm', 'erp', 'admin'] as AppArea[])
      : (['crm', 'erp', 'admin'] as AppArea[]).filter((a) => hasAccess(user, a))

  if (areas.length <= 1) return null

  return (
    <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      {areas.map((area) => {
        const conf = labels[area]
        const Icon = conf.icon
        const active = area === current
        return (
          <button
            key={area}
            onClick={() => {
              if (location.pathname !== conf.path) navigate(conf.path)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {conf.ja}
          </button>
        )
      })}
    </div>
  )
}
