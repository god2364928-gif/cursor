import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { adminOnly } from '../middleware/adminOnly'
import fs from 'fs'
import path from 'path'
import { expiryDate, calcServiceYearsAtGrant, type GrantType, type LeaveType } from '../lib/vacation'
import { sendVacationNotification } from '../utils/slackClient'
import { getUserIdSqlType, buildVacationSchemaSql } from '../migrations/autoMigrate'

const LEAVE_TYPE_LABEL_JA: Record<LeaveType, string> = {
  full: '全休',
  half_am: '午前半休',
  half_pm: '午後半休',
  unpaid: '無給休暇',
  health_check: '健康診断',
  condolence: '慶弔',
}

async function notifyVacationDecision(
  kind: 'approved' | 'rejected',
  request: any,
  approverName: string,
  rejectedReason?: string
) {
  try {
    const u = await pool.query('SELECT name FROM users WHERE id = $1', [request.user_id])
    const userName = u.rows[0]?.name || '不明'
    sendVacationNotification({
      kind,
      userName,
      startDate: new Date(request.start_date).toISOString().slice(0, 10),
      endDate: new Date(request.end_date).toISOString().slice(0, 10),
      leaveTypeLabel: LEAVE_TYPE_LABEL_JA[request.leave_type as LeaveType] || request.leave_type,
      consumedDays: Number(request.consumed_days) || 0,
      reason: request.reason,
      rejectedReason,
      approverName,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}

const router = Router()

router.use(authMiddleware, adminOnly)

/** 마이그레이션 강제 재실행 (어드민) — 에러를 응답에 그대로 노출 */
router.post('/run-migrations', async (req: AuthRequest, res: Response) => {
  const results: any = {}

  // 1. vacation 테이블 생성 (users.id 타입 동적 매칭)
  try {
    const userIdType = await getUserIdSqlType()
    results.users_id_type = userIdType
    const sql = buildVacationSchemaSql(userIdType)
    await pool.query(sql)
    results.vacation_tables = `✅ 생성 완료 (user_id type: ${userIdType})`
  } catch (e: any) {
    results.vacation_tables = `❌ ${e.message} (code: ${e.code || 'unknown'})`
  }

  // 2. 일본 공휴일 시드
  try {
    const sqlPath = path.join(__dirname, '../../database/seed-jp-holidays.sql')
    if (!fs.existsSync(sqlPath)) {
      results.jp_holidays = `❌ SQL 파일 없음: ${sqlPath}`
    } else {
      const sql = fs.readFileSync(sqlPath, 'utf-8')
      await pool.query(sql)
      results.jp_holidays = '✅ 시드 완료'
    }
  } catch (e: any) {
    results.jp_holidays = `❌ ${e.message} (code: ${e.code || 'unknown'})`
  }

  // 3. 노션 휴가 데이터 import
  try {
    const sqlPath = path.join(__dirname, '../../database/seed-notion-vacation-data.sql')
    if (!fs.existsSync(sqlPath)) {
      results.notion_data = `❌ SQL 파일 없음: ${sqlPath}`
    } else {
      // 멱등성 체크
      const checkResult = await pool.query(
        `SELECT COUNT(*)::int AS cnt FROM vacation_grants WHERE notes LIKE 'Notion移行%'`
      )
      if ((checkResult.rows[0]?.cnt || 0) > 0) {
        results.notion_data = `ℹ️ 이미 import됨 (grants ${checkResult.rows[0].cnt}건)`
      } else {
        const sql = fs.readFileSync(sqlPath, 'utf-8')
        await pool.query(sql)
        results.notion_data = '✅ import 완료'
      }
    }
  } catch (e: any) {
    results.notion_data = `❌ ${e.message} (code: ${e.code || 'unknown'})`
  }

  // 4. __dirname / 파일 시스템 정보
  try {
    const dbDir = path.join(__dirname, '../../database')
    const exists = fs.existsSync(dbDir)
    const files = exists ? fs.readdirSync(dbDir).filter((f) => f.endsWith('.sql')) : []
    results.filesystem = {
      __dirname,
      database_dir: dbDir,
      database_dir_exists: exists,
      sql_files: files,
    }
  } catch (e: any) {
    results.filesystem = `❌ ${e.message}`
  }

  res.json(results)
})

/** 마이그레이션/데이터 상태 진단 (어드민) */
router.get('/debug', async (req: AuthRequest, res: Response) => {
  const result: any = {}
  try {
    // 1. app_access 컬럼 존재 여부
    const appAccessCol = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema='public' AND table_name='users' AND column_name='app_access'
      ) AS exists
    `)
    result.users_app_access_column = appAccessCol.rows[0].exists

    // 2. vacation 테이블 존재 여부
    const tables = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('vacation_grants', 'vacation_requests', 'jp_holidays')
      ORDER BY table_name
    `)
    result.vacation_tables = tables.rows.map((r: any) => r.table_name)

    if (result.vacation_tables.includes('vacation_grants')) {
      // 3. 부여/신청/공휴일 데이터 카운트
      const counts = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM vacation_grants) AS grants,
          (SELECT COUNT(*)::int FROM vacation_grants WHERE notes LIKE 'Notion移行%') AS notion_grants,
          (SELECT COUNT(*)::int FROM vacation_requests) AS requests,
          (SELECT COUNT(*)::int FROM vacation_requests WHERE reason LIKE 'Notion移行%') AS notion_requests,
          (SELECT COUNT(*)::int FROM jp_holidays) AS holidays
      `)
      result.counts = counts.rows[0]

      // 4. 직원별 잔여 요약
      const summary = await pool.query(`
        SELECT u.id, u.name, u.email, u.hire_date, u.app_access,
               COALESCE(SUM(g.days), 0) AS granted,
               (SELECT COALESCE(SUM(consumed_days), 0)
                  FROM vacation_requests vr
                  WHERE vr.user_id = u.id AND vr.status = 'approved') AS consumed
        FROM users u
        LEFT JOIN vacation_grants g ON g.user_id = u.id
        WHERE u.email IN (
          'm5ymsk@hotseller.co.kr','amao0423@hotseller.co.kr',
          'j0705@hotseller.co.kr','umm240227@hotseller.co.kr','god2364928@hotseller.co.kr'
        )
        GROUP BY u.id
        ORDER BY u.hire_date NULLS LAST
      `)
      result.employees = summary.rows.map((r: any) => ({
        name: r.name,
        email: r.email,
        hire_date: r.hire_date,
        app_access: r.app_access,
        granted: Number(r.granted),
        consumed: Number(r.consumed),
        remaining: Number(r.granted) - Number(r.consumed),
      }))
    }

    res.json(result)
  } catch (error: any) {
    res.status(500).json({ error: error.message, partial: result })
  }
})

/** pending 신청 목록 (어드민) */
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as { status?: string }
    const where = status ? `vr.status = $1` : `vr.status = 'pending'`
    const params = status ? [status] : []
    const result = await pool.query(
      `SELECT vr.id, vr.user_id, vr.start_date, vr.end_date, vr.leave_type,
              vr.consumed_days, vr.status, vr.reason, vr.rejected_reason,
              vr.approver_id, vr.approved_at, vr.created_at,
              u.name AS user_name, u.department, u.team
       FROM vacation_requests vr
       JOIN users u ON u.id = vr.user_id
       WHERE ${where}
       ORDER BY vr.created_at DESC`,
      params
    )
    res.json(result.rows)
  } catch (error: any) {
    console.error('admin vacation/requests error:', error.message)
    res.status(500).json({ error: '목록 조회 실패' })
  }
})

/** 신청 승인 */
router.post('/requests/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const approverId = req.user!.id
    const result = await pool.query(
      `UPDATE vacation_requests
       SET status = 'approved', approver_id = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [approverId, id]
    )
    if (result.rows.length === 0) {
      return res.status(400).json({ error: '承認できない申請です' })
    }
    notifyVacationDecision('approved', result.rows[0], req.user!.name)
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('approve error:', error.message)
    res.status(500).json({ error: '承認失敗' })
  }
})

