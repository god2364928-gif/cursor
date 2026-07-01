/**
 * 経費申請・精算 — 라우트 (design 02 §5·§6·§7)
 *
 * 접근제어 (★확정):
 *  - ERP=본인 것만, admin/office_assistant(reviewer)=전체
 *  - 직원용 조회는 항상 WHERE user_id = req.user.id (구독은 owner_user_id)
 *  - GET /requests/:id·/attachments/:id/download: 본인 또는 reviewer
 *  - /admin/* 는 reviewer 아니면 403
 *
 * freee 는 PRODUCTION — 라우트는 런타임에 서비스 함수만 호출 (여기선 정의만).
 */

import { Router, Response, NextFunction } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { requireAppAccess } from '../middleware/requireAppAccess'
import { resendReceiptToFreee } from '../services/expenseFreee'

const router = Router()
router.use(authMiddleware, requireAppAccess('erp'))

// ============================================================
// 헬퍼
// ============================================================

function isReviewer(req: AuthRequest): boolean {
  return ['admin', 'office_assistant'].includes(req.user!.role)
}

// 신규 모델: 개인결제(reimburse_required) + 법인결제(already_paid → corp_card)
// 카테고리 검증은 앱 계층에서 수행 (DB CHECK 는 relax_expense_category.sql 로 제거됨)
const ALLOWED_CATEGORIES = [
  'transport',
  'dining',
  'meal',
  'reimburse',
  'welfare',
  'health_checkup',
  'other',
  'corp_card',
]
const ALLOWED_SETTLEMENT = ['reimburse_required', 'already_paid']
const ALLOWED_TAX_RATES = [0, 8, 10]

// multer memoryStorage 20MB, PDF/이미지/HEIC 허용 (education 패턴)
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

// multer 에러를 JSON 으로 변환 (silent 500 방지) — healthCheckup 패턴
function uploadSingle(field: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    upload.single(field)(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'ファイルサイズが上限 (20MB) を超えています' })
        }
        return res.status(400).json({ error: err.message || 'アップロードに失敗しました' })
      }
      next()
    })
  }
}

