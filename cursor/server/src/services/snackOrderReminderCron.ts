import cron from 'node-cron'
import { pool } from '../db'
import { calcOrderTargetWeek } from '../lib/snackWeek'
import { sendSnackOrderReminder } from '../utils/slackClient'

/**
 * 발주 대상 주(직전 마감된 주)의 pending 신청을 슬랙 日本_알림방으로 알림.
 * - 신청이 없으면 알림 미발송 (스팸 방지)
 * - 발주 담당자가 ERP 화면에서 발주 처리하도록 안내
 */
export async function runSnackOrderReminderJob(): Promise<{
  sent: boolean
  week_start: string
  item_count: number
}> {
  const weekStart = calcOrderTargetWeek(new Date())
  try {
    const result = await pool.query(
      `SELECT
         u.name AS user_name, u.department,
         sr.product_name, sr.product_url,
         sr.unit_price, sr.quantity, sr.total
       FROM snack_requests sr
       JOIN users u ON sr.user_id = u.id
       WHERE sr.week_start = $1
         AND sr.status = 'pending'
       ORDER BY u.department NULLS LAST, u.name, sr.created_at`,
      [weekStart]
    )

    const items = result.rows.map((r: any) => ({
      user_name: r.user_name,
      department: r.department,
      product_name: r.product_name,
      product_url: r.product_url,
      unit_price: Number(r.unit_price) || 0,
      quantity: Number(r.quantity) || 0,
      total: Number(r.total) || 0,
    }))

    if (items.length === 0) {
      console.log(
        `[SnackOrderReminder] no pending items for week ${weekStart} — skip notification`
      )
      return { sent: false, week_start: weekStart, item_count: 0 }
    }

    const totalAmount = items.reduce((s, it) => s + it.total, 0)
    const sent = await sendSnackOrderReminder({
      weekStart,
      totalAmount,
      items,
    })

    return { sent, week_start: weekStart, item_count: items.length }
  } catch (e: any) {
    console.error('[SnackOrderReminder] runSnackOrderReminderJob error:', e.message)
    return { sent: false, week_start: weekStart, item_count: 0 }
  }
}

/** 매주 월요일 09:30 JST */
export function startSnackOrderReminderCron(): void {
  cron.schedule(
    '30 9 * * 1',
    () => {
      runSnackOrderReminderJob().catch((e) =>
        console.error('[SnackOrderReminder] cron error:', e)
      )
    },
    { timezone: 'Asia/Tokyo' }
  )

  console.log('[SnackOrderReminder] cron scheduled (every Mon 09:30 JST)')
}
