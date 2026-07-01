import { useEffect, useRef, useState } from 'react'
import { X, Upload, Loader2 } from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import { create, update, uploadAttachment, pollOcr, remove } from './expenseApi'
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

// 결제 방식 탭 → settlement_type 자동 매핑
type PayType = 'personal' | 'corporate'

const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

// 개인결제 항목 selector 값 (category value) — 7종
const PERSONAL_ITEMS: ExpenseCategory[] = [
  'transport',
  'dining',
  'meal',
  'reimburse',
  'welfare',
  'health_checkup',
  'other',
]

// corp_card 는 법인카드/법인결제 계열 category → corporate 탭
function payTypeForCategory(cat: ExpenseCategory): PayType {
  return cat === 'corp_card' ? 'corporate' : 'personal'
}

export default function ExpenseRequestModal({
  open,
  editing,
  onClose,
  onSubmitted,
}: Props) {
  const { t } = useI18nStore()

  // 탭 (결제 방식) — settlement_type 은 탭에서 자동 결정
  const [payType, setPayType] = useState<PayType>('personal')
  // 개인결제 항목 selector (corporate 에서는 항상 corp_card 로 고정)
  const [item, setItem] = useState<ExpenseCategory | ''>('')

  // 공통 입력
  const [usedAt, setUsedAt] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [purpose, setPurpose] = useState('')
  const [memo, setMemo] = useState('')

  // transport(교통비) 기간
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  // upload / ocr
  const [uploadedFileName, setUploadedFileName] = useState('')
  const [hasReceipt, setHasReceipt] = useState(false)
  const [ocrPending, setOcrPending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 이 모달 세션에서 사용하는 단일 request row id. null 이면 아직 create 전.
  // 한 세션당 create 는 정확히 1회만 발생 (id 설정 후에는 항상 update).
  const [requestId, setRequestId] = useState<number | null>(null)
  // state 는 비동기라 같은 tick 연속 호출 시 stale 가능 → ref 로 동기 미러링해 중복 create 원천 차단.
  const requestIdRef = useRef<number | null>(null)
  // 이 모달 세션에서 (신규 신청 중) create 로 draft row 를 만들었는지 여부.
  // true 이고 제출 없이 취소/닫기 시 orphan draft 를 삭제한다. 기존 신청 편집이면 항상 false.
  const sessionCreatedDraftRef = useRef(false)
  // 제출 완료 여부 — 제출했으면 취소/닫기 시 삭제하지 않는다.
  const submittedRef = useRef(false)

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
    // 세션 상태 초기화: 신규 세션은 아직 draft 미생성·미제출
    sessionCreatedDraftRef.current = false
    submittedRef.current = false
    if (editing) {
      const cat = editing.category
      setPayType(payTypeForCategory(cat))
      setItem(cat === 'corp_card' ? '' : cat)
      setUsedAt(editing.used_at ? editing.used_at.slice(0, 10) : '')
      setAmount(editing.amount_incl_tax ?? '')
      setPurpose(editing.purpose || '')
      setMemo(editing.memo || '')
      const m = (editing.meta || {}) as Record<string, any>
      setPeriodStart(m.period_start || '')
      setPeriodEnd(m.period_end || '')
      // 기존 첨부가 있으면 영수증 있음으로 간주 (제출 가능)
      setHasReceipt(
        Array.isArray(editing.attachments) && editing.attachments.length > 0
      )
    } else {
      setPayType('personal')
      setItem('')
      setUsedAt('')
      setAmount('')
      setPurpose('')
      setMemo('')
      setPeriodStart('')
      setPeriodEnd('')
      setHasReceipt(false)
    }
  }, [open, editing])

  if (!open) return null

  // 탭 전환 시 settlement_type 자동 결정
  const settlementType: SettlementType =
    payType === 'personal' ? 'reimburse_required' : 'already_paid'

  // 최종 category: 개인결제 → 선택 항목, 법인결제 → corp_card 고정
  const category: ExpenseCategory | '' =
    payType === 'corporate' ? 'corp_card' : item

  const showTransportPeriod = payType === 'personal' && item === 'transport'
  const showPurpose =
    payType === 'corporate' || (payType === 'personal' && item === 'other')
  const purposeRequired = payType === 'corporate'

  function buildMeta(): Record<string, any> {
    const meta: Record<string, any> = {}
    if (showTransportPeriod) {
      if (periodStart) meta.period_start = periodStart
      if (periodEnd) meta.period_end = periodEnd
    }
    return meta
  }

  // 제출: category + 영수증 + used_at + amount(>=0) 필수. corporate 는 purpose 도 필수.
  const canSubmit =
    !!category &&
    hasReceipt &&
    !!usedAt &&
    typeof amount === 'number' &&
    amount >= 0 &&
    (!purposeRequired || purpose.trim().length > 0)

  async function pollOcrLoop(reqId: number, attempts: number) {
    try {
      const r = await pollOcr(reqId)
      if (r.ocr_status === 'done') {
        if (r.amount_incl_tax != null) setAmount(r.amount_incl_tax)
        if (r.used_at) setUsedAt(r.used_at.slice(0, 10))
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
    // 신규 신청 세션에서 방금 draft row 를 생성 → 미제출 취소 시 삭제 대상
    if (!editing) sessionCreatedDraftRef.current = true
    return created.id
  }

  /** 영수증 업로드 (upload-first): request row 확보 → 업로드 → OCR 폴링 prefill. */
  async function handleFile(file: File) {
    if (uploading || submitting) return
    if (!category) {
      // 개인결제에서 항목 미선택이면 업로드 불가 (안내)
      setError(t('expense_field_category'))
      return
    }
    setUploading(true)
    setError('')
    try {
      // 업로드 단계에서는 항상 draft 로 row 확보 (아직 제출 아님)
      const id = await ensureRequestId(true)
      if (id == null) return
      await uploadAttachment(id, file)
      setUploadedFileName(file.name)
      setHasReceipt(true)
      // 부모 리스트 갱신 (새 draft 노출)
      onSubmitted()
      // OCR 폴링 시작 → prefill (영수증은 freee 파일박스에도 저장됨)
      setOcrPending(true)
      if (ocrTimer.current) window.clearTimeout(ocrTimer.current)
      void pollOcrLoop(id, 0)
    } catch (e: any) {
      setError(e?.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  /** 제출 (submit:true 로 create/update). */
  async function submitRequest() {
    if (submitting || uploading) return
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      // requestId 있으면 update, 없으면 create — 세션당 create 1회 보장
      await ensureRequestId(false)
      // 제출 성공 → 취소/닫기 시 orphan 삭제 대상 아님
      submittedRef.current = true
      onSubmitted()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 취소/닫기 처리. 이 세션에서 만든 미제출 draft 가 있으면 best-effort 로 삭제
   * (orphan draft row 방지). 기존 신청 편집이거나 이미 제출했으면 삭제하지 않음.
   */
  function handleCancel() {
    if (submitting) return
    const id = requestIdRef.current
    if (id != null && sessionCreatedDraftRef.current && !submittedRef.current) {
      sessionCreatedDraftRef.current = false
      void remove(id).catch(() => {})
      // 부모 리스트에서 방금 만든 draft 가 사라지도록 갱신
      onSubmitted()
    }
    onClose()
  }

  function selectTab(next: PayType) {
    setPayType(next)
    if (next === 'corporate') setItem('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) handleCancel()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('erp_expense')}
          </h2>
          <button
            onClick={handleCancel}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ① 결제 방식 탭 (settlement_type 자동 결정) */}
        <div className="mb-5 grid grid-cols-2 gap-2">
          {(['personal', 'corporate'] as PayType[]).map((pt) => (
            <button
              key={pt}
              type="button"
              onClick={() => selectTab(pt)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                payType === pt
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t(`expense_paytype_${pt}`)}
            </button>
          ))}
        </div>

        {/* ② 개인결제 — 항목 selector */}
        {payType === 'personal' && (
          <div className="mb-4">
            <label className={labelClass}>
              {t('expense_field_category')} <span className="text-red-500">*</span>
            </label>
            <select
              value={item}
              onChange={(e) => setItem(e.target.value as ExpenseCategory)}
              className={inputClass}
            >
              <option value="">—</option>
              {PERSONAL_ITEMS.map((c) => (
                <option key={c} value={c}>
                  {t(`expense_item_${c}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {(payType === 'corporate' || item) && (
          <>
            {/* ③ 영수증 업로드 (필수) + OCR */}
            <div className="mb-4">
              <label className={labelClass}>
                {t('education_upload_receipt')}{' '}
                <span className="text-red-500">*</span>
              </label>
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

            {/* ④ 결제일/사용일 + 금액 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  {payType === 'personal'
                    ? t('expense_field_payment_date')
                    : t('expense_field_used_at')}{' '}
                  <span className="text-red-500">*</span>
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
                  {t('expense_field_amount')}{' '}
                  <span className="text-red-500">*</span>
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
            </div>

            {/* ⑤ 교통비 기간 (개인결제·transport 전용) */}
            {showTransportPeriod && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>
                    {t('expense_field_period_start')}
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('expense_field_period_end')}
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* ⑥ 목적·용도 (법인결제 필수 / 개인결제·직접작성) */}
            {showPurpose && (
              <div className="mt-4">
                <label className={labelClass}>
                  {t('expense_field_purpose')}
                  {purposeRequired && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className={inputClass}
                />
              </div>
            )}

            {/* ⑦ 비고 (큰 textarea) */}
            <div className="mt-4">
              <label className={labelClass}>{t('expense_field_memo')}</label>
              <textarea
                rows={5}
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
            onClick={handleCancel}
            disabled={submitting || uploading}
          >
            {t('cancel')}
          </Button>
          <Button
            onClick={() => submitRequest()}
            disabled={!canSubmit || submitting || uploading}
          >
            {t('expense_msg_submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
