import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'

export type AppArea = 'crm' | 'erp' | 'admin'

export function hasAppAccess(appAccess: string | undefined | null, area: AppArea): boolean {
  if (!appAccess) return false
  const list = appAccess.split(',').map((s) => s.trim()).filter(Boolean)
  return list.includes(area)
}

export function requireAppAccess(area: AppArea) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '인증이 필요합니다' })
    }
    if (req.user.role === 'admin') {
      return next()
    }
    if (!hasAppAccess(req.user.app_access, area)) {
      return res.status(403).json({ error: `${area.toUpperCase()} 접근 권한이 없습니다` })
    }
    next()
  }
}
