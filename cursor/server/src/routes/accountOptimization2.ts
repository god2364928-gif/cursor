import { Router, Response } from 'express'
import { fetch } from 'undici'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import OpenAI from 'openai'

const router = Router()

const RENEWAL_ENDPOINT = 'https://api.growthcore.co.kr/api/thirdparty/id-analytics-renewal'

const createErrorResponse = (message: string) => ({
  status: 'error',
  message,
})

// OpenAI 클라이언트 초기화 (API 키가 없어도 서버 시작 가능)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

// 번역 함수
async function translateToJapanese(text: string): Promise<string> {
  if (!text || typeof text !== 'string') return text
  if (!openai) {
    console.warn('[Translation] OpenAI API key not configured, skipping translation')
    return text
  }
  
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Translate the given Korean text to natural Japanese. Maintain the tone and formatting. Only return the translated text without any explanations.'
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.3,
    })
    
    return response.choices[0]?.message?.content || text
  } catch (error) {
    console.error('[Translation] Error translating text:', error)
    return text // 번역 실패 시 원본 반환
  }
}

// API 응답 번역 함수
async function translateApiResponse(data: any): Promise<any> {
  if (!data || !data.result) return data
  
  const result = data.result
  
  // 번역할 텍스트들을 배열로 모아서 한번에 처리
  const translations: Array<{ key: string; text: string; path?: (string | number)[] }> = []
  
  // 상위 레벨 텍스트
  if (result.analytics_message) translations.push({ key: 'analytics_message', text: result.analytics_message })
  if (result.content_briefing) translations.push({ key: 'content_briefing', text: result.content_briefing })
  if (result.grade_action) translations.push({ key: 'grade_action', text: result.grade_action })
  if (result.grade_text) translations.push({ key: 'grade_text', text: result.grade_text })
  if (result.distribution_advice) translations.push({ key: 'distribution_advice', text: result.distribution_advice })
  if (result.distribution_text) translations.push({ key: 'distribution_text', text: result.distribution_text })
  if (result.reaction_status) translations.push({ key: 'reaction_status', text: result.reaction_status })
  
  // recommend_service_message 배열 처리
  if (result.recommend_service_message && Array.isArray(result.recommend_service_message)) {
    result.recommend_service_message.forEach((msg: string, idx: number) => {
      translations.push({ 
        key: `recommend_service_message_${idx}`, 
        text: msg, 
        path: ['recommend_service_message', idx] 
      })
    })
  }
  
  // category_data 내부 텍스트
  if (result.category_data && Array.isArray(result.category_data)) {
    result.category_data.forEach((category: any, idx: number) => {
      if (category.title) {
        translations.push({ key: `category_${idx}_title`, text: category.title, path: ['category_data', idx, 'title'] })
      }
      if (category.desc) {
        translations.push({ key: `category_${idx}_desc`, text: category.desc, path: ['category_data', idx, 'desc'] })
      }
      if (category.know_how) {
        translations.push({ key: `category_${idx}_know_how`, text: category.know_how, path: ['category_data', idx, 'know_how'] })
      }
      if (category.insight) {
        translations.push({ key: `category_${idx}_insight`, text: category.insight, path: ['category_data', idx, 'insight'] })
      }
      if (category.current_status?.text) {
        translations.push({ 
          key: `category_${idx}_current_status_text`, 
          text: category.current_status.text, 
          path: ['category_data', idx, 'current_status', 'text'] 
        })
      }
      
      // current_status.unit 번역 (한국어 단위 → 일본어)
      if (category.current_status?.unit) {
        const unitMap: Record<string, string> = {
          '개': '個',
          '명': '名',
          '회': '回',
          '일': '日',
          '시간': '時間',
          '분': '分',
          '건': '件',
        }
        const koreanUnit = category.current_status.unit
        if (unitMap[koreanUnit]) {
          category.current_status.unit = unitMap[koreanUnit]
        }
      }
      
      // action.recommendations
      if (category.action?.recommendations && Array.isArray(category.action.recommendations)) {
        category.action.recommendations.forEach((rec: any, recIdx: number) => {
          if (rec.title) {
            translations.push({ 
              key: `category_${idx}_rec_${recIdx}_title`, 
              text: rec.title, 
              path: ['category_data', idx, 'action', 'recommendations', recIdx, 'title'] 
            })
          }
          if (rec.description) {
            translations.push({ 
              key: `category_${idx}_rec_${recIdx}_desc`, 
              text: rec.description, 
              path: ['category_data', idx, 'action', 'recommendations', recIdx, 'description'] 
            })
          }
        })
      }
    })
  }
  
  console.log(`[Translation] Translating ${translations.length} text fields...`)
  
  // 모든 텍스트 병렬 번역
  const translatedTexts = await Promise.all(
    translations.map(item => translateToJapanese(item.text))
  )
  
  // 번역된 텍스트를 결과에 적용
  translations.forEach((item, idx) => {
    const translatedText = translatedTexts[idx]
    
    if (item.path) {
      // 중첩된 경로 처리
      let target = result
      for (let i = 0; i < item.path.length - 1; i++) {
        target = target[item.path[i]]
      }
      target[item.path[item.path.length - 1]] = translatedText
    } else {
      // 최상위 레벨
      result[item.key] = translatedText
    }
  })
  
  console.log('[Translation] Translation completed')
  
  // 번역 후 일본어 교정 (OpenAI 번역 오류 보정)
  postTranslationFix(data)
  
  return data
}

