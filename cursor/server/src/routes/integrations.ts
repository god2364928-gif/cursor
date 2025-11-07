import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { importRecentCalls } from '../services/cpiImportService'
import { fetchFirstOutCalls } from '../integrations/cpiClient'
import { pool } from '../db'

const router = Router()

// Trigger CPI import manually (admin only)
router.post('/cpi/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const sinceParam = req.query.since as string | undefined
    const until = new Date()
    const since = sinceParam ? new Date(sinceParam) : new Date(until.getTime() - 2 * 60 * 60 * 1000) // last 2h

    const result = await importRecentCalls(since, until)
    res.json({ ok: true, ...result })
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Internal error' })
  }
})

export default router

// Peek CPI records without inserting (debug)
router.get('/cpi/peek', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    const start = (req.query.start as string) || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const end = (req.query.end as string) || new Date().toISOString().slice(0, 10)
    const { data, total } = await fetchFirstOutCalls({ startDate: start, endDate: end, row: 50, page: 1 })
    const username = (req.query.username as string) || ''
    const filtered = username ? data.filter(d => (d.username || '').trim() === username.trim()) : data
    res.json({ total, count: filtered.length, sample: filtered.slice(0, 10) })
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Internal error' })
  }
})

// Check inserted records for a manager/date
router.get('/cpi/check', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.query.manager) return res.status(400).json({ message: 'manager required' })
    const manager = String(req.query.manager)
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10)
    const r = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM sales_tracking WHERE manager_name = $1 AND date = $2`,
      [manager, date]
    )
    res.json({ manager, date, count: r.rows[0].cnt })
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Internal error' })
  }
})


