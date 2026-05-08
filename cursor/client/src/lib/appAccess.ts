import type { User } from '@/types'

export type AppArea = 'crm' | 'erp' | 'admin'

export function parseAppAccess(user: User | null | undefined): AppArea[] {
  if (!user) return []
  const raw = user.app_access || (user.role === 'admin' ? 'admin,crm,erp' : 'crm,erp')
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is AppArea => s === 'crm' || s === 'erp' || s === 'admin')
}

export function hasAccess(user: User | null | undefined, area: AppArea): boolean {
  if (!user) return false
  if (user.role === 'admin') return true
  return parseAppAccess(user).includes(area)
}

export function defaultLandingPath(user: User | null | undefined): string {
  if (!user) return '/login'
  const access = parseAppAccess(user)
  // 우선순위: CRM (마케팅이 주력) → ERP → admin
  if (access.includes('crm')) return '/'
  if (access.includes('erp')) return '/erp'
  if (access.includes('admin')) return '/admin'
  return '/login'
}