/** 신청 반려 */
router.post('/requests/:id/reject', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body as { reason?: string }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: '却下理由を入力してください' })
    }
    const approverId = req.user!.id
    const result = await pool.query(
      `UPDATE vacation_requests
       SET status = 'rejected', approver_id = $1, approved_at = NOW(),
           rejected_reason = $2, updated_at = NOW()
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
      [approverId, reason.trim(), id]
    )
    if (result.rows.length === 0) {
      return res.status(400).json({ error: '却下できない申請です' })
    }
    notifyVacationDecision('rejected', result.rows[0], req.user!.name, reason.trim())
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('reject error:', error.message)
    res.status(500).json({ error: '却下失敗' })
  }
})

/** 직원별 부여 내역 조회 */
router.get('/grants/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params
    const result = await pool.query(
      `SELECT g.id, g.user_id, g.grant_date, g.expires_at, g.days, g.grant_type,
              g.service_years_at_grant, g.notes, g.created_by, g.created_at,
              u.name AS user_name, u.hire_date
       FROM vacation_grants g
       JOIN users u ON u.id = g.user_id
       WHERE g.user_id = $1
       ORDER BY g.grant_date DESC`,
      [userId]
    )
    res.json(result.rows)
  } catch (error: any) {
    console.error('admin grants error:', error.message)
    res.status(500).json({ error: '조회 실패' })
  }
})

/** 수동 부여 */
router.post('/grants', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, grantDate, days, grantType, expiresAt, notes } = req.body as {
      userId: number
      grantDate: string
      days: number
      grantType?: GrantType
      expiresAt?: string
      notes?: string
    }
    if (!userId || !grantDate || days === undefined) {
      return res.status(400).json({ error: 'userId/grantDate/days は必須です' })
    }

    const grant = new Date(grantDate)
    if (isNaN(grant.getTime())) {
      return res.status(400).json({ error: '付与日が不正です' })
    }
    const exp = expiresAt ? new Date(expiresAt) : expiryDate(grant)
    if (isNaN(exp.getTime())) {
      return res.status(400).json({ error: '有効期限が不正です' })
    }

    // 근속연수 계산 (옵션)
    const userResult = await pool.query('SELECT hire_date FROM users WHERE id = $1', [userId])
    let serviceYears: number | null = null
    if (userResult.rows[0]?.hire_date) {
      const hireDate = new Date(userResult.rows[0].hire_date)
      if (!isNaN(hireDate.getTime())) {
        serviceYears = calcServiceYearsAtGrant(hireDate, grant)
      }
    }

    const result = await pool.query(
      `INSERT INTO vacation_grants
       (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        grant.toISOString().slice(0, 10),
        exp.toISOString().slice(0, 10),
        days,
        grantType || 'manual',
        serviceYears,
        notes || null,
        req.user!.id,
      ]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('grant create error:', error.message)
    res.status(500).json({ error: '付与失敗' })
  }
})

