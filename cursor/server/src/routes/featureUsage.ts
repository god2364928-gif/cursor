import { Router, Response } from 'express'
import { pool } from '../db'
import { superAdminOnly, SuperAdminRequest } from '../middleware/superAdminOnly'

const router = Router()

router.get('/', superAdminOnly, async (req: SuperAdminRequest, res: Response) => {
  const { user_id, feature, from_date, to_date } = req.query

  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (user_id) {
    conditions.push(`f.user_id = $${idx++}`)
    params.push(user_id)
  }
  if (feature) {
    conditions.push(`f.feature_name = $${idx++}`)
    params.push(feature)
  }
  if (from_date) {
    conditions.push(`f.created_at >= $${idx++}`)
    params.push(from_date)
  }
  if (to_date) {
    conditions.push(`f.created_at < ($${idx++}::date + interval '1 day')`)
    params.push(to_date)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  try {
    const result = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        f.feature_name,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE f.created_at >= CURRENT_DATE) AS today_count,
        COUNT(*) FILTER (WHERE f.created_at >= date_trunc('month', CURRENT_DATE)) AS month_count,
        MAX(f.created_at) AS last_used_at
      FROM feature_usage_logs f
      JOIN users u ON f.user_id = u.id
      ${whereClause}
      GROUP BY u.id, u.name, f.feature_name
      ORDER BY u.name, f.feature_name
      `,
      params
    )

    return res.json(result.rows)
  } catch (error: any) {
    console.error('[FeatureUsage] Query failed:', error.message)
    return res.status(500).json({ message: '조회 중 오류가 발생했습니다.' })
  }
})

router.get('/detail', superAdminOnly, async (req: SuperAdminRequest, res: Response) => {
  const { user_id, feature, from_date, to_date, limit = '100', offset = '0' } = req.query

  const conditions: string[] = []
  const params: any[] = []
  let idx = 1

  if (user_id) {
    conditions.push(`f.user_id = $${idx++}`)
    params.push(user_id)
  }
  if (feature) {
    conditions.push(`f.feature_name = $${idx++}`)
    params.push(feature)
  }
  if (from_date) {
    conditions.push(`f.created_at >= $${idx++}`)
    params.push(from_date)
  }
  if (to_date) {
    conditions.push(`f.created_at < ($${idx++}::date + interval '1 day')`)
    params.push(to_date)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  params.push(Number(limit))
  params.push(Number(offset))

  try {
    const result = await pool.query(
      `
      SELECT
        f.id,
        u.name AS user_name,
        f.feature_name,
        f.metadata,
        f.created_at
      FROM feature_usage_logs f
      JOIN users u ON f.user_id = u.id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
      `,
      params
    )

    return res.json(result.rows)
  } catch (error: any) {
    console.error('[FeatureUsage] Detail query failed:', error.message)
    return res.status(500).json({ message: '조회 중 오류가 발생했습니다.' })
  }
})

export default router
