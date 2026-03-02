import { pool } from '../db'

export async function autoMigrateFeatureUsage(): Promise<void> {
  try {
    console.log('Checking feature_usage_logs table...')

    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'feature_usage_logs'
      );
    `)

    if (checkResult.rows[0].exists) {
      console.log('✓ feature_usage_logs table already exists')
      return
    }

    console.log('feature_usage_logs table does not exist. Creating...')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(`
        CREATE TABLE feature_usage_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          feature_name VARCHAR(100) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX idx_feature_usage_user_feature ON feature_usage_logs (user_id, feature_name, created_at);
      `)
      await client.query('COMMIT')
      console.log('✅ feature_usage_logs table created successfully')
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
    console.error('❌ feature_usage_logs auto-migration failed:', error.message)
    console.error('Server will continue to start, but feature usage tracking may not work')
  }
}
