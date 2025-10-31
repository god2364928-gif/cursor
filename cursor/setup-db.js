const { Client } = require('pg');

async function setupRailwayDatabase() {
  // Railway 데이터베이스로 연결
  const dbClient = new Client({
    connectionString: 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await dbClient.connect();
    console.log('Connected to Railway Postgres database');

    // fs 모듈로 SQL 파일 읽기
    const fs = require('fs');
    const path = require('path');

    const schemaSQL = fs.readFileSync(path.join(__dirname, 'cursor', 'server', 'database', 'schema.sql'), 'utf8');
    const seedSQL = fs.readFileSync(path.join(__dirname, 'cursor', 'server', 'database', 'seed.sql'), 'utf8');

    // 스키마 실행
    console.log('Running schema.sql on Railway...');
    await dbClient.query(schemaSQL);
    console.log('✅ Schema created successfully on Railway');

    // 시드 데이터 실행
    console.log('Running seed.sql on Railway...');
    await dbClient.query(seedSQL);
    console.log('✅ Seed data inserted successfully on Railway');

    await dbClient.end();
    console.log('\n✅ Railway database setup completed!');
    console.log('\nYou can now login with:');
    console.log('Email: hong@example.com');
    console.log('Password: password123');

  } catch (err) {
    console.error('❌ Railway database setup failed:', err.message);
    process.exit(1);
  }
}

setupRailwayDatabase();

