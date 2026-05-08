import { useEffect, useMemo, useState } from 'react'
import api from '../../lib/api'
import { Button } from '../../components/ui/button'
import { X } from 'lucide-react'
import { useLeaveLabels, type LeaveType } from './leaveLabels'

interface Props {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  currentRemaining: number
}

const TYPE_OPTIONS: LeaveType[] = ['full', 'half_am', 'half_pm', 'unpaid', 'health_check', 'condolence']

export default function LeaveRequestModal({ open, onClose, onSubmitted, currentRemaining }: Props) {
  const { t, leaveTypeLabel } = useLeaveLabels()
  const [leaveType, setLeaveType] = useState<LeaveType>('full')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setLeaveType('full')
      setStartDate('')
      setEndDate('')
      setReason('')
      setError('')
    }
  }, [open])

  const isHalf = leaveType === 'half_am' || leaveType === 'half_pm'

  useEffect(() => {
    if (isHalf && startDate) {
      setEndDate(startDate)
    }
  }, [isHalf, startDate])

  const consumedPreview = useMemo(() => {
    if (!startDate || !endDate) return 0
    if (isHalf) return 0.5
    if (leaveType === 'unpaid' || leaveType === 'health_check' || leaveType === 'condolence') return 0
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0
    return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }, [leaveType, startDate, endDate, isHalf])

  const isPaid = leaveType === 'full' || isHalf
  const willOverflow = isPaid && consumedPreview > currentRemaining

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!startDate || !endDate) {
      setError(t('err_dates_required'))
      return
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError(t('err_end_before_start'))
      return
    }
    if (willOverflow) {
      setError(`${t('modal_insufficient')} (${t('leave_remaining')} ${currentRemaining}${t('unit_day')})`)
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api.post('/vacation/requests', {
        startDate,
        endDate,
        leaveType,
        reason: reason || undefined,
      })
      onSubmitted()
    } catch (err: any) {
      setError(err?.response?.data?.error || t('err_request_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('modal_apply_title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('modal_leave_kind')}</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((value) => {
                const active = leaveType === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLeaveType(value)}
                    className={`px-3 py-2 text-sm rounded-md border transition ${
                      active
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {leaveTypeLabel(value)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('modal_start_date')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('modal_end_date')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                disabled={isHalf}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
          {isHalf && (
            <p className="text-xs text-gray-500 -mt-2">{t('modal_half_note')}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('modal_reason')} <span className="text-gray-400 font-normal">{t('common_optional_short')}</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={t('modal_reason_placeholder')}
            />
          </div>

          {isPaid && (
            <div
              className={`text-sm rounded-md p-3 ${
                willOverflow
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {t('modal_apply_preview')}{' '}
              <span className="font-semibold">
                {t('leave_remaining')} {currentRemaining}{t('unit_day')} → {(currentRemaining - consumedPreview).toFixed(1)}{t('unit_day')}
              </span>{' '}
              ({consumedPreview}{t('unit_day')} {t('modal_consume_label')})
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              {t('modal_cancel')}
            </Button>
            <Button type="submit" disabled={submitting || willOverflow}>
              {submitting ? t('modal_submitting') : t('modal_submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
