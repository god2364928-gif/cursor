import { useEffect, useRef, useState } from 'react'
import {
  X,
  Upload,
  Train,
  Utensils,
  Wallet,
  CreditCard,
  Loader2,
} from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import { create, update, uploadAttachment, pollOcr } from './expenseApi'
import type { CreateExpensePayload } from './expenseApi'
import type {
  ExpenseRequest,
  ExpenseCategory,
  SettlementType,
} from './expenseTypes'

interface Props {
  open: boolean
  editing: ExpenseRequest | null
  onClose: () => void
  onSubmitted: () => void
}

type TransportMethod = 'train' | 'bus' | 'taxi' | 'shinkansen' | 'other'
type MealPurpose = 'meeting' | 'entertainment' | 'welfare'

const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

const CATEGORY_CARDS: {
  key: ExpenseCategory
  labelKey: string
  Icon: typeof Train
}[] = [
  { key: 'transport', labelKey: 'expense_category_transport', Icon: Train },
  { key: 'meal', labelKey: 'expense_category_meal', Icon: Utensils },
  { key: 'reimburse', labelKey: 'expense_category_reimburse', Icon: Wallet },
  { key: 'corp_card', labelKey: 'expense_category_corp_card', Icon: CreditCard },
]

const TRANSPORT_METHODS: { key: TransportMethod; labelKey: string }[] = [
  { key: 'train', labelKey: 'expense_transport_method_train' },
  { key: 'bus', labelKey: 'expense_transport_method_bus' },
  { key: 'taxi', labelKey: 'expense_transport_method_taxi' },
  { key: 'shinkansen', labelKey: 'expense_transport_method_shinkansen' },
  { key: 'other', labelKey: 'expense_transport_method_other' },
]

const MEAL_PURPOSES: { key: MealPurpose; labelKey: string }[] = [
  { key: 'meeting', labelKey: 'expense_meal_purpose_meeting' },
  { key: 'entertainment', labelKey: 'expense_meal_purpose_entertainment' },
  { key: 'welfare', labelKey: 'expense_meal_purpose_welfare' },
]

/** design §2.1 classifyMeal 프론트 미러링: 1인당 1만엔 기준 */
function classifyMeal(
  amountInclTax: number,
  attendeeCount: number,
  purpose: MealPurpose
): { tag: '会議費' | '接待交際費'; perPerson: number } {
  const perPerson =
    attendeeCount > 0 ? Math.floor(amountInclTax / attendeeCount) : amountInclTax
  if (purpose === 'welfare') return { tag: '会議費', perPerson }
  const tag = perPerson <= 10000 ? '会議費' : '接待交際費'
  return { tag, perPerson }
}

/** design §2.1: 公共交通機関特例 (電車·バス & 税込 3만엔 미만 → 인보이스·영수증 불요) */
function isPublicTransportException(
  method: TransportMethod | '',
  amountInclTax: number
): boolean {
  return (method === 'train' || method === 'bus') && amountInclTax < 30000
}

