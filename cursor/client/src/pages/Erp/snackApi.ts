import { useAuthStore } from '../../store/authStore'

// ===== Types =====

export interface SnackRequestItem {
  id: number
  user_id: number
  user_name: string
  department: string | null
  product_url: string
  product_name: string
  unit_price: number
  quantity: number
  total: number
  note: string | null
  status: 'pending' | 'ordered' | 'cancelled'
  fixed_id: number | null
  ordered_at: string | null
  cancelled_at: string | null
  cancel_reason: string | null
  created_at: string
}

export interface SnackFixedItem {
  id: number
  user_id: number
  user_name: string
  department: string | null
  product_url: string
  product_name: string
  unit_price: number
  quantity: number
  note: string | null
  start_date: string // YYYY-MM-DD
  end_date: string
  active: boolean
  created_at: string
}

export interface ThisWeekResponse {
  week_start: string
  is_current: boolean
  order_target_week: string  // 발주 대상 주(=지난 주) 라벨용
  deadline: string | null    // 과거 주 조회 시 null
  days_until_deadline: number | null
  total_amount: number
  total_count: number
  items: SnackRequestItem[]
}

export interface MyHistoryResponse {
  month: string // YYYY-MM
  total_amount: number
  total_count: number
  items: SnackRequestItem[]
}

export interface StatsResponse {
  month: string
  my_total_amount: number
  my_total_count: number
  company_total_amount: number
  company_total_count: number
  active_employees: number
  per_person_avg: number
}

export interface CreateRequestPayload {
  product_url: string
  product_name: string
  unit_price: number
  quantity: number
  note?: string
}

export interface CreateFixedPayload {
  product_url: string
  product_name: string
  unit_price: number
  quantity: number
  note?: string
  start_date: string // YYYY-MM-DD
  end_date: string
}

// ===== Internal helpers =====

/**
 * 베이스 URL 결정 — 기존 lib/api.ts 와 동일한 규칙.
 * - localhost / 127.0.0.1 → '/api' (Vite proxy)
 * - 그 외(프로덕션) → Railway 백엔드
 */
function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '/api'
    }
  }
  return 'https://cursor-production-1d92.up.railway.app/api'
}

function getAuthHeader(): Record<string, string> {
  // authStore 우선, 없으면 localStorage fallback (lib/api.ts 와 동일 정책)
  const token =
    useAuthStore.getState().token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('admin_token')
      : null)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}/snack${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API error ${res.status}: ${text || res.statusText}`)
  }
  return res.json() as Promise<T>
}

// ===== Public API =====

/** 1. 이번 주 전사 신청 + 합계 + D-day */
export function fetchThisWeek(weekStart?: string): Promise<ThisWeekResponse> {
  const q = weekStart ? `?week_start=${encodeURIComponent(weekStart)}` : ''
  return apiFetch<ThisWeekResponse>(`/this-week${q}`)
}

/** 2. 내 신청 이력 (월 기준, 미지정 시 이번 달) */
export function fetchMyHistory(month?: string): Promise<MyHistoryResponse> {
  const q = month ? `?month=${encodeURIComponent(month)}` : ''
  return apiFetch<MyHistoryResponse>(`/my-history${q}`)
}

/** 3. 이번 달 통계 (개인/전사) */
export function fetchStats(): Promise<StatsResponse> {
  return apiFetch<StatsResponse>('/stats')
}

/** 4. 신청 생성 */
export function createRequest(
  payload: CreateRequestPayload
): Promise<SnackRequestItem> {
  return apiFetch<SnackRequestItem>('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 5. 신청 취소(소프트 삭제) */
export function deleteRequest(
  id: number,
  reason?: string
): Promise<SnackRequestItem> {
  return apiFetch<SnackRequestItem>(`/requests/${id}`, {
    method: 'DELETE',
    body: reason ? JSON.stringify({ reason }) : JSON.stringify({}),
  })
}

/** 6. 정기 신청 목록 */
export function fetchFixedList(): Promise<{ items: SnackFixedItem[] }> {
  return apiFetch<{ items: SnackFixedItem[] }>('/fixed')
}

/** 7. 정기 신청 생성 */
export function createFixed(payload: CreateFixedPayload): Promise<SnackFixedItem> {
  return apiFetch<SnackFixedItem>('/fixed', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** 8. 정기 신청 활성/비활성 토글 */
export function patchFixed(
  id: number,
  payload: { active: boolean }
): Promise<SnackFixedItem> {
  return apiFetch<SnackFixedItem>(`/fixed/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/** 9. 정기 신청 삭제 */
export function deleteFixed(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/fixed/${id}`, {
    method: 'DELETE',
  })
}

/** 10. (admin) 이번 주 일괄 발주 처리 */
export function adminMarkOrdered(
  weekStart?: string
): Promise<{ ordered_count: number; ordered_at: string }> {
  return apiFetch<{ ordered_count: number; ordered_at: string }>(
    '/admin/mark-ordered',
    {
      method: 'POST',
      body: weekStart
        ? JSON.stringify({ week_start: weekStart })
        : JSON.stringify({}),
    }
  )
}

/** 11. (admin) 정기 신청 → 이번 주 신청 자동 생성 잡 수동 실행 */
export function adminRunFixedJob(): Promise<{
  inserted: number
  week_start: string
}> {
  return apiFetch<{ inserted: number; week_start: string }>(
    '/admin/run-fixed-job',
    { method: 'POST' }
  )
}