// pg 에서 돌아오는 DATE/TIMESTAMP → 'YYYY-MM-DD'
function toISODate(v: any): string | null {
  if (!v) return null
  if (typeof v === 'string') return v.slice(0, 10)
  const d = new Date(v)
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 신청 단건/목록 공통 SELECT (첨부·이력은 상세에서만 추가 조회)
const REQUEST_SELECT = `
  er.id, er.user_id, u.name AS user_name, u.department,
  er.category, er.settlement_type, er.used_at, er.amount_incl_tax,
  er.tax_rate, er.amount_tax, er.reduced_tax, er.vendor_name, er.invoice_number,
  er.account_item_id, er.tax_code, er.purpose, er.memo, er.status, er.meta,
  er.freee_receipt_id, er.freee_deal_id, er.ocr_status, er.freee_error,
  er.subscription_id, er.billing_month, er.approver_id, er.approved_at,
  er.reject_reason, er.created_at, er.updated_at, er.deleted_at
`

async function fetchRequest(id: number | string): Promise<any | null> {
  const result = await pool.query(
    `SELECT ${REQUEST_SELECT}
       FROM expense_requests er
       JOIN users u ON u.id = er.user_id
      WHERE er.id = $1 AND er.deleted_at IS NULL`,
    [id]
  )
  return result.rows[0] || null
}

// 제출 시 첨부(영수증) 최소 1건 필수 — 첨부 개수 조회
async function countAttachments(
  client: { query: (q: string, p?: any[]) => Promise<any> },
  requestId: number | string
): Promise<number> {
  const r = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM expense_attachments WHERE request_id = $1`,
    [requestId]
  )
  return Number(r.rows[0]?.cnt || 0)
}

// 상태 이력 INSERT (트랜잭션 client 또는 pool)
async function insertHistory(
  client: { query: (q: string, p?: any[]) => Promise<any> },
  requestId: number | string,
  fromStatus: string | null,
  toStatus: string,
  actorId: string | null,
  reason: string | null
): Promise<void> {
  await client.query(
    `INSERT INTO expense_status_history (request_id, from_status, to_status, actor_id, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [requestId, fromStatus, toStatus, actorId, reason]
  )
}

// ============================================================
// 본인용 라우트
// ============================================================

/** GET /requests?status= — 내 신청 이력 */
router.get('/requests', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id
    const statusFilter = (req.query.status as string | undefined) || ''
    const where: string[] = ['er.user_id = $1', 'er.deleted_at IS NULL', "er.status <> 'draft'"]
    const params: any[] = [userId]
    if (statusFilter) {
      where.push(`er.status = $${params.length + 1}`)
      params.push(statusFilter)
    }
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
         FROM expense_requests er
         JOIN users u ON u.id = er.user_id
        WHERE ${where.join(' AND ')}
        ORDER BY er.created_at DESC`,
      params
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('expense/requests list error:', error.message)
    res.status(500).json({ error: '履歴の取得に失敗しました' })
  }
})

/** GET /requests/:id — 상세 + 첨부 메타 + 상태 이력 */
router.get('/requests/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const row = await fetchRequest(id)
    if (!row) return res.status(404).json({ error: '申請が見つかりません' })
    if (String(row.user_id) !== req.user!.id && !isReviewer(req)) {
      return res.status(403).json({ error: '権限がありません' })
    }

    const attRes = await pool.query(
      `SELECT id, request_id, file_name, mime_type, file_size, file_hash, uploaded_by, uploaded_at
         FROM expense_attachments
        WHERE request_id = $1
        ORDER BY uploaded_at`,
      [id]
    )
    const histRes = await pool.query(
      `SELECT id, request_id, from_status, to_status, actor_id, reason, created_at
         FROM expense_status_history
        WHERE request_id = $1
        ORDER BY created_at`,
      [id]
    )
    res.json({ ...row, attachments: attRes.rows, history: histRes.rows })
  } catch (error: any) {
    console.error('expense/requests GET single error:', error.message)
    res.status(500).json({ error: '取得に失敗しました' })
  }
})

/** POST /requests — 신청 생성 (draft 저장 또는 즉시 제출) */
router.post('/requests', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  try {
    const userId = req.user!.id
    const b = req.body as Record<string, any>
    const {
      category,
      settlement_type,
      used_at,
      amount_incl_tax,
      tax_rate,
      reduced_tax,
      vendor_name,
      invoice_number,
      account_item_id,
      purpose,
      memo,
      meta,
      submit,
    } = b

    const isSubmit = submit === true

    // category·settlement_type 은 draft/submit 공통 필수
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'カテゴリが正しくありません' })
    }
    if (!ALLOWED_SETTLEMENT.includes(settlement_type)) {
      return res.status(400).json({ error: '精算区分が正しくありません' })
    }

    // used_at / amount_incl_tax 은 제출 시에만 필수 (draft 는 OCR prefill 대기 → 비워둘 수 있음)
    if (isSubmit) {
      if (!used_at || !/^\d{4}-\d{2}-\d{2}$/.test(used_at)) {
        return res.status(400).json({ error: '使用日が正しくありません' })
      }
      if (!Number.isInteger(amount_incl_tax) || amount_incl_tax < 0) {
        return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
      }
      // 목적·용도(purpose): 기타(other) 또는 법인결제(already_paid) 는 제출 시 필수
      if (
        (category === 'other' || settlement_type === 'already_paid') &&
        (!purpose || !String(purpose).trim())
      ) {
        return res.status(400).json({ error: '目的・用途を入力してください' })
      }
    } else {
      // draft: 값이 있으면 형식만 검증, 없으면 통과 (NULL / 0 으로 저장)
      if (used_at != null && !/^\d{4}-\d{2}-\d{2}$/.test(used_at)) {
        return res.status(400).json({ error: '使用日が正しくありません' })
      }
      if (
        amount_incl_tax != null &&
        (!Number.isInteger(amount_incl_tax) || amount_incl_tax < 0)
      ) {
        return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
      }
    }
    const rate = tax_rate == null ? 10 : Number(tax_rate)
    if (!ALLOWED_TAX_RATES.includes(rate)) {
      return res.status(400).json({ error: '税率が正しくありません' })
    }

    // draft 는 used_at NULL / amount 0 허용
    const usedAtValue =
      used_at && /^\d{4}-\d{2}-\d{2}$/.test(used_at) ? used_at : null
    const amountValue = Number.isInteger(amount_incl_tax) ? amount_incl_tax : 0

    const status = isSubmit ? 'pending' : 'draft'
    const metaObj = meta && typeof meta === 'object' ? meta : {}

    await client.query('BEGIN')
    const insert = await client.query(
      `INSERT INTO expense_requests
         (user_id, category, settlement_type, used_at, amount_incl_tax, tax_rate,
          reduced_tax, vendor_name, invoice_number, account_item_id, purpose, memo,
          status, meta)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        userId,
        category,
        settlement_type,
        usedAtValue,
        amountValue,
        rate,
        !!reduced_tax,
        vendor_name ? String(vendor_name).trim() : null,
        invoice_number ? String(invoice_number).trim() : null,
        account_item_id != null ? Number(account_item_id) : null,
        purpose ? String(purpose).trim() : null,
        memo ? String(memo).trim() : null,
        status,
        JSON.stringify(metaObj),
      ]
    )
    const newId = insert.rows[0].id

    // 제출 시 영수증(첨부) 최소 1건 필수
    if (isSubmit) {
      const attCount = await countAttachments(client, newId)
      if (attCount === 0) {
        await client.query('ROLLBACK')
        return res
          .status(400)
          .json({ error: '領収書を添付してください（提出には添付が必須です）' })
      }
    }

    await insertHistory(client, newId, null, status, userId, null)
    await client.query('COMMIT')

    const created = await fetchRequest(newId)
    res.json(created)
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('expense POST request error:', error.message)
    res.status(500).json({ error: '申請に失敗しました' })
  } finally {
    client.release()
  }
})

