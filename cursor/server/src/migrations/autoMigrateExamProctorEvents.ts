import { pool } from '../db'

// 시험 응시 중 부정행위 의심 이벤트(붙여넣기 차단, 탭 이탈, 복사 등)를 기록하는 테이블
export async function autoMigrateExamProctorEvents(): Promise<void> {
  try {
    console.log('Checking exam_proctor_events table...')

    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'exam_proctor_events'
      );
    `)

    if (checkResult.rows[0].exists) {
      console.log('✓ exam_proctor_events table already exists')
      return
    }

    console.log('exam_proctor_events table does not exist. Creating...')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        CREATE TABLE exam_proctor_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          exam_round INT NOT NULL,
          event_type TEXT NOT NULL,
          detail JSONB,
          occurred_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_exam_proctor_user_round ON exam_proctor_events (user_id, exam_round);
      `)
      await client.query('COMMIT')
      console.log('✅ exam_proctor_events table created successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      if (error.code === '42P07') {
        console.log('ℹ️  Table was created by another process (this is OK)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('❌ exam_proctor_events auto-migration failed:', error.message)
    console.error('Server will continue to start, but exam proctoring may not work')
  }
}
