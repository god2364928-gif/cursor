import { useAuthStore } from '../../store/authStore'
import { useI18nStore } from '../../i18n'

export default function MyPage() {
  const user = useAuthStore((state) => state.user)
  const { t } = useI18nStore()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('erp_my_page')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('mypage_subtitle')}</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
        <Field label={t('mypage_name')} value={user?.name || '-'} />
        <Field label={t('mypage_email')} value={user?.email || '-'} />
        <Field label={t('mypage_team')} value={user?.team || '-'} />
        <Field label={t('mypage_role')} value={user?.role || '-'} />
        <Field label={t('mypage_access')} value={user?.app_access || '-'} />
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
