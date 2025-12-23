"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 관리자 전용 미들웨어
const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: '관리자만 접근 가능합니다' });
    }
    next();
};
// 특정 회계연도의 전체 데이터 조회
router.get('/:fiscalYear', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fiscalYear } = req.params;
        const result = await db_1.pool.query(`SELECT fiscal_year, month, payment_method, amount, is_fee 
       FROM total_sales 
       WHERE fiscal_year = $1 
       ORDER BY month, payment_method, is_fee`, [fiscalYear]);
        // 원본 데이터를 그대로 반환 (클라이언트에서 변환)
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching total sales:', error);
        res.status(500).json({ error: '전체매출 조회 실패' });
    }
});
// 특정 셀 데이터 업데이트
router.put('/update', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { fiscalYear, month, paymentMethod, isFee, amount } = req.body;
        const result = await db_1.pool.query(`INSERT INTO total_sales (fiscal_year, month, payment_method, amount, is_fee)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fiscal_year, month, payment_method, is_fee)
       DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP
       RETURNING *`, [fiscalYear, month, paymentMethod, amount || 0, isFee]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error updating total sales:', error);
        res.status(500).json({ error: '전체매출 업데이트 실패' });
    }
});
// CSV 데이터 일괄 입력
router.post('/bulk-insert', auth_1.authMiddleware, adminOnly, async (req, res) => {
    try {
        const { data } = req.body; // data is an array of { fiscalYear, month, paymentMethod, amount, isFee }
        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: '유효한 데이터가 없습니다' });
        }
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            for (const item of data) {
                await client.query(`INSERT INTO total_sales (fiscal_year, month, payment_method, amount, is_fee)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (fiscal_year, month, payment_method, is_fee)
           DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP`, [item.fiscalYear, item.month, item.paymentMethod, item.amount || 0, item.isFee]);
            }
            await client.query('COMMIT');
            res.json({ success: true, count: data.length });
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('Error bulk inserting total sales:', error);
        res.status(500).json({ error: '일괄 입력 실패' });
    }
});
exports.default = router;
//# sourceMappingURL=totalSales.js.map