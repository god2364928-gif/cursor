import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { logFeatureUsage } from '../utils/logFeatureUsage'

const router = Router()

const DECAGO_USER_API = 'https://ig-parser.decago.co.kr/api/instagram/v3/user/username'

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const username = String(req.query.username ?? '').trim()

  if (!username) {
    return res.status(400).json({ error: 'username parameter is required' })
  }

  try {
    const url = `${DECAGO_USER_API}/${encodeURIComponent(username)}?skip_web_parsing=true`
    console.log('[FlagCheck] Fetching:', url)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000)

    const upstream = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)

    if (!upstream.ok) {
      console.error('[FlagCheck] Upstream error:', upstream.status)
      return res.status(upstream.status).json({ error: 'Upstream API error' })
    }

    const data: any = await upstream.json()

    if (req.user?.id) {
      await logFeatureUsage(req.user.id, '팔로워설정플래그조회')
    }

    return res.json({
      username,
      spam_follower_setting_enabled: data?.spam_follower_setting_enabled ?? null,
    })
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return res.status(504).json({ error: 'Request timed out' })
    }
    console.error('[FlagCheck] Error:', error.message)
    return res.status(502).json({ error: 'Failed to fetch user data' })
  }
})

export default router
