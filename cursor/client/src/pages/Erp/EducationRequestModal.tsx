import { useEffect, useState } from 'react'
import { X, GraduationCap, AlertCircle } from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import {
  createRequest,
  updateRequest,
  type EducationCourseType,
  type EducationScheduleType,
  type EducationRequest,
} from './educationApi'

interface Props {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  editing?: EducationRequest | null // 임시저장 수정 시 전달
}

const CEO_THRESHOLD = 50000
const EVIDENCE_DUE_DAYS = 14

export default function EducationRequestModal({ open, onClose, onSubmitted, editing }: Props) {
  const { t } = useI18nStore()

  const [courseType, setCourseType] = useState<EducationCourseType>('offline')
  const [scheduleType, setScheduleType] = useState<EducationScheduleType>('after_work')
  const [provider, setProvider] = useState('')
  const [courseName, setCourseName] = useState('')
  const [courseUrl, setCourseUrl] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [cost, setCost] = useState<number | ''>('')
  const [relevance, setRelevance] = useState('')
  const [studyPlan, setStudyPlan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setCourseType(editing.course_type)
      setScheduleType(editing.schedule_type)
      setProvider(editing.provider)
      setCourseName(editing.course_name)
      setCourseUrl(editing.course_url || '')
      setStartDate(editing.start_date.slice(0, 10))
      setEndDate(editing.end_date.slice(0, 10))
      setCost(editing.cost)
      setRelevance(editing.relevance || '')
      setStudyPlan(editing.study_plan || '')
    } else {
      setCourseType('offline')
      setScheduleType('after_work')
      setProvider('')
      setCourseName('')
      setCourseUrl('')
      setStartDate('')
      setEndDate('')
      setCost('')
      setRelevance('')
      setStudyPlan('')
    }
    setError('')
  }, [open, editing])

  if (!open) return null

  const baseValid =
    !!provider.trim() &&
    !!courseName.trim() &&
    !!startDate &&
    !!endDate &&
    typeof cost === 'number' &&
    cost >= 0 &&
    new Date(endDate).getTime() >= new Date(startDate).getTime()

  const submitValid = baseValid && !!relevance.trim() && !!studyPlan.trim()
  const needsCeo = typeof cost === 'number' && cost >= CEO_THRESHOLD

  async function save(submit: boolean) {
    if (submitting) return
    if (submit && !submitValid) {
      setError(t('education_validation_required'))
      return
    }
    if (!submit && !baseValid) {
      setError(t('education_validation_required_basic'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        course_type: courseType,
        schedule_type: scheduleType,
        provider: provider.trim(),
        course_name: courseName.trim(),
        course_url: courseUrl.trim() || null,
        start_date: startDate,
        end_date: endDate,
        cost: cost as number,
        relevance: relevance.trim(),
        study_plan: studyPlan.trim(),
        submit,
      }
      if (editing) {
        await updateRequest(editing.id, payload)
      } else {
        await createRequest(payload)
      }
      onSubmitted()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gray-800 text-white px-6 py-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6" />
            <div>
              <h2 className="text-lg font-semibold">{t('education_modal_title')}</h2>
              <p className="text-xs text-gray-300 mt-0.5">{t('education_modal_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-300 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body — 2-column */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: 기본 정보 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              📋 {t('education_section_basic')}
            </h3>

            <div>
              <label className={labelClass}>
                {t('education_course_type')} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 text-sm">
                {(['offline', 'online', 'book'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="course_type"
                      checked={courseType === v}
                      onChange={() => setCourseType(v)}
                    />
                    <span>{t(`education_course_type_${v}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t('education_schedule')} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4 text-sm">
                {(['after_work', 'weekend', 'self_paced'] as const).map((v) => (
                  <label key={v} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule_type"
                      checked={scheduleType === v}
                      onChange={() => setScheduleType(v)}
                    />
                    <span>{t(`education_schedule_${v}`)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t('education_provider')} <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                placeholder={t('education_provider_placeholder')}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>
                {t('education_course_name')} <span className="text-red-500">*</span>
              </label>
              <input
                className={inputClass}
                placeholder={t('education_course_name_placeholder')}
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>{t('education_course_url')}</label>
              <input
                className={inputClass}
                placeholder="https://..."
                value={courseUrl}
                onChange={(e) => setCourseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>
                {t('education_period')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  className={inputClass}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-gray-500">~</span>
                <input
                  type="date"
                  className={inputClass}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>
                {t('education_cost')} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  placeholder="0"
                  value={cost}
                  onChange={(e) =>
                    setCost(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))
                  }
                />
                <span className="text-gray-500 text-sm whitespace-nowrap">{t('education_yen')}</span>
              </div>
              {needsCeo && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{t('education_ceo_required_notice')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: 작성 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">
              ✍️ {t('education_section_writing')}
            </h3>

            <div>
              <label className={labelClass}>
                {t('education_relevance')} <span className="text-red-500">*</span>
              </label>
              <textarea
                className={inputClass}
                rows={5}
                placeholder={t('education_relevance_placeholder')}
                value={relevance}
                onChange={(e) => setRelevance(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>
                {t('education_study_plan')} <span className="text-red-500">*</span>
              </label>
              <textarea
                className={inputClass}
                rows={9}
                placeholder={t('education_study_plan_placeholder')}
                value={studyPlan}
                onChange={(e) => setStudyPlan(e.target.value)}
              />
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2 space-y-1">
              <div>· {t('education_evidence_due_notice').replace('{{n}}', String(EVIDENCE_DUE_DAYS))}</div>
              <div>· {t('education_evidence_required_by_type')}</div>
            </div>
          </div>
        </div>

        {error && (
          <div className="px-6 pb-3 text-sm text-red-600">{error}</div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl flex items-center justify-end gap-2">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => save(false)}
          >
            {t('education_save_draft')}
          </Button>
          <Button
            disabled={submitting || !submitValid}
            onClick={() => save(true)}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            {t('education_submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
