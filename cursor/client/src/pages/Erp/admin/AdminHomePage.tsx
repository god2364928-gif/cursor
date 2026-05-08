import { Link } from 'react-router-dom'
import { CheckCircle2, FilePlus } from 'lucide-react'
import { useI18nStore } from '../../../i18n'

export default function AdminHomePage() {
  const { t } = useI18nStore()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('erp_integrated_mgmt')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('adminhome_subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <Link
          to="/erp/admin/approvals"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow transition"
        >
          <CheckCircle2 className="h-8 w-8 text-blue-600 mb-3" />
          <div className="font-semibold text-gray-900">{t('erp_approvals_menu')}</div>
          <div className="text-sm text-gray-500 mt-1">{t('adminhome_approvals_desc')}</div>
        </Link>
        <Link
          to="/erp/admin/grants"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow transition"
        >
          <FilePlus className="h-8 w-8 text-emerald-600 mb-3" />
          <div className="font-semibold text-gray-900">{t('erp_grants_mgmt')}</div>
          <div className="text-sm text-gray-500 mt-1">{t('adminhome_grants_desc')}</div>
        </Link>
      </div>
    </div>
  )
}
