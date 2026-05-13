import { Router, Response } from 'express'
import multer from 'multer'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { requireAppAccess } from '../middleware/requireAppAccess'

const router = Router()
router.use(authMiddleware, requireAppAccess('erp'))

// CEO 승인이 필요한 기준 금액 (¥)
const CEO_APPROVAL_THRESHOLD = 50000
// 증빙 제출 기한 (수강 종료일로부터 일수)
const EVIDENCE_DUE_DAYS = 14

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/heic',
      'image/heif',
      'image/webp',
    ]
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('対応していないファイル形式です (PDF / JPG / PNG / HEIC / WEBP のみ)'))
  },
})

function isReviewer(req: AuthRequest): boolean {
  return req.user!.role === 'admin' || req.user!.role === 'office_assistant'
}
function isOwnerOrReviewer(req: AuthRequest, ownerId: string): boolean {
  return req.user!.id === ownerId || isReviewer(req)
}

function addDaysISO(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const REQUEST_SELECT = `
  er.id, er.user_id, u.name AS user_name, u.department,
  er.fiscal_year, er.course_type, er.schedule_type,
  er.provider, er.course_name, er.course_url,
  er.start_date, er.end_date, er.cost, er.reimbursed_amount,
  er.relevance, er.study_plan,
  er.status, er.ceo_approval_required, er.ceo_approved_at, er.ceo_approved_by,
  er.approver_id, er.approved_at, er.paid_at,
  er.evidence_due_date, er.completed_at,
  er.reject_reason, er.refund_reason, er.submitted_at,
  er.created_at, er.updated_at,
  (
    SELECT json_agg(json_build_object(
      'id', f.id, 'kind', f.kind, 'file_name', f.file_name,
      'file_size', f.file_size, 'mime_type', f.mime_type,
      'uploaded_at', f.uploaded_at
    ) ORDER BY f.uploaded_at)
    FROM education_files f WHERE f.request_id = er.id
  ) AS files
`

// ============================================================
// 본인용 라우트
// ============================================================

/** 1. 내 통계 (연도별 집행 총액 / 활성 신청) */
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const year = Number(req.query.year) || new Date().getFullYear()

    const sumRes = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('paid', 'evidence_pending', 'completed') THEN reimbursed_amount END), 0) AS total_spent,
         COUNT(*) FILTER (WHERE status NOT IN ('draft', 'cancelled', 'rejected', 'refunded')) AS active_count
       FROM education_requests
       WHERE user_id = $1 AND fiscal_year = $2`,
      [userId, year]
    )

    res.json({
      year,
      total_spent: Number(sumRes.rows[0]?.total_spent || 0),
      active_count: Number(sumRes.rows[0]?.active_count || 0),
      ceo_approval_threshold: CEO_APPROVAL_THRESHOLD,
      evidence_due_days: EVIDENCE_DUE_DAYS,
    })
  } catch (error: any) {
    console.error('education/stats error:', error.message)
    res.status(500).json({ error: '統計の取得に失敗しました' })
  }
})

/** 2. 내 신청 이력 */
router.get('/my-history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const statusFilter = (req.query.status as string | undefined) || ''
    const where: string[] = ['er.user_id = $1']
    const params: any[] = [userId]
    if (statusFilter) {
      where.push(`er.status = $${params.length + 1}`)
      params.push(statusFilter)
    }
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM education_requests er
       JOIN users u ON u.id = er.user_id
       WHERE ${where.join(' AND ')}
       ORDER BY er.created_at DESC`,
      params
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('education/my-history error:', error.message)
    res.status(500).json({ error: '履歴の取得に失敗しました' })
  }
})

