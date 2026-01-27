const { Pool } = require('pg');

// Railway DATABASE_URL 사용
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function deleteTestData() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('테스트 데이터 삭제 시작...');
    
    // 1. 리타겟팅 테이블에서 삭제
    console.log('\n1. 리타겟팅 고객 삭제 중...');
    const retargetingResult = await client.query(`
      DELETE FROM retargeting_customers 
      WHERE company_name IN ('test', 'test2', 'test3', 'test4', 'test5', 'test6')
         OR customer_name IN ('test', 'test2', 'test3', 'test4', 'test5', 'test6')
      RETURNING id, company_name, customer_name
    `);
    
    console.log(`✓ 리타겟팅에서 ${retargetingResult.rowCount}개 삭제됨`);
    if (retargetingResult.rows.length > 0) {
      console.log('삭제된 항목:');
      retargetingResult.rows.forEach(row => {
        console.log(`  - ${row.company_name || row.customer_name} (ID: ${row.id})`);
      });
    }
    
    // 2. 영업이력 테이블에서 삭제
    console.log('\n2. 영업이력 삭제 중...');
    const salesResult = await client.query(`
      DELETE FROM sales_tracking 
      WHERE company_name IN ('test', 'test2', 'test3', 'test4', 'test5', 'test6')
         OR customer_name IN ('test', 'test2', 'test3', 'test4', 'test5', 'test6')
      RETURNING id, company_name, customer_name
    `);
    
    console.log(`✓ 영업이력에서 ${salesResult.rowCount}개 삭제됨`);
    if (salesResult.rows.length > 0) {
      console.log('삭제된 항목:');
      salesResult.rows.forEach(row => {
        console.log(`  - ${row.company_name || row.customer_name} (ID: ${row.id})`);
      });
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ 테스트 데이터 삭제 완료!');
    console.log(`총 ${retargetingResult.rowCount + salesResult.rowCount}개 항목 삭제됨`);
    
    // 3. 남은 test 데이터 확인
    console.log('\n3. 남은 test 데이터 확인 중...');
    const remainingSales = await client.query(`
      SELECT COUNT(*) as count 
      FROM sales_tracking 
      WHERE company_name LIKE 'test%' OR customer_name LIKE 'test%'
    `);
    
    const remainingRetargeting = await client.query(`
      SELECT COUNT(*) as count 
      FROM retargeting_customers 
      WHERE company_name LIKE 'test%' OR customer_name LIKE 'test%'
    `);
    
    console.log(`영업이력에 남은 test 데이터: ${remainingSales.rows[0].count}개`);
    console.log(`리타겟팅에 남은 test 데이터: ${remainingRetargeting.rows[0].count}개`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 삭제 중 오류 발생:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

deleteTestData()
  .then(() => {
    console.log('\n작업 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n작업 실패:', error);
    process.exit(1);
  });
