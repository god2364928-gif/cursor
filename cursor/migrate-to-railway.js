const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway';

async function migrateToRailway() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to Railway database...');
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL');

    // Step 1: Disable foreign key constraints temporarily
    console.log('\n🔄 Disabling foreign key constraints...');
    await client.query('SET session_replication_role = replica;');
    console.log('✅ Foreign key constraints disabled');

    // Step 2: Truncate all tables in correct order (child tables first)
    console.log('\n🗑️  Truncating all tables...');
    const truncateOrder = [
      'retargeting_history',
      'customer_history',
      'payments',
      'sales',
      'retargeting_customers',
      'customers',
      'users',
      'teams',
      'payment_types',
      'services'
    ];

    for (const table of truncateOrder) {
      try {
        await client.query(`TRUNCATE TABLE ${table} CASCADE;`);
        console.log(`✅ Truncated ${table}`);
      } catch (err) {
        console.log(`⚠️  Table ${table}: ${err.message}`);
      }
    }

    // Step 3: Re-enable foreign key constraints
    console.log('\n🔄 Re-enabling foreign key constraints...');
    await client.query('SET session_replication_role = DEFAULT;');
    console.log('✅ Foreign key constraints enabled');

    // Step 4: Load data from dump file
    console.log('\n📦 Loading data from dev_db_complete_dump.sql...');
    const dumpSQL = fs.readFileSync(path.join(__dirname, '..', 'dev_db_complete_dump.sql'), 'utf8');
    
    // Remove restrict/unrestrict and other dump-specific commands
    const cleanSQL = dumpSQL
      .replace(/\\restrict.*$/gm, '')
      .replace(/\\unrestrict.*$/gm, '')
      .replace(/SELECT pg_catalog\.set_config\('search_path'.*$/gm, '')
      .replace(/COMMENT ON EXTENSION.*$/gm, '');

    await client.query(cleanSQL);
    console.log('✅ Data loaded successfully');

    // Step 5: Verify data
    console.log('\n🔍 Verifying data...');
    const result = await client.query(`
      SELECT 'customers' as table_name, COUNT(*) as count FROM customers
      UNION ALL SELECT 'payments', COUNT(*) FROM payments
      UNION ALL SELECT 'sales', COUNT(*) FROM sales
      UNION ALL SELECT 'users', COUNT(*) FROM users
      UNION ALL SELECT 'retargeting_customers', COUNT(*) FROM retargeting_customers
      ORDER BY table_name;
    `);

    console.log('\n📊 Final data counts:');
    console.table(result.rows);

    await client.end();
    console.log('\n🎉 Migration completed successfully!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

migrateToRailway();

