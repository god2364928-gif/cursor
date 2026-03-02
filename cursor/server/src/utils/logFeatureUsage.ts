import { pool } from '../db'

export async function logFeatureUsage(userId: string, featureName: string): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO feature_usage_logs (user_id, feature_name) VALUES ($1, $2)',
      [userId, featureName]
    )
  } catch (error: any) {
    console.error('[FeatureUsage] Failed to log usage:', error.message)
  }
}
