"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// 관리자 전용 미들웨어
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'owner') {
        return res.status(403).json({ message: '권한이 없습니다' });
    }
    next();
};
// 특정 연도/월의 급여 데이터 및 히스토리 조회
router.get('/:fiscalYear/:month', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fiscalYear, month } = req.params;
        // 급여 데이터 조회
        const payrollResult = await db_1.pool.query(`SELECT * FROM monthly_payroll 
       WHERE fiscal_year = $1 AND month = $2
       ORDER BY employee_name`, [fiscalYear, month]);
        // 히스토리 조회
        const historyResult = await db_1.pool.query(`SELECT history_text FROM monthly_payroll_history 
       WHERE fiscal_year = $1 AND month = $2`, [fiscalYear, month]);
        res.json({
            payrollData: payrollResult.rows,
            history: historyResult.rows[0]?.history_text || ''
        });
    }
    catch (error) {
        console.error('Monthly payroll fetch error:', error);
        res.status(500).json({ message: '급여 데이터 조회에 실패했습니다' });
    }
});
// 단일 셀 업데이트
router.put('/update', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id, field, value } = req.body;
        if (!id || !field) {
            return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' });
        }
        // 허용된 필드만 업데이트
        const allowedFields = ['base_salary', 'coconala', 'bonus', 'incentive', 'business_trip', 'other', 'notes'];
        if (!allowedFields.includes(field)) {
            return res.status(400).json({ message: '허용되지 않은 필드입니다' });
        }
        // 금액 필드인 경우 합계 자동 계산
        if (field !== 'notes') {
            // 먼저 필드를 업데이트하고, 그 다음 합계를 계산
            await db_1.pool.query(`UPDATE monthly_payroll 
         SET ${field} = $1,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`, [value || 0, id]);
            // 업데이트된 값을 포함하여 합계 재계산
            await db_1.pool.query(`UPDATE monthly_payroll 
         SET total = COALESCE(base_salary, 0) + COALESCE(coconala, 0) + COALESCE(bonus, 0) + COALESCE(incentive, 0) + COALESCE(business_trip, 0) + COALESCE(other, 0)
         WHERE id = $1`, [id]);
        }
        else {
            await db_1.pool.query(`UPDATE monthly_payroll 
         SET ${field} = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`, [value, id]);
        }
        res.json({ success: true, message: '업데이트되었습니다' });
    }
    catch (error) {
        console.error('Payroll update error:', error);
        res.status(500).json({ message: '업데이트에 실패했습니다' });
    }
});
// 직원 추가
router.post('/add-employee', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fiscalYear, month, employeeName } = req.body;
        if (!fiscalYear || !month || !employeeName) {
            return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' });
        }
        await db_1.pool.query(`INSERT INTO monthly_payroll 
       (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total)
       VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0)
       ON CONFLICT (fiscal_year, month, employee_name) DO NOTHING`, [fiscalYear, month, employeeName]);
        res.json({ success: true, message: '직원이 추가되었습니다' });
    }
    catch (error) {
        console.error('Add employee error:', error);
        res.status(500).json({ message: '직원 추가에 실패했습니다' });
    }
});
// 직원 삭제
router.delete('/:id', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.pool.query('DELETE FROM monthly_payroll WHERE id = $1', [id]);
        res.json({ success: true, message: '삭제되었습니다' });
    }
    catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ message: '삭제에 실패했습니다' });
    }
});
// 히스토리 저장
router.put('/history', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fiscalYear, month, historyText } = req.body;
        if (!fiscalYear || !month) {
            return res.status(400).json({ message: '필수 파라미터가 누락되었습니다' });
        }
        await db_1.pool.query(`INSERT INTO monthly_payroll_history (fiscal_year, month, history_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (fiscal_year, month) DO UPDATE SET
       history_text = EXCLUDED.history_text, updated_at = CURRENT_TIMESTAMP`, [fiscalYear, month, historyText || '']);
        res.json({ success: true, message: '히스토리가 저장되었습니다' });
    }
    catch (error) {
        console.error('History update error:', error);
        res.status(500).json({ message: '히스토리 저장에 실패했습니다' });
    }
});
// 월별 급여 자동 생성 (직원 테이블의 기본급 기반)
router.post('/generate', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fiscalYear, month, overwrite } = req.body;
        if (!fiscalYear || !month) {
            return res.status(400).json({ message: '연도와 월을 입력해주세요' });
        }
        // 2025년 11월 1일 이전에는 자동 생성 불가
        const targetDate = new Date(fiscalYear, month - 1, 1);
        const cutoffDate = new Date(2025, 10, 1); // 2025년 11월 1일
        if (targetDate < cutoffDate) {
            return res.status(400).json({
                message: '2025년 11월 1일부터 자동 생성이 가능합니다. 이전 데이터는 수동으로 입력해주세요.'
            });
        }
        // 이미 해당 월 데이터가 있는지 확인
        const existingData = await db_1.pool.query('SELECT COUNT(*) as count FROM monthly_payroll WHERE fiscal_year = $1 AND month = $2', [fiscalYear, month]);
        const hasExistingData = parseInt(existingData.rows[0].count) > 0;
        if (hasExistingData && !overwrite) {
            return res.status(409).json({
                message: 'existing_data',
                count: existingData.rows[0].count
            });
        }
        // 덮어쓰기 옵션이 true면 기존 데이터 삭제
        if (hasExistingData && overwrite) {
            await db_1.pool.query('DELETE FROM monthly_payroll WHERE fiscal_year = $1 AND month = $2', [fiscalYear, month]);
        }
        // 입사중인 직원들의 기본급 가져오기
        const employeesResult = await db_1.pool.query(`SELECT name, base_salary 
       FROM accounting_employees 
       WHERE employment_status = '입사중' 
       ORDER BY name`);
        if (employeesResult.rows.length === 0) {
            return res.status(400).json({ message: '등록된 직원이 없습니다' });
        }
        // 각 직원에 대해 급여 데이터 생성
        let createdCount = 0;
        for (const employee of employeesResult.rows) {
            await db_1.pool.query(`INSERT INTO monthly_payroll 
         (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total)
         VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, $4)`, [fiscalYear, month, employee.name, employee.base_salary || 0]);
            createdCount++;
        }
        res.json({
            success: true,
            message: `${createdCount}명의 직원에 대한 급여 데이터가 생성되었습니다`,
            createdCount
        });
    }
    catch (error) {
        console.error('Payroll generation error:', error);
        res.status(500).json({ message: '급여 생성에 실패했습니다' });
    }
});
exports.default = router;
//# sourceMappingURL=monthlyPayroll.js.map