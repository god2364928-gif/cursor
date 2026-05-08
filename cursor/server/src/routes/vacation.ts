import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { requireAppAccess } from '../middleware/requireAppAccess'
import {
  calcConsumedDays,
  calcBalance,
  calcMandatoryStatus,
  nextGrantDate,
  firstGrantDate,
  type LeaveType,
} from '../lib/vacation'
import { sendVacationNotification } from '../utils/slackClient'

const LEAVE_TYPE_LABEL_JA: Record<LeaveType, string> = {
  full: '全休',
  half_am: '午前半休',
  half_pm: '午後半休',
  unpaid: '無給休暇',
  health_check: '健康診断',
  condolence: '慶弔',
}

const router = Router()

// 모든 휴가 라우트는 ERP 접근 권한 필요
router.use(authMiddleware, requireAppAccess('erp'))

/** 본인 잔여 + 다음 부여일 + 카드용 데이터 */
router.get('/balance', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    const userResult = await pool.query('SELECT hire_date FROM users WHERE id = $1', [userId])
    const hireDate = userResult.rows[0]?.hire_date ? new Date(userResult.rows[0].hire_date) : null

    const [grantsResult, requestsResult, lastAnnualResult] = await Promise.all([
      pool.query(
        `SELECT id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes
         FROM vacation_grants WHERE user_id = $1 ORDER BY grant_date DESC`,
        [userId]
      ),
      pool.query(
        `SELECT id, start_date, end_date, leave_type, consumed_days, status, reason, created_at
         FROM vacation_requests WHERE user_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT grant_date FROM vacation_grants
         WHERE user_id = $1 AND grant_type = 'annual'
         ORDER BY grant_date DESC LIMIT 1`,
        [userId]
      ),
    ])

    const balance = calcBalance(grantsResult.rows, requestsResult.rows)
    const mandatory = calcMandatoryStatus(grantsResult.rows, requestsResult.rows)

    let nextGrant: string | null = null
    let firstGrant: string | null = null
    if (hireDate && !isNaN(hireDate.getTime())) {
      const lastAnnualDate = lastAnnualResult.rows.length > 0
        ? new Date(lastAnnualResult.rows[0].grant_date)
        : null
      nextGrant = nextGrantDate(hireDate, lastAnnualDate).toISOString().slice(0, 10)
      firstGrant = firstGrantDate(hireDate).toISOString().slice(0, 10)
    }

    res.json({
      ...balance,
      hireDate: hireDate ? hireDate.toISOString().slice(0, 10) : null,
      firstGrantDate: firstGrant,
      nextGrantDate: nextGrant,
      mandatory,
    })
  } catch (error: any) {
    console.error('vacation/balance error:', error.message)
    res.status(500).json({ error: '잔여 조회 실패' })
  }
})

/** 본인 부여 내역 */
router.get('/grants', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const result = await pool.query(
      `SELECT id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes, created_at
       FROM vacation_grants WHERE user_id = $1 ORDER BY grant_date DESC`,
      [userId]
    )
    res.json(result.rows)
  } catch (error: any) {
    console.error('vacation/grants error:', error.message)
    res.status(500).json({ error: '부여 내역 조회 실패' })
  }
})