// 번역 후 일본어 교정 함수
function postTranslationFix(data: any): void {
  if (!data || !data.result) return

  const fixes: [string, string][] = [
    ['探索タブ', '発見タブ'],
    ['リルス', 'リール'],
    ['私の投稿の上位拡散作業', '投稿上位拡散作業'],
  ]

  function applyFixes(text: string): string {
    let fixed = text
    for (const [from, to] of fixes) {
      fixed = fixed.split(from).join(to)
    }
    return fixed
  }

  const result = data.result

  // 상위 레벨 텍스트 필드
  const topKeys = [
    'analytics_message', 'content_briefing', 'grade_action',
    'grade_text', 'distribution_advice', 'distribution_text', 'reaction_status',
  ]
  for (const key of topKeys) {
    if (typeof result[key] === 'string') {
      result[key] = applyFixes(result[key])
    }
  }

  // recommend_service_message
  if (Array.isArray(result.recommend_service_message)) {
    result.recommend_service_message = result.recommend_service_message.map(
      (msg: any) => typeof msg === 'string' ? applyFixes(msg) : msg
    )
  }

  // category_data
  if (Array.isArray(result.category_data)) {
    for (const category of result.category_data) {
      if (typeof category.title === 'string') category.title = applyFixes(category.title)
      if (typeof category.desc === 'string') category.desc = applyFixes(category.desc)
      if (typeof category.know_how === 'string') category.know_how = applyFixes(category.know_how)
      if (typeof category.insight === 'string') category.insight = applyFixes(category.insight)
      if (typeof category.current_status?.text === 'string') {
        category.current_status.text = applyFixes(category.current_status.text)
      }
      if (Array.isArray(category.action?.recommendations)) {
        for (const rec of category.action.recommendations) {
          if (typeof rec.title === 'string') rec.title = applyFixes(rec.title)
          if (typeof rec.description === 'string') rec.description = applyFixes(rec.description)
        }
      }
    }
  }
}

