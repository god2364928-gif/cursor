import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db'

const router = Router()

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: '이메일과 비밀번호를 입력해주세요.' })
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])

    if (result.rows.length === 0) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }

    const user = result.rows[0]

    if (user.role !== 'admin') {
      return res.status(403).json({ message: '어드민 권한이 없습니다.' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    }

    const token = jwt.sign(
      { role: 'super_admin', username: user.email, userId: user.id },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '12h' }
    )

    return res.json({ token })
  } catch (error) {
    console.error('[AdminAuth] Login error:', error)
    return res.status(500).json({ message: '서버 오류가 발생했습니다.' })
  }
})

export default router
