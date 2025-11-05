const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

// Railway DATABASE_URL 사용 (환경 변수에서 가져옴)
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.')
  console.error('Railway 프로젝트의 DATABASE_URL을 환경 변수로 설정해주세요.')
  process.exit(1)
}

console.log('Database URL:', databaseUrl.replace(/password=[^@]+/, 'password=***'))

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
})

async function runMigration() {
  const client = await pool.connect()
  
  try {
    console.log('Starting migration: sales_tracking table...')
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'add-sales-tracking.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute SQL
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    
    console.log('✅ Migration completed successfully!')
    
    // Verify table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_tracking'
      );
    `)
    
    if (result.rows[0].exists) {
      console.log('✓ sales_tracking table created successfully')
    } else {
      console.log('✗ sales_tracking table was not created')
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed:', error.message)
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists (this is OK)')
    } else {
      throw error
    }
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => {
    console.log('Migration script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })
