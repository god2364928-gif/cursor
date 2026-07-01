/**
 * 経費申請・精算 — freee 연동 서비스 (design 02 §4)
 *
 * - pushReceiptAndOcr: 업로드 시 파일박스 push + OCR 폴링 (fire-and-forget, 절대 throw 안 함)
 * - createDealForRequest: 승인 시 계정과목·税区分 확정 → 取引 생성 (멱등)
 */

import convert from 'heic-convert'
import { pool } from '../db'
import { taxDisplayCategory } from '../lib/expenseTax'
import {
  getDefaultCompanyId,
  uploadReceiptToFileBox,
  getReceipt,
  getCompanyTaxes,
  createExpenseDeal,
} from '../integrations/freeeClient'

/** 지연 헬퍼 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** pg 에서 돌아오는 DATE (Date | string | null) → 'YYYY-MM-DD' 문자열 정규화 */
function toYmd(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) {
    const y = value.getUTCFullYear()
    const m = value.getUTCMonth() + 1
    const d = value.getUTCDate()
    const p2 = (n: number) => (n < 10 ? '0' + n : String(n))
    return `${y}-${p2(m)}-${p2(d)}`
  }
  // string: 'YYYY-MM-DD' 또는 ISO — 앞 10자만 사용
  return String(value).slice(0, 10)
}

