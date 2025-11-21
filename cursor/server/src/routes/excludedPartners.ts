import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { pool } from '../db'

const router = Router()

/**
 * 제외 거래처 목록 조회
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, partner_name, created_by, created_at FROM excluded_partners ORDER BY partner_name'
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching excluded partners:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 제외 거래처 추가 (어드민만)
 */
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 어드민 권한 체크
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { partner_name } = req.body

    if (!partner_name || !partner_name.trim()) {
      return res.status(400).json({ message: 'Partner name is required' })
    }

    const result = await pool.query(
      'INSERT INTO excluded_partners (partner_name, created_by) VALUES ($1, $2) RETURNING *',
      [partner_name.trim(), req.user.name || req.user.email]
    )

    console.log(`✅ Excluded partner added: ${partner_name} by ${req.user.name}`)
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Error adding excluded partner:', error)
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ message: 'This partner is already excluded' })
    }
    
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 제외 거래처 삭제 (어드민만)
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 어드민 권한 체크
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM excluded_partners WHERE id = $1 RETURNING partner_name',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Excluded partner not found' })
    }

    console.log(`✅ Excluded partner removed: ${result.rows[0].partner_name} by ${req.user?.name}`)
    res.json({ message: 'Excluded partner removed successfully' })
  } catch (error) {
    console.error('Error deleting excluded partner:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router





