import { Router, Response } from 'express'
import { fetch } from 'undici'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { logFeatureUsage } from '../utils/logFeatureUsage'
import OpenAI from 'openai'

const router = Router()

const DEFAULT_ENDPOINT = 'https://api.growthcore.co.kr/api/thirdparty/id-analytics'

const createErrorResponse = (message: string) => ({
  status: 'error',
  message,
})

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

async function translateToJapanese(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return text
  if (!openai) return text
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the given Korean text to natural Japanese. Maintain the tone and formatting. Only return the translated text without any explanations.',
        },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
    })
    return response.choices[0]?.message?.content || text
  } catch (error) {
    console.error('[AccountOptimization] Translation error:', error)
    return text
  }
}

async function translateApiResponse(data: any): Promise<any> {
  if (!data || !data.result) return data
  const result = data.result

  const translations: Array<{ key: string; text: string }> = []
  if (result.analytics_message) translations.push({ key: 'analytics_message', text: result.analytics_message })

  if (result.recommend_service_message && Array.isArray(result.recommend_service_message)) {
    result.recommend_service_message.forEach((msg: string, idx: number) => {
      translations.push({ key: `rsm_${idx}`, text: msg })
    })
  }

  const translatedTexts = await Promise.all(translations.map(item => translateToJapanese(item.text)))

  let rsmIdx = 0
  translations.forEach((item, idx) => {
    if (item.key === 'analytics_message') {
      result.analytics_message = translatedTexts[idx]
    } else if (item.key.startsWith('rsm_')) {
      result.recommend_service_message[rsmIdx++] = translatedTexts[idx]
    }
  })

  return data
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.query.id ?? '').trim()
  const lang = String(req.query.lang ?? 'ja').trim()

  console.log('[AccountOptimization] Request received:', { id, lang })

  if (!id) {
    return res
      .status(400)
      .json(createErrorResponse('インスタグラムIDを入力してください。'))
  }

  const apiKey =
    process.env.ACCOUNT_OPTIMIZATION_API_KEY ||
    process.env.INSTAGRAM_ANALYTICS_API_KEY ||
    ''

  if (!apiKey) {
    console.error('[AccountOptimization] Missing API key environment variable')
    return res
      .status(500)
      .json(createErrorResponse('外部連携キーが設定されていません。'))
  }

  const endpoint =
    process.env.ACCOUNT_OPTIMIZATION_API_URL ||
    process.env.INSTAGRAM_ANALYTICS_API_URL ||
    DEFAULT_ENDPOINT

  console.log('[AccountOptimization] Using endpoint:', endpoint)

  try {
    const url = new URL(endpoint)
    url.searchParams.set('id', id)

    console.log('[AccountOptimization] Calling GrowthCore API:', url.toString())

    const upstreamResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-Key': apiKey,
        Accept: 'application/json',
      },
    })

    console.log('[AccountOptimization] GrowthCore response status:', upstreamResponse.status)

    const rawText = await upstreamResponse.text()
    console.log('[AccountOptimization] Raw response length:', rawText.length)
    
    let payload: any = null

    if (rawText) {
      try {
        payload = JSON.parse(rawText)
        console.log('[AccountOptimization] Parsed response:', { 
          status: payload?.status,
          hasResult: !!payload?.result 
        })
        // 실제 응답 구조 확인을 위한 로그 (개발용)
        console.log('[AccountOptimization] Full response structure:', JSON.stringify(payload, null, 2).substring(0, 2000))
      } catch (parseError) {
        console.error('[AccountOptimization] Failed to parse response JSON', parseError)
        console.error('[AccountOptimization] Raw text (first 500 chars):', rawText.substring(0, 500))
        payload = createErrorResponse('外部サービスの応答を解析できませんでした。')
      }
    }

    if (!upstreamResponse.ok) {
      const statusCode = upstreamResponse.status || 502
      console.error('[AccountOptimization] Upstream error:', {
        statusCode,
        payload: payload ? JSON.stringify(payload).substring(0, 200) : 'null'
      })
      return res.status(statusCode).json(
        payload ||
          createErrorResponse(
            '外部サービスからエラーが返されました。少し時間を置いて再度お試しください。'
          )
      )
    }

    if (!payload) {
      console.error('[AccountOptimization] Empty payload received')
      return res
        .status(502)
        .json(createErrorResponse('外部サービスから空の応答が返されました。'))
    }

    if (lang === 'ja') {
      console.log('[AccountOptimization] Translating response to Japanese...')
      payload = await translateApiResponse(payload)
    }

    console.log('[AccountOptimization] Returning successful response')
    if (req.user?.id) {
      logFeatureUsage(req.user.id, '계정최적화조회', { query: id })
    }
    return res.json(payload)
  } catch (error) {
    console.error('[AccountOptimization] Request failed:', error)
    console.error('[AccountOptimization] Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack?.substring(0, 500)
    })
    return res
      .status(502)
      .json(createErrorResponse('外部サービス呼び出しに失敗しました。再度お試しください。'))
  }
})

router.get('/image-proxy', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rawUrl = String(req.query.url ?? '').trim()
    if (!rawUrl) {
      return res.status(400).json(createErrorResponse('画像URLが必要です。'))
    }

    let parsed: URL
    try {
      parsed = new URL(rawUrl)
    } catch (error) {
      return res.status(400).json(createErrorResponse('無効なURLです。'))
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json(createErrorResponse('対応していないURLです。'))
    }

    const host = parsed.hostname
    if (!host.includes('growthcore')) {
      return res.status(400).json(createErrorResponse('許可されていない画像ホストです。'))
    }

    const upstream = await fetch(parsed.toString())
    if (!upstream.ok) {
      return res.status(502).json(createErrorResponse('画像を取得できませんでした。'))
    }

    const arrayBuffer = await upstream.arrayBuffer()
    const contentType = upstream.headers.get('content-type') || 'image/jpeg'
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return res.json({ dataUrl: `data:${contentType};base64,${base64}` })
  } catch (error) {
    console.error('[AccountOptimization] Image proxy failed', error)
    return res.status(500).json(createErrorResponse('画像取得中にエラーが発生しました。'))
  }
})

router.post('/screenshot', authMiddleware, async (_req: AuthRequest, res: Response) => {
  return res
    .status(410)
    .json(
      createErrorResponse(
        'スクリーンショットの自動生成機能は現在ご利用いただけません。画面上部の保存ボタンをご利用ください。'
      )
    )
})

export default router


