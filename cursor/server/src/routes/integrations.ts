import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { importRecentCalls } from '../services/cpiImportService'
import { fetchFirstOutCalls } from '../integrations/cpiClient'
import { formatPhoneNumber } from '../utils/nullSafe'
import { pool } from '../db'

const router = Router()

// Trigger CPI import manually (admin only)
// Flexible date parser (accepts multiple formats, defaults to KST)
function parseDateFlexible(input: string | undefined, fallback: Date): Date {
  if (!input) return fallback
  const s = input.trim()
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T00:00:00+09:00`)
  // YYYY/MM/DD
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
    const t = s.split('/').join('-')
    return new Date(`${t}T00:00:00+09:00`)
  }
  // YYYY-MM-DD HH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s)) return new Date(s.replace(' ', 'T') + '+09:00')
  // YYYY-MM-DDTHH:mm:ss (no tz)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return new Date(s + '+09:00')
  // ISO with tz
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  throw new Error('Invalid time format. Use ISO or YYYY-MM-DD( HH:mm:ss).')
}

router.post('/cpi/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' })
    }
    const sinceParam = req.query.since as string | undefined
    const until = new Date()
    let since: Date
    try {
      since = parseDateFlexible(sinceParam, new Date(until.getTime() - 2 * 60 * 60 * 1000))
    } catch {
      // 파싱 실패 시에도 수집이 멈추지 않도록 최근 24시간으로 진행
      since = new Date(until.getTime() - 24 * 60 * 60 * 1000)
    }

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
    const page = parseInt(String(req.query.page || '1'), 10) || 1
    const row = parseInt(String(req.query.row || '50'), 10) || 50
    const { data, total } = await fetchFirstOutCalls({ startDate: start, endDate: end, row, page })
    const username = (req.query.username as string) || ''
    const filtered = username ? data.filter(d => (d.username || '').trim() === username.trim()) : data
    res.json({ total, count: filtered.length, sample: filtered.slice(0, 10), page, row })
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Internal error' })
  }
})

// Import by phone (precise) - fetch OUT calls for a given phone
router.post('/cpi/import-by-phone', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
    const phone = (req.query.phone as string)?.trim()
    const day = (req.query.day as string) || new Date().toISOString().slice(0, 10)
    if (!phone) return res.status(400).json({ message: 'phone required' })

    // Use CPI client directly with query by phone
    const start = day
    const end = day
    let page = 1
    let totalInserted = 0
    while (true) {
      const { data, total } = await fetchFirstOutCalls({ startDate: start, endDate: end, page, row: 100, query: phone, queryType: 2 })
      if (!data || data.length === 0) break
      for (const r of data) {
        const externalId = String(r.record_id)
        const exists = await pool.query('SELECT 1 FROM sales_tracking WHERE external_call_id = $1 LIMIT 1', [externalId])
        if (exists.rowCount && exists.rowCount > 0) continue
        const managerName = r.username?.trim() || ''
        const dateStr = (r.created_at || '').slice(0, 10)
        const companyName = r.company?.trim() || ''
        const phoneNum = formatPhoneNumber(r.phone_number) || ''
        await pool.query(
          `INSERT INTO sales_tracking (
            date, manager_name, company_name, customer_name, industry, contact_method, status, contact_person, phone, memo, memo_note, user_id, created_at, updated_at, external_call_id, external_source
          ) VALUES (
            $1, $2, $3, '', NULL, '電話', '未返信', NULL, $4, NULL, NULL, NULL, NOW(), NOW(), $5, 'cpi'
          ) ON CONFLICT (external_call_id) DO NOTHING`,
          [dateStr, managerName, companyName, phoneNum, externalId]
        )
        totalInserted++
      }
      if (page * 100 >= total) break
      page++
    }
    res.json({ ok: true, inserted: totalInserted })
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

// Find a row by external_call_id (debug)
router.get('/cpi/by-id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rid = (req.query.rid as string)?.trim()
    if (!rid) return res.status(400).json({ message: 'rid required' })
    const r = await pool.query(
      `SELECT id, date, manager_name, company_name, phone, contact_method, status, external_call_id
       FROM sales_tracking WHERE external_call_id = $1`,
      [rid]
    )
    res.json({ count: r.rowCount || 0, rows: r.rows })
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Internal error' })
  }
})


