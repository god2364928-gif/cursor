import { pool } from '../db'

/**
 * 월별 급여 테이블에 교통비(transport) 컬럼 추가
 * - 집세(rent)와 기타(other) 사이에 표시되는 교통비 항목
 * - total 은 transport 를 포함하도록 재계산
 * 멱등: ADD COLUMN IF NOT EXISTS + 재계산이라 매번 실행되어도 OK
 */
export async function autoMigratePayrollTransport(): Promise<void> {
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'monthly_payroll'
      ) AS exists
    `)
    if (!tableCheck.rows[0]?.exists) {
      return // 테이블 자체가 아직 없음
    }

    // 컬럼 존재 여부 확인 (없을 때만 total 재계산)
    const colCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'monthly_payroll' AND column_name = 'transport'
      ) AS exists
    `)
    const alreadyExists = colCheck.rows[0]?.exists === true

    await pool.query(`ALTER TABLE monthly_payroll ADD COLUMN IF NOT EXISTS transport DECIMAL(12, 2) DEFAULT 0`)

    if (!alreadyExists) {
      // 신규 컬럼 추가 시 total 재계산 (transport 포함)
      await pool.query(`
        UPDATE monthly_payroll
        SET total = COALESCE(base_salary, 0) + COALESCE(coconala, 0) + COALESCE(bonus, 0)
                  + COALESCE(incentive, 0) + COALESCE(business_trip, 0) + COALESCE(rent, 0)
                  + COALESCE(transport, 0) + COALESCE(other, 0)
      `)
      console.log('✅ monthly_payroll: transport(교통비) 컬럼 추가 & total 재계산 완료')
    } else {
      console.log('✓ monthly_payroll: transport 컬럼 이미 존재')
    }
  } catch (error: any) {
    console.error('❌ monthly_payroll transport 컬럼 마이그레이션 실패:', error.message)
  }
}