/** 3. 단건 조회 */
router.get('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM education_requests er
       JOIN users u ON u.id = er.user_id
       WHERE er.id = $1`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = result.rows[0]
    if (!isOwnerOrReviewer(req, String(row.user_id))) {
      return res.status(403).json({ error: '権限がありません' })
    }
    res.json(row)
  } catch (error: any) {
    console.error('education GET single error:', error.message)
    res.status(500).json({ error: '取得に失敗しました' })
  }
})

/** 4. 신규 작성 (임시저장 또는 즉시 제출) */
router.post('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const {
      course_type,
      schedule_type,
      provider,
      course_name,
      course_url,
      start_date,
      end_date,
      cost,
      relevance,
      study_plan,
      submit, // true 면 pending, 아니면 draft
    } = req.body as {
      course_type?: string
      schedule_type?: string
      provider?: string
      course_name?: string
      course_url?: string
      start_date?: string
      end_date?: string
      cost?: number
      relevance?: string
      study_plan?: string
      submit?: boolean
    }

    if (!['offline', 'online', 'book'].includes(course_type || '')) {
      return res.status(400).json({ error: '受講形態が正しくありません' })
    }
    if (!['after_work', 'weekend', 'self_paced'].includes(schedule_type || '')) {
      return res.status(400).json({ error: 'スケジュールが正しくありません' })
    }
    if (!provider || !provider.trim()) {
      return res.status(400).json({ error: '受講機関は必須です' })
    }
    if (!course_name || !course_name.trim()) {
      return res.status(400).json({ error: '受講内容/科目名は必須です' })
    }
    if (!start_date || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({ error: '受講開始日が正しくありません' })
    }
    if (!end_date || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return res.status(400).json({ error: '受講終了日が正しくありません' })
    }
    if (new Date(end_date).getTime() < new Date(start_date).getTime()) {
      return res.status(400).json({ error: '終了日は開始日以降の日付にしてください' })
    }
    if (!Number.isInteger(cost) || (cost as number) < 0) {
      return res.status(400).json({ error: '受講料は0以上の整数で入力してください' })
    }
    if (submit) {
      if (!relevance || !relevance.trim()) {
        return res.status(400).json({ error: '業務関連性は必須です' })
      }
      if (!study_plan || !study_plan.trim()) {
        return res.status(400).json({ error: '受講計画書は必須です' })
      }
    }

    const fiscalYear = new Date(start_date).getFullYear()
    const ceoRequired = (cost as number) >= CEO_APPROVAL_THRESHOLD
    const status = submit ? 'pending' : 'draft'
    const submittedAt = submit ? new Date() : null

    const insert = await pool.query(
      `INSERT INTO education_requests
        (user_id, fiscal_year, course_type, schedule_type, provider, course_name, course_url,
         start_date, end_date, cost, relevance, study_plan,
         status, ceo_approval_required, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING id`,
      [
        userId,
        fiscalYear,
        course_type,
        schedule_type,
        provider.trim(),
        course_name.trim(),
        course_url ? String(course_url).trim() : null,
        start_date,
        end_date,
        cost,
        relevance ? String(relevance).trim() : '',
        study_plan ? String(study_plan).trim() : '',
        status,
        ceoRequired,
        submittedAt,
      ]
    )

    const newId = insert.rows[0].id
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM education_requests er JOIN users u ON u.id = er.user_id
       WHERE er.id = $1`,
      [newId]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('education POST request error:', error.message)
    res.status(500).json({ error: '申請に失敗しました' })
  }
})

/** 5. 본인 수정 (draft / pending 상태) */
router.patch('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, user_id, status FROM education_requests WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]
    const owner = String(row.user_id)
    if (!isOwnerOrReviewer(req, owner)) {
      return res.status(403).json({ error: '権限がありません' })
    }
    if (!isReviewer(req) && !['draft', 'pending'].includes(row.status)) {
      return res.status(400).json({ error: 'この状態では修正できません' })
    }

    const body = req.body as Record<string, any>
    const allowed = [
      'course_type',
      'schedule_type',
      'provider',
      'course_name',
      'course_url',
      'start_date',
      'end_date',
      'cost',
      'relevance',
      'study_plan',
    ]
    const fields: string[] = []
    const params: any[] = []
    let idx = 1
    for (const k of allowed) {
      if (body[k] === undefined) continue
      if (k === 'cost') {
        if (!Number.isInteger(body.cost) || body.cost < 0) {
          return res.status(400).json({ error: '受講料は0以上の整数で入力してください' })
        }
        fields.push(`cost = $${idx++}`)
        params.push(body.cost)
        fields.push(`ceo_approval_required = $${idx++}`)
        params.push(body.cost >= CEO_APPROVAL_THRESHOLD)
        continue
      }
      if (k === 'start_date') {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.start_date)) {
          return res.status(400).json({ error: '受講開始日が正しくありません' })
        }
        fields.push(`start_date = $${idx++}`)
        params.push(body.start_date)
        fields.push(`fiscal_year = $${idx++}`)
        params.push(new Date(body.start_date).getFullYear())
        continue
      }
      if (k === 'end_date' && !/^\d{4}-\d{2}-\d{2}$/.test(body.end_date)) {
        return res.status(400).json({ error: '受講終了日が正しくありません' })
      }
      fields.push(`${k} = $${idx++}`)
      params.push(typeof body[k] === 'string' ? body[k].trim() : body[k])
    }

    // submit 플래그: draft → pending 전환
    if (body.submit === true && row.status === 'draft') {
      fields.push(`status = 'pending'`)
      fields.push(`submitted_at = NOW()`)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '更新する内容がありません' })
    }
    fields.push(`updated_at = NOW()`)
    params.push(id)

    await pool.query(
      `UPDATE education_requests SET ${fields.join(', ')} WHERE id = $${idx}`,
      params
    )

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM education_requests er JOIN users u ON u.id = er.user_id
       WHERE er.id = $1`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('education PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

/** 6. 본인 취소 (cancelled 마킹 — pending/approved 까지만, draft 는 그냥 삭제) */
router.delete('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, user_id, status FROM education_requests WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]
    if (!isOwnerOrReviewer(req, String(row.user_id))) {
      return res.status(403).json({ error: '権限がありません' })
    }

    if (row.status === 'draft') {
      await pool.query(`DELETE FROM education_requests WHERE id = $1`, [id])
      return res.json({ message: 'deleted' })
    }

    if (!['pending', 'approved'].includes(row.status) && !isReviewer(req)) {
      return res.status(400).json({ error: 'この状態では取消できません' })
    }

    await pool.query(
      `UPDATE education_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    )
    res.json({ message: 'cancelled' })
  } catch (error: any) {
    console.error('education DELETE error:', error.message)
    res.status(500).json({ error: '取消に失敗しました' })
  }
})

