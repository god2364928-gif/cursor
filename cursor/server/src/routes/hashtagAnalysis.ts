import { Router, Request, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

const DECAGO_API_BASE = 'https://ig-parser.decago.co.kr/api/instagram/v3/hashtag'

const VALID_TABS = ['popular', 'foryou', 'top', 'recent'] as const

const ALLOWED_IMAGE_HOSTS = [
  'scontent.cdninstagram.com',
  'instagram.com',
  'cdninstagram.com',
]

router.get('/image-proxy', authMiddleware, async (req: Request, res: Response) => {
  const imageUrl = String(req.query.url ?? '').trim()

  if (!imageUrl) {
    return res.status(400).json({ error: 'url parameter is required' })
  }

  try {
    const parsed = new URL(imageUrl)
    const isAllowed = ALLOWED_IMAGE_HOSTS.some(h => parsed.hostname.endsWith(h))
    if (!isAllowed) {
      return res.status(403).json({ error: 'Host not allowed' })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const upstream = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    clearTimeout(timeout)

    if (!upstream.ok) {
      return res.status(upstream.status).end()
    }

    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')

    const buffer = Buffer.from(await upstream.arrayBuffer())
    return res.send(buffer)
  } catch {
    return res.status(502).end()
  }
})

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
