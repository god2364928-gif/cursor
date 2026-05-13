import { Router, Response, NextFunction } from 'express'
import multer from 'multer'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { requireAppAccess } from '../middleware/requireAppAccess'

const router = Router()
router.use(authMiddleware, requireAppAccess('erp'))

// 회사 부담 한도 (1만 엔)
const REIMBURSEMENT_CAP = 10000

// 파일 업로드: 진단서(PDF/이미지) 메모리 → Base64 → DB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    // PDF 또는 image/* 전부 허용 (HEIC/HEIF/WEBP 등 브라우저별 mime 다양성 대응)
    const ok =
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'application/octet-stream' ||
      file.mimetype.startsWith('image/')
    if (ok) cb(null, true)
    else cb(new Error(`対応していないファイル形式です: ${file.mimetype}`))
  },
})

// multer 에러를 JSON 으로 변환 (silent 500 방지)
function uploadSingle(field: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ファイルサイズが上限 (25MB) を超えています' })
        }
        return res.status(400).json({ error: err.message || 'アップロードに失敗しました' })
      }
      next()
    })
  }
}

function isReviewer(req: AuthRequest): boolean {
  return req.user!.role === 'admin' || req.user!.role === 'office_assistant'
}

function isOwnerOrReviewer(req: AuthRequest, ownerId: string): boolean {
  return req.user!.id === ownerId || isReviewer(req)
}

function calcReimbursement(amountPaid: number): number {
  return Math.max(0, Math.min(amountPaid, REIMBURSEMENT_CAP))
}

const REQUEST_SELECT = `
  hc.id, hc.user_id, u.name AS user_name, u.department,
  hc.fiscal_year, hc.exam_date,
  hc.hospital_name, hc.hospital_address,
  hc.checked_items, hc.amount_paid, hc.amount_reimbursed,
  hc.status, hc.vacation_granted, hc.vacation_request_id,
  hc.reviewed_by, hc.reviewed_at, hc.reject_reason, hc.note,
  hc.created_at, hc.updated_at,
  (
    SELECT json_agg(json_build_object(
      'id', f.id, 'kind', f.kind, 'file_name', f.file_name,
      'file_size', f.file_size, 'mime_type', f.mime_type,
      'uploaded_at', f.uploaded_at
    ) ORDER BY f.uploaded_at)
    FROM health_checkup_files f WHERE f.request_id = hc.id
  ) AS files
`

/** 1. 내 자격·현황
 *  - 최근 수검 / 다음 마감 / 자격 안내용
 */
