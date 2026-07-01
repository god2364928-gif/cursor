import { useCallback, useEffect, useRef, useState } from 'react'
import { readCache, writeCache } from '../../lib/erpCache'
import { pendingSummary } from './expenseApi'
import type { PendingSummary } from './expenseTypes'

// design §7: ERP 진입 시 1회 fetch + 5분 폴링, erpCache로 깜빡임 방지.
// ExpensePage 배너(my_awaiting_receipt) 및 (추후) 네비 뱃지에서 사용.

const CACHE_NS = 'expense_pending_summary'
const CACHE_KEY = '_'
const POLL_MS = 5 * 60 * 1000 // 5분

export function useExpensePendingSummary(): {
  summary: PendingSummary | null
  loading: boolean
  refetch: () => Promise<void>
} {
  const cached = readCache<PendingSummary>(CACHE_NS, CACHE_KEY)
  const [summary, setSummary] = useState<PendingSummary | null>(cached ?? null)
  const [loading, setLoading] = useState(!cached)
  const mounted = useRef(true)

  const refetch = useCallback(async () => {
    try {
      const res = await pendingSummary()
      if (!mounted.current) return
      setSummary(res)
      writeCache<PendingSummary>(CACHE_NS, CACHE_KEY, res)
    } catch {
      // 조용히 무시 (알림 카운트는 비필수) — 캐시된 값 유지
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void refetch()
    const id = window.setInterval(() => {
      void refetch()
    }, POLL_MS)
    return () => {
      mounted.current = false
      window.clearInterval(id)
    }
  }, [refetch])

  return { summary, loading, refetch }
}