/** 7. 파일 업로드 */
router.post(
  '/requests/:id/files',
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { kind } = req.body as { kind?: string }
      if (!req.file) return res.status(400).json({ error: 'ファイルがありません' })
      if (!['certificate', 'book_record', 'progress', 'receipt'].includes(kind || '')) {
        return res
          .status(400)
          .json({ error: 'kind は certificate / book_record / progress / receipt のいずれかです' })
      }

      const existing = await pool.query(
        `SELECT user_id, status FROM education_requests WHERE id = $1`,
        [id]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: '申請が見つかりません' })
      }
      const owner = String(existing.rows[0].user_id)
      if (!isOwnerOrReviewer(req, owner)) {
        return res.status(403).json({ error: '権限がありません' })
      }

      const fileDataBase64 = req.file.buffer.toString('base64')
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')

      const insert = await pool.query(
        `INSERT INTO education_files
          (request_id, kind, file_name, file_size, mime_type, file_data, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, kind, file_name, file_size, mime_type, uploaded_at`,
        [id, kind, originalName, req.file.size, req.file.mimetype, fileDataBase64, req.user!.id]
      )

      res.json(insert.rows[0])
    } catch (error: any) {
      console.error('education file upload error:', error.message)
      res.status(500).json({ error: error.message || 'アップロードに失敗しました' })
    }
  }
)

/** 8. 첨부 다운로드 */
router.get('/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const result = await pool.query(
      `SELECT f.file_name, f.mime_type, f.file_data, r.user_id
       FROM education_files f
       JOIN education_requests r ON r.id = f.request_id
       WHERE f.id = $1`,
      [fileId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ファイルが見つかりません' })
    }
    const row = result.rows[0]
    if (!isOwnerOrReviewer(req, String(row.user_id))) {
      return res.status(403).json({ error: '権限がありません' })
    }
    const buf = Buffer.from(row.file_data, 'base64')
    res.setHeader('Content-Type', row.mime_type)
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(row.file_name)}"`
    )
    res.send(buf)
  } catch (error: any) {
    console.error('education file download error:', error.message)
    res.status(500).json({ error: 'ダウンロードに失敗しました' })
  }
})

