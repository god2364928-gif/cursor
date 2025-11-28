import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// 일본 47개 도도부현 (지방별 그룹화)
const PREFECTURES = {
  '北海道': ['北海道'],
  '東北': ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
  '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
  '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
  '近畿': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
  '中国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
  '四国': ['徳島県', '香川県', '愛媛県', '高知県'],
  '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
}

// 모든 도도부현 플랫 리스트
const ALL_PREFECTURES = Object.values(PREFECTURES).flat()

/**
 * 도도부현 목록 (지방별 그룹화)
 * GET /api/restaurants/prefectures
 */
router.get('/prefectures', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      prefectures: PREFECTURES,
      all: ALL_PREFECTURES
    })
  } catch (error) {
    console.error('Error fetching prefectures:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 특정 도도부현의 지역 목록
 * GET /api/restaurants/areas?prefecture=東京都
 */
router.get('/areas', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prefecture } = req.query

    if (!prefecture) {
      return res.status(400).json({ message: 'prefecture is required' })
    }

    const result = await pool.query(`
      SELECT DISTINCT unnest(areas) as area
      FROM restaurants
      WHERE prefecture = $1 AND is_unusable = false
      ORDER BY area
    `, [prefecture])

    res.json({
      areas: result.rows.map(r => r.area).filter(Boolean)
    })
  } catch (error) {
    console.error('Error fetching areas:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 장르 목록
 * GET /api/restaurants/genres
 */
router.get('/genres', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT unnest(genres) as genre
      FROM restaurants
      WHERE is_unusable = false
      ORDER BY genre
    `)

    res.json({
      genres: result.rows.map(r => r.genre).filter(Boolean)
    })
  } catch (error) {
    console.error('Error fetching genres:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 음식점 목록 조회 (필터링 + 페이지네이션)
 * GET /api/restaurants
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      prefecture,
      area,
      genre,
      has_original_phone,
      has_homepage,
      can_contact,
      has_instagram,
      show_unusable,
      search,
      status,
      page = '1',
      limit = '50'
    } = req.query

    // 기본 조건
    const conditions: string[] = []
    const params: any[] = []
    let paramIndex = 1

    // 쓸 수 없는 가게 필터 (기본: 숨김)
    if (show_unusable !== 'true') {
      conditions.push('is_unusable = false')
    }

    // 도도부현 필터 (필수)
    if (prefecture) {
      conditions.push(`prefecture = $${paramIndex}`)
      params.push(prefecture)
      paramIndex++
    }

    // 지역 필터 (배열에서 검색)
    if (area) {
      conditions.push(`$${paramIndex} = ANY(areas)`)
      params.push(area)
      paramIndex++
    }

    // 장르 필터 (배열에서 검색)
    if (genre) {
      conditions.push(`$${paramIndex} = ANY(genres)`)
      params.push(genre)
      paramIndex++
    }

    // 전화번호(기존) 필터
    if (has_original_phone === 'true') {
      conditions.push("tel_original IS NOT NULL AND tel_original != ''")
    }

    // 홈페이지 필터
    if (has_homepage === 'true') {
      conditions.push("homepage IS NOT NULL AND homepage != ''")
    }

    // 문의 가능 필터
    if (can_contact === 'true') {
      conditions.push('is_contactable = true')
    }

    // 인스타그램 필터
    if (has_instagram === 'true') {
      conditions.push("instagram IS NOT NULL AND instagram != ''")
    }

    // 상태 필터
    if (status) {
      conditions.push(`status = $${paramIndex}`)
      params.push(status)
      paramIndex++
    }

    // 가게명 검색
    if (search) {
      conditions.push(`name ILIKE $${paramIndex}`)
      params.push(`%${search}%`)
      paramIndex++
    }

    // WHERE 절 구성
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 페이지네이션
    const pageNum = parseInt(page as string) || 1
    const limitNum = Math.min(parseInt(limit as string) || 50, 100)
    const offset = (pageNum - 1) * limitNum

    // 메인 쿼리 (리스트용 가벼운 데이터)
    const query = `
      SELECT 
        r.id,
        r.shop_id,
        r.name,
        r.tel_original,
        r.tel_confirmed,
        r.prefecture,
        r.areas,
        r.genres,
        r.homepage,
        r.instagram,
        r.hotpepper,
        r.is_contactable,
        r.is_unusable,
        r.status,
        r.last_contacted_at,
        r.assignee_id,
        u.name as assignee_name,
        (SELECT COUNT(*) FROM sales_activities sa WHERE sa.restaurant_id = r.id) as activity_count
      FROM restaurants r
      LEFT JOIN users u ON r.assignee_id = u.id
      ${whereClause}
      ORDER BY 
        CASE WHEN r.tel_original IS NOT NULL AND r.tel_original != '' THEN 0 ELSE 1 END,
        r.id
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `
    
    params.push(limitNum, offset)

    const result = await pool.query(query, params)

    // 전체 개수 쿼리
    const countQuery = `
      SELECT COUNT(*) as total
      FROM restaurants r
      ${whereClause}
    `
    const countParams = params.slice(0, -2) // LIMIT, OFFSET 제외
    const countResult = await pool.query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].total)

    res.json({
      restaurants: result.rows,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    })
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 음식점 상세 조회
 * GET /api/restaurants/:id
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    // 음식점 정보
    const result = await pool.query(`
      SELECT 
        r.*,
        u1.name as assignee_name,
        u2.name as unusable_by_name,
        u3.name as last_contacted_by_name
      FROM restaurants r
      LEFT JOIN users u1 ON r.assignee_id = u1.id
      LEFT JOIN users u2 ON r.unusable_by = u2.id
      LEFT JOIN users u3 ON r.last_contacted_by = u3.id
      WHERE r.id = $1
    `, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }

    // 영업 이력 조회
    const activitiesResult = await pool.query(`
      SELECT 
        sa.id,
        sa.user_name,
        sa.contact_method,
        sa.notes,
        sa.created_at
      FROM sales_activities sa
      WHERE sa.restaurant_id = $1
      ORDER BY sa.created_at DESC
      LIMIT 50
    `, [id])

    res.json({
      restaurant: result.rows[0],
      activities: activitiesResult.rows
    })
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 음식점 메모 업데이트
 * PATCH /api/restaurants/:id
 */
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { memo, assignee_id } = req.body

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (memo !== undefined) {
      updates.push(`memo = $${paramIndex}`)
      params.push(memo || null)
      paramIndex++
    }

    if (assignee_id !== undefined) {
      updates.push(`assignee_id = $${paramIndex}`)
      params.push(assignee_id || null)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    params.push(id)
    await pool.query(
      `UPDATE restaurants SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating restaurant:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 쓸 수 없음 표시
 * POST /api/restaurants/:id/unusable
 */
router.post('/:id/unusable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { reason } = req.body
    const userId = req.user?.id

    await pool.query(`
      UPDATE restaurants 
      SET 
        is_unusable = true,
        unusable_reason = $1,
        unusable_by = $2,
        unusable_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [reason || null, userId, id])

    res.json({ success: true })
  } catch (error) {
    console.error('Error marking restaurant as unusable:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 쓸 수 없음 해제
 * DELETE /api/restaurants/:id/unusable
 */
router.delete('/:id/unusable', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    await pool.query(`
      UPDATE restaurants 
      SET 
        is_unusable = false,
        unusable_reason = NULL,
        unusable_by = NULL,
        unusable_at = NULL
      WHERE id = $1
    `, [id])

    res.json({ success: true })
  } catch (error) {
    console.error('Error unmarking restaurant as unusable:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 영업 이력 등록
 * POST /api/restaurants/:id/sales-activity
 */
router.post('/:id/sales-activity', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { contact_method, notes } = req.body
    const userId = req.user?.id
    const userName = req.user?.name || 'Unknown'

    if (!contact_method || !['form', 'phone', 'instagram', 'line'].includes(contact_method)) {
      return res.status(400).json({ 
        message: 'contact_method must be one of: form, phone, instagram, line' 
      })
    }

    // 영업 이력 등록
    const activityResult = await pool.query(`
      INSERT INTO sales_activities (restaurant_id, user_id, user_name, contact_method, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at
    `, [id, userId, userName, contact_method, notes || null])

    // 가게 상태 업데이트
    await pool.query(`
      UPDATE restaurants 
      SET 
        status = CASE WHEN status = 'new' THEN 'contacted' ELSE status END,
        last_contacted_at = CURRENT_TIMESTAMP,
        last_contacted_by = $1,
        assignee_id = COALESCE(assignee_id, $1)
      WHERE id = $2
    `, [userId, id])

    res.json({
      success: true,
      activity: activityResult.rows[0]
    })
  } catch (error) {
    console.error('Error creating sales activity:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 음식점 영업 이력 목록
 * GET /api/restaurants/:id/sales-activities
 */
router.get('/:id/sales-activities', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const result = await pool.query(`
      SELECT 
        sa.id,
        sa.user_id,
        sa.user_name,
        sa.contact_method,
        sa.notes,
        sa.created_at
      FROM sales_activities sa
      WHERE sa.restaurant_id = $1
      ORDER BY sa.created_at DESC
    `, [id])

    res.json({
      activities: result.rows
    })
  } catch (error) {
    console.error('Error fetching sales activities:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 통계 조회
 * GET /api/restaurants/stats/summary
 */
router.get('/stats/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prefecture } = req.query

    let whereClause = 'WHERE is_unusable = false'
    const params: any[] = []

    if (prefecture) {
      whereClause += ' AND prefecture = $1'
      params.push(prefecture)
    }

    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE tel_original IS NOT NULL AND tel_original != '') as with_original_phone,
        COUNT(*) FILTER (WHERE homepage IS NOT NULL AND homepage != '') as with_homepage,
        COUNT(*) FILTER (WHERE is_contactable = true) as contactable,
        COUNT(*) FILTER (WHERE instagram IS NOT NULL AND instagram != '') as with_instagram,
        COUNT(*) FILTER (WHERE status = 'new') as status_new,
        COUNT(*) FILTER (WHERE status = 'contacted') as status_contacted
      FROM restaurants
      ${whereClause}
    `, params)

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router

