import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

const DECAGO_API_BASE = 'https://ig-parser.decago.co.kr/api/instagram/v3/hashtag'

const VALID_TABS = ['popular', 'foryou', 'top', 'recent'] as const

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const hashtag = String(req.query.hashtag ?? '').trim()
  const tab = String(req.query.tab ?? 'popular').trim()

  if (!hashtag) {
    return res.status(400).json({ error: 'hashtag parameter is required' })
  }

  if (!VALID_TABS.includes(tab as any)) {
    return res.status(400).json({ error: `Invalid tab. Must be one of: ${VALID_TABS.join(', ')}` })
  }

  try {
    const url = new URL(DECAGO_API_BASE)
    url.searchParams.set('hashtag', hashtag)
    url.searchParams.set('tab', tab)
    url.searchParams.set('sync', 'false')

    console.log('[HashtagAnalysis] Fetching:', url.toString())

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)

    const upstream = await fetch(url.toString(), {
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      console.error('[HashtagAnalysis] Upstream error:', upstream.status)
      return res.status(upstream.status).json({ error: 'Upstream API error' })
    }

    const data: any = await upstream.json()
    console.log('[HashtagAnalysis] Success for hashtag:', hashtag, '| post_count:', data?.post_count)
    return res.json(data)
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[HashtagAnalysis] Request timed out for:', hashtag)
      return res.status(504).json({ error: 'Request timed out' })
    }
    console.error('[HashtagAnalysis] Error:', error.message)
    return res.status(502).json({ error: 'Failed to fetch hashtag data' })
  }
})

export default router
