import type { User } from '@/types'

// CRM 페이지 키 — Layout 네비게이션 / 라우트 가드에서 공용
export type CrmPageKey =
  | 'dashboard'
  | 'customers'
  | 'retargeting'
  | 'salesTracking'
  | 'inquiryLeads'
  | 'hotpepper'
  | 'sales'
  | 'invoices'
  | 'quotes'
  | 'settings'
  | 'settingsChild'

// office_assistant 가 접근 가능한 CRM 페이지
const OFFICE_ASSISTANT_ALLOWED: ReadonlySet<CrmPageKey> = new Set([
  'salesTracking',
  'inquiryLeads',
  'hotpepper',
  'settings',
  'settingsChild',
])

export function canAccessCrmPage(user: User | null | undefined, page: CrmPageKey): boolean {
  if (!user) return false
  if (user.role === 'office_assistant') return OFFICE_ASSISTANT_ALLOWED.has(page)
  return true
}

// URL 경로 → 페이지 키 매핑 (라우트 가드용)
export function crmPageKeyFromPath(pathname: string): CrmPageKey | null {
  if (pathname === '/') return 'dashboard'
  if (pathname.startsWith('/customers')) return 'customers'
  if (pathname.startsWith('/retargeting')) return 'retargeting'
  if (pathname.startsWith('/sales-tracking')) return 'salesTracking'
  if (pathname.startsWith('/inquiry-leads')) return 'inquiryLeads'
  if (pathname.startsWith('/hotpepper')) return 'hotpepper'
  if (pathname === '/sales' || pathname.startsWith('/sales/')) return 'sales'
  if (pathname.startsWith('/invoices')) return 'invoices'
  if (pathname.startsWith('/quotes')) return 'quotes'
  if (pathname === '/settings') return 'settings'
  if (pathname.startsWith('/settings/')) return 'settingsChild'
  return null
}
