import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useI18nStore } from '../../i18n'
import { Button } from '../../components/ui/button'
import {
  Cookie,
  Plus,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react'
import {
  fetchThisWeek,
  fetchMyHistory,
  fetchStats,
  fetchFixedList,
  deleteRequest,
  patchFixed,
  deleteFixed,
  adminMarkOrdered,
  adminRunFixedJob,
  type ThisWeekResponse,
  type MyHistoryResponse,
  type StatsResponse,
  type SnackRequestItem,
  type SnackFixedItem,
} from './snackApi'
import SnackRequestModal from './SnackRequestModal'
import SnackFixedModal from './SnackFixedModal'

// ===== Helpers =====

function formatYen(n: number): string {
  return '¥' + Number(n || 0).toLocaleString('ja-JP')
}

function interpolate(s: string, vars: Record<string, string | number>): string {
  let out = s
  for (const k of Object.keys(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(vars[k]))
  }
  return out
}

function formatYmd(s?: string | null): string {
  if (!s) return '-'
  const d = new Date(s)
  if (isNaN(d.getTime())) return s
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ===== Page =====

export default function SnackRequestPage() {
  const user = useAuthStore((s) => s.user)
  const { t } = useI18nStore()
  const isAdmin = user?.role === 'admin' || user?.role === 'office_assistant'
  const currentUserId = user?.id ? String(user.id) : ''

  const [thisWeek, setThisWeek] = useState<ThisWeekResponse | null>(null)
  const [myHistory, setMyHistory] = useState<MyHistoryResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [fixedList, setFixedList] = useState<SnackFixedItem[]>([])
  const [view, setView] = useState<'thisWeek' | 'myHistory'>('thisWeek')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showFixedModal, setShowFixedModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAll = useCallback(async () => {
    try {
      setError('')
      const [tw, st, fx, mh] = await Promise.all([
        fetchThisWeek(),
        fetchStats(),
        fetchFixedList(),
        fetchMyHistory(),
      ])
      setThisWeek(tw)
      setStats(st)
      setFixedList(fx.items)
      setMyHistory(mh)
    } catch (e: any) {
      setError(e?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // 마감 표시
  function deadlineLabel(): string {
    if (!thisWeek) return ''
    const d = thisWeek.days_until_deadline
    if (d < 0) return t('snack_deadline_passed')
    if (d === 0) return t('snack_deadline_today')
    return interpolate(t('snack_deadline_d_minus'), { n: d })
  }

  function deadlineTone(): string {
    if (!thisWeek) return 'text-gray-500'
    const d = thisWeek.days_until_deadline
    if (d < 0) return 'text-gray-400'
    if (d === 0) return 'text-red-600 font-semibold'
    if (d <= 1) return 'text-orange-600 font-semibold'
    return 'text-gray-600'
  }

  // 주차 표시 (yyyy年 M月 N週目)
  function weekLabel(): string {
    if (!thisWeek?.week_start) return ''
    const d = new Date(thisWeek.week_start)
    if (isNaN(d.getTime())) return ''
    const month = d.getMonth() + 1
    const weekOfMonth = Math.ceil(d.getDate() / 7)
    return `${d.getFullYear()}年 ${month}月 ${weekOfMonth}週目`
  }

  // 액션 핸들러
  async function handleDeleteRequest(id: number) {
    if (!confirm('취소하시겠습니까?')) return
    try {
      await deleteRequest(id)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || 'Error')
    }
  }

  async function handleToggleFixed(item: SnackFixedItem) {
    try {
      await patchFixed(item.id, { active: !item.active })
      await loadAll()
    } catch (e: any) {
      alert(e?.message || 'Error')
    }
  }

  async function handleDeleteFixed(id: number) {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      await deleteFixed(id)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || 'Error')
    }
  }

  async function handleMarkOrdered() {
    if (!confirm(t('snack_admin_mark_ordered') + '?')) return
    try {
      const res = await adminMarkOrdered()
      alert(`${res.ordered_count}件`)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || 'Error')
    }
  }

  async function handleRunCron() {
    try {
      const res = await adminRunFixedJob()
      alert(`Inserted: ${res.inserted}`)
      await loadAll()
    } catch (e: any) {
      alert(e?.message || 'Error')
    }
  }

  // ===== 선택된 리스트 =====
  const currentItems: SnackRequestItem[] =
    view === 'thisWeek' ? thisWeek?.items ?? [] : myHistory?.items ?? []
  const currentTotal =
    view === 'thisWeek'
      ? thisWeek?.total_amount ?? 0
      : myHistory?.total_amount ?? 0
  const currentCount =
    view === 'thisWeek'
      ? thisWeek?.total_count ?? 0
      : myHistory?.total_count ?? 0

  const activeFixedCount = fixedList.filter((f) => f.active).length

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 mt-0.5">
          <Cookie className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('erp_snack_request')}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {weekLabel() && <span className="font-medium">{weekLabel()}</span>}
            {weekLabel() && <span className="mx-1">·</span>}
            {t('snack_subtitle')}
          </p>
        </div>
      </div>

      {/* ===== Error banner ===== */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded">
          {error}
        </div>
      )}

      {/* ===== StatsCards ===== */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500">
            {t('snack_my_monthly_total')}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {stats ? formatYen(stats.my_total_amount) : '-'}
            </div>
            <div className="text-xs text-gray-500">
              {stats
                ? interpolate(t('snack_count_label'), {
                    n: stats.my_total_count,
                  })
                : ''}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="text-xs text-gray-500">
            {t('snack_company_monthly_total')}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {stats ? formatYen(stats.company_total_amount) : '-'}
            </div>
            <div className="text-xs text-gray-500">
              {stats
                ? `${t('snack_per_person_avg')}: ${formatYen(
                    stats.per_person_avg
                  )}`
                : ''}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Fixed Section ===== */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">
              {t('snack_fixed_section')}
            </h2>
            <span className="text-xs text-gray-500">
              {interpolate(t('snack_fixed_active_count'), {
                n: activeFixedCount,
              })}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => setShowFixedModal(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {t('snack_fixed_register')}
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">読込中...</div>
        ) : fixedList.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            {t('snack_empty_fixed')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>申請者</Th>
                  <Th>商品</Th>
                  <Th align="right">単価</Th>
                  <Th align="right">数量</Th>
                  <Th>期間</Th>
                  <Th>状態</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fixedList.map((f) => {
                  const canEdit =
                    isAdmin || (currentUserId && String(f.user_id) === currentUserId)
                  return (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <Td>
                        <div className="text-sm">{f.user_name}</div>
                        {f.department && (
                          <div className="text-xs text-gray-400">
                            {f.department}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <a
                          href={f.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                        >
                          {f.product_name}
                          <ExternalLink className="h-3 w-3 opacity-60" />
                        </a>
                        {f.note && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {f.note}
                          </div>
                        )}
                      </Td>
                      <Td align="right" className="text-sm">
                        {formatYen(f.unit_price)}
                      </Td>
                      <Td align="right" className="text-sm">
                        {f.quantity}
                      </Td>
                      <Td className="text-xs text-gray-600">
                        {formatYmd(f.start_date)}
                        <span className="mx-1 text-gray-400">~</span>
                        {formatYmd(f.end_date)}
                      </Td>
                      <Td>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs ${
                            f.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {f.active ? 'ON' : 'OFF'}
                        </span>
                      </Td>
                      <Td align="right">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              title={f.active ? 'OFF' : 'ON'}
                              onClick={() => handleToggleFixed(f)}
                              className="p-1 text-gray-500 hover:text-gray-800 rounded"
                            >
                              {f.active ? (
                                <ToggleRight className="h-5 w-5" />
                              ) : (
                                <ToggleLeft className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="삭제"
                              onClick={() => handleDeleteFixed(f.id)}
                              className="p-1 text-red-500 hover:text-red-700 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Action Bar ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <SegButton
            active={view === 'thisWeek'}
            onClick={() => setView('thisWeek')}
          >
            {t('snack_this_week_view')}
          </SegButton>
          <SegButton
            active={view === 'myHistory'}
            onClick={() => setView('myHistory')}
          >
            {t('snack_my_history_view')}
          </SegButton>
          {view === 'thisWeek' && (
            <span className={`ml-3 text-xs ${deadlineTone()}`}>
              {deadlineLabel()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowRequestModal(true)}
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            {t('snack_new_request')}
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkOrdered}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {t('snack_admin_mark_ordered')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunCron}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t('snack_admin_run_cron')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ===== Request List ===== */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900">
            {view === 'thisWeek'
              ? t('snack_this_week_view')
              : t('snack_my_history_view')}
          </h2>
          <div className="text-xs text-gray-500 flex items-center gap-3">
            <span>
              {interpolate(t('snack_count_label'), { n: currentCount })}
            </span>
            <span>·</span>
            <span>
              {t('snack_total_label')}{' '}
              <span className="font-semibold text-gray-900">
                {formatYen(currentTotal)}
              </span>
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">読込中...</div>
        ) : currentItems.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            {t('snack_empty_this_week')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <Th>申請者</Th>
                  <Th>Amazon</Th>
                  <Th>商品名</Th>
                  <Th align="right">数量</Th>
                  <Th align="right">金額</Th>
                  <Th>状態</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((it) => {
                  const canCancel =
                    it.status === 'pending' &&
                    (isAdmin ||
                      (currentUserId && String(it.user_id) === currentUserId))
                  return (
                    <tr key={it.id} className="hover:bg-gray-50">
                      <Td>
                        <div className="text-sm">{it.user_name}</div>
                        {it.department && (
                          <div className="text-xs text-gray-400">
                            {it.department}
                          </div>
                        )}
                      </Td>
                      <Td>
                        <a
                          href={it.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline inline-flex items-center gap-1 text-xs"
                          title={t('snack_amazon_link')}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="sr-only">
                            {t('snack_amazon_link')}
                          </span>
                        </a>
                      </Td>
                      <Td>
                        <a
                          href={it.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {it.product_name}
                        </a>
                        {it.note && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {it.note}
                          </div>
                        )}
                        {it.fixed_id && (
                          <div className="text-[10px] text-amber-600 mt-0.5">
                            (定期)
                          </div>
                        )}
                      </Td>
                      <Td align="right" className="text-sm">
                        {it.quantity}
                      </Td>
                      <Td align="right" className="text-sm font-medium">
                        {formatYen(it.total)}
                      </Td>
                      <Td>
                        <StatusBadge status={it.status} />
                      </Td>
                      <Td align="right">
                        {canCancel ? (
                          <button
                            type="button"
                            title="취소"
                            onClick={() => handleDeleteRequest(it.id)}
                            className="p-1 text-red-500 hover:text-red-700 rounded inline-flex"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===== Modals ===== */}
      {showRequestModal && (
        <SnackRequestModal
          open={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          onSubmitted={() => {
            setShowRequestModal(false)
            loadAll()
          }}
          daysUntilDeadline={thisWeek?.days_until_deadline ?? 0}
          nextWeekStart={thisWeek?.week_start}
        />
      )}
      {showFixedModal && (
        <SnackFixedModal
          open={showFixedModal}
          onClose={() => setShowFixedModal(false)}
          onSubmitted={() => {
            setShowFixedModal(false)
            loadAll()
          }}
        />
      )}
    </div>
  )
}

// ===== Sub-components =====

function StatusBadge({ status }: { status: SnackRequestItem['status'] }) {
  const { t } = useI18nStore()
  const map: Record<
    SnackRequestItem['status'],
    { label: string; cls: string }
  > = {
    pending: {
      label: t('snack_status_pending'),
      cls: 'bg-yellow-100 text-yellow-800',
    },
    ordered: {
      label: t('snack_status_ordered'),
      cls: 'bg-green-100 text-green-800',
    },
    cancelled: {
      label: t('snack_status_cancelled'),
      cls: 'bg-gray-100 text-gray-500',
    },
  }
  const m = map[status]
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs ${m.cls}`}>
      {m.label}
    </span>
  )
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
        active
          ? 'bg-gray-900 text-white border-gray-900'
          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode
  align?: 'right'
}) {
  return (
    <th
      className={`px-4 py-2.5 font-medium text-xs uppercase text-gray-600 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  align,
  className,
}: {
  children: React.ReactNode
  align?: 'right'
  className?: string
}) {
  return (
    <td
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''} ${
        className || ''
      }`}
    >
      {children}
    </td>
  )
}
