import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import { readCache, writeCache } from '../../lib/erpCache'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'
import {
  useLeaveLabels,
  statusColor,
  formatYmd,
  daysUntil,
  type LeaveType,
  type GrantType,
  type RequestStatus,
} from './leaveLabels'
import LeaveRequestModal from './LeaveRequestModal'

interface MandatoryStatus {
  applicable: boolean
  required: number
  used: number
  remaining: number
  baseDate: string | null
  deadline: string | null
  daysUntilDeadline: number | null
}

interface BalanceRes {
  totalGranted: number
  consumed: number
  expired: number
  pending: number
  remaining: number
  hireDate: string | null
  firstGrantDate: string | null
  nextGrantDate: string | null
  mandatory?: MandatoryStatus
}

interface Grant {
  id: number
  grant_date: string
  expires_at: string
  days: number
  grant_type: GrantType
  service_years_at_grant: number | null
  notes: string | null
}

interface LeaveRequest {
  id: number
  start_date: string
  end_date: string
  leave_type: LeaveType
  consumed_days: number
  status: RequestStatus
  reason: string | null
  rejected_reason: string | null
  created_at: string
}

interface LeaveCache {
  balance: BalanceRes | null
  grants: Grant[]
  requests: LeaveRequest[]
}

export default function LeavePage() {
  const { t, leaveTypeLabel, grantTypeLabel, statusLabel } = useLeaveLabels()
  const cached = readCache<LeaveCache>('leave')
  const [balance, setBalance] = useState<BalanceRes | null>(cached?.balance ?? null)
  const [grants, setGrants] = useState<Grant[]>(cached?.grants ?? [])
  const [requests, setRequests] = useState<LeaveRequest[]>(cached?.requests ?? [])
  const [loading, setLoading] = useState(!cached)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [b, g, r] = await Promise.all([
        api.get('/vacation/balance'),
        api.get('/vacation/grants'),
        api.get('/vacation/requests'),
      ])
      setBalance(b.data)
      setGrants(g.data)
      setRequests(r.data)
      writeCache<LeaveCache>('leave', '_', {
        balance: b.data,
        grants: g.data,
        requests: r.data,
      })
    } catch (e) {
      console.error('vacation fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const cancelRequest = async (id: number) => {
    if (!confirm(t('confirm_cancel_request'))) return
    try {
      await api.delete(`/vacation/requests/${id}`)
      await fetchAll()
    } catch (e: any) {
      alert(e?.response?.data?.error || t('err_cancel_failed'))
    }
  }

  const dDay = daysUntil(balance?.nextGrantDate)
  const dDayLabel =
    dDay === null ? null : dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-DAY' : `D+${-dDay}`

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('erp_leave_mgmt')}</h1>
          <p className="text-sm text-gray-600 mt-1 min-h-[20px]">
            {balance ? (
              <>
                {t('leave_remaining')}{' '}
                <span className="font-semibold text-gray-900">{balance.remaining}{t('unit_day')}</span>
                {balance.nextGrantDate && (
                  <>
                    {' '}/ {t('leave_next_grant')}{' '}
                    <span className="font-medium text-gray-900">
                      {formatYmd(balance.nextGrantDate)}
                    </span>
                    {dDayLabel && <span className="text-gray-500"> ({dDayLabel})</span>}
                  </>
                )}
              </>
            ) : (
              <span className="text-gray-400">{t('loading_short')}</span>
            )}
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('leave_apply_btn')}
        </Button>
      </div>

      {balance?.mandatory?.applicable && <MandatoryCard m={balance.mandatory} t={t} />}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label={t('leave_total_granted')} value={balance ? `${balance.totalGranted}${t('unit_day')}` : '-'} />
        <Stat label={t('leave_used')} value={balance ? `${balance.consumed}${t('unit_day')}` : '-'} />
        <Stat label={t('leave_expired')} value={balance ? `${balance.expired}${t('unit_day')}` : '-'} muted />
        <Stat label={t('status_pending')} value={balance ? `${balance.pending}${t('unit_day')}` : '-'} muted />
        <Stat label={t('leave_remaining')} value={balance ? `${balance.remaining}${t('unit_day')}` : '-'} accent />
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{t('leave_grant_history')}</h2>
          <span className="text-xs text-gray-500">{grants.length}{t('unit_count')}</span>
        </div>
        {loading || grants.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            {loading ? t('loading_short') : t('empty_grants')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>{t('col_grant_date')}</Th>
                  <Th>{t('col_type')}</Th>
                  <Th align="right">{t('col_days')}</Th>
                  <Th>{t('col_expires')}</Th>
                  <Th>{t('col_notes')}</Th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <Td>{formatYmd(g.grant_date)}</Td>
                    <Td>
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {grantTypeLabel(g.grant_type)}
                      </span>
                    </Td>
                    <Td align="right" className="font-semibold">{g.days}{t('unit_day')}</Td>
                    <Td>{formatYmd(g.expires_at)}</Td>
                    <Td className="text-gray-500">{g.notes || '-'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{t('leave_request_history')}</h2>
          <span className="text-xs text-gray-500">{requests.length}{t('unit_count')}</span>
        </div>
        {loading || requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            {loading ? t('loading_short') : t('empty_requests')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>{t('col_period')}</Th>
                  <Th>{t('col_type')}</Th>
                  <Th align="right">{t('col_days')}</Th>
                  <Th>{t('col_status')}</Th>
                  <Th>{t('col_reason')}</Th>
                  <Th align="right">{t('col_actions')}</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <Td>
                      {formatYmd(r.start_date)}
                      {r.start_date !== r.end_date && ` ~ ${formatYmd(r.end_date)}`}
                    </Td>
                    <Td>{leaveTypeLabel(r.leave_type)}</Td>
                    <Td align="right">{r.consumed_days}{t('unit_day')}</Td>
                    <Td>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded border ${statusColor[r.status]}`}
                      >
                        {statusLabel(r.status)}
                      </span>
                      {(r.status === 'rejected' || r.status === 'cancelled') && r.rejected_reason && (
                        <div className={`text-[11px] mt-0.5 ${r.status === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>
                          {r.rejected_reason}
                        </div>
                      )}
                    </Td>
                    <Td className="text-gray-500 max-w-xs truncate">{r.reason || '-'}</Td>
                    <Td align="right">
                      {r.status === 'pending' ? (
                        <button
                          onClick={() => cancelRequest(r.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          {t('btn_cancel_short')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LeaveRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitted={() => {
          setModalOpen(false)
          fetchAll()
        }}
        currentRemaining={balance?.remaining ?? 0}
      />
    </div>
  )
}

function MandatoryCard({ m, t }: { m: MandatoryStatus; t: (k: string) => string }) {
  const completed = m.remaining === 0
  const dDay = m.daysUntilDeadline
  const danger = !completed && dDay !== null && dDay <= 30
  const warning = !completed && dDay !== null && dDay > 30 && dDay <= 90
  const tone = completed
    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
    : danger
      ? 'bg-red-50 border-red-300 text-red-800'
      : warning
        ? 'bg-amber-50 border-amber-200 text-amber-800'
        : 'bg-blue-50 border-blue-200 text-blue-800'

  const dDayLabel =
    dDay === null ? '' : dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-DAY' : `${t('mandatory_overdue')} +${-dDay}${t('unit_day')}`

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="text-xs font-medium opacity-70">{t('mandatory_title')}</div>
      <div className="mt-1 text-base font-semibold">
        {completed ? (
          <>✅ {t('mandatory_done')} ({m.required}{t('unit_day')}{t('mandatory_summary_in')} {m.used}{t('unit_day')})</>
        ) : (
          <>
            {t('leave_remaining')} <span className="text-lg font-bold">{m.remaining}{t('unit_day')}</span> {t('mandatory_remaining_text')}
            <span className="text-sm font-normal opacity-80">
              {' '}({m.required}{t('unit_day')}{t('mandatory_summary_in')} {m.used}{t('mandatory_summary_completed')})
            </span>
          </>
        )}
      </div>
      <div className="text-xs mt-1 opacity-80">
        {t('mandatory_base_date')} {formatYmd(m.baseDate)} → {t('mandatory_deadline')} {formatYmd(m.deadline)}
        {dDayLabel && <span className="ml-2 font-semibold">({dDayLabel})</span>}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string
  value: string
  accent?: boolean
  muted?: boolean
}) {
  return (
    <div
      className={`bg-white rounded-lg border p-4 ${
        accent ? 'border-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="text-xs text-gray-500">{label}</div>
      <div
        className={`text-xl font-bold mt-1 ${
          accent ? 'text-blue-700' : muted ? 'text-amber-700' : 'text-gray-900'
        }`}
      >
        {value}
      </div>
    </div>
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
      className={`px-4 py-2.5 font-medium text-xs ${
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
      className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''} ${className || ''}`}
    >
      {children}
    </td>
  )
}
