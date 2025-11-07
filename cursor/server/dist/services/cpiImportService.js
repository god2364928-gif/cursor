"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRecentCalls = importRecentCalls;
const db_1 = require("../db");
const cpiClient_1 = require("../integrations/cpiClient");
function toKstDate(dateIso) {
    const d = new Date(dateIso);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().split('T')[0];
}
async function importRecentCalls(since, until) {
    const startDate = toKstDate(since.toISOString());
    const endDate = toKstDate(until.toISOString());
    let page = 1;
    let inserted = 0;
    let skipped = 0;
    while (true) {
        const { data, total } = await (0, cpiClient_1.fetchFirstOutCalls)({ startDate, endDate, page, row: 100 });
        if (!data || data.length === 0)
            break;
        for (const r of data) {
            const externalId = String(r.record_id);
            // dedupe by external_call_id
            const exists = await db_1.pool.query('SELECT 1 FROM sales_tracking WHERE external_call_id = $1 LIMIT 1', [externalId]);
            if (exists.rowCount && exists.rowCount > 0) {
                skipped++;
                continue;
            }
            const managerName = r.username?.trim();
            if (!managerName) {
                skipped++;
                continue;
            }
            const dateStr = toKstDate(r.created_at);
            const companyName = r.company?.trim() || '';
            const phone = r.phone_number?.trim() || '';
            try {
                await db_1.pool.query(`INSERT INTO sales_tracking (
            date, manager_name, company_name, customer_name, industry, contact_method, status, contact_person, phone, memo, memo_note, user_id, created_at, updated_at, external_call_id, external_source
          ) VALUES (
            $1, $2, $3, '', NULL, '電話', '未返信', NULL, $4, NULL, NULL, NULL, NOW(), NOW(), $5, 'cpi'
          ) ON CONFLICT (external_call_id) DO NOTHING`, [dateStr, managerName, companyName, phone, externalId]);
                inserted++;
            }
            catch (e) {
                console.error('[CPI] insert failed:', e);
                skipped++;
            }
        }
        // stop when we've fetched all pages
        if (page * 100 >= total)
            break;
        page++;
    }
    return { inserted, skipped };
}
//# sourceMappingURL=cpiImportService.js.map