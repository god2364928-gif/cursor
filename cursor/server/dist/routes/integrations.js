"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const cpiImportService_1 = require("../services/cpiImportService");
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
//# sourceMappingURL=integrations.js.map