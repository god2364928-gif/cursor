import fs from 'fs'
import path from 'path'
import { pool } from '../db'
import { planAnnualGrant, expiryDate, calcServiceYearsAtGrant } from '../lib/vacation'

/** 일본 공휴일 시드 데이터 로딩 (startup 시 1번) */
export async function seedJpHolidaysIfEmpty(): Promise<void> {
  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM jp_holidays')
    const count = Number(countResult.rows[0].count) || 0
    if (count > 0) {
      console.log(`✓ jp_holidays already has ${count} rows`)
      return
    }
    const sqlPath = path.join(__dirname, '../../database/seed-jp-holidays.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    await pool.query(sql)
    console.log('✅ jp_holidays seed data loaded')
  } catch (error: any) {
    console.error('jp_holidays seed failed:', error.message)
  }
}

/**
 * 재직자 전원 순회하며 연차 자동 부여
 * - 부여일이 오늘 이전(또는 오늘) → INSERT
 * - 이미 부여된 건 건너뜀
 * - 출근율 검증 X (정책)
 */
export async function runVacationGrantCheck(): Promise<{ granted: number; skipped: number }> {
  let granted = 0
  let skipped = 0

  try {
    // 재직 중 + 입사일 있는 사용자만
    const usersResult = await pool.query(`
      SELECT id, hire_date, employment_status
      FROM users
      WHERE hire_date IS NOT NULL
        AND (employment_status IS NULL
             OR employment_status = ''
             OR employment_status = '입사중'
             OR employment_status = '在籍中'
             OR employment_status = '在職中')
    `)

    const today = new Date()

    for (const u of usersResult.rows) {
      try {
        const hireDate = new Date(u.hire_date)
        if (isNaN(hireDate.getTime())) {
          skipped++
          continue
        }

        // 가장 최근 annual 부여 조회
        const lastResult = await pool.query(
          `SELECT grant_date FROM vacation_grants
           WHERE user_id = $1 AND grant_type = 'annual'
           ORDER BY grant_date DESC LIMIT 1`,
          [u.id]
        )
        const lastAnnualDate: Date | null =
          lastResult.rows.length > 0 ? new Date(lastResult.rows[0].grant_date) : null

        const plan = planAnnualGrant(hireDate, lastAnnualDate, today)
        if (!plan) {
          skipped++
          continue
        }

        const exp = expiryDate(plan.grantDate)
        const sy = calcServiceYearsAtGrant(hireDate, plan.grantDate)

        await pool.query(
          `INSERT INTO vacation_grants
           (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes)
           VALUES ($1, $2, $3, $4, 'annual', $5, $6)`,
          [
            u.id,
            plan.grantDate.toISOString().slice(0, 10),
            exp.toISOString().slice(0, 10),
            plan.days,
            sy,
            `自動付与 (勤続 ${sy} 年時点)`,
          ]
        )
        granted++
      } catch (e: any) {
        console.error(`vacation grant failed for user ${u.id}:`, e.message)
        skipped++
      }
    }

    if (granted > 0) {
      console.log(`[Vacation] auto-grant: ${granted} granted, ${skipped} skipped`)
    }
  } catch (error: any) {
    console.error('[Vacation] cron check error:', error.message)
  }

  return { granted, skipped }
}

/** startup + 24시간 주기로 부여 체크 실행 (간단한 setInterval 방식) */
export function startVacationCron(): void {
  // startup 후 30초 뒤 한 번 실행 (서버 안정화 대기)
  setTimeout(() => {
    seedJpHolidaysIfEmpty()
      .then(() => runVacationGrantCheck())
      .catch((e) => console.error('[Vacation] initial run error:', e))
  }, 30 * 1000)

  // 24시간 주기
  setInterval(() => {
    runVacationGrantCheck().catch((e) => console.error('[Vacation] periodic run error:', e))
  }, 24 * 60 * 60 * 1000)

  console.log('[Vacation] cron scheduler enabled (initial: 30s, then every 24h)')
}
