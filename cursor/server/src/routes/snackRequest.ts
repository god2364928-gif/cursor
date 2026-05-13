import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { requireAppAccess } from '../middleware/requireAppAccess'
import {
  calcWeekStart,
  normalizeToMonday,
  daysUntilDeadline,
  deadlineISO,
} from '../lib/snackWeek'

const router = Router()

// 모든 간식 신청 라우트는 ERP 접근 권한 필요
router.use(authMiddleware, requireAppAccess('erp'))

/** 권한 체크 헬퍼 */
function isOwnerOrAdmin(req: AuthRequest, ownerUserId: number): boolean {
  return Number(req.user!.id) === ownerUserId || req.user!.role === 'admin'
}

/** 신청 row + JOIN 결과 공통 SELECT 절 */
const REQUEST_SELECT = `
  sr.id, sr.user_id, u.name AS user_name, u.department,
  sr.product_url, sr.product_name,
  sr.unit_price, sr.quantity, sr.total, sr.note,
  sr.status, sr.fixed_id, sr.created_at
`

/** 1. 이번 주 전사 신청 + 합계 + D-day */
router.get('/this-week', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date()
    const weekStart = calcWeekStart(now)
    const deadline = deadlineISO(now)
    const daysLeft = daysUntilDeadline(now)

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM snack_requests sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.week_start = $1
       ORDER BY sr.created_at DESC`,
      [weekStart]
    )

    let totalAmount = 0
    let totalCount = 0
    for (const row of result.rows) {
      if (row.status !== 'cancelled') {
        totalAmount += Number(row.total) || 0
        totalCount += 1
      }
    }

    res.json({
      week_start: weekStart,
      deadline,
      days_until_deadline: daysLeft,
      total_amount: totalAmount,
      total_count: totalCount,
      items: result.rows,
    })
  } catch (error: any) {
    console.error('snack/this-week error:', error.message)
    res.status(500).json({ error: '이번 주 조회 실패' })
  }
})

/** 2. 내 신청 이력 (월 기준) */
router.get('/my-history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id)
    const monthQuery = (req.query.month as string | undefined) || ''

    let year: number
    let month: number // 1-12
    const m = /^(\d{4})-(\d{2})$/.exec(monthQuery)
    if (m) {
      year = Number(m[1])
      month = Number(m[2])
    } else {
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth() + 1
    }

    // 해당 월의 시작/다음 달 시작 (UTC 기준 — created_at 비교)
    const startStr = `${year}-${month < 10 ? '0' + month : month}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endStr = `${nextYear}-${nextMonth < 10 ? '0' + nextMonth : nextMonth}-01`
    const monthLabel = `${year}-${month < 10 ? '0' + month : month}`

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM snack_requests sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.user_id = $1
         AND sr.created_at >= $2
         AND sr.created_at < $3
       ORDER BY sr.created_at DESC`,
      [userId, startStr, endStr]
    )

    let totalAmount = 0
    let totalCount = 0
    for (const row of result.rows) {
      if (row.status !== 'cancelled') {
        totalAmount += Number(row.total) || 0
        totalCount += 1
      }
    }

    res.json({
      month: monthLabel,
      total_amount: totalAmount,
      total_count: totalCount,
      items: result.rows,
    })
  } catch (error: any) {
    console.error('snack/my-history error:', error.message)
    res.status(500).json({ error: '내 이력 조회 실패' })
  }
})

/** 3. 통계 — 이번 달 내 누적 + 전사 누적 + 1인 평균 */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id)
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const startStr = `${year}-${month < 10 ? '0' + month : month}-01`
    const nextMonth = month === 12 ? 1 : month + 1
    const nextYear = month === 12 ? year + 1 : year
    const endStr = `${nextYear}-${nextMonth < 10 ? '0' + nextMonth : nextMonth}-01`
    const monthLabel = `${year}-${month < 10 ? '0' + month : month}`

    const [myResult, companyResult, activeResult] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total), 0) AS total_amount, COUNT(*) AS total_count
         FROM snack_requests
         WHERE user_id = $1
           AND created_at >= $2
           AND created_at < $3
           AND status != 'cancelled'`,
        [userId, startStr, endStr]
      ),
      pool.query(
        `SELECT COALESCE(SUM(total), 0) AS total_amount, COUNT(*) AS total_count
         FROM snack_requests
         WHERE created_at >= $1
           AND created_at < $2
           AND status != 'cancelled'`,
        [startStr, endStr]
      ),
      pool.query(
        `SELECT COUNT(*) AS cnt FROM users
         WHERE employment_status IS NULL
            OR employment_status = ''
            OR employment_status = '입사중'
            OR employment_status = '在籍中'`
      ),
    ])

    const myTotalAmount = Number(myResult.rows[0]?.total_amount) || 0
    const myTotalCount = Number(myResult.rows[0]?.total_count) || 0
    const companyTotalAmount = Number(companyResult.rows[0]?.total_amount) || 0
    const companyTotalCount = Number(companyResult.rows[0]?.total_count) || 0
    const activeEmployees = Number(activeResult.rows[0]?.cnt) || 0
    const perPersonAvg =
      activeEmployees > 0 ? Math.round(companyTotalAmount / activeEmployees) : 0

    res.json({
      month: monthLabel,
      my_total_amount: myTotalAmount,
      my_total_count: myTotalCount,
      company_total_amount: companyTotalAmount,
      company_total_count: companyTotalCount,
      active_employees: activeEmployees,
      per_person_avg: perPersonAvg,
    })
  } catch (error: any) {
    console.error('snack/stats error:', error.message)
    res.status(500).json({ error: '통계 조회 실패' })
  }
})

