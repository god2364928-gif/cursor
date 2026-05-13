import cron from 'node-cron'
import { pool } from '../db'
import { calcWeekStart } from '../lib/snackWeek'

/** 활성 고정 구매를 이번 주 신청에 추가 (멱등) */
export async function runSnackFixedJob(): Promise<{ inserted: number; week_start: string }> {
  const weekStart = calcWeekStart(new Date())
  try {
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
    const inserted = result.rowCount ?? 0
    console.log(`[SnackFixed] inserted ${inserted} requests for week ${weekStart}`)
    return { inserted, week_start: weekStart }
  } catch (e: any) {
    console.error('[SnackFixed] runSnackFixedJob error:', e.message)
    return { inserted: 0, week_start: weekStart }
  }
}

/** 매주 월요일 00:05 JST + 서버 startup 30초 후 1회 (멱등) */
export function startSnackFixedCron(): void {
  cron.schedule(
    '5 0 * * 1',
    () => {
      runSnackFixedJob().catch((e) =>
        console.error('[SnackFixed] cron error:', e)
      )
    },
    { timezone: 'Asia/Tokyo' }
  )

  setTimeout(() => {
    runSnackFixedJob().catch((e) =>
      console.error('[SnackFixed] startup run error:', e)
    )
  }, 30 * 1000)

  console.log('[SnackFixed] cron scheduled (every Mon 00:05 JST)')
}