/** meta JSONB (Object | string | null) → 안전한 record */
function parseMeta(meta: unknown): Record<string, unknown> {
  if (!meta) return {}
  if (typeof meta === 'string') {
    try {
      return JSON.parse(meta) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof meta === 'object') return meta as Record<string, unknown>
  return {}
}

/**
 * 업로드 시: 파일박스 push + OCR 폴링 (비동기, 라우트에서 fire-and-forget).
 * OCR 실패는 절대 throw 하지 않는다 (신청은 계속 진행).
 */
export async function pushReceiptAndOcr(
  requestId: number,
  file: { buffer: Buffer; filename: string; mimeType: string }
): Promise<void> {
  try {
    let uploadFile = file

    // 1) HEIC/HEIF → JPEG 변환 (실패 시 원본으로 진행)
    const isHeic =
      /heic|heif/i.test(file.mimeType) || /\.(heic|heif)$/i.test(file.filename)
    if (isHeic) {
      try {
        const out = await convert({
          buffer: file.buffer,
          format: 'JPEG',
          quality: 0.9,
        })
        const jpgBuffer = Buffer.from(out)
        const jpgName = file.filename.replace(/\.(heic|heif)$/i, '') + '.jpg'
        uploadFile = {
          buffer: jpgBuffer,
          filename: jpgName,
          mimeType: 'image/jpeg',
        }
        console.log(`✅ [Expense OCR] HEIC→JPEG 변환 완료: ${jpgName}`)
      } catch (convErr) {
        console.error(
          '[Expense OCR] HEIC 변환 실패, 원본으로 진행:',
          (convErr as Error).message
        )
      }
    }

    // 2) 파일박스 업로드 → freee_receipt_id 저장, ocr_status='pending'
    const companyId = await getDefaultCompanyId()
    const uploaded = await uploadReceiptToFileBox(companyId, uploadFile)
    const receiptId = uploaded.id

    await pool.query(
      `UPDATE expense_requests
         SET freee_receipt_id = $1, ocr_status = 'pending', updated_at = NOW()
       WHERE id = $2`,
      [receiptId, requestId]
    )

    // 3) 백그라운드 폴링: 최대 12회, 5초 간격
    const MAX_TRIES = 12
    const INTERVAL_MS = 5000
    for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
      await sleep(INTERVAL_MS)

      let receipt
      try {
        receipt = await getReceipt(companyId, receiptId)
      } catch (pollErr) {
        console.error(
          `[Expense OCR] getReceipt 실패 (attempt ${attempt + 1}):`,
          (pollErr as Error).message
        )
        continue
      }

      const md = receipt.receipt_metadatum
      const hasData =
        !!md &&
        (md.amount != null || !!md.issue_date || !!md.partner_name)

      if (!hasData) continue

      // 4) prefill — 사용자가 이미 설정한 값은 덮어쓰지 않음 (컬럼별 가드)
      const issueDate = toYmd(md!.issue_date)
      const invoiceNumber = receipt.invoice_registration_number

      const sets: string[] = ["ocr_status = 'done'", 'updated_at = NOW()']
      const params: unknown[] = []
      let idx = 1

      if (md!.amount != null) {
        sets.push(
          `amount_incl_tax = CASE WHEN (amount_incl_tax IS NULL OR amount_incl_tax = 0) THEN $${idx} ELSE amount_incl_tax END`
        )
        params.push(Math.round(md!.amount))
        idx++
      }
      if (issueDate) {
        sets.push(
          `used_at = COALESCE(used_at, $${idx}::date)`
        )
        params.push(issueDate)
        idx++
      }
      if (md!.partner_name) {
        sets.push(
          `vendor_name = COALESCE(NULLIF(vendor_name, ''), $${idx})`
        )
        params.push(md!.partner_name)
        idx++
      }
      if (invoiceNumber) {
        sets.push(
          `invoice_number = COALESCE(NULLIF(invoice_number, ''), $${idx})`
        )
        params.push(invoiceNumber)
        idx++
      }

      params.push(requestId)
      await pool.query(
        `UPDATE expense_requests SET ${sets.join(', ')} WHERE id = $${idx}`,
        params
      )

      console.log(`✅ [Expense OCR] prefill 완료: request ${requestId}`)
      return
    }

    // 5) 타임아웃 — ocr_status='failed' (수동 입력으로 진행 가능)
    await pool.query(
      `UPDATE expense_requests
         SET ocr_status = 'failed', updated_at = NOW()
       WHERE id = $1`,
      [requestId]
    )
    console.warn(`⚠️ [Expense OCR] 타임아웃: request ${requestId} → failed`)
  } catch (err) {
    // OCR 실패로 절대 밖으로 throw 하지 않음 (fire-and-forget)
    console.error(
      `[Expense OCR] request ${requestId} 처리 실패:`,
      (err as Error).message
    )
    try {
      await pool.query(
        `UPDATE expense_requests
           SET ocr_status = 'failed', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      )
    } catch (updErr) {
      console.error(
        '[Expense OCR] ocr_status 갱신 실패:',
        (updErr as Error).message
      )
    }
  }
}

/**
 * 승인 시: 계정과목·税区分 확정 → freee 取引 생성.
 * 멱등: freee_deal_id 가 이미 있으면 재생성하지 않고 그대로 반환.
 */
export async function createDealForRequest(requestId: number): Promise<number> {
  // 1) 신청 row 조회
  const { rows } = await pool.query(
    `SELECT id, category, used_at, amount_incl_tax, tax_rate, reduced_tax,
            vendor_name, purpose, account_item_id, tax_code,
            freee_receipt_id, freee_deal_id, meta
       FROM expense_requests
      WHERE id = $1`,
    [requestId]
  )
  const row = rows[0]
  if (!row) {
    throw new Error('expense request not found: ' + requestId)
  }

  // 이미 生成된 取引 있으면 멱등 반환
  if (row.freee_deal_id != null) {
    return Number(row.freee_deal_id)
  }

  // 2) 영수증 없으면 진행 불가
  if (row.freee_receipt_id == null) {
    throw new Error('no freee receipt for request')
  }

  const companyId = await getDefaultCompanyId()
  const meta = parseMeta(row.meta)

  // 3) account_item_id 확정: 요청값 우선, 없으면 expense_freee_map (category, subtype)
  let accountItemId: number | null =
    row.account_item_id != null ? Number(row.account_item_id) : null

  if (accountItemId == null) {
    // subtype 결정
    let subtype: string | null = null
    if (row.category === 'meal') {
      const mealPurpose = meta.meal_purpose
      if (mealPurpose === 'meeting' || mealPurpose === 'entertainment') {
        subtype = mealPurpose
      }
    } else if (row.category === 'transport') {
      subtype = meta.method === 'taxi' ? 'taxi' : null
    }

    // subtype 은 DB 에서 '' 로 저장될 수 있음 (NULL-unique gotcha) → COALESCE 로 매칭
    const mapRes = await pool.query(
      `SELECT account_item_id
         FROM expense_freee_map
        WHERE category = $1
          AND COALESCE(subtype, '') = COALESCE($2, '')
        LIMIT 1`,
      [row.category, subtype]
    )
    if (mapRes.rows[0]?.account_item_id != null) {
      accountItemId = Number(mapRes.rows[0].account_item_id)
    }
  }

  if (accountItemId == null) {
    throw new Error('no account_item mapping')
  }

  // 4) tax_code 확정: taxDisplayCategory 로 family 결정 → getCompanyTaxes 에서 매칭
  const usedAtYmd = toYmd(row.used_at)
  if (!usedAtYmd) {
    throw new Error('used_at is required to resolve tax_code')
  }
  const family = taxDisplayCategory(
    usedAtYmd,
    Number(row.tax_rate),
    !!row.reduced_tax
  )

  const taxes = await getCompanyTaxes(companyId)
  const matched = taxes.find(
    (t) => t.available === true && t.display_category === family
  )
  if (!matched) {
    throw new Error('no matching tax_code for ' + family)
  }
  const taxCode = matched.code

  // 5) 経費 取引 생성
  const amount = Number(row.amount_incl_tax)
  const description: string =
    (row.vendor_name as string) || (row.purpose as string) || ''

  const deal = await createExpenseDeal({
    companyId,
    issueDate: usedAtYmd,
    details: [
      {
        accountItemId,
        taxCode,
        amount,
        description: description || undefined,
      },
    ],
    receiptIds: [Number(row.freee_receipt_id)],
  })

  // 6) freee_deal_id, tax_code, account_item_id 저장
  await pool.query(
    `UPDATE expense_requests
        SET freee_deal_id = $1, tax_code = $2, account_item_id = $3, updated_at = NOW()
      WHERE id = $4`,
    [deal.id, taxCode, accountItemId, requestId]
  )

  return deal.id
}
