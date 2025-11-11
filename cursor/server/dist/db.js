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
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:xodrn123@localhost:5432/crm_db';
console.log('Database URL:', databaseUrl.replace(/password=[^@]+/, 'password=***'));
// Determine if SSL should be used based on hostname
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
const poolConfig = {
    connectionString: databaseUrl,
    max: 20, // 최대 연결 수
    idleTimeoutMillis: 30000, // idle 연결 타임아웃 (30초)
    connectionTimeoutMillis: 10000, // 연결 대기 시간 (10초)
};
// Only use SSL for remote connections (Railway)
if (!isLocalhost) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}
exports.pool = new pg_1.Pool(poolConfig);
// Ensure UTF-8 encoding for all connections
exports.pool.on('connect', (client) => {
    client.query('SET client_encoding TO UTF8');
});
//# sourceMappingURL=db.js.map