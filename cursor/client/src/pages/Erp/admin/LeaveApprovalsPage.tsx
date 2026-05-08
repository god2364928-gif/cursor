import { useEffect, useState, useCallback } from 'react'
import api from '../../../lib/api'
import { Button } from '../../../components/ui/button'
import { Check, X } from 'lucide-react'
import {
  leaveTypeLabel,
  statusLabel,
  statusColor,
  formatYmd,
  type LeaveType,
  type RequestStatus,
} from '../leaveLabels'

interface Req {
  id: number
  user_id: number
  user_name: string
  department: string | null
  team: string | null
  start_date: string
  end_date: string
  leave_type: LeaveType
  consumed_days: number
  status: RequestStatus
  reason: string | null
  rejected_reason: string | null
  approved_at: string | null
  created_at: string
}

type StatusFilter = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all'

export default function LeaveApprovalsPage() {
  const [items, setItems] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<StatusFilter>('pending')
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = {}
      if (filter !== 'all') params.status = filter
      const res = await api.get('/admin/vacation/requests', { params })
      setItems(res.data)
    } catch (e) {
      console.error('approvals fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const approve = async (id: number) => {
    if (!confirm('この申請を承認しますか？')) return
    try {
      await api.post(`/admin/vacation/requests/${id}/approve`)
      await fetchData()
    } catch (e: any) {
      alert(e?.response?.data?.error || '承認失敗')
    }
  }

  const submitReject = async () => {
    if (!rejectingId) return
    if (!rejectReason.trim()) {
      alert('却下理由を入力してください')
      return
    }
    try {
      await api.post(`/admin/vacation/requests/${rejectingId}/reject`, {
        reason: rejectReason,
      })
      setRejectingId(null)
      setRejectReason('')
      await fetchData()
    } catch (e: any) {
      alert(e?.response?.data?.error || '却下失敗')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">申請処理</h1>
          <p className="text-sm text-gray-500 mt-1">休暇申請の承認・却下を行います。</p>
        </div>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-sm">
          {(['pending', 'approved', 'rejected', 'cancelled', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 border-l first:border-l-0 border-gray-200 ${
                filter === s ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s === 'all' ? '全て' : statusLabel[s as RequestStatus]}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-sm text-gray-400">読み込み中...</div>}

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">該当する申請はありません。</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">申請日</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">氏名</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">部署</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">期間</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">種類</th>
                  <th className="px-4 py-2.5 text-right font-medium text-xs">日数</th>
                  <th className="px-4 py-2.5 text-left font-medium text-xs">状態 / 理由</th>
                  <th className="px-4 py-2.5 text-right font-medium text-xs">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50 align-top">
                    <td className="px-4 py-3 text-gray-500">{formatYmd(r.created_at)}</td>
                    <td className="px-4 py-3 font-medium">{r.user_name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.department || r.team || '-'}</td>
                    <td className="px-4 py-3">
                      {formatYmd(r.start_date)}
                      {r.start_date !== r.end_date && ` ~ ${formatYmd(r.end_date)}`}
                    </td>
                    <td className="px-4 py-3">{leaveTypeLabel[r.leave_type]}</td>
                    <td className="px-4 py-3 text-right">{r.consumed_days}日</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded border ${statusColor[r.status]}`}>
                        {statusLabel[r.status]}
                      </span>
                      {r.reason && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs">
                          理由: {r.reason}
                        </div>
                      )}
                      {r.status === 'rejected' && r.rejected_reason && (
                        <div className="text-xs text-red-600 mt-1 max-w-xs">
                          却下: {r.rejected_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => approve(r.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="h-3 w-3" />
                            承認
                          </button>
                          <button
                            onClick={() => {
                              setRejectingId(r.id)
                              setRejectReason('')
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                            却下
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 반려 사유 모달 */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">却下理由</h2>
            </div>
            <div className="p-6 space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                placeholder="却下理由を記入してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRejectingId(null)}>
                  キャンセル
                </Button>
                <Button onClick={submitReject} className="bg-red-600 hover:bg-red-700">
                  却下する
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
