import { useAuthStore } from '../../store/authStore'
import type {
  ExpenseRequest,
  ExpenseAttachment,
  ExpenseStatus,
  ExpenseCategory,
  ExpenseSubscription,
  PendingSummary,
  ExpenseFreeeMap,
  FreeeAccountItem,
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
  category: ExpenseCategory
  settlement_type: ExpenseRequest['settlement_type']
  used_at: string
  amount_incl_tax: number
  tax_rate?: number
  reduced_tax?: boolean
  vendor_name?: string | null
  invoice_number?: string | null
  account_item_id?: number | null
  purpose?: string | null
  memo?: string | null
  meta?: Record<string, any>
  submit?: boolean
}

export type UpdateExpensePayload = Partial<CreateExpensePayload>

export interface CreateSubscriptionPayload {
  service_name: string
  card_label?: string | null
  category?: string
  cycle?: 'month' | 'year'
  billing_day: number
  amount?: number | null
  tax_rate?: number
  active?: boolean
  start_date?: string | null
  end_date?: string | null
  owner_user_id?: string
}

export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>

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

/** 電帳法 CSV export → blob object URL (호출측이 URL.revokeObjectURL로 해제) */
export async function exportCsv(filters?: AdminListFilters): Promise<string> {
  const params = new URLSearchParams()
  if (filters?.status) params.set('status', filters.status)
  if (filters?.from) params.set('from', filters.from)
  if (filters?.to) params.set('to', filters.to)
  if (filters?.vendor) params.set('vendor', filters.vendor)
  if (filters?.min_amount != null) params.set('min_amount', String(filters.min_amount))
  if (filters?.max_amount != null) params.set('max_amount', String(filters.max_amount))
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

// ===== subscriptions (정기결제 마스터) =====

export function listSubscriptions(): Promise<{ items: ExpenseSubscription[] }> {
  return apiFetch<{ items: ExpenseSubscription[] }>('/subscriptions')
}

export function createSubscription(
  body: CreateSubscriptionPayload
): Promise<ExpenseSubscription> {
  return apiFetch<ExpenseSubscription>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateSubscription(
  id: number,
  body: UpdateSubscriptionPayload
): Promise<ExpenseSubscription> {
  return apiFetch<ExpenseSubscription>(`/subscriptions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function deleteSubscription(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/subscriptions/${id}`, { method: 'DELETE' })
}

// ===== freee =====

export function getAccountItems(): Promise<{ items: FreeeAccountItem[] }> {
  return apiFetch<{ items: FreeeAccountItem[] }>('/freee/account-items')
}

export function getMap(): Promise<{ items: ExpenseFreeeMap[] }> {
  return apiFetch<{ items: ExpenseFreeeMap[] }>('/freee/map')
}

export function putMap(
  body: Array<{
    category: string
    subtype?: string | null
    account_item_id: number
    account_item_name?: string | null
  }>
): Promise<{ items: ExpenseFreeeMap[] }> {
  return apiFetch<{ items: ExpenseFreeeMap[] }>('/freee/map', {
    method: 'PUT',
    body: JSON.stringify({ map: body }),
  })
}
