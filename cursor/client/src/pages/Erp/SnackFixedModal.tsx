import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import { createFixed } from './snackApi'

interface Props {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
}

export default function SnackFixedModal({ open, onClose, onSubmitted }: Props) {
  const { t, language } = useI18nStore()

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [productUrl, setProductUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setStartDate('')
      setEndDate('')
      setProductUrl('')
      setProductName('')
      setUnitPrice('')
      setQuantity(1)
      setNote('')
      setError('')
    }
  }, [open])

  if (!open) return null

  // 기간 N주 계산 (양 끝 포함)
  const weeksCount = (() => {
    if (!startDate || !endDate) return 0
    const s = new Date(startDate)
    const e = new Date(endDate)
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0
    const diffDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
    return Math.floor(diffDays / 7) + 1
  })()

  const total = (typeof unitPrice === 'number' ? unitPrice : 0) * quantity
  const isValid =
    !!startDate &&
    !!endDate &&
    new Date(endDate) >= new Date(startDate) &&
    !!productUrl.trim() &&
    !!productName.trim() &&
    typeof unitPrice === 'number' &&
    unitPrice >= 0 &&
    quantity >= 1

  const inputCls =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  async function submit() {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await createFixed({
        product_url: productUrl.trim(),
        product_name: productName.trim(),
        unit_price: unitPrice as number,
        quantity,
        note: note.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
      })
      onSubmitted()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('snack_fixed_register')}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {language === 'ja'
                ? '毎週自動で申請箱に追加されます'
                : '매주 자동으로 신청함에 담겨요'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* 기간 */}
          <div>
            <label className={labelCls}>
              {t('snack_form_period')} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {t('snack_form_start_date')}
                </p>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  {t('snack_form_end_date')}
                </p>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            {weeksCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {t('snack_fixed_period_hint').replace(
                  '{{n}}',
                  String(weeksCount)
                )}
              </p>
            )}
          </div>

          {/* Amazon 바로가기 */}
          <div>
            <a
              href="https://www.amazon.co.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Amazon <span aria-hidden>↗</span>
            </a>
          </div>

          {/* URL */}
          <div>
            <label className={labelCls}>
              {t('snack_form_url')} <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder={t('snack_form_url_placeholder')}
              className={inputCls}
            />
          </div>

          {/* 상품명 */}
          <div>
            <label className={labelCls}>
              {t('snack_form_name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder={t('snack_form_name_placeholder')}
              className={inputCls}
            />
          </div>

          {/* 단가 / 수량 / 합계 */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>
                {t('snack_form_unit_price')}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                value={unitPrice}
                onChange={(e) => {
                  const v = e.target.value
                  setUnitPrice(v === '' ? '' : Number(v))
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>
                {t('snack_form_quantity')}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  const v = Number(e.target.value)
                  setQuantity(isNaN(v) || v < 1 ? 1 : v)
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>{t('snack_form_total')}</label>
              <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-900">
                {total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className={labelCls}>{t('snack_form_note')}</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('snack_form_note_placeholder')}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            {t('snack_cancel_button')}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={!isValid || submitting}
          >
            {t('snack_register_button')}
          </Button>
        </div>
      </div>
    </div>
  )
}
