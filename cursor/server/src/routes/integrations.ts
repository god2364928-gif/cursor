import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { importRecentCalls } from '../services/cpiImportService'

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


