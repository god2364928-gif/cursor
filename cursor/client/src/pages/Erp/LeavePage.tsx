import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'
import { Button } from '../../components/ui/button'
import { Plus } from 'lucide-react'
import {
  leaveTypeLabel,
  grantTypeLabel,
  statusLabel,
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

export default function LeavePage() {
  const [balance, setBalance] = useState<BalanceRes | null>(null)
  const [grants, setGrants] = useState<Grant[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [b, g, r] = await Promise.all([
        api.get('/vacation/balance'),
        api.get('/vacation/grants'),
        api.get('/vacation/requests'),
      ])
      setBalance(b.data)
      setGrants(g.data)
      setRequests(r.data)
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
    if (!confirm('この申請を取消しますか？')) return
    try {
      await api.delete(`/vacation/requests/${id}`)
      await fetchAll()
    } catch (e: any) {
      alert(e?.response?.data?.error || '取消失敗')
    }
  }

  const dDay = daysUntil(balance?.nextGrantDate)
  const dDayLabel =
    dDay === null ? null : dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-DAY' : `D+${-dDay}`

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">休暇管理</h1>
          {balance && (
            <p className="text-sm text-gray-600 mt-1">
              残り{' '}
              <span className="font-semibold text-gray-900">{balance.remaining}日</span>
              {balance.nextGrantDate && (
                <>
                  {' '}/ 次回付与日{' '}
                  <span className="font-medium text-gray-900">
                    {formatYmd(balance.nextGrantDate)}
                  </span>
                  {dDayLabel && <span className="text-gray-500"> ({dDayLabel})</span>}
                </>
              )}
            </p>
          )}
        </div>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          休暇申請
        </Button>
      </div>

      {/* 의무 5일 취득 알림 */}
      {balance?.mandatory?.applicable && <MandatoryCard m={balance.mandatory} />}

      {/* 통계 4개 (심플 풍이지만 핵심 숫자는 짧게) */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="総付与" value={`${balance.totalGranted}日`} />
          <Stat label="使用" value={`${balance.consumed}日`} />
          <Stat label="承認待ち" value={`${balance.pending}日`} muted />
          <Stat label="残り" value={`${balance.remaining}日`} accent />
        </div>
      )}

      {loading && <div className="text-sm text-gray-400">読み込み中...</div>}

      {/* 부여 내역 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">休暇付与履歴</h2>
          <span className="text-xs text-gray-500">{grants.length}件</span>
        </div>
        {grants.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">付与履歴はまだありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>付与日</Th>
                  <Th>種類</Th>
                  <Th align="right">日数</Th>
                  <Th>有効期限</Th>
                  <Th>備考</Th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => (
                  <tr key={g.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <Td>{formatYmd(g.grant_date)}</Td>
                    <Td>
                      <span className="inline-block px-2 py-0.5 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {grantTypeLabel[g.grant_type] || g.grant_type}
                      </span>
                    </Td>
                    <Td align="right" className="font-semibold">{g.days}日</Td>
                    <Td>{formatYmd(g.expires_at)}</Td>
                    <Td className="text-gray-500">{g.notes || '-'}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 신청 내역 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">申請履歴</h2>
          <span className="text-xs text-gray-500">{requests.length}件</span>
        </div>
        {requests.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">申請履歴はまだありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>期間</Th>
                  <Th>種類</Th>
                  <Th align="right">日数</Th>
                  <Th>状態</Th>
                  <Th>理由</Th>
                  <Th align="right">操作</Th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <Td>
                      {formatYmd(r.start_date)}
                      {r.start_date !== r.end_date && ` ~ ${formatYmd(r.end_date)}`}
                    </Td>
                    <Td>{leaveTypeLabel[r.leave_type] || r.leave_type}</Td>
                    <Td align="right">{r.consumed_days}日</Td>
                    <Td>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded border ${statusColor[r.status]}`}
                      >
                        {statusLabel[r.status]}
                      </span>
                      {r.status === 'rejected' && r.rejected_reason && (
                        <div className="text-[11px] text-red-600 mt-0.5">
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
                          取消
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

function MandatoryCard({ m }: { m: MandatoryStatus }) {
  const completed = m.remaining === 0
  const dDay = m.daysUntilDeadline
  // 위험 수준 판정: 미달성 + 마감 30일 이내
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
    dDay === null ? '' : dDay > 0 ? `D-${dDay}` : dDay === 0 ? 'D-DAY' : `期限超過 +${-dDay}日`

  return (
    <div className={`rounded-xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs font-medium opacity-70">年5日取得義務 (働き方改革関連法)</div>
          <div className="mt-1 text-base font-semibold">
            {completed ? (
              <>✅ 義務達成済み (5日中 {m.used}日 取得)</>
            ) : (
              <>
                残り <span className="text-lg font-bold">{m.remaining}日</span> 取得必要
                <span className="text-sm font-normal opacity-80">
                  {' '}({m.required}日中 {m.used}日完了)
                </span>
              </>
            )}
          </div>
          <div className="text-xs mt-1 opacity-80">
            基準日 {formatYmd(m.baseDate)} → 期限 {formatYmd(m.deadline)}
            {dDayLabel && <span className="ml-2 font-semibold">({dDayLabel})</span>}
          </div>
        </div>
        {!completed && (
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold leading-none">{m.remaining}</div>
            <div className="text-[11px] opacity-80 mt-1">日</div>
          </div>
        )}
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
