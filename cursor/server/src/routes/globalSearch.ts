import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Global search across customers, retargeting, and sales tracking
// Fixed: retargeting_customers uses 'phone' column only (not phone1/phone2/phone3)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const keyword = req.query.q as string || ''
    console.log(`[Global Search] Received keyword: "${keyword}"`)
    
    if (!keyword || keyword.trim().length === 0) {
      console.log('[Global Search] Empty keyword, returning empty array')
      return res.json([])
    }
    
    const exactKeyword = keyword.trim()
    const startsWithKeyword = `${exactKeyword}%`
    // 부분 일치: 최소 4자 이상만 부분 일치 허용 (짧은 검색어는 정확/시작 일치만)
    const partialKeyword = exactKeyword.length >= 4 ? `%${exactKeyword}%` : null
    console.log(`[Global Search] exactKeyword="${exactKeyword}", startsWithKeyword="${startsWithKeyword}", partialKeyword="${partialKeyword}")`)
    
    // 1. 고객관리 검색 - company/customer는 부분일치, instagram/phone은 정확만 (정확도 우선)
    const customersQuery = partialKeyword
      ? `SELECT 
          'customers' as page,
          manager as manager_name,
          COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name,
          id,
          CASE
            WHEN company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone1 = $1 OR phone2 = $1 OR phone3 = $1
                 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
                 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
                 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
            WHEN company_name ILIKE $2 OR customer_name ILIKE $2 OR phone1 ILIKE $2 OR phone2 ILIKE $2 OR phone3 ILIKE $2
                 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
                 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
                 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%') THEN 2
            WHEN company_name ILIKE $3 OR customer_name ILIKE $3 THEN 3
          END as match_priority
        FROM customers
        WHERE 
          (company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone1 = $1 OR phone2 = $1 OR phone3 = $1
           OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
           OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
           OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))) OR
          (company_name ILIKE $2 OR customer_name ILIKE $2 OR phone1 ILIKE $2 OR phone2 ILIKE $2 OR phone3 ILIKE $2
           OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
           OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
           OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')) OR
          (company_name ILIKE $3 OR customer_name ILIKE $3)
        ORDER BY match_priority, company_name
        LIMIT 10`
      : `SELECT 
          'customers' as page,
          manager as manager_name,
          COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name,
          id,
          CASE
            WHEN company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone1 = $1 OR phone2 = $1 OR phone3 = $1
                 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
                 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
                 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
            WHEN company_name ILIKE $2 OR customer_name ILIKE $2 OR phone1 ILIKE $2 OR phone2 ILIKE $2 OR phone3 ILIKE $2
                 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
                 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
                 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%') THEN 2
          END as match_priority
        FROM customers
        WHERE 
          (company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone1 = $1 OR phone2 = $1 OR phone3 = $1
           OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
           OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))
           OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))) OR
          (company_name ILIKE $2 OR customer_name ILIKE $2 OR phone1 ILIKE $2 OR phone2 ILIKE $2 OR phone3 ILIKE $2
           OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone1, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
           OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone2, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%')
           OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone3, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%'))
        ORDER BY match_priority, company_name
        LIMIT 10`
    
    const customersResult = await pool.query(customersQuery, partialKeyword ? [exactKeyword, startsWithKeyword, partialKeyword] : [exactKeyword, startsWithKeyword])
    
    // 2. 리타겟팅 검색 - 정확 일치 > 시작 일치 > 부분 일치 (4자 이상만, instagram/phone은 정확만)
    const retargetingQuery = partialKeyword
      ? `SELECT 'retargeting' as page, manager as manager_name, COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name, id,
          CASE WHEN company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
               WHEN company_name ILIKE $2 OR customer_name ILIKE $2 OR phone ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%') THEN 2
               WHEN company_name ILIKE $3 OR customer_name ILIKE $3 THEN 3 END as match_priority
        FROM retargeting_customers
        WHERE (company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g'))) 
           OR (company_name ILIKE $2 OR customer_name ILIKE $2 OR phone ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%'))
           OR (company_name ILIKE $3 OR customer_name ILIKE $3)
        ORDER BY match_priority, company_name LIMIT 10`
      : `SELECT 'retargeting' as page, manager as manager_name, COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name, id,
          CASE WHEN company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
               WHEN company_name ILIKE $2 OR customer_name ILIKE $2 OR phone ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%') THEN 2 END as match_priority
        FROM retargeting_customers
        WHERE (company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')))
           OR (company_name ILIKE $2 OR customer_name ILIKE $2 OR phone ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%'))
        ORDER BY match_priority, company_name LIMIT 10`
    
    const retargetingResult = await pool.query(retargetingQuery, partialKeyword ? [exactKeyword, startsWithKeyword, partialKeyword] : [exactKeyword, startsWithKeyword])
    
    // 3. 영업이력 검색 - 정확 일치 > 시작 일치 > 부분 일치 (4자 이상만)
    const salesTrackingQuery = partialKeyword
      ? `SELECT 'salesTracking' as page, manager_name, COALESCE(customer_name, account_id, '(no name)') as display_name, id,
          CASE WHEN customer_name = $1 OR account_id = $1 OR phone = $1 OR contact_person = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
               WHEN customer_name ILIKE $2 OR account_id ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%') THEN 2
               WHEN customer_name ILIKE $3 OR account_id ILIKE $3 OR phone ILIKE $3 OR contact_person ILIKE $3 THEN 3 END as match_priority
        FROM sales_tracking
        WHERE (customer_name = $1 OR account_id = $1 OR phone = $1 OR contact_person = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')))
           OR (customer_name ILIKE $2 OR account_id ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%'))
           OR (customer_name ILIKE $3 OR account_id ILIKE $3 OR phone ILIKE $3 OR contact_person ILIKE $3)
        ORDER BY match_priority, date DESC LIMIT 10`
      : `SELECT 'salesTracking' as page, manager_name, COALESCE(customer_name, account_id, '(no name)') as display_name, id,
          CASE WHEN customer_name = $1 OR account_id = $1 OR phone = $1 OR contact_person = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
               WHEN customer_name ILIKE $2 OR account_id ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%') THEN 2 END as match_priority
        FROM sales_tracking
        WHERE (customer_name = $1 OR account_id = $1 OR phone = $1 OR contact_person = $1 OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')))
           OR (customer_name ILIKE $2 OR account_id ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2 OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '%'))
        ORDER BY match_priority, date DESC LIMIT 10`
    
    const salesTrackingResult = await pool.query(salesTrackingQuery, partialKeyword ? [exactKeyword, startsWithKeyword, partialKeyword] : [exactKeyword, startsWithKeyword])
    
    // 결과 병합
    const results = [
      ...customersResult.rows.map(r => ({
        page: 'customers' as const,
        manager: r.manager_name,
        name: r.display_name,
        id: r.id
      })),
      ...retargetingResult.rows.map(r => ({
        page: 'retargeting' as const,
        manager: r.manager_name,
        name: r.display_name,
        id: r.id
      })),
      ...salesTrackingResult.rows.map(r => ({
        page: 'salesTracking' as const,
        manager: r.manager_name,
        name: r.display_name,
        id: r.id
      }))
    ]
    
    console.log(`[Global Search] Results: customers=${customersResult.rows.length}, retargeting=${retargetingResult.rows.length}, salesTracking=${salesTrackingResult.rows.length}, total=${results.length}`)
    
    res.json(results)
  } catch (error: any) {
    console.error('Error in global search:', error)
    console.error('Error stack:', error.stack)
    console.error('Error message:', error.message)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
})

export default router
