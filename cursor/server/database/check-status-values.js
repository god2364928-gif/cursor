const { Pool } = require('pg')
require('dotenv').config()

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
})

async function checkStatusValues() {
  const client = await pool.connect()
  
  try {
    console.log('=== sales_tracking 테이블의 status 값 확인 ===\n')
    
    // 1. 모든 고유한 status 값 확인
    const statusResult = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM sales_tracking
      GROUP BY status
      ORDER BY count DESC
    `)
    
    console.log('📊 모든 status 값 목록:')
    statusResult.rows.forEach(row => {
      console.log(`  - "${row.status}": ${row.count}건`)
    })
    
    // 2. 2025년 10월 데이터의 status 값 확인
    console.log('\n📅 2025년 10월 데이터의 status 값:')
    const oct2025Result = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = 2025 AND
        EXTRACT(MONTH FROM date) = 10
      GROUP BY status
      ORDER BY count DESC
    `)
    
    oct2025Result.rows.forEach(row => {
      console.log(`  - "${row.status}": ${row.count}건`)
    })
    
    // 3. "返信"이 포함된 status 값 확인
    console.log('\n🔍 "返信"이 포함된 status 값:')
    const replyResult = await client.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM sales_tracking
      WHERE status LIKE '%返信%'
      GROUP BY status
      ORDER BY count DESC
    `)
    
    if (replyResult.rows.length === 0) {
      console.log('  ❌ "返信"이 포함된 status 값이 없습니다.')
    } else {
      replyResult.rows.forEach(row => {
        console.log(`  - "${row.status}": ${row.count}건`)
      })
    }
    
    // 4. 2025년 10월 담당자별 회신수 집계 테스트
    console.log('\n📋 2025년 10월 담당자별 회신수 집계 테스트:')
    const testResult = await client.query(`
      SELECT 
        manager_name,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE status IN ('返信済み', '返信あり', '返信済')) as reply_count_exact,
        COUNT(*) FILTER (WHERE status LIKE '%返信%') as reply_count_like,
        COUNT(*) FILTER (WHERE status = '未返信') as no_reply
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = 2025 AND
        EXTRACT(MONTH FROM date) = 10
      GROUP BY manager_name
      ORDER BY manager_name
    `)
    
    testResult.rows.forEach(row => {
      console.log(`  ${row.manager_name}:`)
      console.log(`    - 총: ${row.total_count}건`)
      console.log(`    - 정확 일치 (返信済み/返信あり/返信済): ${row.reply_count_exact}건`)
      console.log(`    - LIKE '%返信%': ${row.reply_count_like}건`)
      console.log(`    - 未返信: ${row.no_reply}건`)
    })
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

checkStatusValues()
  .then(() => {
    console.log('\n✅ 확인 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ 확인 실패:', error)
    process.exit(1)
  })

