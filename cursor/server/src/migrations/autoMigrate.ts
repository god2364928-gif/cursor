import { pool } from '../db'
import fs from 'fs'
import path from 'path'

/**
 * 휴가 데이터 중복 제거 (멱등 — 매번 실행되어도 OK)
 * 같은 (user_id, grant_date, grant_type, days) 조합 중 가장 작은 id만 남기고 삭제.
 * 같은 (user_id, start_date, end_date, leave_type, consumed_days) 조합도 동일.
 */
export async function autoMigrateDedupVacationData(): Promise<void> {
  try {
    // 멱등성: 중복이 있을 때만 실행
    const tableCheck = await pool.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables
        WHERE table_schema='public' AND table_name='vacation_grants') AS exists
    `)
    if (!tableCheck.rows[0]?.exists) return

    const grantsResult = await pool.query(`
      DELETE FROM vacation_grants
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY user_id, grant_date, grant_type, days
            ORDER BY id
          ) AS rn
          FROM vacation_grants
        ) t WHERE rn > 1
      )
      RETURNING id
    `)

    const requestsResult = await pool.query(`
      DELETE FROM vacation_requests
      WHERE id IN (
        SELECT id FROM (
          SELECT id, ROW_NUMBER() OVER (
            PARTITION BY user_id, start_date, end_date, leave_type, consumed_days
            ORDER BY id
          ) AS rn
          FROM vacation_requests
        ) t WHERE rn > 1
      )
      RETURNING id
    `)

    const gDeleted = grantsResult.rowCount || 0
    const rDeleted = requestsResult.rowCount || 0
    if (gDeleted > 0 || rDeleted > 0) {
      console.log(`✅ Vacation dedup: removed ${gDeleted} duplicate grants, ${rDeleted} duplicate requests`)
    }
  } catch (error: any) {
    console.error('Vacation dedup failed:', error.message)
  }
}

/**
 * 'Notion移行' 라벨 정리 (1회성)
 * - vacation_grants.notes / vacation_requests.reason 에 'Notion移行' prefix 제거
 */
export async function autoMigrateCleanupNotionLabels(): Promise<void> {
  try {
    const check = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM vacation_grants WHERE notes LIKE 'Notion%') AS grants_cnt,
        (SELECT COUNT(*)::int FROM vacation_requests WHERE reason LIKE 'Notion%') AS requests_cnt
    `)
    const grantsCnt = check.rows[0]?.grants_cnt || 0
    const requestsCnt = check.rows[0]?.requests_cnt || 0
    if (grantsCnt === 0 && requestsCnt === 0) {
      return // 이미 정리됨
    }

    await pool.query(`UPDATE vacation_grants SET notes = NULL WHERE notes LIKE 'Notion%'`)
    await pool.query(`UPDATE vacation_requests SET reason = NULL WHERE reason LIKE 'Notion%'`)
    console.log(`✅ Notion labels cleaned (grants: ${grantsCnt}, requests: ${requestsCnt})`)
  } catch (error: any) {
    console.error('Notion labels cleanup failed:', error.message)
  }
}

/**
 * 中村さくら 묶음 import를 정확한 분리 항목으로 교체 (1회성 보정)
 * - 이전 마이그레이션에서 묶음 1건으로 INSERT한 것을 노션 전체 페이지에 맞춰 분리
 * - 묶음이 없으면 skip (정상 case)
 */