// API 응답 내 "한국인" → "일본인" 치환 함수
function replaceTextInPayload(payload: any): void {
  if (!payload || !payload.result) return

  const result = payload.result
  const replacements: [string, string][] = [
    ['한국인', '일본인'],
    ['韓国人', '日本人'],
  ]

  function replaceInString(text: string): string {
    let replaced = text
    for (const [from, to] of replacements) {
      replaced = replaced.split(from).join(to)
    }
    return replaced
  }

  // 상위 레벨 텍스트 필드
  const topLevelKeys = [
    'analytics_message', 'content_briefing', 'grade_action',
    'grade_text', 'distribution_advice', 'distribution_text', 'reaction_status',
  ]
  for (const key of topLevelKeys) {
    if (typeof result[key] === 'string') {
      result[key] = replaceInString(result[key])
    }
  }

  // recommend_service_message 배열
  if (Array.isArray(result.recommend_service_message)) {
    result.recommend_service_message = result.recommend_service_message.map(
      (msg: any) => typeof msg === 'string' ? replaceInString(msg) : msg
    )
  }

  // category_data 내부 텍스트
  if (Array.isArray(result.category_data)) {
    for (const category of result.category_data) {
      if (typeof category.title === 'string') category.title = replaceInString(category.title)
      if (typeof category.desc === 'string') category.desc = replaceInString(category.desc)
      if (typeof category.know_how === 'string') category.know_how = replaceInString(category.know_how)
      if (typeof category.insight === 'string') category.insight = replaceInString(category.insight)
      if (typeof category.current_status?.text === 'string') {
        category.current_status.text = replaceInString(category.current_status.text)
      }
      // action.recommendations
      if (Array.isArray(category.action?.recommendations)) {
        for (const rec of category.action.recommendations) {
          if (typeof rec.title === 'string') rec.title = replaceInString(rec.title)
          if (typeof rec.description === 'string') rec.description = replaceInString(rec.description)
        }
      }
    }
  }
}

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const id = String(req.query.id ?? '').trim()
  const lang = String(req.query.lang ?? 'ko').trim() // 언어 파라미터 받기 (기본값: ko)

  console.log('[AccountOptimization2] Request received:', { id, lang })

  if (!id) {
    return res
      .status(400)
      .json(createErrorResponse('인스타그램 ID를 입력해주세요.'))
  }

  const apiKey =
    process.env.ACCOUNT_OPTIMIZATION_API_KEY ||
    process.env.INSTAGRAM_ANALYTICS_API_KEY ||
    ''

  if (!apiKey) {
    console.error('[AccountOptimization2] Missing API key environment variable')
    return res
      .status(500)
      .json(createErrorResponse('API 키가 설정되지 않았습니다.'))
  }

  const endpoint = RENEWAL_ENDPOINT

  console.log('[AccountOptimization2] Using endpoint:', endpoint)

  try {
    const url = new URL(endpoint)
    url.searchParams.set('id', id)
    // 다양한 언어 파라미터 형식 시도
    url.searchParams.set('lang', lang)
    url.searchParams.set('language', lang)
    url.searchParams.set('locale', lang)

    console.log('[AccountOptimization2] Calling GrowthCore Renewal API:', url.toString())

    const upstreamResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Auth-Key': apiKey,
        Accept: 'application/json',
      },
    })

    console.log('[AccountOptimization2] GrowthCore response status:', upstreamResponse.status)

    const rawText = await upstreamResponse.text()
    console.log('[AccountOptimization2] Raw response length:', rawText.length)
    
    let payload: any = null

    if (rawText) {
      try {
        payload = JSON.parse(rawText)
        console.log('[AccountOptimization2] Parsed response:', { 
          status: payload?.status,
          hasResult: !!payload?.result 
        })
        // 실제 응답 구조 확인을 위한 로그
        console.log('[AccountOptimization2] Full response structure:', JSON.stringify(payload, null, 2))
      } catch (parseError) {
        console.error('[AccountOptimization2] Failed to parse response JSON', parseError)
        console.error('[AccountOptimization2] Raw text (first 500 chars):', rawText.substring(0, 500))
        payload = createErrorResponse('응답을 해석할 수 없습니다.')
      }
    }

    if (!upstreamResponse.ok) {
      const statusCode = upstreamResponse.status || 502
      console.error('[AccountOptimization2] Upstream error:', {
        statusCode,
        payload: payload ? JSON.stringify(payload).substring(0, 200) : 'null'
      })
      return res.status(statusCode).json(
        payload ||
          createErrorResponse(
            'API 호출에 실패했습니다. 잠시 후 다시 시도해주세요.'
          )
      )
    }

    if (!payload) {
      console.error('[AccountOptimization2] Empty payload received')
      return res
        .status(502)
        .json(createErrorResponse('빈 응답을 받았습니다.'))
    }

    // API 응답 내 "한국인" → "일본인" 치환 (GrowthCore API가 한국 기준으로 반환하므로)
    replaceTextInPayload(payload)

    // 일본어 요청인 경우 번역 수행
    if (lang === 'ja') {
      console.log('[AccountOptimization2] Translating response to Japanese...')
      payload = await translateApiResponse(payload)
    }

    console.log('[AccountOptimization2] Returning successful response')
    return res.json(payload)
  } catch (error) {
    console.error('[AccountOptimization2] Request failed:', error)
    console.error('[AccountOptimization2] Error details:', {
      name: (error as Error)?.name,
      message: (error as Error)?.message,
      stack: (error as Error)?.stack?.substring(0, 500)
    })
    return res
      .status(502)
      .json(createErrorResponse('API 호출 중 오류가 발생했습니다.'))
  }
})

export default router
