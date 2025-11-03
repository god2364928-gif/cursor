import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'
import { Button } from '../components/ui/button'

type Summary = {
  total_gross: number
  total_net: number
  total_incentive: number
  total_count: number
  new_count: number
  renew_count: number
  oneoff_count: number
}

type Payment = {
  id: string
  title: string
  payer_name: string
  paid_at: string
  gross_amount_jpy: number
  net_amount_jpy: number
  incentive_amount_jpy: number
  service_name?: string
  manager_name?: string
  type_code?: string
  source_note_url?: string
}

function fmtJPY(n?: number) {
  if (n == null) return '-'
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n)
}

export default function PerformancePage() {
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`
  })
  const [summary, setSummary] = useState<Summary | null>(null)
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<{ managers: { id: string; name: string }[]; services: { id: string; name: string }[]; types: { id: string; code: string; label: string }[] } | null>(null)
  const [managerId, setManagerId] = useState<string>('')
  const [serviceId, setServiceId] = useState<string>('')
  const [typeId, setTypeId] = useState<string>('')

  // 담당자별 매출 합계 계산
  const managerSummary = useMemo(() => {
    const summaryByManager = new Map<string, { name: string; total_gross: number; total_net: number; total_incentive: number; count: number }>()
    
    items.forEach(item => {
      const manager = item.manager_name || '미지정'
      if (!summaryByManager.has(manager)) {
        summaryByManager.set(manager, {
          name: manager,
          total_gross: 0,
          total_net: 0,
          total_incentive: 0,
          count: 0
        })
      }
      
      const current = summaryByManager.get(manager)!
      current.total_gross += Number(item.gross_amount_jpy) || 0
      current.total_net += Number(item.net_amount_jpy) || 0
      current.total_incentive += Number(item.incentive_amount_jpy) || 0
      current.count += 1
    })
    
    return Array.from(summaryByManager.values()).sort((a, b) => b.total_gross - a.total_gross)
  }, [items])

  const period = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    const from = new Date(y, m - 1, 1)
    const to = new Date(y, m, 0)
    return { from: from.toISOString(), to: new Date(to.getTime() + 86399000).toISOString() }
  }, [month])

  async function load() {
    setLoading(true)
    try {
      const s = await api.get('/perf/summary', { params: { month, manager: managerId || undefined, service: serviceId || undefined, type: typeId || undefined } })
      setSummary(s.data)
      const l = await api.get('/perf/list', { params: { from: period.from, to: period.to, pageSize: 50, manager: managerId || undefined, service: serviceId || undefined, type: typeId || undefined } })
      setItems(l.data.items)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, managerId, serviceId, typeId])

  useEffect(() => {
    ;(async () => {
      const r = await api.get('/perf/filters')
      setFilters(r.data)
    })()
  }, [])

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f3f4f6'
    }}>
      <div className="bg-white p-6">
        <div className="space-y-6">
          <div className="border p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="border px-2 py-1 rounded" />
              <select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="border px-2 py-1 rounded">
                <option value="">담당자 전체</option>
                {filters?.managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="border px-2 py-1 rounded">
                <option value="">서비스 전체</option>
                {filters?.services.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className="border px-2 py-1 rounded">
                <option value="">유형 전체</option>
                {filters?.types.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <Button onClick={load} disabled={loading}>Reload</Button>
            </div>
          </div>

      {/* 담당자별 매출 합계 */}
      {managerSummary.length > 0 && (
        <div className="bg-white rounded border p-4">
          <div className="text-lg font-semibold mb-3">담당자별 매출 합계</div>
          <div className="grid grid-cols-4 gap-4">
            {managerSummary.map((manager, idx) => (
              <div key={idx} className="p-3 border rounded">
                <div className="text-sm font-semibold mb-2">{manager.name}</div>
                <div className="text-xs text-gray-500">총액: {fmtJPY(manager.total_gross)}</div>
                <div className="text-xs text-gray-500">순액: {fmtJPY(manager.total_net)}</div>
                <div className="text-xs text-gray-500">인센티브: {fmtJPY(manager.total_incentive)}</div>
                <div className="text-xs text-gray-500 mt-1">건수: {manager.count}건</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded border">
            <div className="text-sm text-gray-500">총액</div>
            <div className="text-xl font-semibold">{fmtJPY(Number(summary.total_gross))}</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-sm text-gray-500">순액</div>
            <div className="text-xl font-semibold">{fmtJPY(Number(summary.total_net))}</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-sm text-gray-500">인센티브</div>
            <div className="text-xl font-semibold">{fmtJPY(Number(summary.total_incentive))}</div>
          </div>
          <div className="p-4 bg-white rounded border">
            <div className="text-sm text-gray-500">건수 (신규/継続/単発)</div>
            <div className="text-xl font-semibold">{summary.total_count} ({summary.new_count}/{summary.renew_count}/{summary.oneoff_count})</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600">
              <th className="p-2 text-left">날짜</th>
              <th className="p-2 text-left">고객</th>
              <th className="p-2 text-left">서비스</th>
              <th className="p-2 text-left">유형</th>
              <th className="p-2 text-left">담당자</th>
              <th className="p-2 text-right">총액</th>
              <th className="p-2 text-right">순액</th>
              <th className="p-2 text-right">인센</th>
              <th className="p-2 text-left">제목</th>
              <th className="p-2 text-left">링크</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t">
                <td className="p-2">{it.paid_at ? new Date(it.paid_at).toLocaleDateString() : ''}</td>
                <td className="p-2">{it.payer_name || ''}</td>
                <td className="p-2">{it.service_name || ''}</td>
                <td className="p-2">{it.type_code || ''}</td>
                <td className="p-2">{it.manager_name || ''}</td>
                <td className="p-2 text-right">{fmtJPY(it.gross_amount_jpy)}</td>
                <td className="p-2 text-right">{fmtJPY(it.net_amount_jpy)}</td>
                <td className="p-2 text-right">{fmtJPY(it.incentive_amount_jpy)}</td>
                <td className="p-2">{it.title || ''}</td>
                <td className="p-2">{it.source_note_url ? <a href={it.source_note_url} className="text-blue-600" target="_blank" rel="noreferrer">link</a> : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
        </div>
      </div>
    </div>
  )
}


