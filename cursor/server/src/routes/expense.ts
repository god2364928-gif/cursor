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
import { pushReceiptAndOcr, createDealForRequest } from '../services/expenseFreee'
import { getAccountItems, getDefaultCompanyId } from '../integrations/freeeClient'
import { runExpenseSubscriptionJob } from '../services/expenseSubscriptionCron'

const router = Router()
router.use(authMiddleware, requireAppAccess('erp'))

// ============================================================
// 헬퍼
// ============================================================

function isReviewer(req: AuthRequest): boolean {
  return ['admin', 'office_assistant'].includes(req.user!.role)
}

const ALLOWED_CATEGORIES = ['transport', 'meal', 'reimburse', 'corp_card']
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
  er.freee_receipt_id, er.freee_deal_id, er.ocr_status,
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
    const where: string[] = ['er.user_id = $1', 'er.deleted_at IS NULL']
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

    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'カテゴリが正しくありません' })
    }
    if (!ALLOWED_SETTLEMENT.includes(settlement_type)) {
      return res.status(400).json({ error: '精算区分が正しくありません' })
    }
    if (!used_at || !/^\d{4}-\d{2}-\d{2}$/.test(used_at)) {
      return res.status(400).json({ error: '使用日が正しくありません' })
    }
    if (!Number.isInteger(amount_incl_tax) || amount_incl_tax < 0) {
      return res.status(400).json({ error: '金額は0以上の整数で入力してください' })
    }
    const rate = tax_rate == null ? 10 : Number(tax_rate)
    if (!ALLOWED_TAX_RATES.includes(rate)) {
      return res.status(400).json({ error: '税率が正しくありません' })
    }

    const status = submit ? 'pending' : 'draft'
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
        used_at,
        amount_incl_tax,
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

      // freee 파일박스 push + OCR 폴링 — fire-and-forget (응답 블로킹 금지)
      pushReceiptAndOcr(Number(id), {
        buffer,
        filename: originalName,
        mimeType,
      }).catch((e) =>
        console.error(`[Expense] pushReceiptAndOcr(${id}) failed:`, (e as Error).message)
      )

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