/** 9. 첨부 삭제 */
router.delete('/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const result = await pool.query(
      `SELECT f.id, r.user_id, r.status
       FROM education_files f
       JOIN education_requests r ON r.id = f.request_id
       WHERE f.id = $1`,
      [fileId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ファイルが見つかりません' })
    }
    const row = result.rows[0]
    if (!isOwnerOrReviewer(req, String(row.user_id))) {
      return res.status(403).json({ error: '権限がありません' })
    }
    if (!isReviewer(req) && row.status === 'completed') {
      return res.status(400).json({ error: '完了済みのため削除できません' })
    }
    await pool.query(`DELETE FROM education_files WHERE id = $1`, [fileId])
    res.json({ message: 'deleted' })
  } catch (error: any) {
    console.error('education file DELETE error:', error.message)
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ============================================================
// 관리자 라우트
// ============================================================

/** A1. 관리자 — 전체 목록 */
router.get('/admin/list', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })

    const statusFilter = (req.query.status as string | undefined) || ''
    const yearFilter = Number(req.query.year)

    const where: string[] = []
    const params: any[] = []
    let idx = 1
    if (statusFilter) {
      where.push(`er.status = $${idx++}`)
      params.push(statusFilter)
    }
    if (Number.isInteger(yearFilter) && yearFilter > 0) {
      where.push(`er.fiscal_year = $${idx++}`)
      params.push(yearFilter)
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM education_requests er
       JOIN users u ON u.id = er.user_id
       ${whereClause}
       ORDER BY er.created_at DESC`,
      params
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('education/admin/list error:', error.message)
    res.status(500).json({ error: '一覧の取得に失敗しました' })
  }
})

/** A2. 관리자 — 상태 전이
 *   action:
 *     approve         : pending → approved (+ CEO 승인 필요건은 ceo_approved_at/by 동시 기록)
 *     reject          : pending → rejected (+ reject_reason)
 *     mark_paid       : approved → paid (+ evidence_due_date = end_date + 14)
 *     mark_completed  : evidence_pending → completed (+ reimbursed_amount 확정)
 *     refund          : any → refunded (+ refund_reason)
 *     reopen          : 임의의 상태 → pending (운영용 되돌리기)
 */
router.patch('/admin/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const { id } = req.params
    const { action, reject_reason, refund_reason, reimbursed_amount } = req.body as {
      action?: string
      reject_reason?: string
      refund_reason?: string
      reimbursed_amount?: number
    }

    const existing = await pool.query(`SELECT * FROM education_requests WHERE id = $1`, [id])
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]

    if (action === 'approve') {
      if (row.status !== 'pending') {
        return res.status(400).json({ error: '承認待ちの申請のみ承認できます' })
      }
      const ceoFields = row.ceo_approval_required
        ? `, ceo_approved_at = NOW(), ceo_approved_by = $3`
        : ''
      const params: any[] = [id, req.user!.id]
      if (row.ceo_approval_required) params.push(req.user!.id)
      await pool.query(
        `UPDATE education_requests
         SET status='approved', approver_id=$2, approved_at=NOW(), updated_at=NOW()${ceoFields}
         WHERE id=$1`,
        params
      )
    } else if (action === 'reject') {
      if (!['pending', 'approved'].includes(row.status)) {
        return res.status(400).json({ error: 'この状態では却下できません' })
      }
      await pool.query(
        `UPDATE education_requests
         SET status='rejected', reject_reason=$2, approver_id=$3, updated_at=NOW()
         WHERE id=$1`,
        [id, reject_reason ? String(reject_reason).trim() : null, req.user!.id]
      )
    } else if (action === 'mark_paid') {
      if (row.status !== 'approved') {
        return res.status(400).json({ error: '承認済みの申請のみ決済処理できます' })
      }
      const evidenceDue = addDaysISO(row.end_date.toISOString().slice(0, 10), EVIDENCE_DUE_DAYS)
      // 종료일이 이미 지났으면 paid → 곧장 evidence_pending 으로 진행
      const today = new Date().toISOString().slice(0, 10)
      const newStatus = row.end_date.toISOString().slice(0, 10) <= today ? 'evidence_pending' : 'paid'
      await pool.query(
        `UPDATE education_requests
         SET status=$2, paid_at=NOW(), evidence_due_date=$3, updated_at=NOW()
         WHERE id=$1`,
        [id, newStatus, evidenceDue]
      )
    } else if (action === 'mark_completed') {
      if (row.status !== 'evidence_pending') {
        return res.status(400).json({ error: '証憑待ちの申請のみ完了処理できます' })
      }
      const finalAmount =
        Number.isInteger(reimbursed_amount) && (reimbursed_amount as number) >= 0
          ? (reimbursed_amount as number)
          : row.cost
      await pool.query(
        `UPDATE education_requests
         SET status='completed', completed_at=NOW(), reimbursed_amount=$2, updated_at=NOW()
         WHERE id=$1`,
        [id, finalAmount]
      )
    } else if (action === 'refund') {
      await pool.query(
        `UPDATE education_requests
         SET status='refunded', refund_reason=$2, updated_at=NOW()
         WHERE id=$1`,
        [id, refund_reason ? String(refund_reason).trim() : null]
      )
    } else if (action === 'reopen') {
      await pool.query(
        `UPDATE education_requests
         SET status='pending', approved_at=NULL, paid_at=NULL,
             evidence_due_date=NULL, completed_at=NULL,
             reject_reason=NULL, refund_reason=NULL,
             ceo_approved_at=NULL, ceo_approved_by=NULL,
             updated_at=NOW()
         WHERE id=$1`,
        [id]
      )
    } else {
      return res.status(400).json({ error: '不正な action です' })
    }

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM education_requests er JOIN users u ON u.id = er.user_id
       WHERE er.id = $1`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('education admin PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

/** A3. 관리자 — 일괄 자동 상태 전이 (paid → evidence_pending) — 수강 종료일 도래분
 *  - 별도 cron 없이 admin/list 조회 직전에 한 번 호출하는 식으로 사용 가능
 */
router.post('/admin/sweep', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const result = await pool.query(
      `UPDATE education_requests
       SET status='evidence_pending', updated_at=NOW()
       WHERE status='paid' AND end_date <= CURRENT_DATE
       RETURNING id`
    )
    res.json({ updated: result.rowCount || 0 })
  } catch (error: any) {
    console.error('education/admin/sweep error:', error.message)
    res.status(500).json({ error: '一括更新に失敗しました' })
  }
})

export default router