/** 4. 신청 등록 */
router.post('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id)
    const { product_url, product_name, unit_price, quantity, note } = req.body as {
      product_url?: string
      product_name?: string
      unit_price?: number
      quantity?: number
      note?: string
    }

    if (!product_url || typeof product_url !== 'string' || !product_url.trim()) {
      return res.status(400).json({ error: '商品URLは必須です' })
    }
    if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
      return res.status(400).json({ error: '商品名は必須です' })
    }
    if (
      !Number.isInteger(unit_price) ||
      (unit_price as number) < 0
    ) {
      return res.status(400).json({ error: '単価は0以上の整数で入力してください' })
    }
    if (!Number.isInteger(quantity) || (quantity as number) < 1) {
      return res.status(400).json({ error: '数量は1以上の整数で入力してください' })
    }

    const weekStart = calcWeekStart(new Date())

    const insert = await pool.query(
      `INSERT INTO snack_requests
        (user_id, product_url, product_name, unit_price, quantity, note, week_start, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       RETURNING id`,
      [
        userId,
        product_url.trim(),
        product_name.trim(),
        unit_price,
        quantity,
        note ? String(note) : null,
        weekStart,
      ]
    )

    const newId = insert.rows[0].id
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM snack_requests sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.id = $1`,
      [newId]
    )

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('snack POST request error:', error.message)
    res.status(500).json({ error: '申請失敗' })
  }
})

/** 5. 신청 취소 */
router.delete('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = (req.body || {}) as { reason?: string }

    const existing = await pool.query(
      `SELECT id, user_id, status FROM snack_requests WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }

    const row = existing.rows[0]
    const isAdmin = req.user!.role === 'admin'
    const isOwner = Number(req.user!.id) === Number(row.user_id)

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: '権限がありません' })
    }

    if (!isAdmin) {
      if (row.status !== 'pending') {
        return res.status(400).json({ error: '取消できない申請です (既に処理済み)' })
      }
      if (daysUntilDeadline() < 0) {
        return res.status(400).json({ error: '締め切りを過ぎたため取消できません' })
      }
    }

    await pool.query(
      `UPDATE snack_requests
       SET status = 'cancelled',
           cancelled_at = NOW(),
           cancel_reason = $2
       WHERE id = $1`,
      [id, reason ? String(reason) : null]
    )

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM snack_requests sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.id = $1`,
      [id]
    )

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('snack DELETE request error:', error.message)
    res.status(500).json({ error: '取消失敗' })
  }
})

/** 6. 고정 구매 리스트 */
router.get('/fixed', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT
         f.id, f.user_id, u.name AS user_name, u.department,
         f.product_url, f.product_name,
         f.unit_price, f.quantity, f.note,
         f.start_date, f.end_date, f.active, f.created_at
       FROM snack_fixed f
       JOIN users u ON f.user_id = u.id
       ORDER BY f.active DESC, f.created_at DESC`
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('snack/fixed GET error:', error.message)
    res.status(500).json({ error: '固定購入リスト取得失敗' })
  }
})

/** 7. 고정 구매 등록 */
router.post('/fixed', async (req: AuthRequest, res: Response) => {
  try {
    const userId = Number(req.user!.id)
    const { product_url, product_name, unit_price, quantity, note, start_date, end_date } =
      req.body as {
        product_url?: string
        product_name?: string
        unit_price?: number
        quantity?: number
        note?: string
        start_date?: string
        end_date?: string
      }

    if (!product_url || typeof product_url !== 'string' || !product_url.trim()) {
      return res.status(400).json({ error: '商品URLは必須です' })
    }
    if (!product_name || typeof product_name !== 'string' || !product_name.trim()) {
      return res.status(400).json({ error: '商品名は必須です' })
    }
    if (!Number.isInteger(unit_price) || (unit_price as number) < 0) {
      return res.status(400).json({ error: '単価は0以上の整数で入力してください' })
    }
    if (!Number.isInteger(quantity) || (quantity as number) < 1) {
      return res.status(400).json({ error: '数量は1以上の整数で入力してください' })
    }
    if (!start_date || !/^\d{4}-\d{2}-\d{2}/.test(start_date)) {
      return res.status(400).json({ error: '開始日が正しくありません' })
    }
    if (!end_date || !/^\d{4}-\d{2}-\d{2}/.test(end_date)) {
      return res.status(400).json({ error: '終了日が正しくありません' })
    }
    if (end_date < start_date) {
      return res.status(400).json({ error: '終了日は開始日以降にしてください' })
    }

    const startMon = normalizeToMonday(start_date)
    const endMon = normalizeToMonday(end_date)

    const insert = await pool.query(
      `INSERT INTO snack_fixed
        (user_id, product_url, product_name, unit_price, quantity, note, start_date, end_date, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
       RETURNING id`,
      [
        userId,
        product_url.trim(),
        product_name.trim(),
        unit_price,
        quantity,
        note ? String(note) : null,
        startMon,
        endMon,
      ]
    )

    const newId = insert.rows[0].id
    const result = await pool.query(
      `SELECT
         f.id, f.user_id, u.name AS user_name, u.department,
         f.product_url, f.product_name,
         f.unit_price, f.quantity, f.note,
         f.start_date, f.end_date, f.active, f.created_at
       FROM snack_fixed f
       JOIN users u ON f.user_id = u.id
       WHERE f.id = $1`,
      [newId]
    )

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('snack/fixed POST error:', error.message)
    res.status(500).json({ error: '固定購入登録失敗' })
  }
})