export async function autoMigrateNakamuraSakuraSplit(): Promise<void> {
  try {
    // 묶음 행 존재 여부 확인
    const checkResult = await pool.query(`
      SELECT vr.id
      FROM vacation_requests vr
      JOIN users u ON u.id = vr.user_id
      WHERE u.email = 'umm240227@hotseller.co.kr'
        AND vr.reason LIKE 'Notion移行 (詳細不明%'
    `)
    if (checkResult.rows.length === 0) {
      // 묶음 없음 → 처음부터 정확하게 import 됐거나, 아직 import 안됨
      return
    }

    console.log('Splitting 中村さくら 묶음 신청 → 정확한 분리 항목')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 묶음 행 삭제
      await client.query(`
        DELETE FROM vacation_requests vr
        USING users u
        WHERE vr.user_id = u.id
          AND u.email = 'umm240227@hotseller.co.kr'
          AND vr.reason LIKE 'Notion移行 (詳細不明%'
      `)

      // 분리된 항목 중 묶음에 포함되지 않았던 것만 INSERT
      // (보이는 10건은 이미 INSERT됨, 추가 분만 넣음)
      await client.query(`
        WITH u AS (SELECT id FROM users WHERE email = 'umm240227@hotseller.co.kr')
        INSERT INTO vacation_requests
          (user_id, start_date, end_date, leave_type, consumed_days, status, reason, approved_at)
        SELECT u.id, d.s, d.e, d.lt, d.cd, 'approved', d.r, (d.s::timestamp + INTERVAL '18 hours')
        FROM u, (VALUES
          (DATE '2025-09-10', DATE '2025-09-12', 'full',    3::numeric, 'Notion移行 (連休)'),
          (DATE '2025-09-16', DATE '2025-09-16', 'full',    1::numeric, 'Notion移行'),
          (DATE '2025-10-06', DATE '2025-10-06', 'full',    1::numeric, 'Notion移行'),
          (DATE '2025-11-04', DATE '2025-11-04', 'full',    1::numeric, 'Notion移行'),
          (DATE '2025-12-24', DATE '2025-12-26', 'full',    3::numeric, 'Notion移行 (連休)'),
          (DATE '2026-02-16', DATE '2026-02-16', 'full',    1::numeric, 'Notion移行'),
          (DATE '2026-02-24', DATE '2026-02-24', 'full',    1::numeric, 'Notion移行'),
          (DATE '2026-02-25', DATE '2026-02-25', 'half_pm', 0.5::numeric, 'Notion移行 (半休)'),
          (DATE '2026-04-21', DATE '2026-04-21', 'half_pm', 0.5::numeric, 'Notion移行 (半休)'),
          (DATE '2026-04-23', DATE '2026-04-23', 'full',    1::numeric, 'Notion移行')
        ) AS d(s, e, lt, cd, r)
      `)

      await client.query('COMMIT')
      console.log('✅ 中村さくら 분리 완료')
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('❌ 中村さくら split migration failed:', error.message)
  }
}

