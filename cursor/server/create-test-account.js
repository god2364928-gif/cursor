#!/usr/bin/env node
/**
 * 테스트 계정 생성 스크립트
 * 
 * 사용법:
 *   node create-test-account.js
 */

const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTestAccounts() {
  console.log('🔐 테스트 계정 생성 중...\n');

  try {
    // 관리자 계정 생성
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminResult = await pool.query(
      `INSERT INTO users (name, email, password, role, team)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password,
         role = EXCLUDED.role
       RETURNING id, name, email, role`,
      ['관리자', 'admin@test.com', adminPassword, 'admin', '경영지원팀']
    );
    
    console.log('✅ 관리자 계정 생성 완료:');
    console.log('   이메일: admin@test.com');
    console.log('   비밀번호: admin123');
    console.log('   역할: admin\n');

    // 일반 사용자 계정 생성
    const userPassword = await bcrypt.hash('test123', 10);
    const userResult = await pool.query(
      `INSERT INTO users (name, email, password, role, team)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         password = EXCLUDED.password
       RETURNING id, name, email, role`,
      ['테스트 사용자', 'test@test.com', userPassword, 'user', '영업팀']
    );
    
    console.log('✅ 일반 사용자 계정 생성 완료:');
    console.log('   이메일: test@test.com');
    console.log('   비밀번호: test123');
    console.log('   역할: user\n');

    console.log('=' .repeat(50));
    console.log('🎉 테스트 계정 생성 완료!');
    console.log('=' .repeat(50));
    console.log('\n로그인 방법:');
    console.log('1. 클라이언트 실행: cd cursor/client && npm run dev');
    console.log('2. 브라우저에서 http://localhost:5173 접속');
    console.log('3. 위의 계정 정보로 로그인\n');

  } catch (error) {
    if (error.code === '42P01') {
      console.error('❌ users 테이블이 존재하지 않습니다.');
      console.error('   먼저 데이터베이스 마이그레이션을 실행하세요:');
      console.error('   psql $DATABASE_URL < cursor/server/database/schema.sql\n');
    } else {
      console.error('❌ 오류 발생:', error.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 실행
createTestAccounts();


