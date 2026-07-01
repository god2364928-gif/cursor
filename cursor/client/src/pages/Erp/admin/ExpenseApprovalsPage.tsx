import { useCallback, useEffect, useState } from 'react'
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
  Plus,
  Trash2,
} from 'lucide-react'
import { useI18nStore } from '../../../i18n'
import { Button } from '../../../components/ui/button'
import {
  adminList,
  adminAction,
  exportCsv,
  downloadAttachment,
  listSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getAccountItems,
  getMap,
  putMap,
  type AdminListFilters,
  type ExpenseAdminAction,
} from '../expenseApi'
import type {
  ExpenseRequest,
  ExpenseStatus,
  ExpenseSubscription,
  ExpenseFreeeMap,
  FreeeAccountItem,
} from '../expenseTypes'

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
  { key: 'awaiting_receipt', labelKey: 'expense_status_awaiting_receipt' },
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
  const [statusFilter, setStatusFilter] = useState<'' | ExpenseStatus>('pending')
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

  // editable account/tax per row (frejust before approve)
  const [editAccount, setEditAccount] = useState<Record<number, number | ''>>({})
  const [editTax, setEditTax] = useState<Record<number, number | ''>>({})

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

  const load = useCallback(async () => {
    try {
      setError('')
      const res = await adminList(currentFilters())
      setItems(res.items)
    } catch (e: any) {
      setError(e?.message || 'Failed')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

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
      } else if (action === 'approve') {
        const acc = editAccount[req.id]
        const tax = editTax[req.id]
        if (acc !== undefined && acc !== '') extra.account_item_id = acc
        if (tax !== undefined && tax !== '') extra.tax_code = tax
      }
      const updated = await adminAction(req.id, action, extra as any)
      // freee 반영 실패 시 서버가 freee_error를 반환할 수 있음
      if ((updated as any).freee_error) {
        alert(`freee: ${(updated as any).freee_error}`)
      }
      await load()
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
        <Button variant="outline" size="sm" onClick={() => void load()}>
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
              const freeeReflected = !!req.freee_deal_id
              return (
                <li key={req.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(req.status)}`}>
                          {t(`expense_status_${req.status}`)}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                          {t(`expense_category_${req.category}`)}
                        </span>
                        {req.invoice_number && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {req.invoice_number}
                          </span>
                        )}
                        {freeeReflected && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            freee ✓
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
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
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

                      {/* editable account_item / tax_code */}
                      {req.status === 'pending' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-gray-200">
                          <div>
                            <label className="text-xs text-gray-500 block mb-0.5">
                              account_item_id (freee)
                            </label>
                            <input
                              type="number"
                              value={
                                editAccount[req.id] ??
                                (req.account_item_id ?? '')
                              }
                              onChange={(e) =>
                                setEditAccount((m) => ({
                                  ...m,
                                  [req.id]:
                                    e.target.value === ''
                                      ? ''
                                      : Number(e.target.value),
                                }))
                              }
                              className={`${inputClass} w-full`}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-0.5">
                              tax_code (freee)
                            </label>
                            <input
                              type="number"
                              value={editTax[req.id] ?? (req.tax_code ?? '')}
                              onChange={(e) =>
                                setEditTax((m) => ({
                                  ...m,
                                  [req.id]:
                                    e.target.value === ''
                                      ? ''
                                      : Number(e.target.value),
                                }))
                              }
                              className={`${inputClass} w-full`}
                            />
                          </div>
                        </div>
                      )}

                      {req.reject_reason && (
                        <div className="text-rose-700">
                          {t('expense_msg_reject')}: {req.reject_reason}
                        </div>
                      )}

                      {/* attachments (receipt preview/download) */}
                      <div className="pt-2 border-t border-gray-200">
                        <div className="font-medium text-gray-900 mb-1.5">
                          {t('expense_field_invoice_number')}
                        </div>
                        <ul className="space-y-1">
                          {(req.attachments || []).map((att) => (
                            <li
                              key={att.id}
                              className="flex items-center justify-between text-xs"
                            >
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
                            </li>
                          ))}
                          {(!req.attachments || req.attachments.length === 0) && (
                            <li className="text-xs text-gray-400">
                              {t('education_no_files')}
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* status history */}
                      {req.history && req.history.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <ul className="space-y-0.5 text-xs text-gray-600">
                            {req.history.map((h) => (
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

      {/* secondary sections */}
      <SubscriptionsSection />
      <FreeeMapSection />
    </div>
  )
}

// ============================================================
// 정기결제 마스터 관리 (collapsible)
// ============================================================
function SubscriptionsSection() {
  const { t } = useI18nStore()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<ExpenseSubscription[]>([])
  const [loading, setLoading] = useState(false)
  const [serviceName, setServiceName] = useState('')
  const [cardLabel, setCardLabel] = useState('')
  const [billingDay, setBillingDay] = useState<number>(1)
  const [amount, setAmount] = useState<number | ''>('')
  const [cycle, setCycle] = useState<'month' | 'year'>('month')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listSubscriptions()
      setItems(res.items)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  async function onCreate() {
    if (!serviceName.trim() || busy) return
    setBusy(true)
    try {
      await createSubscription({
        service_name: serviceName.trim(),
        card_label: cardLabel.trim() || null,
        billing_day: billingDay,
        amount: amount === '' ? null : amount,
        cycle,
      })
      setServiceName('')
      setCardLabel('')
      setAmount('')
      setBillingDay(1)
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  async function onToggleActive(sub: ExpenseSubscription) {
    try {
      await updateSubscription(sub.id, { active: !sub.active })
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  async function onDelete(id: number) {
    if (!confirm(t('expense_admin_confirm_delete'))) return
    try {
      await deleteSubscription(id)
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-gray-900">
          {t('expense_category_corp_card')} — {t('expense_admin_subscription_master')}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{t('expense_field_service_name')}</div>
              <input
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{t('expense_field_card_label')}</div>
              <input
                value={cardLabel}
                onChange={(e) => setCardLabel(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{t('expense_admin_billing_day')}</div>
              <input
                type="number"
                min={1}
                max={31}
                value={billingDay}
                onChange={(e) => setBillingDay(Number(e.target.value) || 1)}
                className={`${inputClass} w-20`}
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">{t('expense_admin_cycle')}</div>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value as 'month' | 'year')}
                className={inputClass}
              >
                <option value="month">{t('expense_admin_cycle_month')}</option>
                <option value="year">{t('expense_admin_cycle_year')}</option>
              </select>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5">
                {t('expense_field_amount')}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) =>
                  setAmount(e.target.value === '' ? '' : Number(e.target.value))
                }
                className={`${inputClass} w-28`}
              />
            </div>
            <Button size="sm" onClick={onCreate} disabled={busy}>
              <Plus className="h-4 w-4 mr-1" />
              {t('expense_admin_add')}
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">{t('loading')}</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {items.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-900">
                      {sub.service_name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {sub.card_label ? `${sub.card_label} · ` : ''}
                      {sub.cycle === 'month'
                        ? t('expense_admin_cycle_monthly')
                        : t('expense_admin_cycle_yearly')}{' '}
                      {sub.billing_day}
                      {t('expense_admin_day_suffix')} ·{' '}
                      {formatYen(sub.amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleActive(sub)}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        sub.active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {sub.active ? t('expense_admin_active') : t('expense_admin_inactive')}
                    </button>
                    <button
                      onClick={() => onDelete(sub.id)}
                      className="p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
              {items.length === 0 && (
                <li className="py-2 text-xs text-gray-400">—</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// freee 매핑 마스터 (collapsible)
// ============================================================
interface MapRow {
  category: string
  subtype: string
  account_item_id: number | ''
  account_item_name: string
}

function FreeeMapSection() {
  const { t } = useI18nStore()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<MapRow[]>([])
  const [accountItems, setAccountItems] = useState<FreeeAccountItem[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mapRes, accRes] = await Promise.all([getMap(), getAccountItems()])
      setRows(
        mapRes.items.map((m: ExpenseFreeeMap) => ({
          category: m.category,
          subtype: m.subtype || '',
          account_item_id: m.account_item_id,
          account_item_name: m.account_item_name || '',
        }))
      )
      setAccountItems(accRes.items)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  function addRow() {
    setRows((r) => [
      ...r,
      { category: 'meal', subtype: '', account_item_id: '', account_item_name: '' },
    ])
  }

  function updateRow(idx: number, patch: Partial<MapRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)))
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx))
  }

  async function save() {
    setBusy(true)
    try {
      const payload = rows
        .filter((r) => r.category && r.account_item_id !== '')
        .map((r) => ({
          category: r.category,
          subtype: r.subtype.trim() || null,
          account_item_id: r.account_item_id as number,
          account_item_name:
            accountItems.find((a) => a.id === r.account_item_id)?.name ||
            r.account_item_name ||
            null,
        }))
      await putMap(payload)
      await load()
    } catch (e: any) {
      alert(e?.message || 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-gray-900">{t('expense_admin_freee_mapping')}</span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
          {loading ? (
            <div className="text-sm text-gray-500">{t('loading')}</div>
          ) : (
            <>
              <ul className="space-y-2">
                {rows.map((row, idx) => (
                  <li key={idx} className="flex flex-wrap items-center gap-2">
                    <select
                      value={row.category}
                      onChange={(e) => updateRow(idx, { category: e.target.value })}
                      className={inputClass}
                    >
                      <option value="transport">
                        {t('expense_category_transport')}
                      </option>
                      <option value="meal">{t('expense_category_meal')}</option>
                      <option value="reimburse">
                        {t('expense_category_reimburse')}
                      </option>
                      <option value="corp_card">
                        {t('expense_category_corp_card')}
                      </option>
                    </select>
                    <input
                      value={row.subtype}
                      onChange={(e) => updateRow(idx, { subtype: e.target.value })}
                      placeholder={t('expense_admin_subtype_placeholder')}
                      className={inputClass}
                    />
                    <select
                      value={row.account_item_id}
                      onChange={(e) =>
                        updateRow(idx, {
                          account_item_id:
                            e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className={`${inputClass} min-w-[12rem]`}
                    >
                      <option value="">{t('expense_admin_select_account_item')}</option>
                      {accountItems.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeRow(idx)}
                      className="p-1 text-gray-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('expense_admin_add_row')}
                </Button>
                <Button size="sm" onClick={save} disabled={busy}>
                  {t('expense_admin_save')}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