/** GET /pending-summary — in-app 알림 카운트 (§7) */
router.get('/pending-summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // 직원: 내가 owner 인 정기결제 미첨부(awaiting_receipt) 건수
    const mine = await pool.query(
      `SELECT COUNT(*)::int AS cnt
         FROM expense_requests
        WHERE user_id = $1 AND status = 'awaiting_receipt' AND deleted_at IS NULL`,
      [userId]
    )
    const summary: {
      my_awaiting_receipt: number
      admin_pending_approval?: number
      admin_awaiting_receipt?: number
    } = { my_awaiting_receipt: Number(mine.rows[0]?.cnt || 0) }

    if (isReviewer(req)) {
      const totals = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_approval,
           COUNT(*) FILTER (WHERE status = 'awaiting_receipt')::int AS awaiting_receipt
         FROM expense_requests
        WHERE deleted_at IS NULL`
      )
      summary.admin_pending_approval = Number(totals.rows[0]?.pending_approval || 0)
      summary.admin_awaiting_receipt = Number(totals.rows[0]?.awaiting_receipt || 0)
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

  const where: string[] = ['er.deleted_at IS NULL']
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
 *   action=approve   → approved (+ createDealForRequest; already_paid→recorded, reimburse_required→payment_pending)
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
    if (action === 'approve') {
      if (row.status !== 'pending') {
        return res.status(400).json({ error: '承認待ちの申請のみ承認できます' })
      }

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
      await client.query('COMMIT')
      transactionOpen = false

      // freee 取引 생성 — 실패해도 승인은 유지 (200 + freee_error)
      let freeeError: string | null = null
      try {
        await createDealForRequest(Number(id))
        // 성공: already_paid → recorded
        if (row.settlement_type === 'already_paid') {
          const c2 = await pool.connect()
          try {
            await c2.query('BEGIN')
            await c2.query(
              `UPDATE expense_requests SET status = 'recorded', updated_at = NOW() WHERE id = $1`,
              [id]
            )
            await insertHistory(c2, id, 'approved', 'recorded', actorId, 'freee deal created')
            await c2.query('COMMIT')
          } catch (e) {
            await c2.query('ROLLBACK').catch(() => {})
            throw e
          } finally {
            c2.release()
          }
        }
      } catch (e) {
        freeeError = (e as Error).message
        console.error(`[Expense] createDealForRequest(${id}) failed:`, freeeError)
      }

      // freee 성공이든 실패든, reimburse_required 는 payment_pending 로 (지급 대기)
      if (row.settlement_type === 'reimburse_required') {
        const c3 = await pool.connect()
        try {
          const cur = await c3.query(
            `SELECT status FROM expense_requests WHERE id = $1`,
            [id]
          )
          const curStatus = cur.rows[0]?.status
          if (curStatus === 'approved') {
            await c3.query('BEGIN')
            await c3.query(
              `UPDATE expense_requests SET status = 'payment_pending', updated_at = NOW() WHERE id = $1`,
              [id]
            )
            await insertHistory(c3, id, 'approved', 'payment_pending', actorId, null)
            await c3.query('COMMIT')
          }
        } catch (e) {
          await c3.query('ROLLBACK').catch(() => {})
          console.error(`[Expense] payment_pending transition(${id}) failed:`, (e as Error).message)
        } finally {
          c3.release()
        }
      }

      const updated = await fetchRequest(id)
      return res.json(freeeError ? { ...updated, freee_error: freeeError } : updated)
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

// ============================================================
// 정기결제 마스터 (subscriptions)
// ============================================================

const SUBSCRIPTION_SELECT = `
  s.id, s.owner_user_id, u.name AS owner_name, s.service_name, s.card_label,
  s.category, s.cycle, s.billing_day, s.amount, s.tax_rate, s.active,
  s.start_date, s.end_date, s.created_at
`

/** GET /subscriptions — 본인=owner 것만 / reviewer=전체 */
router.get('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const reviewer = isReviewer(req)
    const params: any[] = []
    let where = ''
    if (!reviewer) {
      where = 'WHERE s.owner_user_id = $1'
      params.push(req.user!.id)
    }
    const result = await pool.query(
      `SELECT ${SUBSCRIPTION_SELECT}
         FROM expense_subscriptions s
         JOIN users u ON u.id = s.owner_user_id
         ${where}
        ORDER BY s.created_at DESC`,
      params
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('expense/subscriptions list error:', error.message)
    res.status(500).json({ error: '一覧の取得に失敗しました' })
  }
})

/** POST /subscriptions — 마스터 생성 */
router.post('/subscriptions', async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body as Record<string, any>
    const {
      service_name,
      card_label,
      category,
      cycle,
      billing_day,
      amount,
      tax_rate,
      active,
      start_date,
      end_date,
      owner_user_id,
    } = b

    if (!service_name || !String(service_name).trim()) {
      return res.status(400).json({ error: 'サービス名は必須です' })
    }
    if (!Number.isInteger(billing_day) || billing_day < 1 || billing_day > 31) {
      return res.status(400).json({ error: '請求日は1〜31で入力してください' })
    }
    if (cycle && !['month', 'year'].includes(cycle)) {
      return res.status(400).json({ error: 'サイクルが正しくありません' })
    }
    // owner: reviewer 는 타인 지정 가능, 아니면 본인
    const owner =
      isReviewer(req) && owner_user_id ? String(owner_user_id) : req.user!.id

    const insert = await pool.query(
      `INSERT INTO expense_subscriptions
         (owner_user_id, service_name, card_label, category, cycle, billing_day,
          amount, tax_rate, active, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING id`,
      [
        owner,
        String(service_name).trim(),
        card_label ? String(card_label).trim() : null,
        category ? String(category) : 'corp_card',
        cycle || 'month',
        billing_day,
        amount != null ? Number(amount) : null,
        tax_rate != null ? Number(tax_rate) : 10,
        active != null ? !!active : true,
        start_date && /^\d{4}-\d{2}-\d{2}$/.test(start_date) ? start_date : null,
        end_date && /^\d{4}-\d{2}-\d{2}$/.test(end_date) ? end_date : null,
      ]
    )
    const result = await pool.query(
      `SELECT ${SUBSCRIPTION_SELECT}
         FROM expense_subscriptions s JOIN users u ON u.id = s.owner_user_id
        WHERE s.id = $1`,
      [insert.rows[0].id]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('expense/subscriptions POST error:', error.message)
    res.status(500).json({ error: '作成に失敗しました' })
  }
})

/** PATCH /subscriptions/:id — 수정 (owner 또는 reviewer) */
router.patch('/subscriptions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, owner_user_id FROM expense_subscriptions WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '定期決済が見つかりません' })
    }
    if (String(existing.rows[0].owner_user_id) !== req.user!.id && !isReviewer(req)) {
      return res.status(403).json({ error: '権限がありません' })
    }

    const body = req.body as Record<string, any>
    const allowed = [
      'service_name',
      'card_label',
      'category',
      'cycle',
      'billing_day',
      'amount',
      'tax_rate',
      'active',
      'start_date',
      'end_date',
    ]
    const fields: string[] = []
    const params: any[] = []
    let idx = 1
    for (const k of allowed) {
      if (body[k] === undefined) continue
      if (k === 'billing_day') {
        if (!Number.isInteger(body[k]) || body[k] < 1 || body[k] > 31) {
          return res.status(400).json({ error: '請求日は1〜31で入力してください' })
        }
      }
      if (k === 'cycle' && !['month', 'year'].includes(body[k])) {
        return res.status(400).json({ error: 'サイクルが正しくありません' })
      }
      if (k === 'active') {
        fields.push(`active = $${idx++}`)
        params.push(!!body[k])
        continue
      }
      if (k === 'amount' || k === 'tax_rate' || k === 'billing_day') {
        fields.push(`${k} = $${idx++}`)
        params.push(body[k] != null ? Number(body[k]) : null)
        continue
      }
      if (k === 'start_date' || k === 'end_date') {
        const valid = body[k] && /^\d{4}-\d{2}-\d{2}$/.test(body[k]) ? body[k] : null
        fields.push(`${k} = $${idx++}`)
        params.push(valid)
        continue
      }
      fields.push(`${k} = $${idx++}`)
      params.push(typeof body[k] === 'string' ? body[k].trim() : body[k])
    }
    if (fields.length === 0) {
      return res.status(400).json({ error: '更新する内容がありません' })
    }
    params.push(id)
    await pool.query(
      `UPDATE expense_subscriptions SET ${fields.join(', ')} WHERE id = $${idx}`,
      params
    )
    const result = await pool.query(
      `SELECT ${SUBSCRIPTION_SELECT}
         FROM expense_subscriptions s JOIN users u ON u.id = s.owner_user_id
        WHERE s.id = $1`,
      [id]
    )
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('expense/subscriptions PATCH error:', error.message)
    res.status(500).json({ error: '更新に失敗しました' })
  }
})

/** DELETE /subscriptions/:id — 삭제 (owner 또는 reviewer) */
router.delete('/subscriptions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const existing = await pool.query(
      `SELECT id, owner_user_id FROM expense_subscriptions WHERE id = $1`,
      [id]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '定期決済が見つかりません' })
    }
    if (String(existing.rows[0].owner_user_id) !== req.user!.id && !isReviewer(req)) {
      return res.status(403).json({ error: '権限がありません' })
    }
    await pool.query(`DELETE FROM expense_subscriptions WHERE id = $1`, [id])
    res.json({ message: 'deleted' })
  } catch (error: any) {
    console.error('expense/subscriptions DELETE error:', error.message)
    res.status(500).json({ error: '削除に失敗しました' })
  }
})

// ============================================================
// freee 매핑 마스터 (reviewer)
// ============================================================

/** GET /freee/account-items — freee 계정과목 (매핑 UI) */
router.get('/freee/account-items', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const companyId = await getDefaultCompanyId()
    const items = await getAccountItems(companyId)
    res.json({ items })
  } catch (error: any) {
    console.error('expense/freee/account-items error:', error.message)
    res.status(500).json({ error: error.message || '勘定科目の取得に失敗しました' })
  }
})

/** GET /freee/map — 매핑 조회 */
router.get('/freee/map', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const result = await pool.query(
      `SELECT id, category, subtype, account_item_id, account_item_name, updated_by, updated_at
         FROM expense_freee_map
        ORDER BY category, subtype`
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    console.error('expense/freee/map GET error:', error.message)
    res.status(500).json({ error: 'マッピングの取得に失敗しました' })
  }
})

/** PUT /freee/map — 매핑 저장 (upsert; subtype 없으면 '' 로 저장) */
router.put('/freee/map', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect()
  let transactionOpen = false
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const { map } = req.body as {
      map?: Array<{
        category: string
        subtype?: string | null
        account_item_id: number
        account_item_name?: string | null
      }>
    }
    if (!Array.isArray(map)) {
      return res.status(400).json({ error: 'map は配列である必要があります' })
    }

    await client.query('BEGIN')
    transactionOpen = true
    for (const m of map) {
      if (!m.category || m.account_item_id == null) continue
      // subtype 없으면 '' 로 저장 (NULL-unique gotcha 회피)
      const subtype = m.subtype == null ? '' : String(m.subtype)
      await client.query(
        `INSERT INTO expense_freee_map
           (category, subtype, account_item_id, account_item_name, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (category, subtype)
         DO UPDATE SET account_item_id = EXCLUDED.account_item_id,
                       account_item_name = EXCLUDED.account_item_name,
                       updated_by = EXCLUDED.updated_by,
                       updated_at = NOW()`,
        [
          String(m.category),
          subtype,
          Number(m.account_item_id),
          m.account_item_name != null ? String(m.account_item_name) : null,
          req.user!.id,
        ]
      )
    }
    await client.query('COMMIT')
    transactionOpen = false

    const result = await pool.query(
      `SELECT id, category, subtype, account_item_id, account_item_name, updated_by, updated_at
         FROM expense_freee_map
        ORDER BY category, subtype`
    )
    res.json({ items: result.rows })
  } catch (error: any) {
    if (transactionOpen) await client.query('ROLLBACK').catch(() => {})
    console.error('expense/freee/map PUT error:', error.message)
    res.status(500).json({ error: 'マッピングの保存に失敗しました' })
  } finally {
    client.release()
  }
})

// ============================================================
// 정기결제 크론 수동실행 (디버그, reviewer)
// ============================================================

/** POST /admin/run-subscription-job — 크론 잡 수동실행 */
router.post('/admin/run-subscription-job', async (req: AuthRequest, res: Response) => {
  try {
    if (!isReviewer(req)) return res.status(403).json({ error: '権限がありません' })
    const result = await runExpenseSubscriptionJob()
    res.json(result)
  } catch (error: any) {
    console.error('expense/admin/run-subscription-job error:', error.message)
    res.status(500).json({ error: 'ジョブの実行に失敗しました' })
  }
})

export default router
