"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const cpiImportService_1 = require("../services/cpiImportService");
const cpiClient_1 = require("../integrations/cpiClient");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Trigger CPI import manually (admin only)
router.post('/cpi/import', auth_1.authMiddleware, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const sinceParam = req.query.since;
        const until = new Date();
        const since = sinceParam ? new Date(sinceParam) : new Date(until.getTime() - 2 * 60 * 60 * 1000); // last 2h
        const result = await (0, cpiImportService_1.importRecentCalls)(since, until);
        res.json({ ok: true, ...result });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Internal error' });
    }
});
exports.default = router;
// Peek CPI records without inserting (debug)
router.get('/cpi/peek', auth_1.authMiddleware, async (req, res) => {
    try {
        if (req.user?.role !== 'admin')
            return res.status(403).json({ message: 'Forbidden' });
        const start = req.query.start || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const end = req.query.end || new Date().toISOString().slice(0, 10);
        const { data, total } = await (0, cpiClient_1.fetchFirstOutCalls)({ startDate: start, endDate: end, row: 50, page: 1 });
        const username = req.query.username || '';
        const filtered = username ? data.filter(d => (d.username || '').trim() === username.trim()) : data;
        res.json({ total, count: filtered.length, sample: filtered.slice(0, 10) });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Internal error' });
    }
});
// Check inserted records for a manager/date
router.get('/cpi/check', auth_1.authMiddleware, async (req, res) => {
    try {
        if (!req.query.manager)
            return res.status(400).json({ message: 'manager required' });
        const manager = String(req.query.manager);
        const date = req.query.date || new Date().toISOString().slice(0, 10);
        const r = await db_1.pool.query(`SELECT COUNT(*)::int AS cnt FROM sales_tracking WHERE manager_name = $1 AND date = $2`, [manager, date]);
        res.json({ manager, date, count: r.rows[0].cnt });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Internal error' });
    }
});
//# sourceMappingURL=integrations.js.map