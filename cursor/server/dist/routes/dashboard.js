"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
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
        // 매출 합계 (필터링된 기간) - 매니저 필터 적용
        let salesQuery = `
      SELECT COALESCE(SUM(s.amount), 0) as total_sales
      FROM sales s
      JOIN users u ON s.user_id = u.id
      WHERE s.contract_date BETWEEN $1 AND $2
    `;
        let salesParams = [startDate, endDate];
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
        let newCustomersParams = [startDate, endDate];
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
                target: 200,
                percentage: Math.round((parseInt(retargetingResult.rows[0].total) / 200) * 100),
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
exports.default = router;
//# sourceMappingURL=dashboard.js.map