/** PATCH /requests/:id — 본인 수정 (draft/pending, awaiting_receipt→pending 제출) */
router.patch('/requests/:id', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, user_id, status, used_at, amount_incl_tax, category, settlement_type, purpose
         FROM expense_requests WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]
    if (String(row.user_id) !== req.user!.id && !isReviewer(req)) {
      return res.status(403).json({ error: '権限がありません' })
    }
    const editable = ['draft', 'pending', 'awaiting_receipt']
    if (!isReviewer(req) && !editable.includes(row.status)) {
      return res.status(400).json({ error: 'この状態では修正できません' })
    }

    const body = req.body as Record<string, any>
    const allowed = [
      'category',
      'settlement_type',
      'used_at',
      'amount_incl_tax',
      'tax_rate',
      'reduced_tax',
      'vendor_name',
      'invoice_number',
      'account_item_id',
      'purpose',
      'memo',
    ]
    const fields: string[] = []
    const params: any[] = []
    let idx = 1
    for (const k of allowed) {
      if (body[k] === undefined) continue
      if (k === 'category' && !ALLOWED_CATEGORIES.includes(body[k])) {
        return res.status(400).json({ error: 'カテゴリが正しくありません' })
      }
      if (k === 'settlement_type' && !ALLOWED_SETTLEMENT.includes(body[k])) {
        return res.status(400).json({ error: '精算区分が正しくありません' })
      }
      if (k === 'used_at' && !/^\d{4}-\d{2}-\d{2}$/.test(body[k])) {
        return res.status(400).json({ error: '使用日が正しくありません' })
      }
      if (k === 'amount_incl_tax' && (!Number.isInteger(body[k]) || body[k] < 0)) {
        return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
      }
      if (k === 'tax_rate' && !ALLOWED_TAX_RATES.includes(Number(body[k]))) {
        return res.status(400).json({ error: '税率が正しくありません' })
      }
      if (k === 'reduced_tax') {
        fields.push(`reduced_tax = $${idx++}`)
        params.push(!!body[k])
        continue
      }
      if (k === 'account_item_id') {
        fields.push(`account_item_id = $${idx++}`)
        params.push(body[k] != null ? Number(body[k]) : null)
        continue
      }
      fields.push(`${k} = $${idx++}`)
      params.push(typeof body[k] === 'string' ? body[k].trim() : body[k])
    }

    // meta 병합
    if (body.meta !== undefined && body.meta && typeof body.meta === 'object') {
      fields.push(`meta = $${idx++}`)
      params.push(JSON.stringify(body.meta))
    }

    // submit 플래그: draft/awaiting_receipt → pending 제출
    const justSubmitted =
      body.submit === true && ['draft', 'awaiting_receipt'].includes(row.status)

    // 제출 시에는 최종값(요청 바디 우선, 없으면 DB 저장값=OCR prefill 포함)에 대해 전체 검증
    if (justSubmitted) {
      const effUsedAt =
        body.used_at !== undefined ? body.used_at : toISODate(row.used_at)
      const effAmount =
        body.amount_incl_tax !== undefined
          ? body.amount_incl_tax
          : row.amount_incl_tax
      const effCategory =
        body.category !== undefined ? body.category : row.category
      const effSettlement =
        body.settlement_type !== undefined
          ? body.settlement_type
          : row.settlement_type
      const effPurpose =
        body.purpose !== undefined ? body.purpose : row.purpose
      if (!effUsedAt || !/^\d{4}-\d{2}-\d{2}$/.test(effUsedAt)) {
        return res.status(400).json({ error: '使用日が正しくありません' })
      }
      if (!Number.isInteger(Number(effAmount)) || Number(effAmount) < 0) {
        return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
      }
      // 목적·용도(purpose): 기타(other) 또는 법인결제(already_paid) 는 제출 시 필수
      if (
        (effCategory === 'other' || effSettlement === 'already_paid') &&
        (!effPurpose || !String(effPurpose).trim())
      ) {
        return res.status(400).json({ error: '目的・用途を入力してください' })
      }
      // 영수증(첨부) 최소 1건 필수
      const attCount = await countAttachments(pool, id)
      if (attCount === 0) {
        return res
          .status(400)
          .json({ error: '領収書を添付してください（提出には添付が必須です）' })
      }
    }

    await client.query('BEGIN')

    if (justSubmitted) {
      fields.push(`status = 'pending'`)
    }

    if (fields.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: '更新する内容がありません' })
    }
    fields.push(`updated_at = NOW()`)
    params.push(id)

    await client.query(
      `UPDATE expense_requests SET ${fields.join(', ')} WHERE id = $${idx}`,
      params
    )

    if (justSubmitted) {
      await insertHistory(client, id, row.status, 'pending', req.user!.id, null)
    }
    await client.query('COMMIT')

    const updated = await fetchRequest(id)
    res.json(updated)
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('expense PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  } finally {
    client.release()
  }
})

