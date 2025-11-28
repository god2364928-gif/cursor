"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const dateValidator_1 = require("../utils/dateValidator");
const router = (0, express_1.Router)();
// GET /api/perf/filters  → distinct managers/services/types used in payments
router.get('/filters', auth_1.authMiddleware, async (_req, res) => {
    try {
        const managers = await db_1.pool.query(`SELECT DISTINCT u.id, u.name
       FROM payments p
       JOIN users u ON u.id = p.manager_user_id
       WHERE p.manager_user_id IS NOT NULL
       ORDER BY u.name`);
        const services = await db_1.pool.query(`SELECT DISTINCT s.id, s.name
       FROM payments p
       JOIN services s ON s.id = p.service_id
       WHERE p.service_id IS NOT NULL
       ORDER BY s.name`);
        const types = await db_1.pool.query(`SELECT id, code, label FROM payment_types ORDER BY code`);
        res.json({ managers: managers.rows, services: services.rows, types: types.rows });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    }
});
// GET /api/perf/summary?month=YYYY-MM&manager=&service=&type=
// or /api/perf/summary?from=ISO&to=ISO&manager=&service=&type=
router.get('/summary', auth_1.authMiddleware, async (req, res) => {
    try {
        const { month, manager, service, type, from, to } = req.query;
        if (!month && !from && !to) {
            return res.status(400).json({ message: 'month or from/to is required' });
        }
        // 날짜 유효성 검증 및 보정
        const validatedFrom = (0, dateValidator_1.validateAndCorrectDate)(from);
        const validatedTo = (0, dateValidator_1.validateAndCorrectDate)(to);
        const params = [];
        const where = [];
        if (month) {
            where.push("to_char(paid_at, 'YYYY-MM') = $" + (params.push(month)));
        }
        if (validatedFrom)
            where.push('paid_at >= $' + (params.push(validatedFrom)));
        if (validatedTo)
            where.push('paid_at <= $' + (params.push(validatedTo)));
        if (manager)
            where.push('manager_user_id = $' + (params.push(manager)));
        if (service)
            where.push('service_id = $' + (params.push(service)));
        if (type)
            where.push('payment_type_id = $' + (params.push(type)));
        const sql = `
      SELECT 
        COALESCE(SUM(gross_amount_jpy),0) AS total_gross,
        COALESCE(SUM(net_amount_jpy),0)   AS total_net,
        COALESCE(SUM(incentive_amount_jpy),0) AS total_incentive,
        COUNT(*) AS total_count,
        COUNT(*) FILTER (WHERE pt.code = 'new')    AS new_count,
        COUNT(*) FILTER (WHERE pt.code = 'renew')  AS renew_count,
        COUNT(*) FILTER (WHERE pt.code = 'oneoff') AS oneoff_count
      FROM payments p
      LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    `;
        const { rows } = await db_1.pool.query(sql, params);
        res.json(rows[0]);
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    }
});
// GET /api/perf/list?from=&to=&manager=&service=&type=&page=&pageSize=
router.get('/list', auth_1.authMiddleware, async (req, res) => {
    try {
        const { from, to, manager, service, type } = req.query;
        const page = parseInt(req.query.page || '1', 10);
        const pageSize = parseInt(req.query.pageSize || '20', 10);
        // 날짜 유효성 검증 및 보정
        const validatedFrom = (0, dateValidator_1.validateAndCorrectDate)(from);
        const validatedTo = (0, dateValidator_1.validateAndCorrectDate)(to);
        const params = [];
        const where = [];
        if (validatedFrom)
            where.push('paid_at >= $' + (params.push(validatedFrom)));
        if (validatedTo)
            where.push('paid_at <= $' + (params.push(validatedTo)));
        if (manager)
            where.push('manager_user_id = $' + (params.push(manager)));
        if (service)
            where.push('service_id = $' + (params.push(service)));
        if (type)
            where.push('payment_type_id = $' + (params.push(type)));
        const offset = (page - 1) * pageSize;
        const sql = `
      SELECT p.*, 
             u.name AS manager_name, s.name AS service_name, pt.code AS type_code, pt.label AS type_label,
             c.company_name AS customer_company, c.customer_name AS customer_name
      FROM payments p
      LEFT JOIN users u ON u.id = p.manager_user_id
      LEFT JOIN services s ON s.id = p.service_id
      LEFT JOIN payment_types pt ON pt.id = p.payment_type_id
      LEFT JOIN customers c ON c.id = p.customer_id
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY paid_at DESC NULLS LAST
      LIMIT ${pageSize} OFFSET ${offset}
    `;
        const { rows } = await db_1.pool.query(sql, params);
        res.json({ items: rows, page, pageSize });
    }
    catch (err) {
        res.status(500).json({ message: 'Internal server error', error: String(err) });
    }
});
exports.default = router;
//# sourceMappingURL=perf.js.map