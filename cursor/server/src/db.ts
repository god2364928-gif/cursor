import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

// Ensure we use the correct database connection
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:xodrn123@localhost:5432/crm_db'
console.log('Database URL:', databaseUrl.replace(/password=[^@]+/, 'password=***'))

// Determine if SSL should be used based on hostname
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1')
const poolConfig: any = {
  connectionString: databaseUrl,
  max: 20,                          // 최대 연결 수
  idleTimeoutMillis: 30000,         // idle 연결 타임아웃 (30초)
  connectionTimeoutMillis: 2000,    // 연결 대기 시간 (2초)
}

// Only use SSL for remote connections (Railway)
if (!isLocalhost) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  }
}

export const pool = new Pool(poolConfig)