/** 8. 고정 구매 active 토글 */
router.patch('/fixed/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { active } = req.body as { active?: boolean }

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active は boolean 必須' })
    }

    const existing = await pool.query(
      `SELECT id, user_id FROM snack_fixed WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '固定購入が見つかりません' })
    }

    if (!isOwnerOrAdmin(req, Number(existing.rows[0].user_id))) {
      return res.status(403).json({ error: '権限がありません' })
    }

    await pool.query(`UPDATE snack_fixed SET active = $2 WHERE id = $1`, [id, active])

    const result = await pool.query(
      `SELECT
         f.id, f.user_id, u.name AS user_name, u.department,
         f.product_url, f.product_name,
         f.unit_price, f.quantity, f.note,
         f.start_date, f.end_date, f.active, f.created_at
       FROM snack_fixed f
       JOIN users u ON f.user_id = u.id
       WHERE f.id = $1`,
      [id]
    )

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('snack/fixed PATCH error:', error.message)
    res.status(500).json({ error: '固定購入更新失敗' })
  }
})

/** 9. 고정 구매 삭제 */
router.delete('/fixed/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const existing = await pool.query(
      `SELECT id, user_id FROM snack_fixed WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '固定購入が見つかりません' })
    }

    if (!isOwnerOrAdmin(req, Number(existing.rows[0].user_id))) {
      return res.status(403).json({ error: '権限がありません' })
    }

    await pool.query(`DELETE FROM snack_fixed WHERE id = $1`, [id])

    res.json({ message: 'deleted' })
  } catch (error: any) {
    console.error('snack/fixed DELETE error:', error.message)
    res.status(500).json({ error: '固定購入削除失敗' })
  }
})

/** 10. 발주 완료 마킹 (admin) */
router.post('/admin/mark-ordered', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: '管理者のみ実行可能です' })
    }

    const { week_start: bodyWeekStart } = (req.body || {}) as { week_start?: string }
    const weekStart =
      bodyWeekStart && /^\d{4}-\d{2}-\d{2}$/.test(bodyWeekStart)
        ? normalizeToMonday(bodyWeekStart)
        : calcWeekStart(new Date())

    const result = await pool.query(
      `UPDATE snack_requests
       SET status = 'ordered', ordered_at = NOW()
       WHERE week_start = $1 AND status = 'pending'
       RETURNING id, ordered_at`,
      [weekStart]
    )

    const orderedAt =
      result.rows[0]?.ordered_at instanceof Date
        ? result.rows[0].ordered_at.toISOString()
        : result.rows[0]?.ordered_at || new Date().toISOString()

    res.json({
      ordered_count: result.rowCount || 0,
      ordered_at: orderedAt,
    })
  } catch (error: any) {
    console.error('snack/admin/mark-ordered error:', error.message)
    res.status(500).json({ error: '発注完了処理失敗' })
  }
})

/** 11. 고정 구매 자동 신청 잡 수동 실행 (admin, 디버그용) */
router.post('/admin/run-fixed-job', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: '管理者のみ実行可能です' })
    }

    const weekStart = calcWeekStart(new Date())

    const result = await pool.query(
      `INSERT INTO snack_requests
        (user_id, product_url, product_name, unit_price, quantity, note, week_start, fixed_id)
       SELECT
         f.user_id, f.product_url, f.product_name, f.unit_price, f.quantity, f.note,
         $1::date, f.id
       FROM snack_fixed f
       WHERE f.active = TRUE
         AND f.start_date <= $1::date
         AND f.end_date >= $1::date
       ON CONFLICT (fixed_id, week_start) DO NOTHING
       RETURNING id`,
      [weekStart]
    )

    res.json({
      inserted: result.rowCount || 0,
      week_start: weekStart,
    })
  } catch (error: any) {
    console.error('snack/admin/run-fixed-job error:', error.message)
    res.status(500).json({ error: '固定購入ジョブ実行失敗' })
  }
})

export default router
