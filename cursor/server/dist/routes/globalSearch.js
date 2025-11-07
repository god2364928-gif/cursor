"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Global search across customers, retargeting, and sales tracking
// Fixed: retargeting_customers uses 'phone' column only (not phone1/phone2/phone3)
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const keyword = req.query.q || '';
        if (!keyword || keyword.trim().length === 0) {
            return res.json([]);
        }
        const exactKeyword = keyword.trim();
        const startsWithKeyword = `${exactKeyword}%`;
        // 1. 고객관리 검색 (전화번호 포함) - 정확 일치 > 시작 일치만 허용 (부분 일치 완전 제거)
        const customersResult = await db_1.pool.query(`
      SELECT 
        'customers' as page,
        manager as manager_name,
        COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name,
        id,
        CASE
          WHEN company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone1 = $1 OR phone2 = $1 OR phone3 = $1
               OR regexp_replace(phone1, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
               OR regexp_replace(phone2, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
               OR regexp_replace(phone3, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g') THEN 1
          WHEN company_name ILIKE $2 OR customer_name ILIKE $2 OR instagram ILIKE $2 OR phone1 ILIKE $2 OR phone2 ILIKE $2 OR phone3 ILIKE $2
               OR regexp_replace(phone1, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || ''
               OR regexp_replace(phone2, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || ''
               OR regexp_replace(phone3, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '' THEN 2
        END as match_priority
      FROM customers
      WHERE 
        (company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone1 = $1 OR phone2 = $1 OR phone3 = $1
         OR regexp_replace(phone1, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
         OR regexp_replace(phone2, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')
         OR regexp_replace(phone3, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) OR
        (company_name ILIKE $2 OR customer_name ILIKE $2 OR instagram ILIKE $2 OR phone1 ILIKE $2 OR phone2 ILIKE $2 OR phone3 ILIKE $2
         OR regexp_replace(phone1, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || ''
         OR regexp_replace(phone2, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || ''
         OR regexp_replace(phone3, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '')
      ORDER BY match_priority, company_name
      LIMIT 10
    `, [exactKeyword, startsWithKeyword]);
        // 2. 리타겟팅 검색 (전화번호 포함) - 정확 일치 > 시작 일치만 허용 (부분 일치 완전 제거)
        const retargetingResult = await db_1.pool.query(`
      SELECT 
        'retargeting' as page,
        manager as manager_name,
        COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name,
        id,
        CASE
          WHEN company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone = $1
               OR regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g') THEN 1
          WHEN company_name ILIKE $2 OR customer_name ILIKE $2 OR instagram ILIKE $2 OR phone ILIKE $2
               OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '' THEN 2
        END as match_priority
      FROM retargeting_customers
      WHERE 
        (company_name = $1 OR customer_name = $1 OR instagram = $1 OR phone = $1
         OR regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) OR
        (company_name ILIKE $2 OR customer_name ILIKE $2 OR instagram ILIKE $2 OR phone ILIKE $2
         OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '')
      ORDER BY match_priority, company_name
      LIMIT 10
    `, [exactKeyword, startsWithKeyword]);
        // 3. 영업이력 검색 (전화번호 포함) - 정확 일치 > 시작 일치만 허용 (부분 일치 완전 제거)
        const salesTrackingResult = await db_1.pool.query(`
      SELECT 
        'salesTracking' as page,
        manager_name,
        COALESCE(customer_name, account_id, '(no name)') as display_name,
        id,
        CASE
          WHEN customer_name = $1 OR account_id = $1 OR phone = $1 OR contact_person = $1
               OR regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g') THEN 1
          WHEN customer_name ILIKE $2 OR account_id ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2
               OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '' THEN 2
        END as match_priority
      FROM sales_tracking
      WHERE 
        (customer_name = $1 OR account_id = $1 OR phone = $1 OR contact_person = $1
         OR regexp_replace(phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) OR
        (customer_name ILIKE $2 OR account_id ILIKE $2 OR phone ILIKE $2 OR contact_person ILIKE $2
         OR regexp_replace(phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '')
      ORDER BY match_priority, date DESC
      LIMIT 10
    `, [exactKeyword, startsWithKeyword]);
        // 결과 병합
        const results = [
            ...customersResult.rows.map(r => ({
                page: 'customers',
                manager: r.manager_name,
                name: r.display_name,
                id: r.id
            })),
            ...retargetingResult.rows.map(r => ({
                page: 'retargeting',
                manager: r.manager_name,
                name: r.display_name,
                id: r.id
            })),
            ...salesTrackingResult.rows.map(r => ({
                page: 'salesTracking',
                manager: r.manager_name,
                name: r.display_name,
                id: r.id
            }))
        ];
        res.json(results);
    }
    catch (error) {
        console.error('Error in global search:', error);
        console.error('Error stack:', error.stack);
        console.error('Error message:', error.message);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=globalSearch.js.map