/** 본인 신청 내역 */
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const result = await pool.query(
      `SELECT id, start_date, end_date, leave_type, consumed_days, status, reason,
              approver_id, approved_at, rejected_reason, created_at
       FROM vacation_requests WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )
    res.json(result.rows)
  } catch (error: any) {
    console.error('vacation/requests error:', error.message)
    res.status(500).json({ error: '신청 내역 조회 실패' })
  }
})

/** 휴가 신청 */
router.post('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { startDate, endDate, leaveType, reason } = req.body as {
      startDate: string
      endDate: string
      leaveType: LeaveType
      reason?: string
    }

    if (!startDate || !endDate || !leaveType) {
      return res.status(400).json({ error: '시작일/종료일/휴가 종류는 필수입니다' })
    }

    const validTypes: LeaveType[] = ['full', 'half_am', 'half_pm', 'unpaid', 'health_check', 'condolence']
    if (!validTypes.includes(leaveType)) {
      return res.status(400).json({ error: '잘못된 휴가 종류입니다' })
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ error: '날짜가 올바르지 않습니다' })
    }

    // 반차의 경우 시작/종료 동일해야 함
    if ((leaveType === 'half_am' || leaveType === 'half_pm') && startDate !== endDate) {
      return res.status(400).json({ error: '반차는 하루만 신청 가능합니다' })
    }

    const consumed = calcConsumedDays(leaveType, start, end)

    // 유급 휴가의 경우 잔여일수 검증
    if (leaveType === 'full' || leaveType === 'half_am' || leaveType === 'half_pm') {
      const [grantsResult, requestsResult] = await Promise.all([
        pool.query(
          `SELECT days, grant_date, expires_at FROM vacation_grants WHERE user_id = $1`,
          [userId]
        ),
        pool.query(
          `SELECT consumed_days, status FROM vacation_requests WHERE user_id = $1`,
          [userId]
        ),
      ])
      const balance = calcBalance(grantsResult.rows, requestsResult.rows)
      if (balance.remaining < consumed) {
        return res.status(400).json({
          error: `残休暇が不足しています (残り ${balance.remaining}日, 必要 ${consumed}日)`,
        })
      }
    }

    const result = await pool.query(
      `INSERT INTO vacation_requests
       (user_id, start_date, end_date, leave_type, consumed_days, reason)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, startDate, endDate, leaveType, consumed, reason || null]
    )

    // Slack 알림 (실패해도 신청은 성공 응답)
    sendVacationNotification({
      kind: 'submitted',
      userName: req.user!.name,
      startDate,
      endDate,
      leaveTypeLabel: LEAVE_TYPE_LABEL_JA[leaveType],
      consumedDays: consumed,
      reason,
    }).catch(() => {})

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('vacation POST request error:', error.message)
    res.status(500).json({ error: '신청 실패' })
  }
})

/** 본인 신청 취소 (pending만) */
router.delete('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const { id } = req.params

    const result = await pool.query(
      `UPDATE vacation_requests
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [id, userId]
    )

    if (result.rows.length === 0) {
      return res.status(400).json({ error: '取消できない申請です (申請が見つからないか、既に処理済み)' })
    }
    res.json({ success: true })
  } catch (error: any) {
    console.error('vacation DELETE request error:', error.message)
    res.status(500).json({ error: '取消失敗' })
  }
})

/** 전사 휴가 일정 (휴가 일정 공유 페이지) */
router.get('/schedule', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, department } = req.query as {
      startDate?: string
      endDate?: string
      department?: string
    }

    const params: any[] = []
    const conditions: string[] = [`vr.status IN ('approved', 'pending')`]

    if (startDate) {
      params.push(startDate)
      conditions.push(`vr.end_date >= $${params.length}`)
    }
    if (endDate) {
      params.push(endDate)
      conditions.push(`vr.start_date <= $${params.length}`)
    }
    if (department) {
      params.push(department)
      conditions.push(`u.department = $${params.length}`)
    }

    const result = await pool.query(
      `SELECT vr.id, vr.user_id, vr.start_date, vr.end_date, vr.leave_type,
              vr.consumed_days, vr.status, u.name AS user_name, u.department, u.team
       FROM vacation_requests vr
       JOIN users u ON u.id = vr.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY vr.start_date ASC`,
      params
    )
    res.json(result.rows)
  } catch (error: any) {
    console.error('vacation/schedule error:', error.message)
    res.status(500).json({ error: '일정 조회 실패' })
  }
})

/** 일본 공휴일 목록 */
router.get('/holidays', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string }
    const params: any[] = []
    const conditions: string[] = []
    if (startDate) {
      params.push(startDate)
      conditions.push(`date >= $${params.length}`)
    }
    if (endDate) {
      params.push(endDate)
      conditions.push(`date <= $${params.length}`)
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const result = await pool.query(
      `SELECT date, name FROM jp_holidays ${where} ORDER BY date ASC`,
      params
    )
    res.json(result.rows)
  } catch (error: any) {
    console.error('vacation/holidays error:', error.message)
    res.status(500).json({ error: '공휴일 조회 실패' })
  }
})

export default router
