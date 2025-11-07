"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFirstOutCalls = fetchFirstOutCalls;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const BASE = process.env.CPI_API_BASE || 'http://52.192.162.161';
const TOKEN = process.env.CPI_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8';
async function fetchFirstOutCalls(params) {
    // TOKEN이 항상 설정되도록 기본값 제공
    const url = new URL(`${BASE}/api/record`);
    url.searchParams.set('row', String(params.row ?? 100));
    url.searchParams.set('page', String(params.page ?? 1));
    url.searchParams.set('start_date', params.startDate);
    url.searchParams.set('end_date', params.endDate);
    // 모든 OUT 통화 수집 (첫콜 제한 제거) - 안정성 우선
    url.searchParams.set('is_out', '1');
    if (params.query) {
        url.searchParams.set('query', params.query);
        url.searchParams.set('query_type', String(params.queryType ?? 0));
    }
    url.searchParams.set('sort', 'date-desc');
    const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`CPI fetch failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const total = json?.results?.total_count ?? 0;
    const data = json?.results?.data ?? [];
    return { data, total };
}
//# sourceMappingURL=cpiClient.js.map