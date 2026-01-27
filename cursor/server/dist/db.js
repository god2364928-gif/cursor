"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Ensure we use the correct database connection
process.env.PGCLIENTENCODING = 'utf8';
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:xodrn123@localhost:5432/crm_db';
console.log('Database URL:', databaseUrl.replace(/password=[^@]+/, 'password=***'));
// Determine if SSL should be used based on hostname
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
const poolConfig = {
    connectionString: databaseUrl,
    max: 10, // 최대 연결 수 (원격 DB는 낮게 유지)
    idleTimeoutMillis: 20000, // idle 연결 타임아웃 (20초 - 더 빠르게 회수)
    connectionTimeoutMillis: 30000, // 연결 대기 시간 (30초 - 원격이므로 여유있게)
    // TCP KeepAlive 설정 - 원격 DB 연결 안정화 핵심!
    keepalive: true,
    keepaliveInitialDelayMillis: 5000, // 5초 후 keepalive 시작 (더 빠르게)
    // 연결 획득 실패 시 재시도
    allowExitOnIdle: false,
};
// Only use SSL for remote connections (Railway)
if (!isLocalhost) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}
exports.pool = new pg_1.Pool(poolConfig);
// 연결 풀 에러 핸들링 - 예기치 않은 연결 끊김 대응
exports.pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
    // 연결 풀이 자동으로 새 연결을 생성하므로 프로세스 종료 불필요
});
// Ensure UTF-8 encoding + statement_timeout for all connections
exports.pool.on('connect', async (client) => {
    try {
        // UTF-8 인코딩 + 쿼리 타임아웃 30초 설정 (좀비 쿼리 방지)
        await client.query(`
      SET client_encoding TO 'UTF8';
      SET statement_timeout TO '30000';
    `);
    }
    catch (error) {
        console.error('Failed to set client encoding/timeout', error);
    }
});
//# sourceMappingURL=db.js.map