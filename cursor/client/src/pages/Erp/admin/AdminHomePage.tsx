import { Link } from 'react-router-dom'
import { CheckCircle2, FilePlus } from 'lucide-react'

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">統合管理</h1>
        <p className="text-sm text-gray-500 mt-1">承認待ち / 付与管理。</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
        <Link
          to="/erp/admin/approvals"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow transition"
        >
          <CheckCircle2 className="h-8 w-8 text-blue-600 mb-3" />
          <div className="font-semibold text-gray-900">申請処理</div>
          <div className="text-sm text-gray-500 mt-1">休暇申請の承認・却下</div>
        </Link>
        <Link
          to="/erp/admin/grants"
          className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow transition"
        >
          <FilePlus className="h-8 w-8 text-emerald-600 mb-3" />
          <div className="font-semibold text-gray-900">休暇付与管理</div>
          <div className="text-sm text-gray-500 mt-1">社員別付与履歴・手動調整</div>
        </Link>
      </div>
    </div>
  )
}