/** DELETE /requests/:id — draft 하드삭제 / pending·approved → cancelled */
router.delete('/requests/:id', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, user_id, status FROM expense_requests WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]
    if (String(row.user_id) !== req.user!.id && !isReviewer(req)) {
      return res.status(403).json({ error: '権限がありません' })
    }

    if (row.status === 'draft') {
      await pool.query(`DELETE FROM expense_requests WHERE id = $1`, [id])
      return res.json({ message: 'deleted' })
    }

    if (!['pending', 'approved', 'awaiting_receipt'].includes(row.status) && !isReviewer(req)) {
      return res.status(400).json({ error: 'この状態では取消できません' })
    }

    await client.query('BEGIN')
    await client.query(
      `UPDATE expense_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    )
    await insertHistory(client, id, row.status, 'cancelled', req.user!.id, null)
    await client.query('COMMIT')
    res.json({ message: 'cancelled' })
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('expense DELETE error:', error.message)
    res.status(500).json({ error: '取消に失敗しました' })
  } finally {
    client.release()
  }
})

/** POST /requests/:id/attachments — 영수증 업로드 → freee push+OCR 트리거 (fire-and-forget) */
router.post(
  '/requests/:id/attachments',
  uploadSingle('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      if (!req.file) return res.status(400).json({ error: 'ファイルがありません' })

      const existing = await pool.query(
        `SELECT user_id, status FROM expense_requests WHERE id = $1 AND deleted_at IS NULL`,
        [id]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: '申請が見つかりません' })
      }
      const owner = String(existing.rows[0].user_id)
      if (owner !== req.user!.id && !isReviewer(req)) {
        return res.status(403).json({ error: '権限がありません' })
      }

      const buffer = req.file.buffer
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex')
      const fileDataBase64 = buffer.toString('base64')
      const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8')
      const mimeType = req.file.mimetype

      const insert = await pool.query(
        `INSERT INTO expense_attachments
           (request_id, file_name, mime_type, file_size, file_data, file_hash, uploaded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id, request_id, file_name, mime_type, file_size, file_hash, uploaded_by, uploaded_at`,
        [id, originalName, mimeType, req.file.size, fileDataBase64, fileHash, req.user!.id]
      )

      // freee 파일박스 업로드는 자동으로 하지 않는다. 담당자가 승인 화면에서
      // "freee 전송" 버튼으로 수동 전송(resendReceiptToFreee). (사용자 요청)

      res.json(insert.rows[0])
    } catch (error: any) {
      console.error('expense attachment upload error:', error.message)
      res.status(500).json({ error: error.message || 'アップロードに失敗しました' })
    }
  }
)

/** GET /requests/:id/ocr — OCR 상태·prefill 값 폴링 */
router.get('/requests/:id/ocr', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT user_id, ocr_status, amount_incl_tax, used_at, vendor_name, invoice_number
         FROM expense_requests WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = result.rows[0]
    if (String(row.user_id) !== req.user!.id && !isReviewer(req)) {
      return res.status(403).json({ error: '権限がありません' })
    }
    res.json({
      ocr_status: row.ocr_status,
      amount_incl_tax: row.amount_incl_tax,
      used_at: toISODate(row.used_at),
      vendor_name: row.vendor_name,
      invoice_number: row.invoice_number,
    })
  } catch (error: any) {
    console.error('expense/ocr error:', error.message)
    res.status(500).json({ error: '取得に失敗しました' })
  }
})

/** GET /attachments/:id/download — 첨부 다운로드 (본인/reviewer) */
router.get('/attachments/:id/download', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT a.file_name, a.mime_type, a.file_data, r.user_id
         FROM expense_attachments a
         JOIN expense_requests r ON r.id = a.request_id
        WHERE a.id = $1`,
      [id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ファイルが見つかりません' })
    }
    const row = result.rows[0]
    if (String(row.user_id) !== req.user!.id && !isReviewer(req)) {
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
    console.error('expense attachment download error:', error.message)
    res.status(500).json({ error: 'ダウンロードに失敗しました' })
  }
})

