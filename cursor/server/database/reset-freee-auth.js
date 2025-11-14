const { Pool } = require('pg')
require('dotenv').config()

// Railway DATABASE_URL 사용
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 환경 변수가 설정되지 않았습니다.')
  process.exit(1)
}

console.log('🔗 Connecting to Railway database...')
console.log('Database URL:', databaseUrl.replace(/password=[^@]+/, 'password=***'))

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
})

async function resetFreeeAuth() {
  try {
    // freee 토큰 삭제
    const result = await pool.query('DELETE FROM freee_tokens RETURNING *')
    
    if (result.rowCount > 0) {
      console.log(`✅ ${result.rowCount}개의 freee 토큰이 삭제되었습니다.`)
      console.log('📝 삭제된 토큰:', result.rows)
    } else {
      console.log('⚠️  삭제할 토큰이 없습니다.')
    }
    
    console.log('\n✅ freee 인증이 초기화되었습니다.')
    console.log('👉 이제 청구서 발행 페이지에서 다시 인증하세요.')
    
  } catch (error) {
    console.error('❌ 오류 발생:', error)
  } finally {
    await pool.end()
  }
}

resetFreeeAuth()