/** 부여 수정 */
router.patch('/grants/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { days, expiresAt, notes } = req.body as {
      days?: number
      expiresAt?: string
      notes?: string
    }
    const result = await pool.query(
      `UPDATE vacation_grants
       SET days = COALESCE($1, days),
           expires_at = COALESCE($2, expires_at),
           notes = COALESCE($3, notes)
       WHERE id = $4
       RETURNING *`,
      [days, expiresAt, notes, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '付与履歴が見つかりません' })
    }
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('grant update error:', error.message)
    res.status(500).json({ error: '修正失敗' })
  }
})

/** 부여 삭제 */
router.delete('/grants/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `DELETE FROM vacation_grants WHERE id = $1 RETURNING id`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '見つかりません' })
    }
    res.json({ success: true })
  } catch (error: any) {
    console.error('grant delete error:', error.message)
    res.status(500).json({ error: '削除失敗' })
  }
})

/** 직원별 잔여 요약 (부여 관리 페이지의 직원 리스트용) */
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.department, u.team, u.hire_date, u.employment_status,
             COALESCE(SUM(CASE WHEN g.expires_at >= CURRENT_DATE THEN g.days ELSE 0 END), 0) AS active_granted,
             COALESCE(SUM(CASE WHEN g.expires_at < CURRENT_DATE THEN g.days ELSE 0 END), 0) AS expired,
             (SELECT COALESCE(SUM(consumed_days), 0)
                FROM vacation_requests vr
                WHERE vr.user_id = u.id AND vr.status = 'approved') AS consumed,
             (SELECT COALESCE(SUM(consumed_days), 0)
                FROM vacation_requests vr
                WHERE vr.user_id = u.id AND vr.status = 'pending') AS pending
      FROM users u
      LEFT JOIN vacation_grants g ON g.user_id = u.id
      WHERE u.hire_date IS NOT NULL
      GROUP BY u.id
      ORDER BY u.department NULLS LAST, u.hire_date DESC
    `)
    res.json(
      result.rows.map((r) => {
        const granted = Number(r.active_granted) || 0
        const consumed = Number(r.consumed) || 0
        const pending = Number(r.pending) || 0
        return {
          id: r.id,
          name: r.name,
          email: r.email,
          department: r.department,
          team: r.team,
          hire_date: r.hire_date,
          employment_status: r.employment_status,
          granted,
          consumed,
          pending,
          expired: Number(r.expired) || 0,
          remaining: Math.round((granted - consumed - pending) * 10) / 10,
        }
      })
    )
  } catch (error: any) {
    console.error('admin summary error:', error.message)
    res.status(500).json({ error: '집계 실패' })
  }
})

export default router
