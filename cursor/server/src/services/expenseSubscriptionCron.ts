/**
 * 経費申請・精算 — 정기결제 초안 생성 크론 (design 02 §6)
 *
 * snackFixedCron.ts 패턴:
 *  - 매일 09:00 JST + 서버 startup 30초 후 1회 (멱등)
 *  - active 구독 중 오늘이 billing_day(말일 보정)인 것 → owner 명의 draft(awaiting_receipt) 생성
 *  - ON CONFLICT (subscription_id, billing_month) DO NOTHING 로 멱등
 */

import cron from 'node-cron'
import { pool } from '../db'
import { jstToday, jstBillingMonth, isBillingDayToday } from '../lib/expenseDate'

/**
 * 활성 구독 중 오늘이 결제일인 것에 대해 이번 달 경비 초안 생성 (멱등).
 * - status='awaiting_receipt', settlement_type='already_paid'
 * - billing_month = jstBillingMonth(), used_at = jstToday()
 */
export async function runExpenseSubscriptionJob(): Promise<{ inserted: number }> {
  const month = jstBillingMonth()
  const today = jstToday()
  let inserted = 0

  try {
    // 활성 구독 조회 (기간 유효성 포함)
    const subs = await pool.query(
      `SELECT id, owner_user_id, category, billing_day, amount, tax_rate
         FROM expense_subscriptions
        WHERE active = TRUE
          AND (start_date IS NULL OR start_date <= $1::date)
          AND (end_date   IS NULL OR end_date   >= $1::date)`,
      [today]
    )

    for (const sub of subs.rows) {
      // JST 오늘이 결제일(말일 보정)인지
      if (!isBillingDayToday(Number(sub.billing_day))) continue

      const result = await pool.query(
        `INSERT INTO expense_requests
           (user_id, category, settlement_type, used_at, amount_incl_tax, tax_rate,
            status, subscription_id, billing_month)
         VALUES ($1, $2, 'already_paid', $3::date, $4, $5, 'awaiting_receipt', $6, $7)
         ON CONFLICT (subscription_id, billing_month) DO NOTHING
         RETURNING id`,
        [
          sub.owner_user_id,
          sub.category || 'corp_card',
          today,
          sub.amount != null ? Number(sub.amount) : 0,
          sub.tax_rate != null ? Number(sub.tax_rate) : 10,
          sub.id,
          month,
        ]
      )
      if ((result.rowCount ?? 0) > 0) {
        inserted += result.rowCount ?? 0
        const newId = result.rows[0]?.id
        // 상태 이력 기록 (초안 생성)
        if (newId != null) {
          await pool.query(
            `INSERT INTO expense_status_history (request_id, from_status, to_status, actor_id, reason)
             VALUES ($1, NULL, 'awaiting_receipt', NULL, 'subscription auto-draft')`,
            [newId]
          )
        }
      }
    }

    console.log(`[ExpenseSubscription] inserted ${inserted} drafts for ${month}`)
    return { inserted }
  } catch (e: any) {
    console.error('[ExpenseSubscription] runExpenseSubscriptionJob error:', e.message)
    return { inserted }
  }
}

/** 매일 09:00 JST + 서버 startup 30초 후 1회 (멱등) */
export function startExpenseSubscriptionCron(): void {
  cron.schedule(
    '0 9 * * *',
    () => {
      runExpenseSubscriptionJob().catch((e) =>
        console.error('[ExpenseSubscription] cron error:', e)
      )
    },
    { timezone: 'Asia/Tokyo' }
  )

  setTimeout(() => {
    runExpenseSubscriptionJob().catch((e) =>
      console.error('[ExpenseSubscription] startup run error:', e)
    )
  }, 30 * 1000)

  console.log('[ExpenseSubscription] cron scheduled (every day 09:00 JST)')
}
