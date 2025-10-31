import { Router, Request, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// GET /api/perf/filters  → distinct managers/services/types used in payments
router.get('/filters', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const managers = await pool.query(
      `SELECT DISTINCT u.id, u.name
       FROM payments p
       JOIN users u ON u.id = p.manager_user_id
       WHERE p.manager_user_id IS NOT NULL
       ORDER BY u.name`
    )
    const services = await pool.query(
      `SELECT DISTINCT s.id, s.name
       FROM payments p
       JOIN services s ON s.id = p.service_id
       WHERE p.service_id IS NOT NULL
       ORDER BY s.name`
    )
    const types = await pool.query(`SELECT id, code, label FROM payment_types ORDER BY code`)
    res.json({ managers: managers.rows, services: services.rows, types: types.rows })
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: String(err) })
  }
})

// GET /api/perf/summary?month=YYYY-MM&manager=&service=&type=
// or /api/perf/summary?from=ISO&to=ISO&manager=&service=&type=
router.get('/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { month, manager, service, type, from, to } = req.query as Record<string, string | undefined>
    if (!month && !from && !to) {
      return res.status(400).json({ message: 'month or from/to is required' })
    }

    const params: any[] = []
    const where: string[] = []

    if (month) {
      where.push("to_char(paid_at, 'YYYY-MM') = $" + (params.push(month)))
    }
    if (from) where.push('paid_at >= $' + (params.push(from)))
    if (to) where.push('paid_at <= $' + (params.push(to)))
    if (manager) where.push('manager_user_id = $' + (params.push(manager)))
    if (service) where.push('service_id = $' + (params.push(service)))
    if (type) where.push('payment_type_id = $' + (params.push(type)))

    const sql = `
      SELECT 
        COALESCE(SUM(gross_amount_jpy),0) AS total_gross,
        COALESCE(SUM(net_amount_jpy),0)   AS total_net,
        COALESCE(SUM(incentive_amount_jpy),0) AS total_incentive,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE pt.code = 'new')    AS new_count,
        COUNT(*) FILTER (WHERE pt.code = 'renew')  AS renew_count,
        COUNT(*) FILTER (WHERE pt.code = 'oneoff') AS oneoff_count
      FROM payments p
      LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `

    const { rows } = await pool.query(sql, params)
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: String(err) })
  }
})

// GET /api/perf/list?from=&to=&manager=&service=&type=&page=&pageSize=
router.get('/list', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { from, to, manager, service, type } = req.query as Record<string, string | undefined>
    const page = parseInt((req.query.page as string) || '1', 10)
    const pageSize = parseInt((req.query.pageSize as string) || '20', 10)

    const params: any[] = []
    const where: string[] = []
    if (from) where.push('paid_at >= $' + (params.push(from)))
    if (to) where.push('paid_at <= $' + (params.push(to)))
    if (manager) where.push('manager_user_id = $' + (params.push(manager)))
    if (service) where.push('service_id = $' + (params.push(service)))
    if (type) where.push('payment_type_id = $' + (params.push(type)))

    const offset = (page - 1) * pageSize

    const sql = `
      SELECT p.*, 
             u.name AS manager_name, s.name AS service_name, pt.code AS type_code, pt.label AS type_label,
             c.company_name AS customer_company, c.customer_name AS customer_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.manager_user_id
      LEFT JOIN services s ON s.id = p.service_id
      LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      LEFT JOIN customers c ON c.id = p.customer_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY paid_at DESC NULLS LAST
      LIMIT ${pageSize} OFFSET ${offset}
    `

    const { rows } = await pool.query(sql, params)
    res.json({ items: rows, page, pageSize })
  } catch (err) {
    res.status(500).json({ message: 'Internal server error', error: String(err) })
  }
})

export default router


