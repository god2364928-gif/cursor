"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchFirstOutCalls = fetchFirstOutCalls;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const BASE = process.env.CPI_API_BASE || 'http://52.192.162.161';
const TOKEN = process.env.CPI_API_TOKEN || '';
async function fetchFirstOutCalls(params) {
    if (!TOKEN)
        throw new Error('CPI_API_TOKEN is not set');
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