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
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway';
console.log('Database URL:', databaseUrl.replace(/password=[^@]+/, 'password=***'));
// Determine if SSL should be used based on hostname
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
const poolConfig = {
    connectionString: databaseUrl
};
// Only use SSL for remote connections (Railway)
if (!isLocalhost) {
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}
exports.pool = new pg_1.Pool(poolConfig);
//# sourceMappingURL=db.js.map