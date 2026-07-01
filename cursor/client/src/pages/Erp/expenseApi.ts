import { useAuthStore } from '../../store/authStore'
import type {
  ExpenseRequest,
  ExpenseAttachment,
  ExpenseStatus,
  ExpenseCategory,
  SettlementType,
  PendingSummary,
  OcrResult,
} from './expenseTypes'

// ===== HTTP helpers (educationApi.ts 패턴 복제) =====

function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') return '/api'
  }
  return 'https://cursor-production-1d92.up.railway.app/api'
}

function getAuthHeader(): Record<string, string> {
  const token =
    useAuthStore.getState().token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('admin_token')
      : null)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}/expense${path}`, {
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

// ===== Payload types =====

export interface CreateExpensePayload {
  // 2탭 설계: 개인결제(reimburse_required)/법인결제(already_paid) 에 따라 category·settlement_type 자동 결정.
  category: ExpenseCategory
  settlement_type: SettlementType
  // used_at / amount_incl_tax 은 draft 생성 시 비워둘 수 있음 (OCR prefill 대기).
  // submit 시에만 서버가 필수 검증 (server: expense.ts POST /requests).
  used_at?: string
  amount_incl_tax?: number
  purpose?: string | null
  memo?: string | null
  meta?: Record<string, any>
  // 제출 의도 플래그 (server expense.ts: `submit === true`)
  submit?: boolean
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>

export type ExpenseAdminAction = 'approve' | 'reject' | 'mark_paid' | 'reopen'

export interface AdminActionPayload {
  reject_reason?: string
  account_item_id?: number
  tax_code?: number
  payee_account?: string
  paid_amount?: number
}

export interface AdminListFilters {
  status?: ExpenseStatus
  from?: string
  to?: string
  vendor?: string
  min_amount?: number
  max_amount?: number
  user_id?: string
  category?: string
}

// ===== requests (본인) =====

export function list(status?: ExpenseStatus): Promise<{ items: ExpenseRequest[] }> {
  const q = status ? `?status=${status}` : ''
  return apiFetch<{ items: ExpenseRequest[] }>(`/requests${q}`)
}

export function get(id: number): Promise<ExpenseRequest> {
  return apiFetch<ExpenseRequest>(`/requests/${id}`)
}

export function create(body: CreateExpensePayload): Promise<ExpenseRequest> {
  return apiFetch<ExpenseRequest>('/requests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function update(id: number, body: UpdateExpensePayload): Promise<ExpenseRequest> {
  return apiFetch<ExpenseRequest>(`/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function remove(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/requests/${id}`, { method: 'DELETE' })
}

// ===== attachments =====

export async function uploadAttachment(id: number, file: File): Promise<ExpenseAttachment> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch(`${getApiBase()}/expense/requests/${id}/attachments`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    body: fd,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Upload failed ${res.status}: ${text || res.statusText}`)
  }
  return res.json()
}

/** 첨부 다운로드 → blob object URL (호출측이 URL.revokeObjectURL로 해제) */
export async function downloadAttachment(id: number): Promise<string> {
  const res = await fetch(`${getApiBase()}/expense/attachments/${id}/download`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Download failed ${res.status}: ${text || res.statusText}`)
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

export function pollOcr(id: number): Promise<OcrResult> {
  return apiFetch<OcrResult>(`/requests/${id}/ocr`)
}

// ===== pending-summary (§7) =====

export function pendingSummary(): Promise<PendingSummary> {
  return apiFetch<PendingSummary>('/pending-summary')
}

// ===== admin (reviewer) =====

export function adminList(filters?: AdminListFilters): Promise<{ items: ExpenseRequest[] }> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  if (filters?.vendor) params.set('vendor', filters.vendor)
  if (filters?.min_amount != null) params.set('min_amount', String(filters.min_amount))
  if (filters?.max_amount != null) params.set('max_amount', String(filters.max_amount))
  if (filters?.user_id) params.set('user_id', filters.user_id)
  if (filters?.category) params.set('category', filters.category)
  const q = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<{ items: ExpenseRequest[] }>(`/admin/list${q}`)
}

export function adminAction(
  id: number,
  action: ExpenseAdminAction,
  payload?: AdminActionPayload
): Promise<ExpenseRequest> {
  return apiFetch<ExpenseRequest>(`/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, ...(payload || {}) }),
  })
}

/** 관리자 카테고리 변경 (reviewer only) → 요청의 category 를 변경하고 갱신된 행을 반환 */
export async function setCategory(id: number, category: string): Promise<ExpenseRequest> {
  return apiFetch<ExpenseRequest>(`/admin/${id}/category`, {
    method: 'PATCH',
    body: JSON.stringify({ category }),
  })
}

/** freee 파일박스 재전송 (진단용) → 영수증 첨부를 freee file box 로 다시 업로드 시도 */
export async function freeeResend(
  id: number
): Promise<{ receipt_id: number | null; error: string | null; already: boolean; ocr_status: string }> {
  return apiFetch<{ receipt_id: number | null; error: string | null; already: boolean; ocr_status: string }>(
    `/admin/${id}/freee-resend`,
    { method: 'POST' }
  )
}

/** 電帳法 CSV export → blob object URL (호출측이 URL.revokeObjectURL로 해제) */
export async function exportCsv(filters?: AdminListFilters): Promise<string> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  if (filters?.vendor) params.set('vendor', filters.vendor)
  if (filters?.min_amount != null) params.set('min_amount', String(filters.min_amount))
  if (filters?.max_amount != null) params.set('max_amount', String(filters.max_amount))
  if (filters?.user_id) params.set('user_id', filters.user_id)
  if (filters?.category) params.set('category', filters.category)
  const q = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${getApiBase()}/expense/admin/export.csv${q}`, {
    method: 'GET',
    headers: { ...getAuthHeader() },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Export failed ${res.status}: ${text || res.statusText}`)
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

/** 직원(사용자) 목록 조회 → 필터 드롭다운용. /expense 가 아닌 /auth/users 를 직접 호출. */
export async function getUsers(): Promise<{ id: string; name: string }[]> {
  try {
    const res = await fetch(`${getApiBase()}/auth/users`, { headers: getAuthHeader() })
    if (!res.ok) return []
    const rows = await res.json()
    if (!Array.isArray(rows)) return []
    return rows.map((u: any) => ({ id: u.id, name: u.name }))
  } catch {
    return []
  }
}
