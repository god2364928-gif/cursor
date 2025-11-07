"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRecentCalls = importRecentCalls;
const db_1 = require("../db");
const cpiClient_1 = require("../integrations/cpiClient");
const nullSafe_1 = require("../utils/nullSafe");
// CPI created_at은 KST 형식 문자열(예: 2025-11-07T11:13:25.xxx)로 반환됨.
// 타임존 오프셋을 추가하지 않고 'YYYY-MM-DD'만 안정적으로 추출한다.
function toDateString(isoLike) {
    if (!isoLike)
        return new Date().toISOString().split('T')[0];
    const i = isoLike.indexOf('T');
    return i > 0 ? isoLike.slice(0, i) : isoLike.slice(0, 10);
}
async function importRecentCalls(since, until) {
    const startDate = toDateString(since.toISOString());
    const endDate = toDateString(until.toISOString());
    let page = 1;
    let inserted = 0;
    let skipped = 0;
    while (true) {
        // 모든 OUT 통화 수집 (첫콜 제한 없음)
        const { data, total } = await (0, cpiClient_1.fetchFirstOutCalls)({ startDate, endDate, page, row: 100 });
        if (!data || data.length === 0)
            break;
        for (const r of data) {
            const externalId = String(r.record_id);
            const rawPhoneDigits = r.phone_number ? String(r.phone_number).replace(/\D/g, '') : '';
            // 첫콜+OUT (type=1) 우선, 분류없음(type=8)은 같은 번호가 이전에 없을 때만 허용
            if (r.type !== 1) {
                if (r.type === 8) {
                    if (!rawPhoneDigits) {
                        skipped++;
                        continue;
                    }
                    const existingSamePhone = await db_1.pool.query(`SELECT 1 FROM sales_tracking WHERE external_source = 'cpi' AND regexp_replace(phone, '[^0-9]', '', 'g') = $1 LIMIT 1`, [rawPhoneDigits]);
                    if ((existingSamePhone.rowCount ?? 0) > 0) {
                        skipped++;
                        continue;
                    }
                }
                else {
                    skipped++;
                    continue;
                }
            }
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
            const userResult = await db_1.pool.query('SELECT id FROM users WHERE name = $1 LIMIT 1', [managerName]);
            if (userResult.rowCount === 0) {
                skipped++;
                continue;
            }
            const userId = userResult.rows[0].id;
            const dateStr = toDateString(r.created_at);
            const companyName = r.company?.trim() || '';
            const phone = (0, nullSafe_1.formatPhoneNumber)(r.phone_number) || '';
            try {
                await db_1.pool.query(`INSERT INTO sales_tracking (
            date, manager_name, company_name, customer_name, industry, contact_method, status, contact_person, phone, memo, memo_note, user_id, created_at, updated_at, external_call_id, external_source
          ) VALUES (
            $1, $2, $3, '', NULL, '電話', '未返信', NULL, $4, NULL, NULL, $5, NOW(), NOW(), $6, 'cpi'
          )`, [dateStr, managerName, companyName, phone, userId, externalId]);
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