router.get('/me', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const userInfo = await pool.query(
      `SELECT contract_start_date, employment_status FROM users WHERE id = $1`,
      [userId]
    )
    const hireDate: string | null = userInfo.rows[0]?.contract_start_date
      ? new Date(userInfo.rows[0].contract_start_date).toISOString().slice(0, 10)
      : null

    const latest = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM health_checkup_requests hc
       JOIN users u ON u.id = hc.user_id
       WHERE hc.user_id = $1 AND hc.status <> 'rejected'
       ORDER BY hc.exam_date DESC
       LIMIT 1`,
      [userId]
    )

    // 休暇システム の health_check (Notion 마이그레이션 등 과거 데이터) 도 포함해
    // 가장 최근 검진일 계산. 자격 판정의 기준.
    const combinedLatest = await pool.query(
      `SELECT MAX(d) AS last_exam, (ARRAY_AGG(src ORDER BY d DESC))[1] AS last_source
       FROM (
         SELECT exam_date AS d, 'health_checkup' AS src
           FROM health_checkup_requests
           WHERE user_id = $1 AND status <> 'rejected'
         UNION ALL
         SELECT start_date AS d, 'vacation' AS src
           FROM vacation_requests
           WHERE user_id = $1
             AND leave_type = 'health_check'
             AND status IN ('approved', 'pending')
       ) t`,
      [userId]
    )
    const latestExamRow = combinedLatest.rows[0] || {}
    const latestExamDate: string | null = latestExamRow.last_exam
      ? new Date(latestExamRow.last_exam).toISOString().slice(0, 10)
      : null

    const now = new Date()
    const currentYear = now.getFullYear()

    res.json({
      hire_date: hireDate,
      current_year: currentYear,
      latest: latest.rows[0] || null,
      latest_exam_date: latestExamDate,
      latest_source: latestExamRow.last_source || null,
      reimbursement_cap: REIMBURSEMENT_CAP,
    })
  } catch (error: any) {
    console.error('health-checkup/me error:', error.message)
    res.status(500).json({ error: '現状の取得に失敗しました' })
  }
})

/** 2. 내 신청 이력 (연도별)
 *  + vacation_requests 의 health_check 휴가 중 health_checkup_requests 와 연결되지 않은
 *    과거 데이터 (Notion 마이그레이션 등) 도 함께 반환 → 사용자가 통합 이력으로 본다.
 */
router.get('/my-history', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const [result, vacResult] = await Promise.all([
      pool.query(
        `SELECT ${REQUEST_SELECT}
         FROM health_checkup_requests hc
         JOIN users u ON u.id = hc.user_id
         WHERE hc.user_id = $1
         ORDER BY hc.exam_date DESC, hc.created_at DESC`,
        [userId]
      ),
      pool.query(
        `SELECT vr.id, vr.start_date AS exam_date, vr.reason, vr.status, vr.created_at,
                EXTRACT(YEAR FROM vr.start_date)::int AS fiscal_year
         FROM vacation_requests vr
         WHERE vr.user_id = $1
           AND vr.leave_type = 'health_check'
           AND vr.status IN ('approved', 'pending')
           AND NOT EXISTS (
             SELECT 1 FROM health_checkup_requests hc
             WHERE hc.vacation_request_id = vr.id
           )
         ORDER BY vr.start_date DESC`,
        [userId]
      ),
    ])
    res.json({
      items: result.rows,
      vacation_records: vacResult.rows.map((r) => ({
        id: r.id,
        source: 'vacation' as const,
        exam_date: new Date(r.exam_date).toISOString().slice(0, 10),
        fiscal_year: r.fiscal_year,
        reason: r.reason,
        status: r.status,
        created_at: r.created_at,
      })),
    })
  } catch (error: any) {
    console.error('health-checkup/my-history error:', error.message)
    res.status(500).json({ error: '履歴の取得に失敗しました' })
  }
})

/** 3. 보고 등록 (사후 보고) */
router.post('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const {
      exam_date,
      hospital_name,
      hospital_address,
      checked_items,
      amount_paid,
      note,
    } = req.body as {
      exam_date?: string
      hospital_name?: string
      hospital_address?: string
      checked_items?: { basic?: string[]; skipped?: string[] }
      amount_paid?: number
      note?: string
    }

    if (!exam_date || !/^\d{4}-\d{2}-\d{2}$/.test(exam_date)) {
      return res.status(400).json({ error: '受診日が正しくありません (YYYY-MM-DD)' })
    }
    if (!hospital_name || typeof hospital_name !== 'string' || !hospital_name.trim()) {
      return res.status(400).json({ error: '医療機関名は必須です' })
    }
    if (!Number.isInteger(amount_paid) || (amount_paid as number) < 0) {
      return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
    }

    const examDate = new Date(exam_date)
    if (isNaN(examDate.getTime())) {
      return res.status(400).json({ error: '受診日が正しくありません' })
    }
    if (examDate.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
      return res.status(400).json({ error: '受診日は未来日付にできません (受診完了後に提出してください)' })
    }

    const fiscalYear = examDate.getFullYear()
    const items = {
      basic: Array.isArray(checked_items?.basic) ? checked_items!.basic : [],
      skipped: Array.isArray(checked_items?.skipped) ? checked_items!.skipped : [],
    }
    const reimbursed = calcReimbursement(amount_paid as number)

    const insert = await pool.query(
      `INSERT INTO health_checkup_requests
        (user_id, fiscal_year, exam_date, hospital_name, hospital_address,
         checked_items, amount_paid, amount_reimbursed, note, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, 'submitted')
       RETURNING id`,
      [
        userId,
        fiscalYear,
        exam_date,
        hospital_name.trim(),
        hospital_address ? String(hospital_address).trim() : null,
        JSON.stringify(items),
        amount_paid,
        reimbursed,
        note ? String(note).trim() : null,
      ]
    )

    const newId = insert.rows[0].id
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM health_checkup_requests hc
       JOIN users u ON u.id = hc.user_id
       WHERE hc.id = $1`,
      [newId]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    // unique 위반 (같은 연도 중복) 처리
    if (error?.code === '23505') {
      return res.status(409).json({ error: '同じ年度の申請が既に存在します' })
    }
    console.error('health-checkup POST request error:', error.message)
    res.status(500).json({ error: '申請に失敗しました' })
  }
})

