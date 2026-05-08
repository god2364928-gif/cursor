// 휴가 시스템 공용 라벨/타입 (i18n 지원)
import { useI18nStore } from '../../i18n'

export type LeaveType =
  | 'full'
  | 'half_am'
  | 'half_pm'
  | 'unpaid'
  | 'health_check'
  | 'condolence'

export type GrantType = 'annual' | 'special' | 'manual' | 'condolence'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

const leaveTypeKey: Record<LeaveType, string> = {
  full: 'leave_type_full',
  half_am: 'leave_type_half_am',
  half_pm: 'leave_type_half_pm',
  unpaid: 'leave_type_unpaid',
  health_check: 'leave_type_health_check',
  condolence: 'leave_type_condolence',
}

const grantTypeKey: Record<GrantType, string> = {
  annual: 'grant_type_annual',
  special: 'grant_type_special',
  manual: 'grant_type_manual',
  condolence: 'grant_type_condolence',
}

const statusKey: Record<RequestStatus, string> = {
  pending: 'status_pending',
  approved: 'status_approved',
  rejected: 'status_rejected',
  cancelled: 'status_cancelled',
}

export const statusColor: Record<RequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
}

/** Hook helper — t() 함수와 라벨 lookup 함께 제공 */
export function useLeaveLabels() {
  const { t } = useI18nStore()
  return {
    t,
    leaveTypeLabel: (type: LeaveType) => t(leaveTypeKey[type]) || type,
    grantTypeLabel: (type: GrantType) => t(grantTypeKey[type]) || type,
    statusLabel: (s: RequestStatus) => t(statusKey[s]) || s,
  }
}

export function formatYmd(input: string | Date | null | undefined): string {
  if (!input) return '-'
  const d = typeof input === 'string' ? new Date(input) : input
  if (isNaN(d.getTime())) return '-'
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}

/** 로컬 기준 'YYYY-MM-DD' 포맷 (timezone 변환 X) */
export function ymdLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 'YYYY-MM-DD' 또는 ISO 문자열을 로컬 0시 Date로 파싱 (timezone 영향 X) */
export function parseYmdLocal(s: string | Date): Date {
  if (s instanceof Date) return new Date(s.getFullYear(), s.getMonth(), s.getDate())
  const ymd = String(s).slice(0, 10)
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
