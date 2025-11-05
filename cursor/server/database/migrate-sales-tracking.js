const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:xodrn123@localhost:5432/crm_db'

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') 
    ? false 
    : { rejectUnauthorized: false }
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
    
    console.log('Migration completed successfully!')
    
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
    console.error('Migration failed:', error)
    throw error
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