export default function ExpenseRequestModal({
  open,
  editing,
  onClose,
  onSubmitted,
}: Props) {
  const { t } = useI18nStore()

  // core
  const [category, setCategory] = useState<ExpenseCategory | ''>('')
  const [settlementType, setSettlementType] = useState<SettlementType>(
    'reimburse_required'
  )
  const [usedAt, setUsedAt] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [taxRate, setTaxRate] = useState<number>(10)
  const [vendor, setVendor] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [purpose, setPurpose] = useState('')
  const [memo, setMemo] = useState('')

  // transport meta
  const [method, setMethod] = useState<TransportMethod | ''>('')
  const [fromPlace, setFromPlace] = useState('')
  const [toPlace, setToPlace] = useState('')
  const [roundTrip, setRoundTrip] = useState(false)
  const [visitTarget, setVisitTarget] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  // meal meta
  const [mealPurpose, setMealPurpose] = useState<MealPurpose>('meeting')
  const [attendeeCount, setAttendeeCount] = useState<number>(1)
  const [attendees, setAttendees] = useState('')

  // reimburse meta
  const [payeeAccount, setPayeeAccount] = useState('')
  const [items, setItems] = useState('')

  // corp_card meta
  const [cardLabel, setCardLabel] = useState('')
  const [serviceName, setServiceName] = useState('')
  const [recurring, setRecurring] = useState(false)

  // upload / ocr
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [ocrPending, setOcrPending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 이 모달 세션에서 사용하는 단일 request row id. null 이면 아직 create 전.
  // 한 세션당 create 는 정확히 1회만 발생 (id 설정 후에는 항상 update).
  const [requestId, setRequestId] = useState<number | null>(null)
  // state 는 비동기라 같은 tick 연속 호출 시 stale 가능 → ref 로 동기 미러링해 중복 create 원천 차단.
  const requestIdRef = useRef<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const ocrTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (ocrTimer.current) window.clearTimeout(ocrTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    // reset / prefill from editing
    setError('')
    setSubmitting(false)
    setUploadedFileName('')
    setUploading(false)
    setOcrPending(false)
    if (ocrTimer.current) {
      window.clearTimeout(ocrTimer.current)
      ocrTimer.current = null
    }
    // 기존 신청 편집이면 그 id 를 세션 request row 로 사용, 신규면 null (첫 저장/업로드 때 create)
    setRequestId(editing ? editing.id : null)
    requestIdRef.current = editing ? editing.id : null
    if (editing) {
      setCategory(editing.category)
      setSettlementType(editing.settlement_type)
      setUsedAt(editing.used_at ? editing.used_at.slice(0, 10) : '')
      setAmount(editing.amount_incl_tax ?? '')
      setTaxRate(editing.tax_rate ?? 10)
      setVendor(editing.vendor_name || '')
      setInvoiceNumber(editing.invoice_number || '')
      setPurpose(editing.purpose || '')
      setMemo(editing.memo || '')
      const m = (editing.meta || {}) as Record<string, any>
      setMethod(m.method || '')
      setFromPlace(m.from || '')
      setToPlace(m.to || '')
      setRoundTrip(!!m.round_trip)
      setVisitTarget(m.visit_target || '')
      setPeriodStart(m.period_start || '')
      setPeriodEnd(m.period_end || '')
      setMealPurpose(m.meal_purpose || 'meeting')
      setAttendeeCount(m.attendee_count || 1)
      setAttendees(
        Array.isArray(m.attendees_external)
          ? m.attendees_external.join(', ')
          : Array.isArray(m.attendees_internal)
            ? m.attendees_internal.join(', ')
            : ''
      )
      setPayeeAccount(m.payee_account || '')
      setItems(m.items || '')
      setCardLabel(m.card_label || '')
      setServiceName(m.service_name || '')
      setRecurring(!!m.recurring)
    } else {
      setCategory('')
      setSettlementType('reimburse_required')
      setUsedAt('')
      setAmount('')
      setTaxRate(10)
      setVendor('')
      setInvoiceNumber('')
      setPurpose('')
      setMemo('')
      setMethod('')
      setFromPlace('')
      setToPlace('')
      setRoundTrip(false)
      setVisitTarget('')
      setPeriodStart('')
      setPeriodEnd('')
      setMealPurpose('meeting')
      setAttendeeCount(1)
      setAttendees('')
      setPayeeAccount('')
      setItems('')
      setCardLabel('')
      setServiceName('')
      setRecurring(false)
    }
  }, [open, editing])

  if (!open) return null

  const amountNum = typeof amount === 'number' ? amount : 0
  const publicTransportException =
    category === 'transport' && isPublicTransportException(method, amountNum)
  const showInvoiceNumber = !publicTransportException
  const taxiInvoiceRequired = category === 'transport' && method === 'taxi'

  const mealClass =
    category === 'meal'
      ? classifyMeal(amountNum, attendeeCount, mealPurpose)
      : null

  function buildMeta(): Record<string, any> {
    if (category === 'transport') {
      return {
        method: method || undefined,
        from: fromPlace || undefined,
        to: toPlace || undefined,
        round_trip: roundTrip,
        visit_target: visitTarget || undefined,
        period_start: periodStart || undefined,
        period_end: periodEnd || undefined,
      }
    }
    if (category === 'meal') {
      const external = attendees
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      return {
        meal_purpose: mealPurpose,
        attendee_count: attendeeCount,
        attendees_external: external,
        per_person: mealClass?.perPerson,
        tag: mealClass?.tag,
      }
    }
    if (category === 'reimburse') {
      return {
        payee_account: payeeAccount || undefined,
        items: items || undefined,
      }
    }
    if (category === 'corp_card') {
      return {
        card_label: cardLabel || undefined,
        service_name: serviceName || undefined,
        recurring,
      }
    }
    return {}
  }

  // 카테고리만 있으면 draft 저장·영수증 업로드 가능 (used_at/amount 는 OCR/수동 후채움).
  const canSaveDraft = !!category
  // 제출은 used_at/amount 필수 (server 도 submit 시에만 검증).
  const canSubmit =
    !!category && !!usedAt && typeof amount === 'number' && amount >= 0

  async function pollOcrLoop(reqId: number, attempts: number) {
    try {
      const r = await pollOcr(reqId)
      if (r.ocr_status === 'done') {
        if (r.amount_incl_tax != null) setAmount(r.amount_incl_tax)
        if (r.used_at) setUsedAt(r.used_at.slice(0, 10))
        if (r.vendor_name) setVendor(r.vendor_name)
        if (r.invoice_number) setInvoiceNumber(r.invoice_number)
        setOcrPending(false)
        return
      }
      if (r.ocr_status === 'failed' || r.ocr_status === 'none') {
        setOcrPending(false)
        return
      }
    } catch {
      // 폴링 오류는 무시하고 계속 시도
    }
    if (attempts >= 12) {
      setOcrPending(false)
      return
    }
    ocrTimer.current = window.setTimeout(
      () => pollOcrLoop(reqId, attempts + 1),
      5000
    )
  }

  /** 현재 폼 값으로 create/update payload 구성. asDraft=false 면 submit 플래그 on. */
  function buildPayload(asDraft: boolean): CreateExpensePayload {
    return {
      category: category as ExpenseCategory,
      settlement_type: settlementType,
      // draft 는 비어 있어도 서버가 허용 (submit 시에만 필수 검증)
      used_at: usedAt || undefined,
      amount_incl_tax: typeof amount === 'number' ? amount : undefined,
      tax_rate: taxRate,
      reduced_tax: taxRate === 8,
      vendor_name: vendor.trim() || null,
      invoice_number: showInvoiceNumber ? invoiceNumber.trim() || null : null,
      purpose: purpose.trim() || null,
      memo: memo.trim() || null,
      meta: buildMeta(),
      submit: !asDraft,
    }
  }

  /**
   * 세션 request row 를 보장한다.
   * - 이미 있으면 (requestId) update 로 최신 필드 반영.
   * - 없으면 create(draft) → 반환 id 저장. create 는 세션당 최대 1회.
   * 반환값: 확정된 request id (실패 시 null).
   */
  async function ensureRequestId(asDraft: boolean): Promise<number | null> {
    const payload = buildPayload(asDraft)
    // ref 로 동기 판정 → 같은 tick 연속 호출에도 create 는 1회만.
    const existingId = requestIdRef.current
    if (existingId != null) {
      const saved = await update(existingId, payload)
      return saved.id
    }
    const created = await create(payload)
    requestIdRef.current = created.id
    setRequestId(created.id)
    return created.id
  }

  /** 영수증 업로드 (upload-first): request row 확보 → 업로드 → OCR 폴링 prefill. */
  async function handleFile(file: File) {
    if (uploading || submitting) return
    setUploading(true)
    setError('')
    try {
      // 업로드 단계에서는 항상 draft 로 row 확보 (아직 제출 아님)
      const id = await ensureRequestId(true)
      if (id == null) return
      await uploadAttachment(id, file)
      setUploadedFileName(file.name)
      // 부모 리스트 갱신 (새 draft 노출)
      onSubmitted()
      // OCR 폴링 시작 → prefill
      setOcrPending(true)
      if (ocrTimer.current) window.clearTimeout(ocrTimer.current)
      void pollOcrLoop(id, 0)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  /** Save draft / Submit 공통 저장. asDraft=true → draft, false → 제출. */
  async function save(asDraft: boolean) {
    if (submitting || uploading) return
    if (asDraft && !canSaveDraft) return
    if (!asDraft && !canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      // requestId 있으면 update, 없으면 create — 세션당 create 1회 보장
      await ensureRequestId(asDraft)
      onSubmitted()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

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
            {t('erp_expense')}
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

        {/* ① Category cards */}
        <div className="mb-4">
          <div className={labelClass}>{t('expense_field_category')}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {CATEGORY_CARDS.map(({ key, labelKey, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border text-sm transition-colors ${
                  category === key
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-center leading-tight">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </div>

        {category && (
          <>
            {/* ② Settlement type */}
            <div className="mb-4">
              <div className={labelClass}>
                {t('expense_settlement_reimburse_required').split('(')[0].trim()}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(
                  ['reimburse_required', 'already_paid'] as SettlementType[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSettlementType(st)}
                    className={`px-3 py-2 rounded border text-sm transition-colors ${
                      settlementType === st
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t(`expense_settlement_${st}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* ③ Receipt upload + OCR */}
            <div className="mb-4">
              <div className={labelClass}>{t('expense_field_invoice_number')}</div>
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded bg-white ${
                    uploading || submitting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-gray-100'
                  }`}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {t('education_upload_receipt')}
                  <input
                    type="file"
                    className="hidden"
                    disabled={uploading || submitting}
                    accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      e.target.value = ''
                      if (f) void handleFile(f)
                    }}
                  />
                </label>
                {uploadedFileName && (
                  <span className="text-xs text-gray-600 truncate">
                    {uploadedFileName}
                  </span>
                )}
                {ocrPending && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('expense_msg_ocr_pending')}
                  </span>
                )}
              </div>
            </div>

            {/* ④ Common fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  {t('expense_field_used_at')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={usedAt}
                  onChange={(e) => setUsedAt(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>
                  {t('expense_field_amount')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value
                    setAmount(v === '' ? '' : Number(v))
                  }}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('expense_field_tax_rate')}</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={10}>10%</option>
                  <option value={8}>8%</option>
                  <option value={0}>0%</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{t('expense_field_vendor')}</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className={inputClass}
                />
              </div>

              {showInvoiceNumber && (
                <div>
                  <label className={labelClass}>
                    {t('expense_field_invoice_number')}
                    {taxiInvoiceRequired && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="T1234567890123"
                    className={inputClass}
                  />
                </div>
              )}
              {publicTransportException && (
                <div className="md:col-span-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded p-2">
                  {t('expense_note_public_transport')}
                </div>
              )}

              <div className="md:col-span-2">
                <label className={labelClass}>{t('expense_field_purpose')}</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* transport-specific */}
            {category === 'transport' && (
              <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('expense_field_method')}</label>
                  <select
                    value={method}
                    onChange={(e) =>
                      setMethod(e.target.value as TransportMethod)
                    }
                    className={inputClass}
                  >
                    <option value="">—</option>
                    {TRANSPORT_METHODS.map((m) => (
                      <option key={m.key} value={m.key}>
                        {t(m.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={roundTrip}
                      onChange={(e) => setRoundTrip(e.target.checked)}
                    />
                    {t('expense_field_round_trip')}
                  </label>
                </div>
                <div>
                  <label className={labelClass}>{t('expense_field_from')}</label>
                  <input
                    type="text"
                    value={fromPlace}
                    onChange={(e) => setFromPlace(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('expense_field_to')}</label>
                  <input
                    type="text"
                    value={toPlace}
                    onChange={(e) => setToPlace(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('expense_field_visit_target')}</label>
                  <input
                    type="text"
                    value={visitTarget}
                    onChange={(e) => setVisitTarget(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>{t('expense_field_period_start')}</label>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('expense_field_period_end')}</label>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* meal-specific */}
            {category === 'meal' && (
              <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('expense_field_meal_purpose')}</label>
                  <select
                    value={mealPurpose}
                    onChange={(e) =>
                      setMealPurpose(e.target.value as MealPurpose)
                    }
                    className={inputClass}
                  >
                    {MEAL_PURPOSES.map((m) => (
                      <option key={m.key} value={m.key}>
                        {t(m.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('expense_field_attendee_count')}</label>
                  <input
                    type="number"
                    min="1"
                    value={attendeeCount}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setAttendeeCount(isNaN(v) || v < 1 ? 1 : v)
                    }}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{t('expense_field_attendees')}</label>
                  <input
                    type="text"
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    placeholder={t('expense_placeholder_comma_separated')}
                    className={inputClass}
                  />
                </div>
                {mealClass && (
                  <div className="md:col-span-2 flex items-center gap-2 text-sm">
                    <span className="text-gray-500">{t('expense_field_per_person')}: </span>
                    <span className="text-gray-900 font-medium">
                      ¥{mealClass.perPerson.toLocaleString('ja-JP')}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        mealClass.tag === '会議費'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {mealClass.tag === '会議費'
                        ? t('expense_meal_tag_meeting')
                        : t('expense_meal_tag_entertainment')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* reimburse-specific */}
            {category === 'reimburse' && (
              <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>
                    {t('expense_field_payee_account')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={payeeAccount}
                    onChange={(e) => setPayeeAccount(e.target.value)}
                    placeholder={t('expense_placeholder_payee_account')}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>{t('expense_field_items')}</label>
                  <textarea
                    rows={2}
                    value={items}
                    onChange={(e) => setItems(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* corp_card-specific */}
            {category === 'corp_card' && (
              <div className="mt-4 border-t border-gray-100 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('expense_field_card_label')}</label>
                  <input
                    type="text"
                    value={cardLabel}
                    onChange={(e) => setCardLabel(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('expense_field_service_name')}</label>
                  <input
                    type="text"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                    />
                    {t('expense_field_recurring')}
                  </label>
                  <div className="text-xs text-gray-400 mt-1">
                    {t('expense_note_recurring')}
                  </div>
                </div>
              </div>
            )}

            {/* memo */}
            <div className="mt-4">
              <label className={labelClass}>{t('expense_field_memo')}</label>
              <textarea
                rows={2}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className={inputClass}
              />
            </div>
          </>
        )}

        {error && (
          <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting || uploading}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="outline"
            onClick={() => save(true)}
            disabled={!canSaveDraft || submitting || uploading}
          >
            {t('expense_msg_save_draft')}
          </Button>
          <Button
            onClick={() => save(false)}
            disabled={!canSubmit || submitting || uploading}
          >
            {t('expense_msg_submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