export async function autoMigrateNotionVacationData(): Promise<void> {
  try {
    // users 테이블 / vacation_grants 테이블이 모두 있어야 의미 있음
    const tableCheck = await pool.query(`
      SELECT
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='vacation_grants') AS grants,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema='public' AND table_name='vacation_requests') AS requests
    `)
    if (!tableCheck.rows[0]?.grants || !tableCheck.rows[0]?.requests) {
      console.log('⚠️ vacation tables not yet ready, skipping Notion import')
      return
    }

    // 멱등성 체크: vacation_grants 또는 vacation_requests에 어떤 row라도 있으면 skip
    // (이전엔 notes prefix 기반이었으나, cleanup 후 NULL 처리되면 멱등성 깨져 중복 INSERT 발생)
    const checkResult = await pool.query(
      `SELECT
        (SELECT COUNT(*)::int FROM vacation_grants) AS grants_cnt,
        (SELECT COUNT(*)::int FROM vacation_requests) AS requests_cnt`
    )
    const gCnt = checkResult.rows[0]?.grants_cnt || 0
    const rCnt = checkResult.rows[0]?.requests_cnt || 0
    if (gCnt > 0 || rCnt > 0) {
      console.log(`✓ Vacation data exists (grants: ${gCnt}, requests: ${rCnt}), skipping Notion import`)
      return
    }

    console.log('Importing Notion vacation data...')
    const sqlPath = path.join(__dirname, '../../database/seed-notion-vacation-data.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ Notion vacation data imported successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('❌ Notion vacation data import failed:', error.message)
    console.error('Server will continue to start')
  }
}

/** users.id 컬럼 타입을 동적으로 감지 (INTEGER/BIGINT/UUID/TEXT 등) */
export async function getUserIdSqlType(): Promise<string> {
  const r = await pool.query(`
    SELECT data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='users' AND column_name='id'
  `)
  const dataType = r.rows[0]?.data_type
  const udtName = r.rows[0]?.udt_name
  // PostgreSQL data_type 매핑
  if (dataType === 'uuid') return 'UUID'
  if (dataType === 'bigint') return 'BIGINT'
  if (dataType === 'integer') return 'INTEGER'
  if (dataType === 'smallint') return 'SMALLINT'
  if (dataType === 'character varying' || dataType === 'text' || dataType === 'character') return 'TEXT'
  if (dataType === 'numeric') return 'NUMERIC'
  // fallback - udt_name 사용
  return (udtName || 'INTEGER').toUpperCase()
}

/** users.id 타입에 맞춰 vacation 테이블 생성 SQL 생성 */
export function buildVacationSchemaSql(userIdType: string): string {
  return `
    CREATE TABLE IF NOT EXISTS vacation_grants (
      id SERIAL PRIMARY KEY,
      user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      grant_date DATE NOT NULL,
      expires_at DATE NOT NULL,
      days NUMERIC(4,1) NOT NULL,
      grant_type TEXT NOT NULL DEFAULT 'annual',
      service_years_at_grant NUMERIC(3,1),
      notes TEXT,
      created_by ${userIdType} REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vac_grants_user ON vacation_grants(user_id);
    CREATE INDEX IF NOT EXISTS idx_vac_grants_expiry ON vacation_grants(expires_at);
    CREATE INDEX IF NOT EXISTS idx_vac_grants_user_type_date ON vacation_grants(user_id, grant_type, grant_date DESC);

    CREATE TABLE IF NOT EXISTS vacation_requests (
      id SERIAL PRIMARY KEY,
      user_id ${userIdType} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      leave_type TEXT NOT NULL,
      consumed_days NUMERIC(4,1) NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approver_id ${userIdType} REFERENCES users(id),
      approved_at TIMESTAMPTZ,
      rejected_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_vac_req_user ON vacation_requests(user_id);
    CREATE INDEX IF NOT EXISTS idx_vac_req_status ON vacation_requests(status);
    CREATE INDEX IF NOT EXISTS idx_vac_req_dates ON vacation_requests(start_date, end_date);

    CREATE TABLE IF NOT EXISTS jp_holidays (
      date DATE PRIMARY KEY,
      name TEXT NOT NULL
    );
  `
}

export async function autoMigrateVacation(): Promise<void> {
  try {
    console.log('Checking vacation tables...')

    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'vacation_grants'
      );
    `)

    if (checkResult.rows[0].exists) {
      console.log('✓ vacation tables already exist')
      return
    }

    const userIdType = await getUserIdSqlType()
    console.log(`Creating vacation tables (users.id type: ${userIdType})...`)
    const sql = buildVacationSchemaSql(userIdType)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ vacation tables created successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      if (error.code === '42P07') {
        console.log('ℹ️  Tables were created by another process (this is OK)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('❌ vacation tables auto-migration failed:', error.message)
    console.error('Server will continue to start, but vacation features may not work')
  }
}

export async function autoMigrateAppAccess(): Promise<void> {
  try {
    console.log('Checking users.app_access column...')

    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'app_access'
      );
    `)

    if (checkResult.rows[0].exists) {
      console.log('✓ users.app_access column already exists')
      return
    }

    console.log('Adding users.app_access column...')

    const sqlPath = path.join(__dirname, '../../database/add-app-access-column.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ users.app_access column added and backfilled successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      if (error.code === '42701') {
        console.log('ℹ️  Column was added by another process (this is OK)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }
  } catch (error: any) {
    console.error('❌ app_access auto-migration failed:', error.message)
    console.error('Server will continue to start, but app routing may not work correctly')
  }
}

export async function autoMigrateSalesAmountFields(): Promise<void> {
  try {
    console.log('Checking sales amount fields (total_amount, tax_amount, net_amount)...')
    
    // total_amount 컬럼 존재 여부 확인
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'sales'
        AND column_name = 'total_amount'
      );
    `)
    
    if (checkResult.rows[0].exists) {
      console.log('✓ sales amount fields already exist')
      return
    }
    
    console.log('Adding sales amount fields...')
    
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../database/add-sales-amount-fields.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    // 마이그레이션 실행
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ sales amount fields added and migrated successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      if (error.code === '42701') {
        // 컬럼이 이미 존재하는 경우 (동시 실행 시 발생 가능)
        console.log('ℹ️  Columns were added by another process (this is OK)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('❌ Sales amount fields auto-migration failed:', error.message)
    console.error('Server will continue to start, but some features may not work correctly')
  }
}

export async function autoMigrateHotpepper(): Promise<void> {
  try {
    console.log('Checking hotpepper_restaurants table...')
    
    // hotpepper_restaurants 테이블 존재 여부 확인
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'hotpepper_restaurants'
      );
    `)
    
    if (checkResult.rows[0].exists) {
      console.log('✓ hotpepper_restaurants table already exists')
      return
    }
    
    console.log('hotpepper_restaurants table does not exist. Creating...')
    
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../database/hotpepper-schema.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    // 마이그레이션 실행
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ hotpepper_restaurants table created successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      if (error.code === '42P07') {
        // 테이블이 이미 존재하는 경우 (동시 실행 시 발생 가능)
        console.log('ℹ️  Table was created by another process (this is OK)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('❌ HotPepper table auto-migration failed:', error.message)
    // 마이그레이션 실패해도 서버는 시작 (기존 동작 유지)
    console.error('Server will continue to start, but HotPepper search features may not work')
  }
}

export async function autoMigrateSalesTracking(): Promise<void> {
  try {
    console.log('Checking sales_tracking table...')
    
    // 테이블 존재 여부 확인
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_tracking'
      );
    `)
    
    if (checkResult.rows[0].exists) {
      console.log('✓ sales_tracking table already exists')
      // Ensure external_call_id column exists (for CPI integration)
      try {
        await pool.query(`
          ALTER TABLE sales_tracking
          ADD COLUMN IF NOT EXISTS external_call_id TEXT,
          ADD COLUMN IF NOT EXISTS external_source TEXT;
        `)
        // Add unique index for external_call_id when not null
        await pool.query(`
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
        `)
      } catch (e) {
        console.error('Failed ensuring external_call_id columns:', e)
      }

      try {
        await pool.query(`
          ALTER TABLE sales_tracking
          ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMP WITHOUT TIME ZONE;
        `)
        await pool.query(`
          UPDATE sales_tracking
          SET occurred_at = COALESCE(occurred_at, created_at, date::timestamp)
          WHERE occurred_at IS NULL;
        `)
        await pool.query(`
          ALTER TABLE sales_tracking
          ALTER COLUMN occurred_at SET DEFAULT NOW();
        `)
      } catch (e) {
        console.error('Failed ensuring occurred_at column:', e)
      }

      try {
        await pool.query(`
          UPDATE sales_tracking
          SET company_name = customer_name
          WHERE (company_name IS NULL OR TRIM(company_name) = '')
            AND customer_name IS NOT NULL
            AND TRIM(customer_name) <> '';
        `)
      } catch (e) {
        console.error('Failed migrating customer_name into company_name:', e)
      }

      // Add last_contact_at column for tracking last contact time
      try {
        await pool.query(`
          ALTER TABLE sales_tracking
          ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP;
        `)
        await pool.query(`
          CREATE INDEX IF NOT EXISTS idx_sales_tracking_last_contact ON sales_tracking(last_contact_at);
        `)
        console.log('✓ last_contact_at column ensured')
      } catch (e) {
        console.error('Failed ensuring last_contact_at column:', e)
      }
      return
    }
    
    console.log('sales_tracking table does not exist. Creating...')
    
    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../../database/add-sales-tracking.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    // 마이그레이션 실행
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('COMMIT')
      console.log('✅ sales_tracking table created successfully')
    } catch (error: any) {
      await client.query('ROLLBACK')
      if (error.code === '42P07') {
        // 테이블이 이미 존재하는 경우 (동시 실행 시 발생 가능)
        console.log('ℹ️  Table was created by another process (this is OK)')
      } else {
        throw error
      }
    } finally {
      client.release()
    }
    
  } catch (error: any) {
    console.error('❌ Auto-migration failed:', error.message)
    // 마이그레이션 실패해도 서버는 시작 (기존 동작 유지)
    console.error('Server will continue to start, but some features may not work')
  }
}

/** snack_requests, snack_fixed 테이블 생성 (멱등 + 잘못된 스키마 자동 정리)
 *  users.id 가 UUID 이므로 user_id 컬럼도 UUID 여야 함.
 *  과거 배포에서 INTEGER 로 부분 생성됐다면 DROP 후 재생성.
 */
export async function autoMigrateSnackRequest(): Promise<void> {
  try {
    const colCheck = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_schema='public' AND table_name='snack_requests' AND column_name='user_id'
    `)
    const existingType = colCheck.rows[0]?.data_type as string | undefined

    if (existingType === 'uuid') {
      console.log('[SnackRequest] tables already exist with correct UUID schema, skip')
      return
    }

    if (existingType && existingType !== 'uuid') {
      console.warn(`[SnackRequest] dropping tables with incorrect user_id type: ${existingType}`)
      await pool.query('DROP TABLE IF EXISTS snack_requests CASCADE')
      await pool.query('DROP TABLE IF EXISTS snack_fixed CASCADE')
    } else {
      // snack_requests 가 없어도 snack_fixed 만 부분 생성됐을 가능성
      const fixedCheck = await pool.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_schema='public' AND table_name='snack_fixed' AND column_name='user_id'
      `)
      const fixedType = fixedCheck.rows[0]?.data_type as string | undefined
      if (fixedType && fixedType !== 'uuid') {
        console.warn(`[SnackRequest] dropping snack_fixed with incorrect user_id type: ${fixedType}`)
        await pool.query('DROP TABLE IF EXISTS snack_fixed CASCADE')
      }
    }

    const sqlPath = path.join(__dirname, '../../migrations/add_snack_request.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    await pool.query(sql)
    console.log('✅ [SnackRequest] migration applied (user_id UUID)')
  } catch (error: any) {
    console.error('[SnackRequest] migration failed:', error.message)
  }
}

/**
 * 健康診断申請 (health_checkup_requests / health_checkup_files)
 * 멱등 — 이미 테이블이 있으면 skip.
 */
export async function autoMigrateHealthCheckup(): Promise<void> {
  try {
    const check = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('health_checkup_requests', 'health_checkup_files')
    `)
    if (check.rows.length === 2) {
      console.log('[HealthCheckup] tables already exist, skip')
      return
    }
    const sqlPath = path.join(__dirname, '../../migrations/add_health_checkup.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    await pool.query(sql)
    console.log('✅ [HealthCheckup] migration applied')
  } catch (error: any) {
    console.error('[HealthCheckup] migration failed:', error.message)
  }
}

export async function autoMigrateEducationRequest(): Promise<void> {
  try {
    const check = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name IN ('education_requests', 'education_files')
    `)
    if (check.rows.length === 2) {
      console.log('[EducationRequest] tables already exist, skip')
      return
    }
    const sqlPath = path.join(__dirname, '../../migrations/add_education_request.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    await pool.query(sql)
    console.log('✅ [EducationRequest] migration applied')
  } catch (error: any) {
    console.error('[EducationRequest] migration failed:', error.message)
  }
}
