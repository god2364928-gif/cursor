"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pg_1 = require("pg");
const router = (0, express_1.Router)();
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
// 직원명 매핑
const STAFF_MAPPING = {
    '미유': '山﨑水優',
    '히토미': '石井瞳',
    '미나미': '山下南',
    '제이': 'JEYI'
};
// 매출 목록 조회
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate, category, name } = req.query;
        let query = 'SELECT * FROM paypay_sales WHERE 1=1';
        const params = [];
        let paramCount = 1;
        if (startDate) {
            query += ` AND date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            query += ` AND date <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }
        if (category) {
            query += ` AND category = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        if (name) {
            query += ` AND name ILIKE $${paramCount}`;
            params.push(`%${name}%`);
            paramCount++;
        }
        query += ' ORDER BY date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('PayPay sales fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch sales data' });
    }
});
// 매출 일괄 등록
router.post('/sales/bulk', async (req, res) => {
    const client = await pool.connect();
    try {
        const { sales } = req.body;
        await client.query('BEGIN');
        for (const sale of sales) {
            // 직원명 매핑
            let category = sale.category;
            if (STAFF_MAPPING[category]) {
                category = STAFF_MAPPING[category];
            }
            await client.query(`INSERT INTO paypay_sales (date, category, user_id, name, receipt_number, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`, [sale.date, category, sale.user_id, sale.name, sale.receipt_number, sale.amount]);
        }
        await client.query('COMMIT');
        res.json({ success: true, count: sales.length });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('PayPay sales bulk insert error:', error);
        res.status(500).json({ error: 'Failed to insert sales data' });
    }
    finally {
        client.release();
    }
});
// 지출 목록 조회
router.get('/expenses', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = 'SELECT * FROM paypay_expenses WHERE 1=1';
        const params = [];
        let paramCount = 1;
        if (startDate) {
            query += ` AND date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            query += ` AND date <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }
        query += ' ORDER BY date DESC';
        const result = await pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('PayPay expenses fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch expenses data' });
    }
});
// 지출 추가
router.post('/expenses', async (req, res) => {
    try {
        const { date, item, amount } = req.body;
        const result = await pool.query(`INSERT INTO paypay_expenses (date, item, amount)
       VALUES ($1, $2, $3)
       RETURNING *`, [date, item, amount]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('PayPay expense create error:', error);
        res.status(500).json({ error: 'Failed to create expense' });
    }
});
// 지출 수정
router.put('/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { date, item, amount } = req.body;
        const result = await pool.query(`UPDATE paypay_expenses
       SET date = $1, item = $2, amount = $3
       WHERE id = $4
       RETURNING *`, [date, item, amount, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('PayPay expense update error:', error);
        res.status(500).json({ error: 'Failed to update expense' });
    }
});
// 지출 삭제
router.delete('/expenses/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM paypay_expenses WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('PayPay expense delete error:', error);
        res.status(500).json({ error: 'Failed to delete expense' });
    }
});
// 요약 정보 조회
router.get('/summary', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let salesQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM paypay_sales WHERE 1=1';
        let expensesQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM paypay_expenses WHERE 1=1';
        const params = [];
        let paramCount = 1;
        if (startDate) {
            salesQuery += ` AND date >= $${paramCount}`;
            expensesQuery += ` AND date >= $${paramCount}`;
            params.push(startDate);
            paramCount++;
        }
        if (endDate) {
            salesQuery += ` AND date <= $${paramCount}`;
            expensesQuery += ` AND date <= $${paramCount}`;
            params.push(endDate);
            paramCount++;
        }
        const salesResult = await pool.query(salesQuery, params);
        const expensesResult = await pool.query(expensesQuery, params);
        const totalSales = parseFloat(salesResult.rows[0].total);
        const totalExpenses = parseFloat(expensesResult.rows[0].total);
        const balance = totalSales - totalExpenses;
        res.json({
            totalSales,
            totalExpenses,
            balance
        });
    }
    catch (error) {
        console.error('PayPay summary fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch summary' });
    }
});
exports.default = router;
//# sourceMappingURL=paypay.js.map