/** 4. 본인 수정 (관리자 검토 전까지) */
router.patch('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, user_id, status FROM health_checkup_requests WHERE id = $1`,
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
    if (!isReviewer(req) && row.status !== 'submitted') {
      return res.status(400).json({ error: '審査済みのため修正できません' })
    }

    const {
      exam_date,
      hospital_name,
      hospital_address,
      checked_items,
      amount_paid,
      note,
    } = req.body as {
      exam_date?: string
      hospital_name?: string
      hospital_address?: string
      checked_items?: { basic?: string[]; skipped?: string[] }
      amount_paid?: number
      note?: string
    }

    const fields: string[] = []
    const params: any[] = []
    let idx = 1
    if (exam_date !== undefined) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(exam_date)) {
        return res.status(400).json({ error: '受診日が正しくありません' })
      }
      fields.push(`exam_date = $${idx++}`)
      params.push(exam_date)
      fields.push(`fiscal_year = $${idx++}`)
      params.push(new Date(exam_date).getFullYear())
    }
    if (hospital_name !== undefined) {
      if (!hospital_name.trim()) return res.status(400).json({ error: '医療機関名は必須です' })
      fields.push(`hospital_name = $${idx++}`)
      params.push(hospital_name.trim())
    }
    if (hospital_address !== undefined) {
      fields.push(`hospital_address = $${idx++}`)
      params.push(hospital_address ? String(hospital_address).trim() : null)
    }
    if (checked_items !== undefined) {
      const items = {
        basic: Array.isArray(checked_items?.basic) ? checked_items.basic : [],
        skipped: Array.isArray(checked_items?.skipped) ? checked_items.skipped : [],
      }
      fields.push(`checked_items = $${idx++}::jsonb`)
      params.push(JSON.stringify(items))
    }
    if (amount_paid !== undefined) {
      if (!Number.isInteger(amount_paid) || (amount_paid as number) < 0) {
        return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
      }
      fields.push(`amount_paid = $${idx++}`)
      params.push(amount_paid)
      fields.push(`amount_reimbursed = $${idx++}`)
      params.push(calcReimbursement(amount_paid as number))
    }
    if (note !== undefined) {
      fields.push(`note = $${idx++}`)
      params.push(note ? String(note).trim() : null)
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: '更新する内容がありません' })
    }

    fields.push(`updated_at = NOW()`)
    params.push(id)

    await pool.query(
      `UPDATE health_checkup_requests SET ${fields.join(', ')} WHERE id = $${idx}`,
      params
    )

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM health_checkup_requests hc
       JOIN users u ON u.id = hc.user_id
       WHERE hc.id = $1`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('health-checkup PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

/** 5. 본인 취소 (submitted 만, 관리자는 언제든) */
router.delete('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, user_id, status, vacation_request_id FROM health_checkup_requests WHERE id = $1`,
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
    if (!isReviewer(req) && row.status !== 'submitted') {
      return res.status(400).json({ error: '審査済みのため取消できません' })
    }

    // 휴가가 부여된 상태라면 함께 정리
    if (row.vacation_request_id) {
      await pool.query(`DELETE FROM vacation_requests WHERE id = $1`, [row.vacation_request_id])
    }
    await pool.query(`DELETE FROM health_checkup_requests WHERE id = $1`, [id])
    res.json({ message: 'deleted' })
  } catch (error: any) {
    console.error('health-checkup DELETE error:', error.message)
    res.status(500).json({ error: '取消に失敗しました' })
  }
})

