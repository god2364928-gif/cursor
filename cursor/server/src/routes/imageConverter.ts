import { Router, Response } from 'express'
import { fetch } from 'undici'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// 외부 이미지를 Base64로 변환하는 API
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { imageUrl } = req.body

  if (!imageUrl || typeof imageUrl !== 'string') {
    return res.status(400).json({
      status: 'error',
      message: '이미지 URL이 필요합니다.',
    })
  }

  try {
    console.log('[ImageConverter] Fetching image from:', imageUrl)

    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      console.error('[ImageConverter] Failed to fetch image:', response.status)
      return res.status(response.status).json({
        status: 'error',
        message: '이미지를 가져올 수 없습니다.',
      })
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // Content-Type 추출
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    console.log('[ImageConverter] Image converted successfully, size:', buffer.length)

    return res.json({
      status: 'success',
      data: `data:${contentType};base64,${base64}`,
    })
  } catch (error) {
    console.error('[ImageConverter] Error converting image:', error)
    return res.status(500).json({
      status: 'error',
      message: '이미지 변환 중 오류가 발생했습니다.',
    })
  }
})

export default router
