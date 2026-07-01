import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Receipt,
  Plus,
  Download,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useI18nStore } from '../../i18n'
import { readCache, writeCache } from '../../lib/erpCache'
import { Button } from '../../components/ui/button'
import { list, get, downloadAttachment } from './expenseApi'
import type { ExpenseRequest, ExpenseStatus } from './expenseTypes'
import ExpenseRequestModal from './ExpenseRequestModal'

function formatYen(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return '¥' + Number(n).toLocaleString('ja-JP')
}

function formatYmd(s?: string | null): string {
  if (!s) return '-'
  return s.slice(0, 10)
}

// 전체 + 신청자 관점 상태들 (design §8.3)
const STATUS_TABS: { key: '' | ExpenseStatus; labelKey: string }[] = [
  { key: '', labelKey: 'education_status_all' },
  { key: 'pending', labelKey: 'expense_status_pending' },
  { key: 'approved', labelKey: 'expense_status_approved' },
  { key: 'paid', labelKey: 'expense_status_paid' },
  { key: 'completed', labelKey: 'expense_status_completed' },
  { key: 'rejected', labelKey: 'expense_status_rejected' },
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

interface ExpenseCache {
  items: ExpenseRequest[]
}

export default function ExpensePage() {
  const { t } = useI18nStore()

  const [statusFilter, setStatusFilter] = useState<'' | ExpenseStatus>('')
  const cacheKey = statusFilter || 'all'
  const initial = readCache<ExpenseCache>('expense', cacheKey)
  const [items, setItems] = useState<ExpenseRequest[]>(initial?.items ?? [])
  const [loading, setLoading] = useState(!initial)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<ExpenseRequest | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  // 리스트 응답에는 attachments/history 가 없어 확장 시 상세(get)를 별도 로드해 행별 캐시.
  const [details, setDetails] = useState<Record<number, ExpenseRequest>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  // 이미지 첨부 인라인 미리보기용 object URL (attachment id 별). 인증 헤더가 필요해 fetch 후 blob URL 사용.
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({})

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

  const loadAll = useCallback(async () => {
    const key = statusFilter || 'all'
    const c = readCache<ExpenseCache>('expense', key)
    if (c) {
      setItems(c.items)
      setLoading(false)
    }
    try {
      setError('')
      const res = await list(statusFilter || undefined)
      setItems(res.items)
      writeCache<ExpenseCache>('expense', key, { items: res.items })
      // 목록 갱신 시 행별 상세 캐시 무효화 (재확장 시 최신 attachments/history 재로드)
      setDetails({})
      // 이미지 미리보기 object URL 도 무효화 (누수 방지)
      setImageUrls((prev) => {
        for (const u of Object.values(prev)) URL.revokeObjectURL(u)
        return {}
      })
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // 언마운트 시 남아 있는 이미지 미리보기 object URL 해제 (누수 방지)
  const imageUrlsRef = useRef(imageUrls)
  imageUrlsRef.current = imageUrls
  useEffect(() => {
    return () => {
      for (const u of Object.values(imageUrlsRef.current)) URL.revokeObjectURL(u)
    }
  }, [])

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="h-6 w-6 text-gray-700" />
            {t('erp_expense')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setEditing(null)
              setShowModal(true)
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('expense_msg_submit')}
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="mb-4 bg-white border border-gray-200 rounded-lg px-3 py-2.5">
        <div className="text-xs text-gray-500 mb-1">{t('education_status_filter')}</div>
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

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">{t('loading')}</div>
        ) : error ? (
          <div className="p-6 text-rose-600 text-sm">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 mb-3">
              <Receipt className="h-7 w-7 text-gray-400" />
            </div>
            <div className="text-gray-900 font-medium">{t('expense_msg_no_items')}</div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((req) => {
              const isExpanded = expandedId === req.id
              const canEdit = req.status === 'draft'
              // 확장 시 상세 로드분을 우선 사용 (attachments/history 포함)
              const detail = details[req.id] ?? req
              const detailLoading = detailLoadingId === req.id
              return (
                <li key={req.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                          {t(`expense_status_${req.status}`)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {t(`expense_item_${req.category}`)}
                        </span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {formatYen(req.amount_incl_tax)}
                        </span>
                        {req.vendor_name && (
                          <span className="text-xs text-gray-500 truncate">
                            @ {req.vendor_name}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('expense_field_used_at')}: {formatYmd(req.used_at)}
                        {req.invoice_number && (
                          <span className="ml-2">
                            {t('expense_field_invoice_number')}: {req.invoice_number}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => {
                            setEditing(req)
                            setShowModal(true)
                          }}
                          className="px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                        >
                          {t('edit')}
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
                            {t('expense_field_settlement')}:{' '}
                          </span>
                          <span className="text-gray-800">
                            {t(`expense_settlement_${req.settlement_type}`)}
                          </span>
                        </div>
                        {req.purpose && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">{t('expense_field_purpose')}: </span>
                            <span className="text-gray-800 whitespace-pre-wrap">{req.purpose}</span>
                          </div>
                        )}
                        {req.memo && (
                          <div className="md:col-span-2">
                            <span className="text-gray-500">{t('expense_field_memo')}: </span>
                            <span className="text-gray-800 whitespace-pre-wrap">{req.memo}</span>
                          </div>
                        )}
                      </div>

                      {detail.reject_reason && (
                        <div className="text-rose-700">
                          {t('expense_msg_reject')}: {detail.reject_reason}
                        </div>
                      )}

                      {detailLoading && (
                        <div className="text-xs text-gray-400 pt-1">
                          {t('loading')}
                        </div>
                      )}

                      {/* Attachments */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="font-medium text-gray-900 mb-1.5">
                          {t('expense_field_invoice_number')}
                        </div>
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
                          {!detailLoading &&
                            (!detail.attachments ||
                              detail.attachments.length === 0) && (
                              <li className="text-xs text-gray-400">
                                {t('education_no_files')}
                              </li>
                            )}
                        </ul>
                      </div>

                      {/* Status history */}
                      {detail.history && detail.history.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <ul className="space-y-0.5 text-xs text-gray-600">
                            {detail.history.map((h) => (
                              <li key={h.id}>
                                {formatYmd(h.created_at)} · {h.from_status ? `${t(`expense_status_${h.from_status}`)} → ` : ''}
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

      <ExpenseRequestModal
        open={showModal}
        editing={editing}
        onClose={() => setShowModal(false)}
        onSubmitted={() => {
          void loadAll()
        }}
      />
    </div>
  )
}
