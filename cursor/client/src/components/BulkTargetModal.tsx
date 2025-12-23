import { useState } from 'react'
import { X, Target, Calendar, Save } from 'lucide-react'
import { useI18nStore } from '../i18n'

interface BulkTargetModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (targets: any, weeks: number) => Promise<void>
  type: 'weekly' | 'monthly'
  currentWeek: number
  currentMonth: number
  currentYear: number
}

export default function BulkTargetModal({ 
  isOpen, 
  onClose, 
  onSave, 
  type,
  currentWeek,
  currentMonth,
  currentYear 
}: BulkTargetModalProps) {
  const { t } = useI18nStore()
  const [isSaving, setIsSaving] = useState(false)
  const [numberOfPeriods, setNumberOfPeriods] = useState(4) // 기본 4주 또는 4개월

  // 주간 목표
  const [targetForm, setTargetForm] = useState(0)
  const [targetDm, setTargetDm] = useState(0)
  const [targetLine, setTargetLine] = useState(0)
  const [targetPhone, setTargetPhone] = useState(0)
  const [targetEmail, setTargetEmail] = useState(0)
  const [targetRetargeting, setTargetRetargeting] = useState(0)
  const [targetExisting, setTargetExisting] = useState(0)
  const [targetRetargetingCustomers, setTargetRetargetingCustomers] = useState(0)

  // 월간 목표 (총매출, 신규매출, 총건수, 신규건수만)
  const [targetRevenue, setTargetRevenue] = useState(0)
  const [targetNewRevenue, setTargetNewRevenue] = useState(0)
  const [targetContracts, setTargetContracts] = useState(0)
  const [targetNewContracts, setTargetNewContracts] = useState(0)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const targets = type === 'weekly' ? {
        targetForm,
        targetDm,
        targetLine,
        targetPhone,
        targetEmail,
        targetRetargeting,
        targetExisting,
        targetRetargetingCustomers
      } : {
        targetRevenue,
        targetNewRevenue,
        targetContracts,
        targetNewContracts
      }

      await onSave(targets, numberOfPeriods)
      onClose()
    } catch (error) {
      console.error('Failed to save bulk targets:', error)
      alert(t('saveFailedMeeting'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const periodLabel = type === 'weekly' ? t('week') : t('month')
  const currentPeriod = type === 'weekly' ? currentWeek : currentMonth

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold">
              {type === 'weekly' ? t('bulkWeeklyTargetSetting') : t('bulkMonthlyTargetSetting')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 기간 선택 */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <label className="font-bold text-blue-900">
                {type === 'weekly' ? t('setWeeksAhead') : t('setMonthsAhead')}
              </label>
            </div>
            <select
              value={numberOfPeriods}
              onChange={(e) => setNumberOfPeriods(parseInt(e.target.value))}
              className="w-full border rounded-lg px-4 py-2 text-lg font-medium"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={n}>
                  {type === 'weekly' 
                    ? `${currentYear}${t('year')} ${currentPeriod}${periodLabel} ~ ${currentPeriod + n - 1}${periodLabel} (${n}${type === 'weekly' ? t('weeksTotal') : t('monthsTotal')})`
                    : `${currentYear}${t('year')} ${currentPeriod}${periodLabel} ~ ${currentPeriod + n - 1}${periodLabel} (${n}${t('monthsTotal')})`
                  }
                </option>
              ))}
            </select>
            <p className="text-xs text-blue-600 mt-2">
              {type === 'weekly' 
                ? `💡 ${t('sameTargetAppliedToWeeks')}`
                : `💡 ${t('sameTargetAppliedToMonths')}`
              }
            </p>
          </div>

          {/* 주간 목표 입력 */}
          {type === 'weekly' && (
            <>
              {/* 5대 수단 */}
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  📊 {t('newSalesActivities')} ({t('fiveMethodBreakdown')})
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">📝 {t('form')}</label>
                    <input
                      type="number"
                      value={targetForm}
                      onChange={(e) => setTargetForm(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">📧 {t('contactDM')}</label>
                    <input
                      type="number"
                      value={targetDm}
                      onChange={(e) => setTargetDm(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">💬 {t('line')}</label>
                    <input
                      type="number"
                      value={targetLine}
                      onChange={(e) => setTargetLine(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">📞 {t('contactPhone')}</label>
                    <input
                      type="number"
                      value={targetPhone}
                      onChange={(e) => setTargetPhone(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">✉️ {t('contactMail')}</label>
                    <input
                      type="number"
                      value={targetEmail}
                      onChange={(e) => setTargetEmail(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* 리타겟팅 & 기존 고객 */}
              <div>
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  ✨ {t('otherActivities')}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('retargetingContactTarget')}</label>
                    <input
                      type="number"
                      value={targetRetargeting}
                      onChange={(e) => setTargetRetargeting(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('existingCustomerManagement')}</label>
                    <input
                      type="number"
                      value={targetExisting}
                      onChange={(e) => setTargetExisting(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">👥 {t('targetCustomerCount')}</label>
                    <input
                      type="number"
                      value={targetRetargetingCustomers}
                      onChange={(e) => setTargetRetargetingCustomers(parseInt(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 월간 목표 입력 (총매출, 신규매출, 총건수, 신규건수만) */}
          {type === 'monthly' && (
            <div>
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                💰 {t('monthlyRevenueTarget')}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalRevenueTarget')}</label>
                  <input
                    type="number"
                    value={targetRevenue}
                    onChange={(e) => setTargetRevenue(parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('yen')}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalNewRevenueTarget')}</label>
                  <input
                    type="number"
                    value={targetNewRevenue}
                    onChange={(e) => setTargetNewRevenue(parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('yen')}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalContractsTarget')}</label>
                  <input
                    type="number"
                    value={targetContracts}
                    onChange={(e) => setTargetContracts(parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('contracts')}</span>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('totalNewContractsTarget')}</label>
                  <input
                    type="number"
                    value={targetNewContracts}
                    onChange={(e) => setTargetNewContracts(parseInt(e.target.value) || 0)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">{t('contracts')}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ℹ️ {t('monthlyTargetInfo')}
              </p>
            </div>
          )}

          {/* 주의사항 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ {type === 'weekly' ? t('bulkTargetWeeklyWarning') : t('bulkTargetMonthlyWarning')}
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border rounded-lg hover:bg-gray-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isSaving ? t('savingMeeting') : t('saveTargets')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

