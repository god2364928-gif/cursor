"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const cpiImportService_1 = require("../services/cpiImportService");
const cpiClient_1 = require("../integrations/cpiClient");
const nullSafe_1 = require("../utils/nullSafe");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Trigger CPI import manually (admin only)
// Flexible date parser (accepts multiple formats, defaults to KST)
function parseDateFlexible(input, fallback) {
    if (!input)
        return fallback;
    const s = input.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s))
        return new Date(`${s}T00:00:00+09:00`);
    // YYYY/MM/DD
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(s)) {
        const t = s.split('/').join('-');
        return new Date(`${t}T00:00:00+09:00`);
    }
    // YYYY-MM-DD HH:mm:ss
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(s))
        return new Date(s.replace(' ', 'T') + '+09:00');
    // YYYY-MM-DDTHH:mm:ss (no tz)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s))
        return new Date(s + '+09:00');
    // ISO with tz
    const d = new Date(s);
    if (!isNaN(d.getTime()))
        return d;
    throw new Error('Invalid time format. Use ISO or YYYY-MM-DD( HH:mm:ss).');
}
router.post('/cpi/import', auth_1.authMiddleware, async (req, res) => {
    try {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        const sinceParam = req.query.since;
        const until = new Date();
        let since;
        try {
            since = parseDateFlexible(sinceParam, new Date(until.getTime() - 2 * 60 * 60 * 1000));
        }
        catch {
            // 파싱 실패 시에도 수집이 멈추지 않도록 최근 24시간으로 진행
            since = new Date(until.getTime() - 24 * 60 * 60 * 1000);
        }
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
        const page = parseInt(String(req.query.page || '1'), 10) || 1;
        const row = parseInt(String(req.query.row || '50'), 10) || 50;
        const { data, total } = await (0, cpiClient_1.fetchFirstOutCalls)({ startDate: start, endDate: end, row, page });
        const username = req.query.username || '';
        const filtered = username ? data.filter(d => (d.username || '').trim() === username.trim()) : data;
        res.json({ total, count: filtered.length, sample: filtered.slice(0, 10), page, row });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Internal error' });
    }
});
// Import by phone (precise) - fetch OUT calls for a given phone
router.post('/cpi/import-by-phone', auth_1.authMiddleware, async (req, res) => {
    try {
        if (req.user?.role !== 'admin')
            return res.status(403).json({ message: 'Forbidden' });
        const phone = req.query.phone?.trim();
        const day = req.query.day || new Date().toISOString().slice(0, 10);
        if (!phone)
            return res.status(400).json({ message: 'phone required' });
        // Use CPI client directly with query by phone
        const start = day;
        const end = day;
        let page = 1;
        let totalInserted = 0;
        while (true) {
            const { data, total } = await (0, cpiClient_1.fetchFirstOutCalls)({ startDate: start, endDate: end, page, row: 100, query: phone, queryType: 2 });
            if (!data || data.length === 0)
                break;
            for (const r of data) {
                const externalId = String(r.record_id);
                const managerName = r.username?.trim() || '';
                const dateStr = r.created_at ? r.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10);
                const companyName = r.company?.trim() || '';
                const phoneNum = (0, nullSafe_1.formatPhoneNumber)(r.phone_number) || '';
                const exists = await db_1.pool.query('SELECT 1 FROM sales_tracking WHERE external_call_id = $1 LIMIT 1', [externalId]);
                const occurredAt = (() => {
                    if (r.created_at) {
                        return r.created_at.replace('T', ' ').replace('Z', '').slice(0, 19);
                    }
                    return `${dateStr} 00:00:00`;
                })();
                if (exists.rowCount && exists.rowCount > 0) {
                    await db_1.pool.query(`UPDATE sales_tracking SET
              date = $1,
              occurred_at = $2,
              manager_name = $3,
              company_name = $4,
              phone = $5,
              contact_method = '電話',
              status = '未返信',
              updated_at = NOW()
            WHERE external_call_id = $6`, [dateStr, occurredAt, managerName, companyName, phoneNum, externalId]);
                    continue;
                }
                await db_1.pool.query(`INSERT INTO sales_tracking (
            date, occurred_at, manager_name, company_name, customer_name, industry, contact_method, status, contact_person, phone, memo, memo_note, user_id, created_at, updated_at, external_call_id, external_source
          ) VALUES (
            $1, $2, $3, $4, '', NULL, '電話', '未返信', NULL, $5, NULL, NULL, NULL, NOW(), NOW(), $6, 'cpi'
          ) ON CONFLICT (external_call_id) DO NOTHING`, [dateStr, occurredAt, managerName, companyName, phoneNum, externalId]);
                totalInserted++;
            }
            if (page * 100 >= total)
                break;
            page++;
        }
        res.json({ ok: true, inserted: totalInserted });
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
// Find a row by external_call_id (debug)
router.get('/cpi/by-id', auth_1.authMiddleware, async (req, res) => {
    try {
        const rid = req.query.rid?.trim();
        if (!rid)
            return res.status(400).json({ message: 'rid required' });
        const r = await db_1.pool.query(`SELECT id, date, manager_name, company_name, phone, contact_method, status, external_call_id
       FROM sales_tracking WHERE external_call_id = $1`, [rid]);
        res.json({ count: r.rowCount || 0, rows: r.rows });
    }
    catch (e) {
        res.status(500).json({ message: e.message || 'Internal error' });
    }
});
//# sourceMappingURL=integrations.js.map