/** GET /pending-summary — in-app 알림 카운트 (reviewer=승인 대기 건수) */
router.get('/pending-summary', async (req: AuthRequest, res: Response) => {
  try {
    const summary: { admin_pending_approval?: number } = {}

    if (isReviewer(req)) {
      const totals = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_approval
           FROM expense_requests
          WHERE deleted_at IS NULL`
      )
      summary.admin_pending_approval = Number(totals.rows[0]?.pending_approval || 0)
    }

    res.json(summary)
  } catch (error: any) {
    console.error('expense/pending-summary error:', error.message)
    res.status(500).json({ error: '取得に失敗しました' })
  }
})

// ============================================================
// 관리자(reviewer) 라우트
// ============================================================

// admin 목록·CSV 공통 필터 → WHERE 절 빌드
function buildAdminFilters(req: AuthRequest): { where: string; params: any[] } {
  const status = (req.query.status as string | undefined) || ''
  const from = (req.query.from as string | undefined) || ''
  const to = (req.query.to as string | undefined) || ''
  const vendor = (req.query.vendor as string | undefined) || ''
  const minAmount = req.query.min_amount != null ? Number(req.query.min_amount) : null
  const maxAmount = req.query.max_amount != null ? Number(req.query.max_amount) : null
  const userId = (req.query.user_id as string | undefined) || ''
  const category = (req.query.category as string | undefined) || ''

  // draft(임시저장) 는 목록에서 제외 (내부 상태)
  const where: string[] = ['er.deleted_at IS NULL', "er.status <> 'draft'"]
  const params: any[] = []
  let idx = 1
  if (status) {
    where.push(`er.status = $${idx++}`)
    params.push(status)
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    where.push(`er.used_at >= $${idx++}`)
    params.push(from)
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    where.push(`er.used_at <= $${idx++}`)
    params.push(to)
  }
  if (vendor) {
    where.push(`er.vendor_name ILIKE $${idx++}`)
    params.push(`%${vendor}%`)
  }
  if (minAmount != null && Number.isFinite(minAmount)) {
    where.push(`er.amount_incl_tax >= $${idx++}`)
    params.push(minAmount)
  }
  if (maxAmount != null && Number.isFinite(maxAmount)) {
    where.push(`er.amount_incl_tax <= $${idx++}`)
    params.push(maxAmount)
  }
  if (userId) {
    where.push(`er.user_id = $${idx++}`)
    params.push(userId)
  }
  if (category) {
    where.push(`er.category = $${idx++}`)
    params.push(category)
  }
  return { where: where.join(' AND '), params }
}

/** GET /admin/list — 전체 목록 (상태·기간·거래처·금액 필터) */
router.get('/admin/list', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const { where, params } = buildAdminFilters(req)
    const result = await pool.query(
      `SELECT ${REQUEST_SELECT}
         FROM expense_requests er
         JOIN users u ON u.id = er.user_id
        WHERE ${where}
        ORDER BY er.created_at DESC`,
      params
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('expense/admin/list error:', error.message)
    res.status(500).json({ error: '一覧の取得に失敗しました' })
  }
})

/**
 * PATCH /admin/:id — 상태 전이 (educationRequest action 패턴, 트랜잭션)
 *   action=approve   → approved → (already_paid→recorded, reimburse_required→payment_pending). freee 取引 자동생성 없음
 *   action=reject    → rejected (+ reject_reason)
 *   action=mark_paid → expense_payments.paid + paid → completed
 *   action=reopen    → 직전 상태 복귀
 */
router.patch('/admin/:id', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  let transactionOpen = false
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const { id } = req.params
    const {
      action,
      reject_reason,
      paid_amount,
      payee_account,
      account_item_id,
      tax_code,
    } = req.body as {
      action?: string
      reject_reason?: string
      paid_amount?: number
      payee_account?: string
      account_item_id?: number
      tax_code?: number
    }
    const actorId = req.user!.id

    const existing = await pool.query(
      `SELECT * FROM expense_requests WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '申請が見つかりません' })
    }
    const row = existing.rows[0]

    // ---- approve ----
    // freee 取引 자동생성 없음 — 영수증은 업로드 시 파일박스에 push 됨.
    //   reimburse_required(개인결제) → payment_pending (지급 대기)
    //   already_paid(법인결제)       → recorded (기표 완료)
    if (action === 'approve') {
      if (row.status !== 'pending') {
        return res.status(400).json({ error: '承認待ちの申請のみ承認できます' })
      }

      const nextStatus =
        row.settlement_type === 'already_paid' ? 'recorded' : 'payment_pending'

      await client.query('BEGIN')
      transactionOpen = true

      // 계정과목·税区分 담당자 수정값 반영 (있을 때만)
      const preSets: string[] = [
        "status = 'approved'",
        'approver_id = $2',
        'approved_at = NOW()',
        'updated_at = NOW()',
      ]
      const preParams: any[] = [id, actorId]
      let pi = 3
      if (account_item_id != null) {
        preSets.push(`account_item_id = $${pi++}`)
        preParams.push(Number(account_item_id))
      }
      if (tax_code != null) {
        preSets.push(`tax_code = $${pi++}`)
        preParams.push(Number(tax_code))
      }
      await client.query(
        `UPDATE expense_requests SET ${preSets.join(', ')} WHERE id = $1`,
        preParams
      )
      await insertHistory(client, id, row.status, 'approved', actorId, null)

      // 승인 후 정산구분에 따라 즉시 전이 (payment_pending / recorded)
      await client.query(
        `UPDATE expense_requests SET status = $2, updated_at = NOW() WHERE id = $1`,
        [id, nextStatus]
      )
      await insertHistory(client, id, 'approved', nextStatus, actorId, null)

      await client.query('COMMIT')
      transactionOpen = false

      const updated = await fetchRequest(id)
      return res.json(updated)
    }

    // ---- reject ----
    if (action === 'reject') {
      if (!['pending', 'approved'].includes(row.status)) {
        return res.status(400).json({ error: 'この状態では却下できません' })
      }
      const reason = reject_reason ? String(reject_reason).trim() : null
      await client.query('BEGIN')
      transactionOpen = true
      await client.query(
        `UPDATE expense_requests
            SET status = 'rejected', reject_reason = $2, approver_id = $3, updated_at = NOW()
          WHERE id = $1`,
        [id, reason, actorId]
      )
      await insertHistory(client, id, row.status, 'rejected', actorId, reason)
      await client.query('COMMIT')
      transactionOpen = false
      const updated = await fetchRequest(id)
      return res.json(updated)
    }

    // ---- mark_paid (精算あり 立替 이체) ----
    if (action === 'mark_paid') {
      if (!['approved', 'payment_pending', 'paid'].includes(row.status)) {
        return res.status(400).json({ error: 'この状態では決済処理できません' })
      }
      const amount =
        Number.isInteger(paid_amount) && (paid_amount as number) >= 0
          ? (paid_amount as number)
          : Number(row.amount_incl_tax)
      const account = payee_account ? String(payee_account).trim() : null

      await client.query('BEGIN')
      transactionOpen = true

      // expense_payments insert/update (paid)
      const existingPay = await client.query(
        `SELECT id FROM expense_payments WHERE request_id = $1 ORDER BY id DESC LIMIT 1`,
        [id]
      )
      if (existingPay.rows.length > 0) {
        await client.query(
          `UPDATE expense_payments
              SET payee_account = $2, paid_amount = $3, status = 'paid',
                  paid_at = NOW(), paid_by = $4
            WHERE id = $1`,
          [existingPay.rows[0].id, account, amount, actorId]
        )
      } else {
        await client.query(
          `INSERT INTO expense_payments
             (request_id, payee_account, paid_amount, paid_at, paid_by, status)
           VALUES ($1, $2, $3, NOW(), $4, 'paid')`,
          [id, account, amount, actorId]
        )
      }

      // status paid → completed
      await client.query(
        `UPDATE expense_requests SET status = 'paid', updated_at = NOW() WHERE id = $1`,
        [id]
      )
      await insertHistory(client, id, row.status, 'paid', actorId, null)
      await client.query(
        `UPDATE expense_requests SET status = 'completed', updated_at = NOW() WHERE id = $1`,
        [id]
      )
      await insertHistory(client, id, 'paid', 'completed', actorId, null)
      await client.query('COMMIT')
      transactionOpen = false
      const updated = await fetchRequest(id)
      return res.json(updated)
    }

    // ---- reopen (직전 상태 복귀) ----
    if (action === 'reopen') {
      const hist = await pool.query(
        `SELECT from_status, to_status FROM expense_status_history
          WHERE request_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
        [id]
      )
      // 직전 이력의 from_status 로 복귀 (없으면 pending 기본)
      const prior =
        (hist.rows[0]?.from_status as string | null) || 'pending'

      await client.query('BEGIN')
      transactionOpen = true
      await client.query(
        `UPDATE expense_requests
            SET status = $2, reject_reason = NULL, approved_at = NULL,
                approver_id = NULL, updated_at = NOW()
          WHERE id = $1`,
        [id, prior]
      )
      await insertHistory(client, id, row.status, prior, actorId, 'reopen')
      await client.query('COMMIT')
      transactionOpen = false
      const updated = await fetchRequest(id)
      return res.json(updated)
    }

    return res.status(400).json({ error: '不正な action です' })
  } catch (error: any) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {})
    console.error('expense admin PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  } finally {
    client.release()
  }
})

/**
 * POST /admin/:id/freee-resend — 영수증을 freee 파일박스로 동기 재전송 (진단용)
 *   실제 도달 여부/실패 사유를 즉시 확인. resendReceiptToFreee 는 절대 throw 하지 않음.
 */
router.post('/admin/:id/freee-resend', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const id = Number(req.params.id)
    const r = await resendReceiptToFreee(id)
    res.json(r)
  } catch (error: any) {
    console.error('expense admin freee-resend error:', error.message)
    res.status(500).json({ error: '再送信に失敗しました' })
  }
})

/** GET /admin/export.csv — 電帳法 CSV export (검색요건: 사용일·금액·거래처) */
router.get('/admin/export.csv', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const { where, params } = buildAdminFilters(req)
    const result = await pool.query(
      `SELECT er.used_at, er.amount_incl_tax, er.vendor_name, er.category,
              er.settlement_type, er.status, er.invoice_number, u.name AS user_name
         FROM expense_requests er
         JOIN users u ON u.id = er.user_id
        WHERE ${where}
        ORDER BY er.used_at DESC, er.id DESC`,
      params
    )

    const header = [
      'used_at',
      'amount_incl_tax',
      'vendor_name',
      'category',
      'settlement_type',
      'status',
      'invoice_number',
      'user_name',
    ]
    const escape = (v: any): string => {
      const s = v == null ? '' : String(v)
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const lines = [header.join(',')]
    for (const r of result.rows) {
      lines.push(
        [
          toISODate(r.used_at) || '',
          r.amount_incl_tax ?? '',
          r.vendor_name ?? '',
          r.category ?? '',
          r.settlement_type ?? '',
          r.status ?? '',
          r.invoice_number ?? '',
          r.user_name ?? '',
        ]
          .map(escape)
          .join(',')
      )
    }
    // UTF-8 BOM (Excel)
    const csv = '﻿' + lines.join('\r\n')
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="expense_export.csv"')
    res.send(csv)
  } catch (error: any) {
    console.error('expense/admin/export.csv error:', error.message)
    res.status(500).json({ error: 'エクスポートに失敗しました' })
  }
})

export default router
