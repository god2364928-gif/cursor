import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Receipt,
  Check,
  X,
  CreditCard,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  FileSpreadsheet,
} from 'lucide-react'
import { useI18nStore } from '../../../i18n'
import { Button } from '../../../components/ui/button'
import {
  adminList,
  adminAction,
  get,
  exportCsv,
  downloadAttachment,
  freeeResend,
  type AdminListFilters,
  type ExpenseAdminAction,
} from '../expenseApi'
import type { ExpenseRequest, ExpenseStatus } from '../expenseTypes'

function formatYen(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return '¥' + Number(n).toLocaleString('ja-JP')
}

function formatYmd(s?: string | null): string {
  if (!s) return '-'
  return s.slice(0, 10)
}

const STATUS_TABS: { key: '' | ExpenseStatus; labelKey: string }[] = [
  { key: 'pending', labelKey: 'expense_status_pending' },
  { key: 'approved', labelKey: 'expense_status_approved' },
  { key: 'payment_pending', labelKey: 'expense_status_payment_pending' },
  { key: 'paid', labelKey: 'expense_status_paid' },
  { key: 'completed', labelKey: 'expense_status_completed' },
  { key: 'rejected', labelKey: 'expense_status_rejected' },
  { key: '', labelKey: 'education_status_all' },
]

