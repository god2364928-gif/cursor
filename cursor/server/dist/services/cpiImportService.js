"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importRecentCalls = importRecentCalls;
const db_1 = require("../db");
const cpiClient_1 = require("../integrations/cpiClient");
const nullSafe_1 = require("../utils/nullSafe");
const dateHelper_1 = require("../utils/dateHelper");
// CPI created_at은 KST 형식 문자열(예: 2025-11-07T11:13:25.xxx)로 반환됨.
// 타임존 오프셋을 추가하지 않고 'YYYY-MM-DD'만 안정적으로 추출한다.
function toDateString(isoLike) {
    if (!isoLike)
        return (0, dateHelper_1.getJSTTodayString)();
    const i = isoLike.indexOf('T');
    return i > 0 ? isoLike.slice(0, i) : isoLike.slice(0, 10);
}
// CPI 담당자 이름을 시스템 사용자 이름으로 매핑
// CPI에서 사용하는 이름과 CRM에서 사용하는 실제 이름이 다를 경우 여기에 추가
function mapCpiNameToSystemName(cpiName) {
    const nameMapping = {
        'JEYI': '金帝利',
        // 필요시 다른 매핑 추가:
        // 'CPI이름': '시스템이름',
    };
    return nameMapping[cpiName] || cpiName;
}
async function importRecentCalls(since, until) {
    const startDate = toDateString(since.toISOString());
    const endDate = toDateString(until.toISOString());
    let page = 1;
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    while (true) {
        // 모든 OUT 통화 수집 (첫콜 제한 없음)
        const { data, total } = await (0, cpiClient_1.fetchFirstOutCalls)({ startDate, endDate, page, row: 100 });
        if (!data || data.length === 0)
            break;
        for (const r of data) {
            const externalId = String(r.record_id);
            const rawPhoneDigits = r.phone_number ? String(r.phone_number).replace(/\D/g, '') : '';
            const existingRecord = await db_1.pool.query('SELECT id FROM sales_tracking WHERE external_call_id = $1 LIMIT 1', [externalId]);
            const hasExisting = (existingRecord.rowCount ?? 0) > 0;
            // 첫콜+OUT (type=1) 우선, 분류없음(type=8)은 같은 번호가 이전에 없을 때만 허용
            if (!hasExisting && r.type !== 1) {
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
            const rawManagerName = r.username?.trim();
            if (!rawManagerName) {
                skipped++;
                continue;
            }
            // CPI 이름을 시스템 이름으로 변환 (예: JEYI → 金帝利)
            const managerName = mapCpiNameToSystemName(rawManagerName);
            const userResult = await db_1.pool.query('SELECT id FROM users WHERE name = $1 LIMIT 1', [managerName]);
            if (userResult.rowCount === 0) {
                skipped++;
                continue;
            }
            const userId = userResult.rows[0].id;
            const dateStr = toDateString(r.created_at);
            const companyName = r.company?.trim() || '';
            const phone = (0, nullSafe_1.formatPhoneNumber)(r.phone_number) || '';
            const occurredAt = (() => {
                if (r.created_at) {
                    return r.created_at.replace('T', ' ').replace('Z', '').slice(0, 19);
                }
                return `${dateStr} 00:00:00`;
            })();
            try {
                if (hasExisting) {
                    await db_1.pool.query(`UPDATE sales_tracking SET
              date = $1,
              occurred_at = $2,
              manager_name = $3,
              company_name = $4,
              phone = $5,
              user_id = $6,
              contact_method = '電話',
              status = '未返信',
              updated_at = NOW()
            WHERE external_call_id = $7`, [dateStr, occurredAt, managerName, companyName, phone, userId, externalId]);
                    updated++;
                }
                else {
                    await db_1.pool.query(`INSERT INTO sales_tracking (
              date, occurred_at, manager_name, company_name, customer_name, industry, contact_method, status, contact_person, phone, memo, memo_note, user_id, created_at, updated_at, external_call_id, external_source
            ) VALUES (
              $1, $2, $3, $4, '', NULL, '電話', '未返信', NULL, $5, NULL, NULL, $6, NOW(), NOW(), $7, 'cpi'
            )`, [dateStr, occurredAt, managerName, companyName, phone, userId, externalId]);
                    inserted++;
                }
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
    return { inserted, updated, skipped };
}
//# sourceMappingURL=cpiImportService.js.map