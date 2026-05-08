import { useAuthStore } from '../../store/authStore'

export default function MyPage() {
  const user = useAuthStore((state) => state.user)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>
        <p className="text-sm text-gray-500 mt-1">基本情報を確認できます。</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
        <Field label="氏名" value={user?.name || '-'} />
        <Field label="メール" value={user?.email || '-'} />
        <Field label="所属" value={user?.team || '-'} />
        <Field label="権限" value={user?.role || '-'} />
        <Field label="アクセス" value={user?.app_access || '-'} />
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-2 border-b border-gray-100 last:border-0">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="col-span-2 text-sm text-gray-900">{value}</div>
    </div>
  )
}
