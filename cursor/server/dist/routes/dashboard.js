"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const dateValidator_1 = require("../utils/dateValidator");
const router = (0, express_1.Router)();
// Get dashboard stats
router.get('/stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { startDate, endDate, manager } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }
        // 날짜 유효성 검증 및 보정
        const { validatedStartDate, validatedEndDate } = (0, dateValidator_1.validateDateRange)(startDate, endDate);
        // 매출 합계 (필터링된 기간) - 매니저 필터 적용
        let salesQuery = `
      SELECT COALESCE(SUM(s.amount), 0) as total_sales
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
    `;
        let salesParams = [validatedStartDate, validatedEndDate];
        if (manager && manager !== 'all') {
            salesQuery += ` AND u.name = $3`;
            salesParams.push(manager);
        }
        // manager가 'all'이면 모든 사용자의 매출을 가져옴 (추가 조건 없음)
        const salesResult = await db_1.pool.query(salesQuery, salesParams);
        // 계약중 고객수 (고객관리에서 진행현황이 계약중인 것) - 매니저 필터 적용
        let contractCustomersQuery = `
      SELECT COUNT(*) as contract_customers
      FROM customers c
      WHERE (
        TRIM(c.status) IN ('契約中', '購入', '계약중')
        OR c.status ILIKE '%契約中%'
        OR c.status ILIKE '%購入%'
        OR c.status ILIKE '%계약%'
      )
    `;
        let contractCustomersParams = [];
        if (manager && manager !== 'all') {
            contractCustomersQuery += ` AND (
        TRIM(c.manager) = $1 OR 
        REPLACE(TRIM(c.manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎')
      )`;
            contractCustomersParams.push(manager);
        }
        const contractCustomersResult = await db_1.pool.query(contractCustomersQuery, contractCustomersParams);
        // 신규 고객수 (실적관리에서 신규매출인 것) - 매니저 필터 적용
        let newCustomersQuery = `
      SELECT COUNT(*) as new_customers
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.sales_type = '신규매출'
      AND s.contract_date BETWEEN $1 AND $2
    `;
        let newCustomersParams = [validatedStartDate, validatedEndDate];
        if (manager && manager !== 'all') {
            newCustomersQuery += ` AND u.name = $3`;
            newCustomersParams.push(manager);
        }
        // manager가 'all'이면 모든 사용자의 신규매출을 가져옴 (추가 조건 없음)
        const newCustomersResult = await db_1.pool.query(newCustomersQuery, newCustomersParams);
        // 리타 획득수 (해당 기간에 리타겟팅으로 이동한 고객 수) - 매니저 필터 적용
        let retargetingAcquiredQuery = `
      SELECT COUNT(*) as retargeting_acquired
      FROM retargeting_customers
      WHERE status NOT IN ('ゴミ箱', '휴지통')
    `;
        const retargetingAcquiredParams = [];
        if (manager && manager !== 'all') {
            retargetingAcquiredQuery += ` AND (
        TRIM(manager) = TRIM($1) OR 
        REPLACE(TRIM(manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎')
      )`;
            retargetingAcquiredParams.push(manager);
        }
        const retargetingAcquiredResult = await db_1.pool.query(retargetingAcquiredQuery, retargetingAcquiredParams);
        // 리타겟팅 진행률 - 매니저 필터 적용
        let retargetingQuery = `
      SELECT COUNT(*) as total
      FROM retargeting_customers
      WHERE status NOT IN ('ゴミ箱', '휴지통')
    `;
        let retargetingParams = [];
        if (manager && manager !== 'all') {
            retargetingQuery += ` AND (
        TRIM(manager) = TRIM($1) OR 
        REPLACE(TRIM(manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎')
      )`;
            retargetingParams.push(manager);
        }
        // manager가 'all'이면 모든 사용자의 리타겟팅 고객을 가져옴 (추가 조건 없음)
        const retargetingResult = await db_1.pool.query(retargetingQuery, retargetingParams);
        // 목표 계산: manager가 'all'이면 전체 마케터 수 * 200, 아니면 200
        let target = 200;
        if (manager === 'all') {
            // 전체 마케터 수 조회
            const managersQuery = `
        SELECT COUNT(DISTINCT manager) as manager_count
        FROM retargeting_customers
        WHERE status NOT IN ('ゴミ箱', '휴지통')
        AND manager IS NOT NULL
        AND TRIM(manager) != ''
      `;
            const managersResult = await db_1.pool.query(managersQuery);
            const managerCount = parseInt(managersResult.rows[0].manager_count) || 1;
            target = managerCount * 200;
        }
        // 영업 진행현황 - 매니저 필터 적용
        let dbStatusQuery = `
      SELECT 
        COUNT(CASE WHEN status IN ('開始', '시작') THEN 1 END) as sales_start,
        COUNT(CASE WHEN status IN ('認知', '인지') THEN 1 END) as awareness,
        COUNT(CASE WHEN status IN ('興味', '흥미') THEN 1 END) as interest,
        COUNT(CASE WHEN status IN ('欲求', '욕망') THEN 1 END) as desire
      FROM retargeting_customers
      WHERE status NOT IN ('ゴミ箱', '휴지통')
    `;
        let dbStatusParams = [];
        if (manager && manager !== 'all') {
            dbStatusQuery += ` AND (
        TRIM(manager) = TRIM($1) OR 
        REPLACE(TRIM(manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎')
      )`;
            dbStatusParams.push(manager);
        }
        // manager가 'all'이면 모든 사용자의 리타겟팅 고객을 가져옴 (추가 조건 없음)
        const dbStatusResult = await db_1.pool.query(dbStatusQuery, dbStatusParams);
        const stats = {
            totalSales: parseInt(salesResult.rows[0].total_sales),
            contractCustomers: parseInt(contractCustomersResult.rows[0].contract_customers),
            newCustomers: parseInt(newCustomersResult.rows[0].new_customers),
            retargetingAcquired: parseInt(retargetingAcquiredResult.rows[0].retargeting_acquired),
            dbStatus: {
                salesStart: parseInt(dbStatusResult.rows[0].sales_start),
                awareness: parseInt(dbStatusResult.rows[0].awareness),
                interest: parseInt(dbStatusResult.rows[0].interest),
                desire: parseInt(dbStatusResult.rows[0].desire),
            },
            myRetargetingProgress: {
                total: parseInt(retargetingResult.rows[0].total),
                target: target,
                percentage: Math.round((parseInt(retargetingResult.rows[0].total) / target) * 100),
            },
        };
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 12개월 매출 추이 데이터
router.get('/sales-trend', auth_1.authMiddleware, async (req, res) => {
    try {
        const { manager } = req.query;
        const userId = req.user?.id;
        const userName = req.user?.name;
        // 최근 12개월 데이터 생성 (로컬 타임존 기준 라벨링)
        const months = [];
        const currentDate = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push(label); // YYYY-MM 형식
        }
        let salesTrendData;
        if (manager && manager !== 'all') {
            // 특정 담당자의 매출 추이
            const salesQuery = `
        SELECT 
          TO_CHAR(s.contract_date, 'YYYY-MM') as month,
          COALESCE(SUM(s.amount), 0) as amount
        FROM sales s
        JOIN users u ON s.user_id = u.id
        WHERE u.name = $1
        AND s.contract_date >= $2
        GROUP BY TO_CHAR(s.contract_date, 'YYYY-MM')
        ORDER BY month
      `;
            const twelveMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
            const salesResult = await db_1.pool.query(salesQuery, [manager, twelveMonthsAgo]);
            // 월별 데이터 매핑
            const salesMap = {};
            salesResult.rows.forEach(row => {
                salesMap[row.month] = parseInt(row.amount);
            });
            salesTrendData = months.map(month => ({
                month,
                personalSales: salesMap[month] || 0,
                totalSales: 0 // 개별 담당자일 때는 전체 매출은 별도로 계산
            }));
            // 전체 매출 추이 계산
            const totalSalesQuery = `
        SELECT 
          TO_CHAR(s.contract_date, 'YYYY-MM') as month,
          COALESCE(SUM(s.amount), 0) as amount
        FROM sales s
        WHERE s.contract_date >= $1
        GROUP BY TO_CHAR(s.contract_date, 'YYYY-MM')
        ORDER BY month
      `;
            const totalSalesResult = await db_1.pool.query(totalSalesQuery, [twelveMonthsAgo]);
            const totalSalesMap = {};
            totalSalesResult.rows.forEach(row => {
                totalSalesMap[row.month] = parseInt(row.amount);
            });
            salesTrendData = salesTrendData.map((item) => ({
                ...item,
                totalSales: totalSalesMap[item.month] || 0
            }));
        }
        else {
            // 전체 담당자들의 개별 매출 추이
            const allUsersQuery = `
        SELECT DISTINCT u.name
        FROM users u
        JOIN sales s ON u.id = s.user_id
        WHERE s.contract_date >= $1
        ORDER BY u.name
      `;
            const twelveMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);
            const usersResult = await db_1.pool.query(allUsersQuery, [twelveMonthsAgo]);
            const userSalesData = {};
            for (const user of usersResult.rows) {
                const userSalesQuery = `
          SELECT 
            TO_CHAR(s.contract_date, 'YYYY-MM') as month,
            COALESCE(SUM(s.amount), 0) as amount
          FROM sales s
          JOIN users u ON s.user_id = u.id
          WHERE u.name = $1
          AND s.contract_date >= $2
          GROUP BY TO_CHAR(s.contract_date, 'YYYY-MM')
          ORDER BY month
        `;
                const userSalesResult = await db_1.pool.query(userSalesQuery, [user.name, twelveMonthsAgo]);
                const userSalesMap = {};
                userSalesResult.rows.forEach(row => {
                    userSalesMap[row.month] = parseInt(row.amount);
                });
                userSalesData[user.name] = months.map(month => ({
                    month,
                    amount: userSalesMap[month] || 0
                }));
            }
            // 전체 매출 추이 계산
            const totalSalesQuery = `
        SELECT 
          TO_CHAR(s.contract_date, 'YYYY-MM') as month,
          COALESCE(SUM(s.amount), 0) as amount
        FROM sales s
        WHERE s.contract_date >= $1
        GROUP BY TO_CHAR(s.contract_date, 'YYYY-MM')
        ORDER BY month
      `;
            const totalSalesResult = await db_1.pool.query(totalSalesQuery, [twelveMonthsAgo]);
            const totalSalesMap = {};
            totalSalesResult.rows.forEach(row => {
                totalSalesMap[row.month] = parseInt(row.amount);
            });
            salesTrendData = {
                months: months,
                userSales: userSalesData,
                totalSales: months.map(month => ({
                    month,
                    amount: totalSalesMap[month] || 0
                }))
            };
        }
        res.json(salesTrendData);
    }
    catch (error) {
        console.error('Error fetching sales trend:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get monthly sales data for 12 months
router.get('/monthly-sales', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        // 최근 12개월 계산
        const now = new Date();
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                label: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            });
        }
        // 본인 월별 매출 - 사용자 이름으로 조회
        const personalSales = await db_1.pool.query(`
      SELECT 
        DATE_TRUNC('month', s.contract_date) as month,
        SUM(s.amount) as total
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE u.name = (SELECT name FROM users WHERE id = $1)
      AND s.contract_date >= $2
      GROUP BY month
      ORDER BY month
    `, [userId, months[0].label + '-01']);
        // 전체 월별 매출
        const totalSales = await db_1.pool.query(`
      SELECT 
        DATE_TRUNC('month', contract_date) as month,
        SUM(amount) as total
      FROM sales
      WHERE contract_date >= $1
      GROUP BY month
      ORDER BY month
    `, [months[0].label + '-01']);
        // 데이터 매핑
        const result = months.map(m => {
            const personal = personalSales.rows.find(row => new Date(row.month).getMonth() + 1 === m.month);
            const total = totalSales.rows.find(row => new Date(row.month).getMonth() + 1 === m.month);
            return {
                month: m.label,
                personalSales: personal ? parseInt(personal.total) : 0,
                totalSales: total ? parseInt(total.total) : 0
            };
        });
        res.json(result);
    }
    catch (error) {
        console.error('Error fetching monthly sales:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get performance stats for the new dashboard
router.get('/performance-stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, manager } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }
        // 날짜 유효성 검증 및 보정
        const { validatedStartDate, validatedEndDate } = (0, dateValidator_1.validateDateRange)(startDate, endDate);
        // 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수 (타임존 고려)
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        // === 1. 활동량 집계 ===
        // 1-1. 신규 영업 활동량 - 5가지 수단별로 구분
        // 폼: inquiry_leads에서 해당 기간에 완료된 것 (sent_date 기준)
        let formActivityQuery = `
      SELECT COUNT(*) as count
      FROM inquiry_leads il
      LEFT JOIN users u ON il.assignee_id = u.id
      WHERE il.sent_date BETWEEN $1 AND $2
      AND il.status = 'COMPLETED'
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        // DM/라인/전화/메일: sales_tracking에서 contact_method별로 한 번에 집계
        let contactMethodActivityQuery = `
      SELECT 
        COUNT(CASE WHEN st.contact_method = 'DM' THEN 1 END) as dm_count,
        COUNT(CASE WHEN st.contact_method = 'LINE' THEN 1 END) as line_count,
        COUNT(CASE WHEN st.contact_method = '電話' THEN 1 END) as phone_count,
        COUNT(CASE WHEN st.contact_method = 'メール' THEN 1 END) as mail_count
      FROM sales_tracking st
      LEFT JOIN users u ON st.user_id = u.id
      WHERE st.date BETWEEN $1 AND $2
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const newSalesParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // 1-2. 리타겟팅 영업 활동량: retargeting_history (created_at 기준)
        let retargetingActivityQuery = `
      SELECT COUNT(*) as count
      FROM retargeting_history rh
      LEFT JOIN users u ON rh.user_id = u.id
      WHERE DATE(rh.created_at) BETWEEN $1 AND $2
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const retargetingParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // 1-3. 기존 고객 관리 활동량: customer_history (계약중 고객 대상)
        let existingCustomerActivityQuery = `
      SELECT COUNT(*) as count
      FROM customer_history ch
      JOIN customers c ON ch.customer_id = c.id
      LEFT JOIN users u ON ch.user_id = u.id
      WHERE DATE(ch.created_at) BETWEEN $1 AND $2
      AND (
        TRIM(c.status) IN ('契約中', '購入', '계약중')
        OR c.status ILIKE '%契約中%'
        OR c.status ILIKE '%購入%'
        OR c.status ILIKE '%계약%'
      )
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const existingParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // === 2. 매출 집계 ===
        // 2-1. 총 매출 및 신규/연장 구분
        let salesQuery = `
      SELECT 
        COALESCE(SUM(s.amount), 0) as total_sales,
        COALESCE(SUM(CASE WHEN s.sales_type = '신규매출' THEN s.amount ELSE 0 END), 0) as new_sales,
        COALESCE(SUM(CASE WHEN s.sales_type = '연장매출' THEN s.amount ELSE 0 END), 0) as renewal_sales,
        COUNT(CASE WHEN s.sales_type IN ('신규매출', '연장매출') THEN 1 END) as contract_count,
        COUNT(CASE WHEN s.sales_type = '연장매출' THEN 1 END) as renewal_count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const salesParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // === 3. 전월/전주 대비 데이터 (비교용) ===
        const dateRange = new Date(validatedEndDate).getTime() - new Date(validatedStartDate).getTime();
        const daysDiff = Math.ceil(dateRange / (1000 * 60 * 60 * 24));
        // 전기 날짜 계산 (타임존 고려)
        const prevStart = new Date(validatedStartDate);
        prevStart.setDate(prevStart.getDate() - daysDiff);
        const prevEnd = new Date(validatedEndDate);
        prevEnd.setDate(prevEnd.getDate() - daysDiff);
        const prevStartDate = formatDate(prevStart);
        const prevEndDate = formatDate(prevEnd);
        let prevSalesQuery = `
      SELECT 
        COALESCE(SUM(s.amount), 0) as total_sales,
        COUNT(CASE WHEN s.sales_type IN ('신규매출', '연장매출') THEN 1 END) as contract_count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const prevSalesParams = manager && manager !== 'all'
            ? [prevStartDate, prevEndDate, manager]
            : [prevStartDate, prevEndDate];
        // === 병렬 쿼리 실행 최적화: 모든 독립적인 쿼리를 한 번에 실행 ===
        // 리타겟팅 단계별 현황 쿼리
        let retargetingStageQuery = `
      SELECT 
        COUNT(CASE WHEN status IN ('開始', '시작') THEN 1 END) as stage_start,
        COUNT(CASE WHEN status IN ('認知', '인지') THEN 1 END) as stage_awareness,
        COUNT(CASE WHEN status IN ('興味', '흥미') THEN 1 END) as stage_interest,
        COUNT(CASE WHEN status IN ('欲求', '욕망') THEN 1 END) as stage_desire
      FROM retargeting_customers
      WHERE status NOT IN ('ゴミ箱', '휴지통', '契約完了', '계약완료')
      ${manager && manager !== 'all' ? `AND (TRIM(manager) = TRIM($1) OR REPLACE(TRIM(manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎'))` : ''}
    `;
        const stageParams = manager && manager !== 'all' ? [manager] : [];
        // 리타 계약 쿼리
        let retargetingContractQuery = `
      SELECT COUNT(s.id) as count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      AND s.sales_type = '신규매출'
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        // 전월 총 매출 건수 및 당월 연장 계약 수 조회 (연장율 계산용)
        const currentStartDate = new Date(validatedStartDate);
        const prevMonthStartDate = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth() - 1, 1);
        const prevMonthEndDate = new Date(currentStartDate.getFullYear(), currentStartDate.getMonth(), 0);
        const prevMonthStart = formatDate(prevMonthStartDate);
        const prevMonthEnd = formatDate(prevMonthEndDate);
        // 전월 총 매출 건수 (sales 테이블의 전월 전체 매출)
        let prevMonthExpiringQuery = `
      SELECT COUNT(*) as contract_count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        // 당월 연장매출 건수 (실적관리 sales 테이블 기반)
        let currentMonthRenewedQuery = `
      SELECT COUNT(*) as renewal_count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      AND s.sales_type = '연장매출'
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const prevMonthExpiringParams = manager && manager !== 'all'
            ? [prevMonthStart, prevMonthEnd, manager]
            : [prevMonthStart, prevMonthEnd];
        const currentMonthRenewedParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // 전기 활동량 쿼리
        const prevTotalActivitiesQuery = `
      SELECT COUNT(*) as count FROM (
        SELECT il.id FROM inquiry_leads il
        LEFT JOIN users u ON il.assignee_id = u.id
        WHERE DATE(il.assigned_at) BETWEEN $1 AND $2
        AND il.status IN ('IN_PROGRESS', 'COMPLETED')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        SELECT ch.id FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE DATE(ch.created_at) BETWEEN $1 AND $2
        AND c.status NOT IN ('契約中', '購入', '계약중')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        SELECT rh.id FROM retargeting_history rh
        LEFT JOIN users u ON rh.user_id = u.id
        WHERE DATE(rh.created_at) BETWEEN $1 AND $2
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        SELECT ch.id FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE DATE(ch.created_at) BETWEEN $1 AND $2
        AND (TRIM(c.status) IN ('契約中', '購入', '계약중') OR c.status ILIKE '%契約中%' OR c.status ILIKE '%購入%' OR c.status ILIKE '%계약%')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
      ) AS prev_activities
    `;
        const prevActivityParams = manager && manager !== 'all'
            ? [prevStartDate, prevEndDate, manager]
            : [prevStartDate, prevEndDate];
        // 리타겟팅 연락 주기 쿼리
        let retargetingAlertQuery = `
      SELECT 
        COUNT(CASE WHEN last_contact_date <= CURRENT_DATE - INTERVAL '23 days' 
                    AND last_contact_date > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as due_this_week,
        COUNT(CASE WHEN last_contact_date <= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as overdue,
        COUNT(CASE WHEN last_contact_date > CURRENT_DATE - INTERVAL '23 days' THEN 1 END) as upcoming
      FROM retargeting_customers
      WHERE status NOT IN ('ゴミ箱', '휴지통', '契約完了', '계약완료')
      AND last_contact_date IS NOT NULL
      ${manager && manager !== 'all' ? `AND (TRIM(manager) = TRIM($1) OR REPLACE(TRIM(manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎'))` : ''}
    `;
        const alertParams = manager && manager !== 'all' ? [manager] : [];
        // 담당자별 성과 쿼리 준비는 아래에서
        const [formResult, contactMethodResult, retargetingResult, existingResult, salesResult, prevSalesResult, stageResult, retargetingContractResult, prevMonthExpiringResult, currentMonthRenewedResult, prevActivityResult, alertResult] = await Promise.all([
            db_1.pool.query(formActivityQuery, newSalesParams),
            db_1.pool.query(contactMethodActivityQuery, newSalesParams),
            db_1.pool.query(retargetingActivityQuery, retargetingParams),
            db_1.pool.query(existingCustomerActivityQuery, existingParams),
            db_1.pool.query(salesQuery, salesParams),
            db_1.pool.query(prevSalesQuery, prevSalesParams),
            db_1.pool.query(retargetingStageQuery, stageParams),
            db_1.pool.query(retargetingContractQuery, manager && manager !== 'all' ? [validatedStartDate, validatedEndDate, manager] : [validatedStartDate, validatedEndDate]),
            db_1.pool.query(prevMonthExpiringQuery, prevMonthExpiringParams),
            db_1.pool.query(currentMonthRenewedQuery, currentMonthRenewedParams),
            db_1.pool.query(prevTotalActivitiesQuery, prevActivityParams),
            db_1.pool.query(retargetingAlertQuery, alertParams)
        ]);
        const formActivity = parseInt(formResult.rows[0]?.count || '0');
        const dmActivity = parseInt(contactMethodResult.rows[0]?.dm_count || '0');
        const lineActivity = parseInt(contactMethodResult.rows[0]?.line_count || '0');
        const phoneActivity = parseInt(contactMethodResult.rows[0]?.phone_count || '0');
        const mailActivity = parseInt(contactMethodResult.rows[0]?.mail_count || '0');
        const newSalesActivity = formActivity + dmActivity + lineActivity + phoneActivity + mailActivity;
        const retargetingActivity = parseInt(retargetingResult.rows[0]?.count || '0');
        const existingActivity = parseInt(existingResult.rows[0]?.count || '0');
        const totalActivities = newSalesActivity + retargetingActivity + existingActivity;
        const totalSales = parseInt(salesResult.rows[0]?.total_sales || '0');
        const newSales = parseInt(salesResult.rows[0]?.new_sales || '0');
        const renewalSales = parseInt(salesResult.rows[0]?.renewal_sales || '0');
        const contractCount = parseInt(salesResult.rows[0]?.contract_count || '0');
        const averageOrderValue = contractCount > 0 ? Math.round(totalSales / contractCount) : 0;
        const prevTotalSales = parseInt(prevSalesResult.rows[0]?.total_sales || '0');
        const prevContractCount = parseInt(prevSalesResult.rows[0]?.contract_count || '0');
        // 증감률 계산
        const salesChange = prevTotalSales > 0
            ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
            : 0;
        // 전기 활동량은 이미 위에서 가져옴
        const prevTotalActivities = parseInt(prevActivityResult.rows[0]?.count || '0');
        const prevContractRate = prevTotalActivities > 0
            ? (prevContractCount / prevTotalActivities) * 100
            : 0;
        const currentContractRate = totalActivities > 0
            ? (contractCount / totalActivities) * 100
            : 0;
        const contractRateChange = currentContractRate - prevContractRate;
        // === 4. 리타겟팅 단계별 현황 (이미 위에서 조회됨) ===
        // === 5. 리타 계약률 계산 (이미 위에서 조회됨) ===
        const retargetingContractCount = parseInt(retargetingContractResult.rows[0]?.count || '0');
        const retargetingContractRate = retargetingActivity > 0
            ? (retargetingContractCount / retargetingActivity) * 100
            : 0;
        // === 6. 연장률 계산: (당월 연장 계약 건수 / 전월 만료 계약 건수) × 100 ===
        const renewalCount = parseInt(currentMonthRenewedResult.rows[0]?.renewal_count || '0');
        const prevMonthExpiringCount = parseInt(prevMonthExpiringResult.rows[0]?.contract_count || '0');
        const renewalRate = prevMonthExpiringCount > 0
            ? (renewalCount / prevMonthExpiringCount) * 100
            : 0;
        // === 7. 담당자별 성과 집계 ===
        // 최적화: FULL OUTER JOIN 대신 UNION ALL + GROUP BY 사용 (3-5배 빠름)
        let managerStatsQuery = `
      WITH all_manager_data AS (
        -- 폼 활동
        SELECT 
          u.name as manager_name,
          'form' as metric_type,
          COUNT(*) as value
        FROM inquiry_leads il
        LEFT JOIN users u ON il.assignee_id = u.id
        WHERE il.sent_date BETWEEN $1 AND $2
        AND il.status = 'COMPLETED'
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- DM 활동
        SELECT 
          u.name as manager_name,
          'dm' as metric_type,
          COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2
        AND st.contact_method = 'DM'
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- 라인 활동
        SELECT 
          u.name as manager_name,
          'line' as metric_type,
          COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2
        AND st.contact_method = 'LINE'
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- 전화 활동
        SELECT 
          u.name as manager_name,
          'phone' as metric_type,
          COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2
        AND st.contact_method = '電話'
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- 메일 활동
        SELECT 
          u.name as manager_name,
          'mail' as metric_type,
          COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2
        AND st.contact_method = 'メール'
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- 리타겟팅 활동
        SELECT 
          u.name as manager_name,
          'retargeting_contacts' as metric_type,
          COUNT(*) as value
        FROM retargeting_history rh
        LEFT JOIN users u ON rh.user_id = u.id
        WHERE rh.created_at BETWEEN $1 AND $2
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- 리타겟팅 계약 건수
        SELECT 
          u.name as manager_name,
          'retargeting_contracts' as metric_type,
          COUNT(*) as value
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.contract_date BETWEEN $1 AND $2
        AND s.sales_type = '신규매출'
        AND u.name IS NOT NULL
        GROUP BY u.name
        
        UNION ALL
        
        -- 기존 고객 관리
        SELECT 
          u.name as manager_name,
          'existing_contacts' as metric_type,
          COUNT(*) as value
        FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.created_at BETWEEN $1 AND $2
        AND (TRIM(c.status) IN ('契約中', '購入', '계약중') OR c.status ILIKE '%契約中%' OR c.status ILIKE '%購入%' OR c.status ILIKE '%계약%')
        AND u.name IS NOT NULL
        GROUP BY u.name
      ),
      manager_sales_data AS (
        -- 매출 데이터 (신규/연장/해지)
        SELECT 
          u.name as manager_name,
          COUNT(CASE WHEN s.sales_type = '신규매출' THEN 1 END) as new_contract_count,
          COALESCE(SUM(CASE WHEN s.sales_type = '신규매출' THEN s.amount ELSE 0 END), 0) as new_sales,
          COUNT(CASE WHEN s.sales_type = '연장매출' THEN 1 END) as renewal_count,
          COALESCE(SUM(CASE WHEN s.sales_type = '연장매출' THEN s.amount ELSE 0 END), 0) as renewal_sales,
          COUNT(CASE WHEN s.sales_type = '해지매출' THEN 1 END) as termination_count,
          COALESCE(SUM(CASE WHEN s.sales_type = '해지매출' THEN s.amount ELSE 0 END), 0) as termination_sales,
          COALESCE(SUM(s.amount), 0) as total_sales
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.contract_date BETWEEN $1 AND $2
        AND u.name IS NOT NULL
        GROUP BY u.name
      )
      SELECT 
        COALESCE(amd.manager_name, msd.manager_name) as manager_name,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'form' THEN amd.value END), 0) as form_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'dm' THEN amd.value END), 0) as dm_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'line' THEN amd.value END), 0) as line_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'phone' THEN amd.value END), 0) as phone_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'mail' THEN amd.value END), 0) as mail_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'retargeting_contacts' THEN amd.value END), 0) as retargeting_contacts,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'retargeting_contracts' THEN amd.value END), 0) as retargeting_contract_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'existing_contacts' THEN amd.value END), 0) as existing_contacts,
        COALESCE(msd.new_contract_count, 0) as new_contract_count,
        COALESCE(msd.new_sales, 0) as new_sales,
        COALESCE(msd.renewal_count, 0) as renewal_count,
        COALESCE(msd.renewal_sales, 0) as renewal_sales,
        COALESCE(msd.termination_count, 0) as termination_count,
        COALESCE(msd.termination_sales, 0) as termination_sales,
        COALESCE(msd.total_sales, 0) as total_sales
      FROM all_manager_data amd
      FULL OUTER JOIN manager_sales_data msd ON (
        amd.manager_name = msd.manager_name OR
        REPLACE(amd.manager_name, '﨑', '崎') = REPLACE(msd.manager_name, '﨑', '崎')
      )
      WHERE COALESCE(amd.manager_name, msd.manager_name) IS NOT NULL
      ${manager && manager !== 'all' ? `AND (
        TRIM(COALESCE(amd.manager_name, msd.manager_name)) = TRIM($3) OR
        REPLACE(TRIM(COALESCE(amd.manager_name, msd.manager_name)), '﨑', '崎') = REPLACE(TRIM($3), '﨑', '崎')
      )` : ''}
      GROUP BY COALESCE(amd.manager_name, msd.manager_name), msd.new_contract_count, msd.new_sales, msd.renewal_count, msd.renewal_sales, msd.termination_count, msd.termination_sales, msd.total_sales
      ORDER BY total_sales DESC
    `;
        const managerStatsParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        const managerStatsResult = await db_1.pool.query(managerStatsQuery, managerStatsParams);
        const managerStats = managerStatsResult.rows.map(row => {
            const formCount = parseInt(row.form_count || '0');
            const dmCount = parseInt(row.dm_count || '0');
            const lineCount = parseInt(row.line_count || '0');
            const phoneCount = parseInt(row.phone_count || '0');
            const mailCount = parseInt(row.mail_count || '0');
            const newContacts = formCount + dmCount + lineCount + phoneCount + mailCount;
            const retargetingContacts = parseInt(row.retargeting_contacts || '0');
            const existingContacts = parseInt(row.existing_contacts || '0');
            const retargetingContractCount = parseInt(row.retargeting_contract_count || '0');
            const retargetingContractRate = retargetingContacts > 0
                ? (retargetingContractCount / retargetingContacts) * 100
                : 0;
            return {
                managerName: row.manager_name,
                formCount,
                dmCount,
                lineCount,
                phoneCount,
                mailCount,
                newContacts,
                retargetingContacts,
                retargetingContractCount,
                retargetingContractRate: Math.round(retargetingContractRate * 100) / 100,
                existingContacts,
                newContractCount: parseInt(row.new_contract_count || '0'),
                newSales: parseInt(row.new_sales || '0'),
                renewalCount: parseInt(row.renewal_count || '0'),
                renewalSales: parseInt(row.renewal_sales || '0'),
                terminationCount: parseInt(row.termination_count || '0'),
                terminationSales: parseInt(row.termination_sales || '0'),
                totalSales: parseInt(row.total_sales || '0')
            };
        });
        // === 연락 주기 도래 고객 집계 (이미 위에서 조회됨) ===
        // 리타겟팅 단계별 고객 수
        const retargetingStart = parseInt(stageResult.rows[0]?.stage_start || '0');
        const retargetingAwareness = parseInt(stageResult.rows[0]?.stage_awareness || '0');
        const retargetingInterest = parseInt(stageResult.rows[0]?.stage_interest || '0');
        const retargetingDesire = parseInt(stageResult.rows[0]?.stage_desire || '0');
        // 예상 파이프라인 계산 (단계별 확률 × 객단가)
        // 시작: 5%, 인지: 10%, 흥미: 30%, 욕망: 50%
        const potentialRevenue = Math.round((retargetingStart * 0.05 * averageOrderValue) +
            (retargetingAwareness * 0.10 * averageOrderValue) +
            (retargetingInterest * 0.30 * averageOrderValue) +
            (retargetingDesire * 0.50 * averageOrderValue));
        const response = {
            summary: {
                totalSales,
                potentialRevenue,
                contractCount,
                totalActivities,
                contractRate: Math.round(currentContractRate * 100) / 100,
                retargetingContractRate: Math.round(retargetingContractRate * 100) / 100,
                renewalRate: Math.round(renewalRate * 100) / 100,
                renewalRateDetails: {
                    currentMonthRenewalCount: renewalCount,
                    prevMonthContractCount: prevMonthExpiringCount
                },
                averageOrderValue,
                comparedToPrevious: {
                    salesChange: Math.round(salesChange * 100) / 100,
                    contractRateChange: Math.round(contractRateChange * 100) / 100
                }
            },
            activities: {
                newSales: newSalesActivity,
                newSalesBreakdown: {
                    form: formActivity,
                    dm: dmActivity,
                    line: lineActivity,
                    phone: phoneActivity,
                    mail: mailActivity
                },
                retargeting: retargetingActivity,
                existingCustomer: existingActivity
            },
            salesBreakdown: {
                newSales,
                renewalSales
            },
            retargetingStages: {
                start: retargetingStart,
                awareness: retargetingAwareness,
                interest: retargetingInterest,
                desire: retargetingDesire
            },
            retargetingAlert: {
                dueThisWeek: parseInt(alertResult.rows[0]?.due_this_week || '0'),
                overdue: parseInt(alertResult.rows[0]?.overdue || '0'),
                upcoming: parseInt(alertResult.rows[0]?.upcoming || '0')
            },
            managerStats
        };
        // 디버깅: 담당자 없는 매출 확인
        const orphanedSalesQuery = `
      SELECT 
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN sales_type = '신규매출' THEN amount ELSE 0 END), 0) as new_amount,
        COALESCE(SUM(CASE WHEN sales_type = '연장매출' THEN amount ELSE 0 END), 0) as renewal_amount,
        COALESCE(SUM(CASE WHEN sales_type = '해지매출' THEN amount ELSE 0 END), 0) as termination_amount
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      AND (u.name IS NULL OR u.name = '')
      ${manager && manager !== 'all' ? `AND FALSE` : ''}
    `;
        const orphanedResult = await db_1.pool.query(orphanedSalesQuery, [validatedStartDate, validatedEndDate]);
        const orphanedSales = orphanedResult.rows[0];
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching performance stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map