"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoMigrateSalesTracking = autoMigrateSalesTracking;
const db_1 = require("../db");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function autoMigrateSalesTracking() {
    try {
        console.log('Checking sales_tracking table...');
        // 테이블 존재 여부 확인
        const checkResult = await db_1.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_tracking'
      );
    `);
        if (checkResult.rows[0].exists) {
            console.log('✓ sales_tracking table already exists');
            // Ensure external_call_id column exists (for CPI integration)
            try {
                await db_1.pool.query(`
          ALTER TABLE sales_tracking
          ADD COLUMN IF NOT EXISTS external_call_id TEXT,
          ADD COLUMN IF NOT EXISTS external_source TEXT;
        `);
                // Add unique index for external_call_id when not null
                await db_1.pool.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_sales_tracking_external_call_id_unique'
            ) THEN
              CREATE UNIQUE INDEX idx_sales_tracking_external_call_id_unique
              ON sales_tracking ((external_call_id))
              WHERE external_call_id IS NOT NULL;
            END IF;
          END$$;
        `);
            }
            catch (e) {
                console.error('Failed ensuring external_call_id columns:', e);
            }
            try {
                await db_1.pool.query(`
          ALTER TABLE sales_tracking
          ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITHOUT TIME ZONE;
        `);
                await db_1.pool.query(`
          UPDATE sales_tracking
          SET occurred_at = COALESCE(occurred_at, created_at, date::timestamp)
          WHERE occurred_at IS NULL;
        `);
                await db_1.pool.query(`
          ALTER TABLE sales_tracking
          ALTER COLUMN occurred_at SET DEFAULT NOW();
        `);
            }
            catch (e) {
                console.error('Failed ensuring occurred_at column:', e);
            }
            try {
                await db_1.pool.query(`
          UPDATE sales_tracking
          SET company_name = customer_name
          WHERE (company_name IS NULL OR TRIM(company_name) = '')
            AND customer_name IS NOT NULL
            AND TRIM(customer_name) <> '';
        `);
            }
            catch (e) {
                console.error('Failed migrating customer_name into company_name:', e);
            }
            return;
        }
        console.log('sales_tracking table does not exist. Creating...');
        // SQL 파일 읽기
        const sqlPath = path_1.default.join(__dirname, '../../database/add-sales-tracking.sql');
        const sql = fs_1.default.readFileSync(sqlPath, 'utf-8');
        // 마이그레이션 실행
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log('✅ sales_tracking table created successfully');
        }
        catch (error) {
            await client.query('ROLLBACK');
            if (error.code === '42P07') {
                // 테이블이 이미 존재하는 경우 (동시 실행 시 발생 가능)
                console.log('ℹ️  Table was created by another process (this is OK)');
            }
            else {
                throw error;
            }
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('❌ Auto-migration failed:', error.message);
        // 마이그레이션 실패해도 서버는 시작 (기존 동작 유지)
        console.error('Server will continue to start, but some features may not work');
    }
}
//# sourceMappingURL=autoMigrate.js.map