import { pool } from '../db'

export async function autoMigrateExamOpenings(): Promise<void> {
  try {
    console.log('Checking exam_openings table...')

    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'exam_openings'
      );
    `)

    if (checkResult.rows[0].exists) {
      console.log('✓ exam_openings table already exists')
      return
    }

    console.log('exam_openings table does not exist. Creating...')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        CREATE TABLE exam_openings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          exam_round INT NOT NULL,
          opened_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, exam_round)
        );
        CREATE INDEX idx_exam_openings_user ON exam_openings (user_id);
      `)
      await client.query('COMMIT')
      console.log('✅ exam_openings table created successfully')
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
    console.error('❌ exam_openings auto-migration failed:', error.message)
    console.error('Server will continue to start, but exam opening control may not work')
  }
}
