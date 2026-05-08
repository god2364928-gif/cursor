// 휴가 시스템 공용 라벨/타입 (일본어)

export type LeaveType =
  | 'full'
  | 'half_am'
  | 'half_pm'
  | 'unpaid'
  | 'health_check'
  | 'condolence'

export type GrantType = 'annual' | 'special' | 'manual' | 'condolence'

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export const leaveTypeLabel: Record<LeaveType, string> = {
  full: '全休',
  half_am: '午前半休',
  half_pm: '午後半休',
  unpaid: '無給休暇',
  health_check: '健康診断',
  condolence: '慶弔',
}

export const grantTypeLabel: Record<GrantType, string> = {
  annual: '年次',
  special: '特別',
  manual: '手動付与',
  condolence: '慶弔',
}

export const statusLabel: Record<RequestStatus, string> = {
  pending: '承認待ち',
  approved: '承認済み',
  rejected: '却下',
  cancelled: '取消',
}

export const statusColor: Record<RequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
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

export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr)
  if (isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
