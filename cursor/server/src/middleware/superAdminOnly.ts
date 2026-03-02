import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface SuperAdminRequest extends Request {
  admin?: {
    role: string
    username: string
  }
}

export const superAdminOnly = (
  req: SuperAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ message: '접근 권한이 없습니다.' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any

    if (decoded.role !== 'super_admin') {
      return res.status(403).json({ message: '어드민 전용 페이지입니다.' })
    }

    req.admin = decoded
    next()
  } catch (error) {
    return res.status(401).json({ message: '유효하지 않은 토큰입니다.' })
  }
}
