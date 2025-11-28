"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const recruitClient_1 = require("../integrations/recruitClient");
const router = (0, express_1.Router)();
/**
 * 사용 가능한 API 목록 조회
 * GET /api/recruit/available-apis
 */
router.get('/available-apis', auth_1.authMiddleware, async (req, res) => {
    try {
        const availableAPIs = (0, recruitClient_1.getAvailableAPIs)();
        res.json({
            apis: [
                { type: 'gourmet', name: '飲食店', name_ko: '음식점', enabled: availableAPIs.includes('gourmet') },
                { type: 'beauty', name: '美容・ヘルス', name_ko: '뷰티 & 헬스', enabled: availableAPIs.includes('beauty') },
                { type: 'hotel', name: '宿泊', name_ko: '숙박', enabled: availableAPIs.includes('hotel') },
                { type: 'golf', name: 'ゴルフ', name_ko: '골프', enabled: availableAPIs.includes('golf') },
            ]
        });
    }
    catch (error) {
        console.error('Error fetching available APIs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * API별 카테고리 목록 조회
 * GET /api/recruit/categories/:apiType
 */
router.get('/categories/:apiType', auth_1.authMiddleware, async (req, res) => {
    try {
        const apiType = req.params.apiType;
        if (!(0, recruitClient_1.isAPIAvailable)(apiType)) {
            return res.status(400).json({
                message: `${apiType} API is not available yet. Only 'gourmet' is currently supported.`
            });
        }
        const categories = recruitClient_1.CATEGORIES[apiType] || [];
        res.json({ categories });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * 리쿠르트 API 통합 검색 및 DB 저장
 * POST /api/recruit/search
 */
router.post('/search', auth_1.authMiddleware, async (req, res) => {
    try {
        const { apiType, keyword, area, category, count } = req.body;
        console.log(`🔍 Recruit search request: apiType="${apiType}", keyword="${keyword}", area="${area}", category="${category}"`);
        // API 타입 검증
        if (!(0, recruitClient_1.isAPIAvailable)(apiType)) {
            return res.status(400).json({
                success: false,
                message: `${apiType} API는 아직 사용할 수 없습니다. 현재는 'gourmet'만 지원됩니다.`
            });
        }
        // 검색 파라미터 구성
        const searchParams = {
            apiType,
            count: count || 100,
            start: 1,
        };
        if (keyword) {
            searchParams.keyword = keyword;
        }
        if (area && recruitClient_1.AREA_CODES[area]) {
            searchParams.large_area = recruitClient_1.AREA_CODES[area];
        }
        // API 호출
        const result = await (0, recruitClient_1.searchRecruit)(searchParams);
        const places = result.results?.data || [];
        if (places.length === 0) {
            return res.json({
                success: true,
                saved: 0,
                total: 0,
                message: '검색 결과가 없습니다'
            });
        }
        console.log(`📥 Found ${places.length} places, saving to database...`);
        // DB에 저장
        let savedCount = 0;
        let duplicateCount = 0;
        for (const place of places) {
            try {
                const formattedData = (0, recruitClient_1.formatPlaceForDB)(place, apiType, keyword, area);
                // 중복 체크 (api_type + recruit_id 기준)
                const existingCheck = await db_1.pool.query('SELECT id FROM recruit_places WHERE api_type = $1 AND recruit_id = $2 AND is_deleted = false', [formattedData.api_type, formattedData.recruit_id]);
                if (existingCheck.rows.length > 0) {
                    // 이미 존재하는 경우 업데이트
                    await db_1.pool.query(`UPDATE recruit_places 
             SET name = $1, tel = $2, address = $3, latitude = $4, longitude = $5,
                 genre = $6, category = $7, budget_average = $8, catch_phrase = $9,
                 shop_url = $10, image_url = $11, business_hours = $12, holiday = $13,
                 parking = $14, capacity = $15, card_accepted = $16,
                 search_keyword = $17, search_area = $18, updated_at = CURRENT_TIMESTAMP
             WHERE api_type = $19 AND recruit_id = $20`, [
                        formattedData.name,
                        formattedData.tel,
                        formattedData.address,
                        formattedData.latitude,
                        formattedData.longitude,
                        formattedData.genre,
                        formattedData.category,
                        formattedData.budget_average,
                        formattedData.catch_phrase,
                        formattedData.shop_url,
                        formattedData.image_url,
                        formattedData.business_hours,
                        formattedData.holiday,
                        formattedData.parking,
                        formattedData.capacity,
                        formattedData.card_accepted,
                        formattedData.search_keyword,
                        formattedData.search_area,
                        formattedData.api_type,
                        formattedData.recruit_id,
                    ]);
                    duplicateCount++;
                }
                else {
                    // 새로 저장
                    await db_1.pool.query(`INSERT INTO recruit_places 
             (recruit_id, api_type, name, tel, address, latitude, longitude,
              genre, category, budget_average, catch_phrase, shop_url, image_url,
              business_hours, holiday, parking, capacity, card_accepted,
              search_keyword, search_area, collected_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`, [
                        formattedData.recruit_id,
                        formattedData.api_type,
                        formattedData.name,
                        formattedData.tel,
                        formattedData.address,
                        formattedData.latitude,
                        formattedData.longitude,
                        formattedData.genre,
                        formattedData.category,
                        formattedData.budget_average,
                        formattedData.catch_phrase,
                        formattedData.shop_url,
                        formattedData.image_url,
                        formattedData.business_hours,
                        formattedData.holiday,
                        formattedData.parking,
                        formattedData.capacity,
                        formattedData.card_accepted,
                        formattedData.search_keyword,
                        formattedData.search_area,
                        req.user?.id || null,
                    ]);
                    savedCount++;
                }
            }
            catch (error) {
                console.error(`❌ Failed to save place ${place.name}:`, error);
            }
        }
        console.log(`✅ Saved ${savedCount} new places, updated ${duplicateCount} existing`);
        res.json({
            success: true,
            saved: savedCount,
            updated: duplicateCount,
            total: places.length,
            message: `${savedCount}개 신규 저장, ${duplicateCount}개 업데이트됨`
        });
    }
    catch (error) {
        console.error('Error searching Recruit:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
});
/**
 * 저장된 장소 목록 조회
 * GET /api/recruit/places
 */
router.get('/places', auth_1.authMiddleware, async (req, res) => {
    try {
        const { search, apiType, area, keyword, limit, offset } = req.query;
        let query = `
      SELECT 
        id, recruit_id, api_type, name, tel, address, latitude, longitude,
        genre, category, budget_average, catch_phrase, shop_url, image_url,
        business_hours, holiday, parking, capacity, card_accepted,
        search_keyword, search_area, collected_at, notes, created_at, updated_at
      FROM recruit_places
      WHERE is_deleted = false
    `;
        const params = [];
        let paramIndex = 1;
        // API 타입 필터
        if (apiType) {
            query += ` AND api_type = $${paramIndex}`;
            params.push(apiType);
            paramIndex++;
        }
        // 검색 필터
        if (search) {
            query += ` AND (name ILIKE $${paramIndex} OR address ILIKE $${paramIndex} OR catch_phrase ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }
        if (area) {
            query += ` AND search_area = $${paramIndex}`;
            params.push(area);
            paramIndex++;
        }
        if (keyword) {
            query += ` AND search_keyword ILIKE $${paramIndex}`;
            params.push(`%${keyword}%`);
            paramIndex++;
        }
        // 정렬 및 페이징
        query += ` ORDER BY collected_at DESC`;
        if (limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(parseInt(limit));
            paramIndex++;
        }
        if (offset) {
            query += ` OFFSET $${paramIndex}`;
            params.push(parseInt(offset));
            paramIndex++;
        }
        const result = await db_1.pool.query(query, params);
        // 전체 개수 조회
        let countQuery = 'SELECT COUNT(*) FROM recruit_places WHERE is_deleted = false';
        const countParams = [];
        let countParamIndex = 1;
        if (apiType) {
            countQuery += ` AND api_type = $${countParamIndex}`;
            countParams.push(apiType);
            countParamIndex++;
        }
        if (search) {
            countQuery += ` AND (name ILIKE $${countParamIndex} OR address ILIKE $${countParamIndex} OR catch_phrase ILIKE $${countParamIndex})`;
            countParams.push(`%${search}%`);
            countParamIndex++;
        }
        if (area) {
            countQuery += ` AND search_area = $${countParamIndex}`;
            countParams.push(area);
            countParamIndex++;
        }
        if (keyword) {
            countQuery += ` AND search_keyword ILIKE $${countParamIndex}`;
            countParams.push(`%${keyword}%`);
            countParamIndex++;
        }
        const countResult = await db_1.pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        res.json({
            places: result.rows,
            total: totalCount
        });
    }
    catch (error) {
        console.error('Error fetching places:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * 개별 장소 조회
 * GET /api/recruit/places/:id
 */
router.get('/places/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`SELECT * FROM recruit_places WHERE id = $1 AND is_deleted = false`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Place not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching place:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * 장소 메모 업데이트
 * PATCH /api/recruit/places/:id
 */
router.patch('/places/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        await db_1.pool.query(`UPDATE recruit_places SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [notes || null, id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating place:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * 장소 삭제 (소프트 삭제)
 * DELETE /api/recruit/places/:id
 */
router.delete('/places/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.pool.query(`UPDATE recruit_places SET is_deleted = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting place:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * 대량 삭제
 * POST /api/recruit/places/bulk-delete
 */
router.post('/places/bulk-delete', auth_1.authMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Invalid IDs' });
        }
        await db_1.pool.query(`UPDATE recruit_places SET is_deleted = true, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1::uuid[])`, [ids]);
        res.json({ success: true, deleted: ids.length });
    }
    catch (error) {
        console.error('Error bulk deleting places:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * 지역 코드 목록 조회
 * GET /api/recruit/areas
 */
router.get('/areas', auth_1.authMiddleware, async (req, res) => {
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
        });
    }
    catch (error) {
        console.error('Error fetching areas:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
/**
 * API별 통계
 * GET /api/recruit/stats
 */
router.get('/stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const result = await db_1.pool.query(`
      SELECT 
        api_type,
        COUNT(*) as count,
        COUNT(DISTINCT search_area) as area_count,
        MAX(collected_at) as last_collected
      FROM recruit_places
      WHERE is_deleted = false
      GROUP BY api_type
      ORDER BY count DESC
    `);
        res.json({ stats: result.rows });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=recruit.js.map