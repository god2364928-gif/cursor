import { pool } from '../db'

/**
 * 청구서(invoices) 테이블 하드닝 마이그레이션
 * - 라우트(목록/생성/PDF/취소)가 필요로 하는 컬럼을 멱등하게 보장
 * - freee ID 계열 컬럼을 BIGINT 로 확장하여 32-bit 오버플로 방지
 * - line_items(JSONB) 저장으로 PDF 폴백 확보
 * - freee_invoice_id 부분 UNIQUE 인덱스로 중복 청구서 방지
 * 멱등: ADD COLUMN IF NOT EXISTS / (integer 일 때만) ALTER TYPE BIGINT / CREATE INDEX IF NOT EXISTS
 */
export async function autoMigrateInvoices(): Promise<void> {
  try {
    console.log('Checking invoices table hardening columns...')

    // 1) 누락 컬럼 보장 (memo/은행정보/취소계열/품목)
    await pool.query(`
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS memo TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_bank_info TEXT;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID;
      ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB;
    `)

    // 2) ID 계열 BIGINT 확장 — 현재 타입이 'integer' 일 때만 실행 (불필요한 테이블 재작성 방지)
    const idColumns = ['freee_invoice_id', 'company_id', 'partner_id']
    for (const col of idColumns) {
      const typeCheck = await pool.query(
        `SELECT data_type FROM information_schema.columns
         WHERE table_name = 'invoices' AND column_name = $1`,
        [col]
      )
      const dataType = typeCheck.rows[0]?.data_type
      if (dataType === 'integer') {
        await pool.query(`ALTER TABLE invoices ALTER COLUMN ${col} TYPE BIGINT`)
        console.log(`✅ invoices.${col} → BIGINT 확장 완료`)
      }
    }

    // 3) 중복 청구서 방지 (freee_invoice_id 있는 행에만 UNIQUE)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_freee_invoice_id
      ON invoices(freee_invoice_id) WHERE freee_invoice_id IS NOT NULL;
    `)

    console.log('✅ invoices 하드닝 컬럼/BIGINT/인덱스 보장 완료')
  } catch (error: any) {
    console.error('❌ invoices auto-migration failed:', error.message)
    console.error('Server will continue to start, but invoice routes may not work')
  }
}
