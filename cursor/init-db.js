const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Railway PostgreSQL 연결 정보 (Private Network)
// 필요시 Public Network로 변경
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway';

async function initializeDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL');

    // 스키마 실행
    const schemaSQL = fs.readFileSync(path.join(__dirname, 'server', 'database', 'schema.sql'), 'utf8');
    console.log('📝 Running schema.sql...');
    await client.query(schemaSQL);
    console.log('✅ Schema created successfully');

    // 시드 데이터 실행
    const seedSQL = fs.readFileSync(path.join(__dirname, 'server', 'database', 'seed.sql'), 'utf8');
    console.log('📝 Running seed.sql...');
    await client.query(seedSQL);
    console.log('✅ Seed data inserted successfully');

    await client.end();
    console.log('\n🎉 Database initialization completed!\n');
    console.log('You can now login with:');
    console.log('📧 Email: hong@example.com');
    console.log('🔑 Password: password123\n');

  } catch (err) {
    console.error('❌ Database setup failed:', err.message);
    process.exit(1);
  }
}

initializeDatabase();
