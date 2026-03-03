import { pool } from '../db'

export async function logFeatureUsage(
  userId: string,
  featureName: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await pool.query(
      'INSERT INTO feature_usage_logs (user_id, feature_name, metadata) VALUES ($1, $2, $3)',
      [userId, featureName, metadata ? JSON.stringify(metadata) : null]
    )
  } catch (error: any) {
    console.error('[FeatureUsage] Failed to log usage:', error.message)
  }
}
