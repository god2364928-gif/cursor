import { useAuthStore } from '../../store/authStore'

// ===== Types =====

export type HealthCheckupStatus = 'submitted' | 'reviewed' | 'reimbursed' | 'rejected'

export interface HealthCheckupFile {
  id: number
  kind: 'receipt' | 'result'
  file_name: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

export interface HealthCheckupItem {
  id: number
  user_id: string
  user_name: string
  department: string | null
  fiscal_year: number
  exam_date: string // YYYY-MM-DD
  hospital_name: string
  hospital_address: string | null
  checked_items: { basic: string[]; skipped: string[] }
  amount_paid: number
  amount_reimbursed: number
  status: HealthCheckupStatus
  vacation_granted: boolean
  vacation_request_id: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  reject_reason: string | null
  note: string | null
  created_at: string
  updated_at: string
  files: HealthCheckupFile[] | null
}

export interface MeResponse {
  hire_date: string | null
  current_year: number
  latest: HealthCheckupItem | null
  reimbursement_cap: number
}

export interface CreateReportPayload {
  exam_date: string
  hospital_name: string
  hospital_address?: string
  checked_items?: { basic?: string[]; skipped?: string[] }
  amount_paid: number
  note?: string
}

export type AdminAction =
  | 'review'
  | 'reimburse'
  | 'reject'
  | 'grant_vacation'
  | 'revoke_vacation'

// ===== Internal helpers (snackApi 동일 패턴) =====

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
  const token =
    useAuthStore.getState().token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('token') || localStorage.getItem('admin_token')
      : null)
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}/health-checkup${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let errMsg = `API error ${res.status}`
    try {
      const j = JSON.parse(text)
      if (j?.error) errMsg = j.error
    } catch {
      if (text) errMsg = text
    }
    throw new Error(errMsg)
  }
  return res.json() as Promise<T>
}

// ===== Public API =====

export function fetchMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/me')
}

export function fetchMyHistory(): Promise<{ items: HealthCheckupItem[] }> {
  return apiFetch<{ items: HealthCheckupItem[] }>('/my-history')
}

export function createReport(payload: CreateReportPayload): Promise<HealthCheckupItem> {
  return apiFetch<HealthCheckupItem>('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateReport(
  id: number,
  payload: Partial<CreateReportPayload>
): Promise<HealthCheckupItem> {
  return apiFetch<HealthCheckupItem>(`/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteReport(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/requests/${id}`, {
    method: 'DELETE',
  })
}

export async function uploadFile(
  id: number,
  kind: 'receipt' | 'result',
  file: File
): Promise<HealthCheckupFile> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('kind', kind)
  const res = await fetch(`${getApiBase()}/health-checkup/requests/${id}/files`, {
    method: 'POST',
    headers: { ...getAuthHeader() },
    body: fd,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let errMsg = `Upload error ${res.status}`
    try {
      const j = JSON.parse(text)
      if (j?.error) errMsg = j.error
    } catch {
      if (text) errMsg = text
    }
    throw new Error(errMsg)
  }
  return res.json() as Promise<HealthCheckupFile>
}

export function deleteFile(fileId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/files/${fileId}`, { method: 'DELETE' })
}

export function fileDownloadUrl(fileId: number): string {
  return `${getApiBase()}/health-checkup/files/${fileId}`
}

// ===== Admin =====

export function fetchAdminList(params?: {
  status?: HealthCheckupStatus
  year?: number
}): Promise<{ items: HealthCheckupItem[] }> {
  const q = new URLSearchParams()
  if (params?.status) q.set('status', params.status)
  if (params?.year) q.set('year', String(params.year))
  const qs = q.toString()
  return apiFetch<{ items: HealthCheckupItem[] }>(
    `/admin/list${qs ? `?${qs}` : ''}`
  )
}

export function adminAction(
  id: number,
  action: AdminAction,
  payload?: { amount_reimbursed?: number; reject_reason?: string }
): Promise<HealthCheckupItem> {
  return apiFetch<HealthCheckupItem>(`/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, ...(payload || {}) }),
  })
}

// ===== Helpers =====

export const BASIC_CHECK_ITEMS: { key: string; ja: string; ko: string }[] = [
  { key: 'history', ja: '既往歴及び業務歴の調査', ko: '기왕력 및 업무력 조사' },
  { key: 'symptoms', ja: '自覚症状及び他覚症状の有無の検査', ko: '자/타각 증상 유무' },
  { key: 'physical', ja: '身長・体重・腹囲・視力・聴力の検査', ko: '신장·체중·복위·시력·청력' },
  { key: 'xray', ja: '胸部エックス線検査及び喀痰検査', ko: '흉부 X선 및 객담' },
  { key: 'bp', ja: '血圧の測定', ko: '혈압' },
  { key: 'anemia', ja: '貧血検査', ko: '빈혈' },
  { key: 'liver', ja: '肝機能検査', ko: '간기능' },
  { key: 'lipid', ja: '血中脂質検査', ko: '혈중 지질' },
  { key: 'sugar', ja: '血糖検査', ko: '혈당' },
  { key: 'urine', ja: '尿検査', ko: '소변' },
  { key: 'ecg', ja: '心電図検査', ko: '심전도' },
]

export const SKIPPABLE_CHECK_ITEMS: { key: string; ja: string; ko: string }[] = [
  { key: 'skip_height', ja: '身長の検査', ko: '신장' },
  { key: 'skip_waist', ja: '腹囲の検査', ko: '복위' },
  { key: 'skip_xray', ja: '胸部エックス線検査', ko: '흉부 X선' },
  { key: 'skip_sputum', ja: '喀痰検査', ko: '객담' },
  { key: 'skip_labs', ja: '貧血・肝機能・血中脂質・血糖・心電図', ko: '빈혈·간기능·지질·혈당·심전도' },
]
