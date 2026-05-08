import { useI18nStore } from '../../i18n'

export default function OrgPage() {
  const { t } = useI18nStore()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('erp_org_chart')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('orgpage_subtitle')}</p>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        {t('orgpage_preparing')}
      </div>
    </div>
  )
}
