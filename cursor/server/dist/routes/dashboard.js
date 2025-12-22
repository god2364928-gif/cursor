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
        console.log('Dashboard stats request:', { userId, userName: req.user?.name, startDate, endDate, manager });
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
        console.log('Sales result:', salesResult.rows[0]);
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
        console.log('Sales trend request:', { userId, userName, manager });
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
        console.log('[Performance Stats] Request:', { startDate: validatedStartDate, endDate: validatedEndDate, manager });
        // === 1. 활동량 집계 ===
        // 1-1. 신규 영업 활동량: inquiry_leads (assigned_at 기준) + customer_history (신규 고객)
        let newSalesActivityQuery = `
      SELECT COUNT(*) as count FROM (
        -- 문의 배정 건수
        SELECT il.id 
        FROM inquiry_leads il
        LEFT JOIN users u ON il.assignee_id = u.id
        WHERE il.assigned_at BETWEEN $1 AND $2
        AND il.status IN ('IN_PROGRESS', 'COMPLETED')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        -- 신규 고객 히스토리 건수
        SELECT ch.id
        FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.created_at BETWEEN $1 AND $2
        AND c.status NOT IN ('契約中', '購入', '계약중')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
      ) AS new_activities
    `;
        const newSalesParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // 1-2. 리타겟팅 영업 활동량: retargeting_history (created_at 기준)
        let retargetingActivityQuery = `
      SELECT COUNT(*) as count
      FROM retargeting_history rh
      LEFT JOIN users u ON rh.user_id = u.id
      WHERE rh.created_at BETWEEN $1 AND $2
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
      WHERE ch.created_at BETWEEN $1 AND $2
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
        COUNT(CASE WHEN s.sales_type IN ('신규매출', '연장매출') THEN 1 END) as contract_count
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
      ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
    `;
        const salesParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        // 2-2. 미배정 문의 건수
        const unassignedQuery = `
      SELECT COUNT(*) as count
      FROM inquiry_leads
      WHERE status = 'PENDING' AND assignee_id IS NULL
    `;
        // === 3. 전월/전주 대비 데이터 (비교용) ===
        const dateRange = new Date(validatedEndDate).getTime() - new Date(validatedStartDate).getTime();
        const daysDiff = Math.ceil(dateRange / (1000 * 60 * 60 * 24));
        const prevStartDate = new Date(new Date(validatedStartDate).getTime() - daysDiff * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
        const prevEndDate = new Date(new Date(validatedEndDate).getTime() - daysDiff * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];
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
        // 병렬 쿼리 실행
        const [newSalesResult, retargetingResult, existingResult, salesResult, unassignedResult, prevSalesResult] = await Promise.all([
            db_1.pool.query(newSalesActivityQuery, newSalesParams),
            db_1.pool.query(retargetingActivityQuery, retargetingParams),
            db_1.pool.query(existingCustomerActivityQuery, existingParams),
            db_1.pool.query(salesQuery, salesParams),
            db_1.pool.query(unassignedQuery),
            db_1.pool.query(prevSalesQuery, prevSalesParams)
        ]);
        const newSalesActivity = parseInt(newSalesResult.rows[0]?.count || '0');
        const retargetingActivity = parseInt(retargetingResult.rows[0]?.count || '0');
        const existingActivity = parseInt(existingResult.rows[0]?.count || '0');
        const totalActivities = newSalesActivity + retargetingActivity + existingActivity;
        const totalSales = parseInt(salesResult.rows[0]?.total_sales || '0');
        const newSales = parseInt(salesResult.rows[0]?.new_sales || '0');
        const renewalSales = parseInt(salesResult.rows[0]?.renewal_sales || '0');
        const contractCount = parseInt(salesResult.rows[0]?.contract_count || '0');
        const unassignedInquiries = parseInt(unassignedResult.rows[0]?.count || '0');
        const prevTotalSales = parseInt(prevSalesResult.rows[0]?.total_sales || '0');
        const prevContractCount = parseInt(prevSalesResult.rows[0]?.contract_count || '0');
        // 증감률 계산
        const salesChange = prevTotalSales > 0
            ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
            : 0;
        const prevTotalActivitiesQuery = `
      SELECT COUNT(*) as count FROM (
        SELECT il.id FROM inquiry_leads il
        LEFT JOIN users u ON il.assignee_id = u.id
        WHERE il.assigned_at BETWEEN $1 AND $2
        AND il.status IN ('IN_PROGRESS', 'COMPLETED')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        SELECT ch.id FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.created_at BETWEEN $1 AND $2
        AND c.status NOT IN ('契約中', '購入', '계약중')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        SELECT rh.id FROM retargeting_history rh
        LEFT JOIN users u ON rh.user_id = u.id
        WHERE rh.created_at BETWEEN $1 AND $2
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
        
        UNION ALL
        
        SELECT ch.id FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.created_at BETWEEN $1 AND $2
        AND (TRIM(c.status) IN ('契約中', '購入', '계약중') OR c.status ILIKE '%契約中%' OR c.status ILIKE '%購入%' OR c.status ILIKE '%계약%')
        ${manager && manager !== 'all' ? `AND u.name = $3` : ''}
      ) AS prev_activities
    `;
        const prevActivityParams = manager && manager !== 'all'
            ? [prevStartDate, prevEndDate, manager]
            : [prevStartDate, prevEndDate];
        const prevActivityResult = await db_1.pool.query(prevTotalActivitiesQuery, prevActivityParams);
        const prevTotalActivities = parseInt(prevActivityResult.rows[0]?.count || '0');
        const prevContractRate = prevTotalActivities > 0
            ? (prevContractCount / prevTotalActivities) * 100
            : 0;
        const currentContractRate = totalActivities > 0
            ? (contractCount / totalActivities) * 100
            : 0;
        const contractRateChange = currentContractRate - prevContractRate;
        // === 4. 담당자별 성과 집계 ===
        let managerStatsQuery = `
      WITH manager_activities AS (
        -- 신규 영업 활동
        SELECT 
          u.name as manager_name,
          COUNT(*) as new_contacts
        FROM (
          SELECT il.id, u.id as user_id
          FROM inquiry_leads il
          LEFT JOIN users u ON il.assignee_id = u.id
          WHERE il.assigned_at BETWEEN $1 AND $2
          AND il.status IN ('IN_PROGRESS', 'COMPLETED')
          AND u.name IS NOT NULL
          
          UNION ALL
          
          SELECT ch.id, u.id as user_id
          FROM customer_history ch
          JOIN customers c ON ch.customer_id = c.id
          LEFT JOIN users u ON ch.user_id = u.id
          WHERE ch.created_at BETWEEN $1 AND $2
          AND c.status NOT IN ('契約中', '購入', '계약중')
          AND u.name IS NOT NULL
        ) AS new_act
        JOIN users u ON new_act.user_id = u.id
        GROUP BY u.name
      ),
      retargeting_activities AS (
        -- 리타겟팅 활동
        SELECT 
          u.name as manager_name,
          COUNT(*) as retargeting_contacts
        FROM retargeting_history rh
        LEFT JOIN users u ON rh.user_id = u.id
        WHERE rh.created_at BETWEEN $1 AND $2
        AND u.name IS NOT NULL
        GROUP BY u.name
      ),
      existing_activities AS (
        -- 기존 고객 관리
        SELECT 
          u.name as manager_name,
          COUNT(*) as existing_contacts
        FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.created_at BETWEEN $1 AND $2
        AND (TRIM(c.status) IN ('契約中', '購入', '계약중') OR c.status ILIKE '%契約中%' OR c.status ILIKE '%購入%' OR c.status ILIKE '%계약%')
        AND u.name IS NOT NULL
        GROUP BY u.name
      ),
      manager_sales AS (
        -- 매출 및 계약 건수
        SELECT 
          u.name as manager_name,
          COUNT(CASE WHEN s.sales_type IN ('신규매출', '연장매출') THEN 1 END) as contract_count,
          COALESCE(SUM(s.amount), 0) as total_sales
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.contract_date BETWEEN $1 AND $2
        AND u.name IS NOT NULL
        GROUP BY u.name
      )
      SELECT 
        COALESCE(ma.manager_name, ra.manager_name, ea.manager_name, ms.manager_name) as manager_name,
        COALESCE(ma.new_contacts, 0) as new_contacts,
        COALESCE(ra.retargeting_contacts, 0) as retargeting_contacts,
        COALESCE(ea.existing_contacts, 0) as existing_contacts,
        COALESCE(ms.contract_count, 0) as contract_count,
        COALESCE(ms.total_sales, 0) as total_sales
      FROM manager_activities ma
      FULL OUTER JOIN retargeting_activities ra ON ma.manager_name = ra.manager_name
      FULL OUTER JOIN existing_activities ea ON COALESCE(ma.manager_name, ra.manager_name) = ea.manager_name
      FULL OUTER JOIN manager_sales ms ON COALESCE(ma.manager_name, ra.manager_name, ea.manager_name) = ms.manager_name
      WHERE COALESCE(ma.manager_name, ra.manager_name, ea.manager_name, ms.manager_name) IS NOT NULL
      ${manager && manager !== 'all' ? `AND COALESCE(ma.manager_name, ra.manager_name, ea.manager_name, ms.manager_name) = $3` : ''}
      ORDER BY total_sales DESC
    `;
        const managerStatsParams = manager && manager !== 'all'
            ? [validatedStartDate, validatedEndDate, manager]
            : [validatedStartDate, validatedEndDate];
        const managerStatsResult = await db_1.pool.query(managerStatsQuery, managerStatsParams);
        const managerStats = managerStatsResult.rows.map(row => {
            const totalContacts = parseInt(row.new_contacts) + parseInt(row.retargeting_contacts) + parseInt(row.existing_contacts);
            const contractRate = totalContacts > 0
                ? (parseInt(row.contract_count) / totalContacts) * 100
                : 0;
            return {
                managerName: row.manager_name,
                newContacts: parseInt(row.new_contacts),
                retargetingContacts: parseInt(row.retargeting_contacts),
                existingContacts: parseInt(row.existing_contacts),
                contractCount: parseInt(row.contract_count),
                totalSales: parseInt(row.total_sales),
                contractRate: Math.round(contractRate * 100) / 100
            };
        });
        const response = {
            summary: {
                totalSales,
                contractCount,
                totalActivities,
                contractRate: Math.round(currentContractRate * 100) / 100,
                unassignedInquiries,
                comparedToPrevious: {
                    salesChange: Math.round(salesChange * 100) / 100,
                    contractRateChange: Math.round(contractRateChange * 100) / 100
                }
            },
            activities: {
                newSales: newSalesActivity,
                retargeting: retargetingActivity,
                existingCustomer: existingActivity
            },
            salesBreakdown: {
                newSales,
                renewalSales
            },
            managerStats
        };
        console.log('[Performance Stats] Response summary:', {
            totalActivities,
            contractCount,
            contractRate: response.summary.contractRate,
            managerCount: managerStats.length
        });
        res.json(response);
    }
    catch (error) {
        console.error('Error fetching performance stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map