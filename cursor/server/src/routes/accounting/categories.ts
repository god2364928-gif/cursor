import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'

const router = Router()

// ========== 회계 카테고리 (Categories) ==========

// 목록 (sort_order 순)
router.get('/categories', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, value, label_ja, label_ko, sort_order, is_default, is_system
       FROM accounting_categories
       ORDER BY sort_order ASC, label_ko ASC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Categories fetch error:', error)
    res.status(500).json({ error: '카테고리를 불러오지 못했습니다' })
  }
})

// 추가
router.post('/categories', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { labelKo, labelJa } = req.body
    const ko = (labelKo || '').trim()
    const ja = (labelJa || '').trim() || ko // 일본어 미입력 시 한국어로 대체

    if (!ko) {
      return res.status(400).json({ error: '카테고리명은 필수입니다' })
    }

    // value 는 한국어 라벨을 키로 사용 (거래에 저장되는 문자열)
    const maxResult = await pool.query(`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM accounting_categories`)
    const nextOrder = maxResult.rows[0].next

    const result = await pool.query(
      `INSERT INTO accounting_categories (value, label_ja, label_ko, sort_order, is_default, is_system)
       VALUES ($1, $2, $3, $4, false, false)
       RETURNING id, value, label_ja, label_ko, sort_order, is_default, is_system`,
      [ko, ja, ko, nextOrder]
    )

    res.json({ success: true, category: result.rows[0] })
  } catch (error: any) {
    console.error('Category creation error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: '이미 존재하는 카테고리입니다' })
    }
    res.status(500).json({ error: '카테고리 생성에 실패했습니다' })
  }
})

// 순서 변경 (반드시 /:id 라우트보다 먼저 정의)
router.put('/categories/reorder', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '순서 정보가 올바르지 않습니다' })
    }

    await client.query('BEGIN')
    for (let i = 0; i < ids.length; i++) {
      await client.query(
        `UPDATE accounting_categories SET sort_order = $1, updated_at = NOW() WHERE id = $2`,
        [i, ids[i]]
      )
    }
    await client.query('COMMIT')
    res.json({ success: true })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Category reorder error:', error)
    res.status(500).json({ error: '카테고리 순서 변경에 실패했습니다' })
  } finally {
    client.release()
  }
})

// 수정 (표시 라벨만 변경 — value 는 거래 연동을 위해 불변)
router.put('/categories/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { labelKo, labelJa } = req.body
    const ko = (labelKo || '').trim()
    const ja = (labelJa || '').trim() || ko

    if (!ko) {
      return res.status(400).json({ error: '카테고리명은 필수입니다' })
    }

    const result = await pool.query(
      `UPDATE accounting_categories
       SET label_ko = $1, label_ja = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, value, label_ja, label_ko, sort_order, is_default, is_system`,
      [ko, ja, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다' })
    }

    res.json({ success: true, category: result.rows[0] })
  } catch (error) {
    console.error('Category update error:', error)
    res.status(500).json({ error: '카테고리 수정에 실패했습니다' })
  }
})

// 삭제 (시스템 카테고리 & 사용 중 카테고리는 차단)
router.delete('/categories/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const catResult = await pool.query(
      `SELECT value, is_system FROM accounting_categories WHERE id = $1`,
      [id]
    )
    if (catResult.rows.length === 0) {
      return res.status(404).json({ error: '카테고리를 찾을 수 없습니다' })
    }
    const { value, is_system } = catResult.rows[0]

    if (is_system) {
      return res.status(400).json({ error: '기본 카테고리는 삭제할 수 없습니다' })
    }

    // 거래내역에서 사용 중이면 삭제 차단
    const usage = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM accounting_transactions WHERE category = $1`,
      [value]
    )
    if (usage.rows[0].cnt > 0) {
      return res.status(409).json({
        error: `사용 중인 카테고리입니다 (거래 ${usage.rows[0].cnt}건). 먼저 해당 거래의 카테고리를 변경해 주세요`,
        inUseCount: usage.rows[0].cnt,
      })
    }

    await pool.query(`DELETE FROM accounting_categories WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Category delete error:', error)
    res.status(500).json({ error: '카테고리 삭제에 실패했습니다' })
  }
})

export default router
