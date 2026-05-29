import { pool } from '../db'

export async function autoMigrateExamScoring(): Promise<void> {
  try {
    console.log('Checking exam_answers scoring columns...')

    await pool.query(`
      ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS scores JSONB;
      ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS max_scores JSONB;
      ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS total_score NUMERIC(5,1);
      ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS feedback TEXT;
      ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES users(id);
      ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ;
    `)

    console.log('✅ exam_answers scoring columns ensured successfully')
  } catch (error: any) {
    console.error('❌ exam_answers scoring auto-migration failed:', error.message)
    console.error('Server will continue to start, but exam scoring may not work')
  }
}
