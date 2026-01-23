"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 목표 조회
router.get('/targets', auth_1.authMiddleware, async (req, res) => {
    try {
        const { periodType, year, weekOrMonth } = req.query;
        const query = `
      SELECT ut.*, u.name as user_name
      FROM user_targets ut
      JOIN users u ON ut.user_id = u.id
      WHERE ut.period_type = $1 AND ut.year = $2 AND ut.week_or_month = $3
      AND u.role = 'marketer'
      ORDER BY u.name
    `;
        const result = await db_1.pool.query(query, [periodType, year, weekOrMonth]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching targets:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 목표 생성/수정
router.post('/targets', auth_1.authMiddleware, async (req, res) => {
    try {
        const { userId, periodType, year, weekOrMonth, targetNewSales, targetRetargeting, targetExisting, targetRevenue, targetContracts, targetNewRevenue, targetNewContracts, targetRetargetingCustomers, actualRetargetingCustomers, 
        // 5개 방식별 목표 추가
        targetForm, targetDm, targetLine, targetPhone, targetEmail } = req.body;
        const query = `
      INSERT INTO user_targets (
        user_id, period_type, year, week_or_month,
        target_new_sales, target_retargeting, target_existing,
        target_revenue, target_contracts,
        target_new_revenue, target_new_contracts,
        target_retargeting_customers, actual_retargeting_customers,
        target_form, target_dm, target_line, target_phone, target_email,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, period_type, year, week_or_month)
      DO UPDATE SET
        target_new_sales = $5,
        target_retargeting = $6,
        target_existing = $7,
        target_revenue = $8,
        target_contracts = $9,
        target_new_revenue = $10,
        target_new_contracts = $11,
        target_retargeting_customers = $12,
        actual_retargeting_customers = $13,
        target_form = $14,
        target_dm = $15,
        target_line = $16,
        target_phone = $17,
        target_email = $18,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
        const result = await db_1.pool.query(query, [
            userId, periodType, year, weekOrMonth,
            targetNewSales, targetRetargeting, targetExisting,
            targetRevenue, targetContracts,
            targetNewRevenue || 0, targetNewContracts || 0,
            targetRetargetingCustomers || 0, actualRetargetingCustomers || 0,
            targetForm || 0, targetDm || 0, targetLine || 0, targetPhone || 0, targetEmail || 0
        ]);
        // 주간 목표 저장 시, 해당 월의 목표를 자동으로 4배로 계산하여 업데이트
        if (periodType === 'weekly') {
            // 해당 주차가 속한 월 계산
            const monthForWeek = Math.ceil(weekOrMonth / 4.33); // 대략적인 월 계산
            const actualMonth = weekOrMonth <= 4 ? 1 :
                weekOrMonth <= 9 ? 2 :
                    weekOrMonth <= 13 ? 3 :
                        weekOrMonth <= 17 ? 4 :
                            weekOrMonth <= 22 ? 5 :
                                weekOrMonth <= 26 ? 6 :
                                    weekOrMonth <= 30 ? 7 :
                                        weekOrMonth <= 35 ? 8 :
                                            weekOrMonth <= 39 ? 9 :
                                                weekOrMonth <= 43 ? 10 :
                                                    weekOrMonth <= 48 ? 11 : 12;
            // 월간 목표를 주간 목표 × 4로 자동 계산
            const monthlyQuery = `
        INSERT INTO user_targets (
          user_id, period_type, year, week_or_month,
          target_new_sales, target_retargeting, target_existing,
          target_revenue, target_contracts,
          target_new_revenue, target_new_contracts,
          target_retargeting_customers, actual_retargeting_customers,
          target_form, target_dm, target_line, target_phone, target_email,
          updated_at
        ) VALUES ($1, 'monthly', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, period_type, year, week_or_month)
        DO UPDATE SET
          target_new_sales = $4,
          target_retargeting = $5,
          target_existing = $6,
          target_retargeting_customers = $11,
          actual_retargeting_customers = $12,
          target_form = $13,
          target_dm = $14,
          target_line = $15,
          target_phone = $16,
          target_email = $17,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;
            await db_1.pool.query(monthlyQuery, [
                userId, year, actualMonth,
                targetNewSales * 4,
                targetRetargeting * 4,
                targetExisting * 4,
                targetRevenue || 0, // 총매출은 자동 계산하지 않음 (사용자가 직접 입력)
                targetContracts || 0, // 총계약도 자동 계산하지 않음
                targetNewRevenue || 0, // 신규매출도 자동 계산하지 않음
                targetNewContracts || 0, // 신규계약도 자동 계산하지 않음
                (targetRetargetingCustomers || 0) * 4, // 리타겟팅 고객 수도 × 4
                (actualRetargetingCustomers || 0) * 4, // 실적도 × 4
                (targetForm || 0) * 4,
                (targetDm || 0) * 4,
                (targetLine || 0) * 4,
                (targetPhone || 0) * 4,
                (targetEmail || 0) * 4
            ]);
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error saving target:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 회의 로그 조회
router.get('/logs', auth_1.authMiddleware, async (req, res) => {
    try {
        const { meetingType, year, weekOrMonth } = req.query;
        const query = `
      SELECT ml.*, u.name as user_name
      FROM meeting_logs ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.meeting_type = $1 AND ml.year = $2 AND ml.week_or_month = $3
      AND u.role = 'marketer'
      ORDER BY u.name
    `;
        const result = await db_1.pool.query(query, [meetingType, year, weekOrMonth]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching meeting logs:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 회의 로그 저장
router.post('/logs', auth_1.authMiddleware, async (req, res) => {
    try {
        const { userId, meetingType, year, weekOrMonth, reflection, actionPlan, snapshotData } = req.body;
        const query = `
      INSERT INTO meeting_logs (
        user_id, meeting_type, year, week_or_month,
        reflection, action_plan, snapshot_data, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, meeting_type, year, week_or_month)
      DO UPDATE SET
        reflection = $5,
        action_plan = $6,
        snapshot_data = $7,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
        const result = await db_1.pool.query(query, [
            userId, meetingType, year, weekOrMonth,
            reflection, actionPlan, JSON.stringify(snapshotData)
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error saving meeting log:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 월간 회의용: 해당 월에 속하는 주간 리타겟팅 고객 수 합산 조회
router.get('/weekly-sum-for-month', auth_1.authMiddleware, async (req, res) => {
    try {
        const { year, month } = req.query;
        if (!year || !month) {
            return res.status(400).json({ message: 'year and month are required' });
        }
        const yearNum = parseInt(String(year), 10);
        const monthNum = parseInt(String(month), 10);
        // 해당 월에 속하는 주차 계산 (월요일 기준)
        // 해당 월의 첫째 날과 마지막 날
        const monthStart = new Date(yearNum, monthNum - 1, 1);
        const monthEnd = new Date(yearNum, monthNum, 0);
        // 각 주차의 월요일 날짜를 계산해서 해당 월에 속하는지 확인
        const getWeekNumber = (date) => {
            const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
            const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
            return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        };
        const getMondayOfWeek = (y, week) => {
            const firstDayOfYear = new Date(y, 0, 1);
            const daysOffset = (week - 1) * 7;
            const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            const dayOfWeek = weekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            weekStart.setDate(weekStart.getDate() + mondayOffset);
            return weekStart;
        };
        // 해당 월에 속하는 주차 찾기
        const weeksInMonth = [];
        for (let week = 1; week <= 53; week++) {
            const monday = getMondayOfWeek(yearNum, week);
            // 월요일이 해당 월에 속하면 이 주차를 포함
            if (monday.getMonth() + 1 === monthNum && monday.getFullYear() === yearNum) {
                weeksInMonth.push(week);
            }
        }
        // 연도가 바뀌는 경우도 고려 (예: 1월 1일이 목요일이면 1주차의 월요일은 전년도 12월)
        // 1월의 경우 전년도 마지막 주도 확인
        if (monthNum === 1) {
            for (let week = 52; week <= 53; week++) {
                const monday = getMondayOfWeek(yearNum - 1, week);
                const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000);
                // 해당 주의 일요일이 1월에 속하면 포함 가능
                if (sunday.getMonth() === 0 && sunday.getFullYear() === yearNum) {
                    // 하지만 월요일 기준이므로 이 주는 전년도에 속함 - 스킵
                }
            }
        }
        if (weeksInMonth.length === 0) {
            return res.json({ weeks: [], data: {} });
        }
        // 해당 주차들의 데이터 조회
        const query = `
      SELECT 
        ut.user_id,
        u.name as user_name,
        ut.week_or_month as week,
        COALESCE(ut.target_retargeting_customers, 0) as target_retargeting_customers,
        COALESCE(ut.actual_retargeting_customers, 0) as actual_retargeting_customers
      FROM user_targets ut
      JOIN users u ON ut.user_id = u.id
      WHERE ut.period_type = 'weekly' 
        AND ut.year = $1 
        AND ut.week_or_month = ANY($2::int[])
        AND u.role = 'marketer'
      ORDER BY u.name, ut.week_or_month
    `;
        const result = await db_1.pool.query(query, [yearNum, weeksInMonth]);
        // 사용자별로 합산
        const userSums = {};
        for (const row of result.rows) {
            if (!userSums[row.user_id]) {
                userSums[row.user_id] = {
                    userId: row.user_id,
                    userName: row.user_name,
                    totalTarget: 0,
                    totalActual: 0,
                    weeklyData: []
                };
            }
            userSums[row.user_id].totalTarget += parseInt(row.target_retargeting_customers) || 0;
            userSums[row.user_id].totalActual += parseInt(row.actual_retargeting_customers) || 0;
            userSums[row.user_id].weeklyData.push({
                week: row.week,
                target: parseInt(row.target_retargeting_customers) || 0,
                actual: parseInt(row.actual_retargeting_customers) || 0
            });
        }
        res.json({
            weeks: weeksInMonth,
            data: userSums
        });
    }
    catch (error) {
        console.error('Error fetching weekly sum for month:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 영업 이력 히스토리 기반 실적 집계
// sales_tracking_history 테이블에서 해당 기간 내 작성된 로그가 있는 고유 고객(sales_tracking_id) 수 집계
router.get('/sales-tracking-stats', auth_1.authMiddleware, async (req, res) => {
    try {
        const { periodType, year, weekOrMonth, userId } = req.query;
        if (!periodType || !year || !weekOrMonth) {
            return res.status(400).json({ message: 'periodType, year, and weekOrMonth are required' });
        }
        const yearNum = parseInt(String(year), 10);
        const periodNum = parseInt(String(weekOrMonth), 10);
        // 기간의 시작일과 종료일 계산
        let startDate;
        let endDate;
        if (periodType === 'weekly') {
            // 주차의 시작일(월요일)과 종료일(일요일) 계산
            const firstDayOfYear = new Date(yearNum, 0, 1);
            const daysOffset = (periodNum - 1) * 7;
            const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000);
            const dayOfWeek = weekStart.getDay();
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            weekStart.setDate(weekStart.getDate() + mondayOffset);
            startDate = weekStart;
            endDate = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
            endDate.setHours(23, 59, 59, 999);
        }
        else {
            // 월의 시작일과 종료일
            startDate = new Date(yearNum, periodNum - 1, 1);
            endDate = new Date(yearNum, periodNum, 0);
            endDate.setHours(23, 59, 59, 999);
        }
        const startDateStr = startDate.toISOString();
        const endDateStr = endDate.toISOString();
        // 담당자별 집계 쿼리
        // sales_tracking_history에서 해당 기간 내에 contact_date가 있는 고유 sales_tracking_id 수
        let query = `
      SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(DISTINCT sth.sales_tracking_id) as unique_customers_contacted
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT 
          sth.sales_tracking_id,
          st.user_id
        FROM sales_tracking_history sth
        JOIN sales_tracking st ON sth.sales_tracking_id = st.id
        WHERE sth.contact_date >= $1 AND sth.contact_date <= $2
      ) sth ON u.id = sth.user_id
      WHERE u.role = 'marketer'
    `;
        const params = [startDateStr, endDateStr];
        if (userId) {
            query += ` AND u.id = $3`;
            params.push(userId);
        }
        query += ` GROUP BY u.id, u.name ORDER BY u.name`;
        const result = await db_1.pool.query(query, params);
        // 결과를 Map 형태로 반환
        const stats = {};
        for (const row of result.rows) {
            stats[row.user_id] = parseInt(row.unique_customers_contacted) || 0;
        }
        res.json({
            periodType,
            year: yearNum,
            weekOrMonth: periodNum,
            startDate: startDateStr.split('T')[0],
            endDate: endDateStr.split('T')[0],
            stats
        });
    }
    catch (error) {
        console.error('Error fetching sales tracking stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// 욕망 단계 고객 조회
router.get('/desire-customers', auth_1.authMiddleware, async (req, res) => {
    try {
        const { manager } = req.query;
        let query = `
      SELECT 
        rc.company_name,
        rc.manager,
        rc.last_contact_date,
        rc.status
      FROM retargeting_customers rc
      WHERE rc.status IN ('欲求', '욕망')
      AND rc.status NOT IN ('ゴミ箱', '휴지통', '契約完了', '계약완료')
    `;
        const params = [];
        if (manager && manager !== 'all') {
            query += ` AND (TRIM(rc.manager) = TRIM($1) OR REPLACE(TRIM(rc.manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎'))`;
            params.push(manager);
        }
        query += ` ORDER BY rc.last_contact_date DESC NULLS LAST`;
        const result = await db_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching desire customers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=meeting.js.map