/** 6. 파일 업로드 (진단서 / 영수증 — 호환성) */
router.post(
  '/requests/:id/files',
  uploadSingle('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { kind } = req.body as { kind?: string }
      if (!req.file) return res.status(400).json({ error: 'ファイルがありません' })
      if (kind !== 'receipt' && kind !== 'result') {
        return res.status(400).json({ error: 'kind は receipt / result のいずれかです' })
      }

      const existing = await pool.query(
        `SELECT user_id, status FROM health_checkup_requests WHERE id = $1`,
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

      // 같은 kind 가 이미 있으면 교체 (1요청당 영수증 1·결과서 1)
      await pool.query(
        `DELETE FROM health_checkup_files WHERE request_id = $1 AND kind = $2`,
        [id, kind]
      )

      const insert = await pool.query(
        `INSERT INTO health_checkup_files
          (request_id, kind, file_name, file_size, mime_type, file_data, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, kind, file_name, file_size, mime_type, uploaded_at`,
        [id, kind, originalName, req.file.size, req.file.mimetype, fileDataBase64, req.user!.id]
      )

      res.json(insert.rows[0])
    } catch (error: any) {
      console.error('health-checkup file upload error:', error.message)
      res.status(500).json({ error: error.message || 'アップロードに失敗しました' })
    }
  }
)

