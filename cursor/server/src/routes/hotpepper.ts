import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { searchRestaurants, AREA_CODES, formatRestaurantForDB } from '../integrations/hotpepperClient'
import { crawlHotpepperDetails } from '../services/hotpepperCrawler'

const router = Router()

/**
 * HotPepper API로 음식점 검색 및 DB 저장
 * POST /api/hotpepper/search
 */
router.post('/search', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { keyword, area, count } = req.body
    
    console.log(`🔍 HotPepper search request: keyword="${keyword}", area="${area}"`)
    
    // 검색 파라미터 구성
    const searchParams: any = {
      count: count || 100,  // 최대 100건
      start: 1,
    }
    
    if (keyword) {
      searchParams.keyword = keyword
    }
    
    if (area && AREA_CODES[area as keyof typeof AREA_CODES]) {
      searchParams.large_area = AREA_CODES[area as keyof typeof AREA_CODES]
    }
    
    // API 호출
    const result = await searchRestaurants(searchParams)
    
    const shops = result.results?.shop || []
    
    if (shops.length === 0) {
      return res.json({
        success: true,
        saved: 0,
        total: 0,
        message: '검색 결과가 없습니다'
      })
    }
    
    console.log(`📥 Found ${shops.length} restaurants, saving to database...`)
    
    // DB에 저장
    let savedCount = 0
    let duplicateCount = 0
    
    for (const shop of shops) {
      try {
        const formattedData = formatRestaurantForDB(shop, keyword, area)
        
        // 중복 체크 (hotpepper_id 기준)
        const existingCheck = await pool.query(
          'SELECT id FROM hotpepper_restaurants WHERE hotpepper_id = $1 AND is_deleted = false',
          [formattedData.hotpepper_id]
        )
        
        if (existingCheck.rows.length > 0) {
          // 이미 존재하는 경우 업데이트
          await pool.query(
            `UPDATE hotpepper_restaurants 
             SET name = $1, tel = $2, address = $3, budget_average = $4, 
                 catch_phrase = $5, shop_url = $6, search_keyword = $7, 
                 search_area = $8, updated_at = CURRENT_TIMESTAMP
             WHERE hotpepper_id = $9`,
            [
              formattedData.name,
              formattedData.tel,
              formattedData.address,
              formattedData.budget_average,
              formattedData.catch_phrase,
              formattedData.shop_url,
              formattedData.search_keyword,
              formattedData.search_area,
              formattedData.hotpepper_id,
            ]
          )
          duplicateCount++
        } else {
          // 새로 저장
          await pool.query(
            `INSERT INTO hotpepper_restaurants 
             (hotpepper_id, name, tel, address, budget_average, catch_phrase, 
              shop_url, search_keyword, search_area, collected_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              formattedData.hotpepper_id,
              formattedData.name,
              formattedData.tel,
              formattedData.address,
              formattedData.budget_average,
              formattedData.catch_phrase,
              formattedData.shop_url,
              formattedData.search_keyword,
              formattedData.search_area,
              req.user?.id || null,
            ]
          )
          savedCount++
        }
      } catch (error) {
        console.error(`❌ Failed to save shop ${shop.name}:`, error)
      }
    }
    
    console.log(`✅ Saved ${savedCount} new restaurants, updated ${duplicateCount} existing`)
    
    res.json({
      success: true,
      saved: savedCount,
      updated: duplicateCount,
      total: shops.length,
      message: `${savedCount}개 신규 저장, ${duplicateCount}개 업데이트됨`
    })
  } catch (error: any) {
    console.error('Error searching HotPepper:', error)
    res.status(500).json({ 
      success: false,
      message: error.message || 'Internal server error' 
    })
  }
})

/**
 * 저장된 음식점 목록 조회
 * GET /api/hotpepper/restaurants
 */
router.get('/restaurants', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { search, area, keyword, limit, offset } = req.query
    
    let query = `
      SELECT 
        id, hotpepper_id, name, tel, address, budget_average, 
        catch_phrase, shop_url, search_keyword, search_area,
        collected_at, notes, created_at, updated_at
      FROM hotpepper_restaurants
      WHERE is_deleted = false
    `
    
    const params: any[] = []
    let paramIndex = 1
    
    // 검색 필터
    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR catch_phrase ILIKE $${paramIndex})`
      params.push(`%${search}%`)
      paramIndex++
    }
    
    if (area) {
      query += ` AND search_area = $${paramIndex}`
      params.push(area)
      paramIndex++
    }
    
    if (keyword) {
      query += ` AND search_keyword ILIKE $${paramIndex}`
      params.push(`%${keyword}%`)
      paramIndex++
    }
    
    // 정렬 및 페이징
    query += ` ORDER BY collected_at DESC`
    
    if (limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(parseInt(limit as string))
      paramIndex++
    }
    
    if (offset) {
      query += ` OFFSET $${paramIndex}`
      params.push(parseInt(offset as string))
      paramIndex++
    }
    
    const result = await pool.query(query, params)
    
    // 전체 개수 조회
    let countQuery = 'SELECT COUNT(*) FROM hotpepper_restaurants WHERE is_deleted = false'
    const countParams: any[] = []
    let countParamIndex = 1
    
    if (search) {
      countQuery += ` AND (name ILIKE $${countParamIndex} OR address ILIKE $${countParamIndex} OR catch_phrase ILIKE $${countParamIndex})`
      countParams.push(`%${search}%`)
      countParamIndex++
    }
    
    if (area) {
      countQuery += ` AND search_area = $${countParamIndex}`
      countParams.push(area)
      countParamIndex++
    }
    
    if (keyword) {
      countQuery += ` AND search_keyword ILIKE $${countParamIndex}`
      countParams.push(`%${keyword}%`)
      countParamIndex++
    }
    
    const countResult = await pool.query(countQuery, countParams)
    const totalCount = parseInt(countResult.rows[0].count)
    
    res.json({
      restaurants: result.rows,
      total: totalCount
    })
  } catch (error) {
    console.error('Error fetching restaurants:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 개별 음식점 조회
 * GET /api/hotpepper/restaurants/:id
 */
router.get('/restaurants/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      `SELECT * FROM hotpepper_restaurants WHERE id = $1 AND is_deleted = false`,
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Restaurant not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching restaurant:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 음식점 메모 업데이트
 * PATCH /api/hotpepper/restaurants/:id
 */
router.patch('/restaurants/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { notes } = req.body
    
    await pool.query(
      `UPDATE hotpepper_restaurants SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [notes || null, id]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating restaurant:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 음식점 삭제 (소프트 삭제)
 * DELETE /api/hotpepper/restaurants/:id
 */
router.delete('/restaurants/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    await pool.query(
      `UPDATE hotpepper_restaurants SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting restaurant:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 대량 삭제
 * POST /api/hotpepper/restaurants/bulk-delete
 */
router.post('/restaurants/bulk-delete', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid IDs' })
    }
    
    await pool.query(
      `UPDATE hotpepper_restaurants SET is_deleted = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1::uuid[])`,
      [ids]
    )
    
    res.json({ success: true, deleted: ids.length })
  } catch (error) {
    console.error('Error bulk deleting restaurants:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 지역 코드 목록 조회
 * GET /api/hotpepper/areas
 */
router.get('/areas', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    res.json({
      areas: [
        { code: 'TOKYO', name: '東京', name_ko: '도쿄' },
        { code: 'OSAKA', name: '大阪', name_ko: '오사카' },
        { code: 'KYOTO', name: '京都', name_ko: '교토' },
        { code: 'KOBE', name: '神戸', name_ko: '고베' },
        { code: 'NAGOYA', name: '名古屋', name_ko: '나고야' },
        { code: 'FUKUOKA', name: '福岡', name_ko: '후쿠오카' },
        { code: 'SAPPORO', name: '札幌', name_ko: '삿포로' },
        { code: 'SENDAI', name: '仙台', name_ko: '센다이' },
        { code: 'HIROSHIMA', name: '広島', name_ko: '히로시마' },
        { code: 'YOKOHAMA', name: '横浜', name_ko: '요코하마' },
      ]
    })
  } catch (error) {
    console.error('Error fetching areas:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 크롤링 실행 - 전화번호 및 공식 홈페이지 수집
 * POST /api/hotpepper/crawl-details
 */
router.post('/crawl-details', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { batch_size } = req.body
    const batchSize = batch_size || 20
    
    // 크롤링 대상 확인
    const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM hotpepper_restaurants
      WHERE shop_url IS NOT NULL
        AND (tel IS NULL OR tel = '')
        AND is_deleted = false
    `)
    
    const totalCount = parseInt(countResult.rows[0].count)
    
    if (totalCount === 0) {
      return res.json({
        success: true,
        message: '크롤링할 레스토랑이 없습니다',
        total: 0,
        processed: 0
      })
    }
    
    console.log(`🚀 Starting Puppeteer crawler for ${totalCount} restaurants (batch: ${batchSize})...`)
    
    // 백그라운드에서 크롤링 실행
    crawlHotpepperDetails(batchSize)
      .then(result => {
        console.log(`✅ Crawler completed: ${result.success} success, ${result.error} errors`)
      })
      .catch(error => {
        console.error(`❌ Crawler error:`, error)
      })
    
    // 즉시 응답 반환
    res.json({
      success: true,
      message: '크롤링이 시작되었습니다',
      total: totalCount,
      batch_size: batchSize,
      status: 'running'
    })
    
  } catch (error: any) {
    console.error('Error starting crawler:', error)
    res.status(500).json({ 
      success: false,
      message: error.message || 'Internal server error' 
    })
  }
})

/**
 * 크롤링 진행 상황 조회
 * GET /api/hotpepper/crawl-status
 */
router.get('/crawl-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 전화번호가 있는 레코드 수
    const withTelResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM hotpepper_restaurants
      WHERE tel IS NOT NULL AND tel != ''
        AND is_deleted = false
    `)
    
    // 전화번호가 없는 레코드 수
    const withoutTelResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM hotpepper_restaurants
      WHERE (tel IS NULL OR tel = '')
        AND shop_url IS NOT NULL
        AND is_deleted = false
    `)
    
    // 공식 홈페이지가 있는 레코드 수
    const withHomepageResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM hotpepper_restaurants
      WHERE official_homepage IS NOT NULL AND official_homepage != ''
        AND is_deleted = false
    `)
    
    const withTel = parseInt(withTelResult.rows[0].count)
    const withoutTel = parseInt(withoutTelResult.rows[0].count)
    const withHomepage = parseInt(withHomepageResult.rows[0].count)
    const total = withTel + withoutTel
    
    res.json({
      total,
      with_tel: withTel,
      without_tel: withoutTel,
      with_homepage: withHomepage,
      completion_rate: total > 0 ? Math.round((withTel / total) * 100) : 0
    })
    
  } catch (error) {
    console.error('Error fetching crawl status:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router

