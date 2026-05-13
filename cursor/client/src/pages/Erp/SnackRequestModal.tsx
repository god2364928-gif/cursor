import { useEffect, useState } from 'react'
import { X, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import { createRequest } from './snackApi'

interface Props {
  open: boolean
  onClose: () => void
  onSubmitted: () => void
  daysUntilDeadline: number
  nextWeekStart?: string
}

export default function SnackRequestModal({
  open,
  onClose,
  onSubmitted,
  daysUntilDeadline,
  nextWeekStart,
}: Props) {
  const { t } = useI18nStore()

  const [productUrl, setProductUrl] = useState('')
  const [productName, setProductName] = useState('')
  const [unitPrice, setUnitPrice] = useState<number | ''>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setProductUrl('')
      setProductName('')
      setUnitPrice('')
      setQuantity(1)
      setNote('')
      setError('')
    }
  }, [open])

  if (!open) return null

  const total = (typeof unitPrice === 'number' ? unitPrice : 0) * quantity
  const isValid =
    !!productUrl.trim() &&
    !!productName.trim() &&
    typeof unitPrice === 'number' &&
    unitPrice >= 0 &&
    quantity >= 1

  async function submit(continueAfter: boolean) {
    if (!isValid || submitting) return
    setSubmitting(true)
    setError('')
    try {
      await createRequest({
        product_url: productUrl.trim(),
        product_name: productName.trim(),
        unit_price: unitPrice as number,
        quantity,
        note: note.trim() || undefined,
      })
      onSubmitted()
      if (continueAfter) {
        setProductUrl('')
        setProductName('')
        setUnitPrice('')
        setQuantity(1)
        setNote('')
      } else {
        onClose()
      }
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  const isLate = daysUntilDeadline < 0
  const lateMessage = t('snack_late_warning').replace(
    '{{date}}',
    nextWeekStart || ''
  )

  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('snack_new_request')}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 좌측 안내 */}
          <div>
            <div className="bg-blue-50 border border-blue-100 rounded p-4 space-y-2 text-sm">
              <div className="font-semibold text-gray-900 mb-2">
                {t('snack_guide_title')}
              </div>
              <div className="text-gray-700">• {t('snack_guide_deadline')}</div>
              <div className="text-gray-700">• {t('snack_guide_amazon')}</div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded p-4 space-y-1 text-sm mt-3">
              <div className="font-semibold text-rose-700">
                {t('snack_reject_title')}
              </div>
              <div className="text-rose-700">• {t('snack_reject_1')}</div>
              <div className="text-rose-700">• {t('snack_reject_2')}</div>
              <div className="text-rose-700">• {t('snack_reject_3')}</div>
              <div className="text-rose-700">• {t('snack_reject_4')}</div>
            </div>
          </div>

          {/* 우측 폼 */}
          <div className="space-y-3">
            <div>
              <a
                href="https://www.amazon.co.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-sm"
              >
                <ShoppingCart className="h-4 w-4" />
                {t('snack_amazon_link')}
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('snack_form_url')} <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder={t('snack_form_url_placeholder')}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('snack_form_name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t('snack_form_name_placeholder')}
                className={inputClass}
              />
            </div>

            {isLate && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-2 rounded text-xs flex items-start gap-1">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{lateMessage}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('snack_form_unit_price')}
                </label>
                <input
                  type="number"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => {
                    const v = e.target.value
                    setUnitPrice(v === '' ? '' : Number(v))
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('snack_form_quantity')}
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setQuantity(isNaN(v) || v < 1 ? 1 : v)
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('snack_form_total')}
                </label>
                <div className="w-full border border-gray-200 bg-gray-50 rounded px-3 py-2 text-sm text-gray-900">
                  ¥{total.toLocaleString()}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('snack_form_note')}
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('snack_form_note_placeholder')}
                className={inputClass}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {t('snack_cancel_button')}
          </Button>
          <Button
            variant="outline"
            onClick={() => submit(true)}
            disabled={!isValid || submitting}
          >
            + {t('snack_continue')}
          </Button>
          <Button
            onClick={() => submit(false)}
            disabled={!isValid || submitting}
          >
            {t('snack_submit_button')}
          </Button>
        </div>
      </div>
    </div>
  )
}