/** 7. 첨부 파일 다운로드 */
router.get('/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const result = await pool.query(
      `SELECT f.file_name, f.mime_type, f.file_data, r.user_id
       FROM health_checkup_files f
       JOIN health_checkup_requests r ON r.id = f.request_id
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
    console.error('health-checkup file download error:', error.message)
    res.status(500).json({ error: 'ダウンロードに失敗しました' })
  }
})

/** 8. 첨부 파일 삭제 */
router.delete('/files/:fileId', async (req: AuthRequest, res: Response) => {
  try {
    const { fileId } = req.params
    const result = await pool.query(
      `SELECT f.id, r.user_id, r.status
       FROM health_checkup_files f
       JOIN health_checkup_requests r ON r.id = f.request_id
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
    if (!isReviewer(req) && row.status !== 'submitted') {
      return res.status(400).json({ error: '審査済みのため削除できません' })
    }
    await pool.query(`DELETE FROM health_checkup_files WHERE id = $1`, [fileId])
    res.json({ message: 'deleted' })
  } catch (error: any) {
    console.error('health-checkup file DELETE error:', error.message)
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
      where.push(`hc.status = $${idx++}`)
      params.push(statusFilter)
    }
    if (Number.isInteger(yearFilter) && yearFilter > 0) {
      where.push(`hc.fiscal_year = $${idx++}`)
      params.push(yearFilter)
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM health_checkup_requests hc
       JOIN users u ON u.id = hc.user_id
       ${whereClause}
       ORDER BY hc.exam_date DESC, hc.created_at DESC`,
      params
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('health-checkup/admin/list error:', error.message)
    res.status(500).json({ error: '一覧の取得に失敗しました' })
  }
})

/** A2. 관리자 — 검토 / 상태 변경
 *   action: 'review' | 'reimburse' | 'reject' | 'grant_vacation' | 'revoke_vacation'
 *   review        : status='reviewed' (휴가는 자동 부여 — Phase E)
 *   reimburse     : status='reimbursed' + amount_reimbursed 확정
 *   reject        : status='rejected' + reject_reason
 *   grant_vacation: vacation_requests 에 1일 INSERT (수동 트리거)
 *   revoke_vacation: 부여한 vacation_requests 삭제
 */
router.patch('/admin/:id', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const { id } = req.params
    const { action, amount_reimbursed, reject_reason } = req.body as {
      action?: string
      amount_reimbursed?: number
      reject_reason?: string
    }

    const existing = await client.query(
      `SELECT * FROM health_checkup_requests WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]

    await client.query('BEGIN')

    if (action === 'review') {
      await client.query(
        `UPDATE health_checkup_requests
         SET status = 'reviewed', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id, req.user!.id]
      )
      // 휴가 자동 부여 (멱등)
      if (!row.vacation_granted) {
        const vac = await client.query(
          `INSERT INTO vacation_requests
            (user_id, start_date, end_date, leave_type, consumed_days, status, approver_id, approved_at, reason)
           VALUES ($1, $2, $2, 'health_check', 0, 'approved', $3, NOW(), $4)
           RETURNING id`,
          [row.user_id, row.exam_date, req.user!.id, '健康診断（自動付与）']
        )
        await client.query(
          `UPDATE health_checkup_requests
           SET vacation_granted = TRUE, vacation_request_id = $2
           WHERE id = $1`,
          [id, vac.rows[0].id]
        )
      }
    } else if (action === 'reimburse') {
      if (
        amount_reimbursed !== undefined &&
        (!Number.isInteger(amount_reimbursed) || (amount_reimbursed as number) < 0)
      ) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: '会社負担額が正しくありません' })
      }
      const finalAmount =
        amount_reimbursed !== undefined
          ? Math.min(amount_reimbursed as number, REIMBURSEMENT_CAP)
          : row.amount_reimbursed
      await client.query(
        `UPDATE health_checkup_requests
         SET status = 'reimbursed', amount_reimbursed = $2, updated_at = NOW()
         WHERE id = $1`,
        [id, finalAmount]
      )
    } else if (action === 'reject') {
      await client.query(
        `UPDATE health_checkup_requests
         SET status = 'rejected', reject_reason = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [id, reject_reason ? String(reject_reason).trim() : null, req.user!.id]
      )
      // 자동 부여된 휴가가 있으면 함께 회수
      if (row.vacation_request_id) {
        await client.query(`DELETE FROM vacation_requests WHERE id = $1`, [row.vacation_request_id])
        await client.query(
          `UPDATE health_checkup_requests SET vacation_granted = FALSE, vacation_request_id = NULL WHERE id = $1`,
          [id]
        )
      }
    } else if (action === 'grant_vacation') {
      if (row.vacation_granted) {
        await client.query('ROLLBACK')
        return res.status(400).json({ error: '既に休暇が付与されています' })
      }
      const vac = await client.query(
        `INSERT INTO vacation_requests
          (user_id, start_date, end_date, leave_type, consumed_days, status, approver_id, approved_at, reason)
         VALUES ($1, $2, $2, 'health_check', 0, 'approved', $3, NOW(), $4)
         RETURNING id`,
        [row.user_id, row.exam_date, req.user!.id, '健康診断（手動付与）']
      )
      await client.query(
        `UPDATE health_checkup_requests
         SET vacation_granted = TRUE, vacation_request_id = $2, updated_at = NOW()
         WHERE id = $1`,
        [id, vac.rows[0].id]
      )
    } else if (action === 'revoke_vacation') {
      if (row.vacation_request_id) {
        await client.query(`DELETE FROM vacation_requests WHERE id = $1`, [row.vacation_request_id])
      }
      await client.query(
        `UPDATE health_checkup_requests
         SET vacation_granted = FALSE, vacation_request_id = NULL, updated_at = NOW()
         WHERE id = $1`,
        [id]
      )
    } else {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: '不正な action です' })
    }

    await client.query('COMMIT')

    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
       FROM health_checkup_requests hc
       JOIN users u ON u.id = hc.user_id
       WHERE hc.id = $1`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('health-checkup admin PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  } finally {
    client.release()
  }
})

export default router