function statusColor(s: ExpenseStatus): string {
  switch (s) {
    case 'draft':
      return 'bg-gray-100 text-gray-700'
    case 'awaiting_receipt':
      return 'bg-orange-100 text-orange-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'approved':
      return 'bg-blue-100 text-blue-800'
    case 'payment_pending':
      return 'bg-cyan-100 text-cyan-800'
    case 'paid':
      return 'bg-indigo-100 text-indigo-800'
    case 'completed':
      return 'bg-emerald-100 text-emerald-800'
    case 'recorded':
      return 'bg-teal-100 text-teal-800'
    case 'rejected':
      return 'bg-rose-100 text-rose-800'
    case 'cancelled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

const inputClass =
  'border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'

export default function ExpenseApprovalsPage() {
  const { t } = useI18nStore()
  const [statusFilter, setStatusFilter] = useState<'' | ExpenseStatus>('')
  const [items, setItems] = useState<ExpenseRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  // search filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [vendorSearch, setVendorSearch] = useState('')
  const [minAmount, setMinAmount] = useState<number | ''>('')
  const [maxAmount, setMaxAmount] = useState<number | ''>('')

  // 확장 시 상세(get)로 attachments/history 로드해 행별 캐시 (리스트 응답엔 없음)
  const [details, setDetails] = useState<Record<number, ExpenseRequest>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  // freee 재전송 진행 중인 행 id
  const [freeeResendingId, setFreeeResendingId] = useState<number | null>(null)
  // 이미지 첨부 인라인 미리보기용 object URL (attachment id 별). 인증 헤더가 필요해 fetch 후 blob URL 사용.
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({})

  function currentFilters(): AdminListFilters {
    return {
      status: statusFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
      vendor: vendorSearch.trim() || undefined,
      min_amount: minAmount === '' ? undefined : minAmount,
      max_amount: maxAmount === '' ? undefined : maxAmount,
    }
  }

  // 항상 전달받은 필터로 조회. 미전달 시 상태탭만으로 조회 (탭 전환용).
  // search 버튼은 currentFilters() 를 넘겨 최신 입력값(from/to/vendor/min/max)을 반영 → stale 방지.
  const load = useCallback(async (filters?: AdminListFilters) => {
    try {
      setError('')
      const res = await adminList(filters)
      setItems(res.items)
      // 목록 갱신 시 행별 상세 캐시 무효화 (재확장 시 최신값 재로드)
      setDetails({})
      // 이미지 미리보기 object URL 도 무효화 (누수 방지)
      setImageUrls((prev) => {
        for (const u of Object.values(prev)) URL.revokeObjectURL(u)
        return {}
      })
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // 상태탭 변경 시 재조회. 검색 입력값은 stale 방지를 위해 여기서 직접 읽지 않음.
  useEffect(() => {
    void load({ status: statusFilter || undefined })
  }, [statusFilter, load])

  // 언마운트 시 남아 있는 이미지 미리보기 object URL 해제 (누수 방지)
  const imageUrlsRef = useRef(imageUrls)
  imageUrlsRef.current = imageUrls
  useEffect(() => {
    return () => {
      for (const u of Object.values(imageUrlsRef.current)) URL.revokeObjectURL(u)
    }
  }, [])

  // 이미지 첨부의 인라인 미리보기 object URL 확보 (중복 fetch 방지)
  const loadImagePreviews = useCallback((full: ExpenseRequest) => {
    for (const att of full.attachments || []) {
      if (!att.mime_type?.startsWith('image/')) continue
      setImageUrls((prev) => {
        if (prev[att.id]) return prev
        void downloadAttachment(att.id)
          .then((url) => setImageUrls((m) => (m[att.id] ? m : { ...m, [att.id]: url })))
          .catch(() => {})
        return prev
      })
    }
  }, [])

  async function onToggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (details[id]) {
      loadImagePreviews(details[id])
    } else {
      setDetailLoadingId(id)
      try {
        const full = await get(id)
        setDetails((m) => ({ ...m, [id]: full }))
        loadImagePreviews(full)
      } catch {
        /* 상세 로드 실패 시 기본 행만 표시 */
      } finally {
        setDetailLoadingId((cur) => (cur === id ? null : cur))
      }
    }
  }

  // resend 후 해당 행의 상세를 재조회해 freee_receipt_id/ocr_status/freee_error 최신화
  async function refreshDetail(id: number) {
    try {
      const full = await get(id)
      setDetails((m) => ({ ...m, [id]: full }))
      loadImagePreviews(full)
    } catch {
      /* 재조회 실패 시 기존 캐시 유지 */
    }
  }

  async function onFreeeResend(req: ExpenseRequest) {
    setFreeeResendingId(req.id)
    try {
      const result = await freeeResend(req.id)
      if (result.receipt_id) {
        alert(
          `freee 업로드 성공 (#${result.receipt_id})` +
            (result.already ? ' · 이미 업로드됨' : '')
        )
      } else if (result.error) {
        alert(`freee 업로드 오류: ${result.error}`)
      } else {
        alert('freee 재전송 완료 (영수증 없음)')
      }
    } catch (e: any) {
      alert(e?.message || 'freee 재전송 실패')
    } finally {
      // 성공/실패와 무관하게 상세 재조회로 상태 블록 갱신
      await refreshDetail(req.id)
      setFreeeResendingId(null)
    }
  }

  async function act(req: ExpenseRequest, action: ExpenseAdminAction) {
    setBusyId(req.id)
    try {
      const extra: Record<string, unknown> = {}
      if (action === 'reject') {
        const r = prompt(t('expense_msg_reject'))
        if (r === null) return
        extra.reject_reason = r
      } else if (action === 'mark_paid') {
        const v = prompt(t('expense_msg_mark_paid'), String(req.amount_incl_tax))
        if (v === null) return
        const n = Number(v)
        if (!Number.isFinite(n) || n < 0) {
          alert(t('expense_admin_invalid_amount'))
          return
        }
        extra.paid_amount = Math.round(n)
      }
      await adminAction(req.id, action, extra as any)
      // 현재 화면의 필터(상태·검색조건)를 유지한 채 재조회
      await load(currentFilters())
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setBusyId(null)
    }
  }

  async function onDownload(attachmentId: number, fileName: string) {
    try {
      const url = await downloadAttachment(attachmentId)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e: any) {
      alert(e?.message || 'Download failed')
    }
  }

  async function onExportCsv() {
    try {
      const url = await exportCsv(currentFilters())
      const a = document.createElement('a')
      a.href = url
      a.download = `expense_export_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } catch (e: any) {
      alert(e?.message || 'Export failed')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-gray-700" />
            {t('erp_expense_admin')}
          </h1>
        </div>
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <FileSpreadsheet className="h-4 w-4 mr-1" />
          CSV
        </Button>
      </div>

      {/* status tabs */}
      <div className="mb-3 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key || 'all'}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                statusFilter === tab.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* search filters */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex flex-wrap items-end gap-2">
        <div>
          <div className="text-xs text-gray-500 mb-0.5">{t('expense_field_used_at')}</div>
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={inputClass}
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-0.5">{t('expense_field_vendor')}</div>
          <input
            type="text"
            value={vendorSearch}
            onChange={(e) => setVendorSearch(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-0.5">{t('expense_field_amount')}</div>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={minAmount}
              onChange={(e) =>
                setMinAmount(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`${inputClass} w-24`}
              placeholder="min"
            />
            <span className="text-gray-400">~</span>
            <input
              type="number"
              value={maxAmount}
              onChange={(e) =>
                setMaxAmount(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={`${inputClass} w-24`}
              placeholder="max"
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(currentFilters())}
        >
          <Search className="h-4 w-4 mr-1" />
          {t('expense_admin_search')}
        </Button>
      </div>

      {/* list */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">{t('loading')}</div>
        ) : error ? (
          <div className="p-6 text-rose-600 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            {t('expense_msg_no_items')}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((req) => {
              const isExpanded = expandedId === req.id
              // 확장 시 상세 로드분 우선 (attachments/history 포함)
              const detail = details[req.id] ?? req
              const detailLoading = detailLoadingId === req.id
              return (
                <li key={req.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                          {t(`expense_status_${req.status}`)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {t(`expense_item_${req.category}`)}
                        </span>
                        {req.invoice_number && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {req.invoice_number}
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {formatYen(req.amount_incl_tax)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {req.user_name}
                        {req.department ? ` · ${req.department}` : ''} ·{' '}
                        {formatYmd(req.used_at)}
                        {req.vendor_name ? ` · ${req.vendor_name}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      {req.status === 'pending' && (
                        <>
                          <button
                            disabled={busyId === req.id}
                            onClick={() => act(req, 'approve')}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            {t('expense_msg_approve')}
                          </button>
                          <button
                            disabled={busyId === req.id}
                            onClick={() => act(req, 'reject')}
                            className="px-2 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700 inline-flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            {t('expense_msg_reject')}
                          </button>
                        </>
                      )}
                      {(req.status === 'approved' ||
                        req.status === 'payment_pending') && (
                        <button
                          disabled={busyId === req.id}
                          onClick={() => act(req, 'mark_paid')}
                          className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 inline-flex items-center gap-1"
                        >
                          <CreditCard className="h-3 w-3" />
                          {t('expense_msg_mark_paid')}
                        </button>
                      )}
                      {req.status !== 'pending' && (
                        <button
                          disabled={busyId === req.id}
                          onClick={() => act(req, 'reopen')}
                          className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 inline-flex items-center gap-1"
                          title="reopen"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        onClick={() => void onToggleExpand(req.id)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 ml-1 bg-gray-50 border border-gray-200 rounded p-3 text-sm space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <div>
                          <span className="text-gray-500">
                            {t('expense_field_tax_rate')}:{' '}
                          </span>
                          <span className="text-gray-800">{req.tax_rate}%</span>
                        </div>
                        <div>
                          <span className="text-gray-500">
                            {t('expense_settlement_reimburse_required').split('(')[0].trim()}:{' '}
                          </span>
                          <span className="text-gray-800">
                            {t(`expense_settlement_${req.settlement_type}`)}
                          </span>
                        </div>
                        {req.purpose && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">{t('expense_field_purpose')}: </span>
                            <span className="text-gray-800">{req.purpose}</span>
                          </div>
                        )}
                        {req.memo && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">{t('expense_field_memo')}: </span>
                            <span className="text-gray-800">{req.memo}</span>
                          </div>
                        )}
                      </div>

                      {detail.reject_reason && (
                        <div className="text-rose-700">
                          {t('expense_msg_reject')}: {detail.reject_reason}
                        </div>
                      )}

                      {/* freee 파일박스 업로드 상태 + 재전송 (진단용) */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-xs">
                            {detail.freee_receipt_id ? (
                              <span className="text-emerald-700">
                                ✅ freee 파일박스 업로드됨 (#{detail.freee_receipt_id})
                                {detail.ocr_status
                                  ? ` · OCR: ${detail.ocr_status}`
                                  : ''}
                              </span>
                            ) : detail.freee_error ? (
                              <span className="text-rose-700">
                                ⚠️ freee 업로드 오류: {detail.freee_error}
                              </span>
                            ) : (
                              <span className="text-gray-500">freee 미업로드</span>
                            )}
                          </div>
                          <button
                            disabled={freeeResendingId === req.id}
                            onClick={() => void onFreeeResend(req)}
                            className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            {freeeResendingId === req.id ? '재전송 중…' : 'freee 재전송'}
                          </button>
                        </div>
                      </div>

                      {/* attachments (receipt preview/download) */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="font-medium text-gray-900 mb-1.5">
                          {t('expense_field_invoice_number')}
                        </div>
                        {detailLoading ? (
                          <div className="text-xs text-gray-400">{t('loading')}</div>
                        ) : (
                          <ul className="space-y-2">
                            {(detail.attachments || []).map((att) => {
                              const isImage = att.mime_type?.startsWith('image/')
                              const previewUrl = imageUrls[att.id]
                              return (
                                <li key={att.id} className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-700 truncate">
                                      {att.file_name} · {(att.file_size / 1024).toFixed(1)} KB
                                    </span>
                                    <button
                                      onClick={() => onDownload(att.id, att.file_name)}
                                      className="p-1 text-gray-500 hover:text-blue-600"
                                      title={t('education_download')}
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  {isImage && previewUrl && (
                                    <a
                                      href={previewUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <img
                                        src={previewUrl}
                                        alt={att.file_name}
                                        className="max-h-64 rounded border object-contain"
                                      />
                                    </a>
                                  )}
                                </li>
                              )
                            })}
                            {(!detail.attachments ||
                              detail.attachments.length === 0) && (
                              <li className="text-xs text-gray-400">
                                {t('education_no_files')}
                              </li>
                            )}
                          </ul>
                        )}
                      </div>

                      {/* status history */}
                      {detail.history && detail.history.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <ul className="space-y-0.5 text-xs text-gray-600">
                            {detail.history.map((h) => (
                              <li key={h.id}>
                                {formatYmd(h.created_at)} ·{' '}
                                {h.from_status
                                  ? `${t(`expense_status_${h.from_status}`)} → `
                                  : ''}
                                {t(`expense_status_${h.to_status}`)}
                                {h.reason ? ` · ${h.reason}` : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
