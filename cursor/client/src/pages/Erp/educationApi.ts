import { useAuthStore } from '../../store/authStore'

// ===== Types =====

export type EducationCourseType = 'offline' | 'online' | 'book'
export type EducationScheduleType = 'after_work' | 'weekend' | 'self_paced'
export type EducationStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'paid'
  | 'evidence_pending'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'refunded'
export type EducationFileKind = 'certificate' | 'book_record' | 'progress' | 'receipt'

export interface EducationFile {
  id: number
  kind: EducationFileKind
  file_name: string
  file_size: number
  mime_type: string
  uploaded_at: string
}

export interface EducationRequest {
  id: number
  user_id: string
  user_name: string
  department: string | null
  fiscal_year: number
  course_type: EducationCourseType
  schedule_type: EducationScheduleType
  provider: string
  course_name: string
  course_url: string | null
  start_date: string
  end_date: string
  cost: number
  reimbursed_amount: number
  relevance: string
  study_plan: string
  status: EducationStatus
  ceo_approval_required: boolean
  ceo_approved_at: string | null
  ceo_approved_by: string | null
  approver_id: string | null
  approved_at: string | null
  paid_at: string | null
  evidence_due_date: string | null
  completed_at: string | null
  reject_reason: string | null
  refund_reason: string | null
  submitted_at: string | null
  created_at: string
  updated_at: string
  files: EducationFile[] | null
}

export interface EducationStats {
  year: number
  total_spent: number
  active_count: number
  ceo_approval_threshold: number
  evidence_due_days: number
}

export interface CreateOrUpdatePayload {
  course_type: EducationCourseType
  schedule_type: EducationScheduleType
  provider: string
  course_name: string
  course_url?: string | null
  start_date: string
  end_date: string
  cost: number
  relevance?: string
  study_plan?: string
  submit?: boolean
}

// ===== HTTP helpers =====

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
  const res = await fetch(`${getApiBase()}/education${path}`, {
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

// ===== User-side =====

export function fetchStats(year?: number): Promise<EducationStats> {
  const q = year ? `?year=${year}` : ''
  return apiFetch<EducationStats>(`/stats${q}`)
}

export function fetchMyHistory(status?: EducationStatus): Promise<{ items: EducationRequest[] }> {
  const q = status ? `?status=${status}` : ''
  return apiFetch<{ items: EducationRequest[] }>(`/my-history${q}`)
}

export function fetchRequest(id: number): Promise<EducationRequest> {
  return apiFetch<EducationRequest>(`/requests/${id}`)
}

export function createRequest(payload: CreateOrUpdatePayload): Promise<EducationRequest> {
  return apiFetch<EducationRequest>('/requests', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRequest(
  id: number,
  payload: Partial<CreateOrUpdatePayload>
): Promise<EducationRequest> {
  return apiFetch<EducationRequest>(`/requests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function cancelRequest(id: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/requests/${id}`, { method: 'DELETE' })
}

// ===== File upload =====

export async function uploadFile(
  id: number,
  kind: EducationFileKind,
  file: File
): Promise<EducationFile> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('kind', kind)
  const res = await fetch(`${getApiBase()}/education/requests/${id}/files`, {
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

export function fileDownloadUrl(fileId: number): string {
  return `${getApiBase()}/education/files/${fileId}`
}

export function deleteFile(fileId: number): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/files/${fileId}`, { method: 'DELETE' })
}

// ===== Admin-side =====

export function adminList(opts?: {
  status?: EducationStatus
  year?: number
}): Promise<{ items: EducationRequest[] }> {
  const params = new URLSearchParams()
  if (opts?.status) params.set('status', opts.status)
  if (opts?.year) params.set('year', String(opts.year))
  const q = params.toString() ? `?${params.toString()}` : ''
  return apiFetch<{ items: EducationRequest[] }>(`/admin/list${q}`)
}

export type AdminAction =
  | 'approve'
  | 'reject'
  | 'mark_paid'
  | 'mark_completed'
  | 'refund'
  | 'reopen'

export function adminAct(
  id: number,
  action: AdminAction,
  extra?: { reject_reason?: string; refund_reason?: string; reimbursed_amount?: number }
): Promise<EducationRequest> {
  return apiFetch<EducationRequest>(`/admin/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, ...(extra || {}) }),
  })
}

export function adminSweep(): Promise<{ updated: number }> {
  return apiFetch<{ updated: number }>('/admin/sweep', { method: 'POST' })
}
