const fs = require('fs');
const { parse } = require('csv-parse/sync');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway',
  ssl: false
});

async function importRetargetingData() {
  console.log('🚀 리타겟팅 데이터 임포트 시작...\n');

  try {
    // Read CSV file
    const csvPath = '../../리타겟팅_추가등록.csv';
    console.log(`📂 CSV 파일 읽기: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true // Handle BOM for UTF-8
    });

    console.log(`✅ ${records.length}개 레코드 발견\n`);

    // Get user_id for manager (山﨑水優)
    const userResult = await pool.query(
      `SELECT id FROM users WHERE name = $1`,
      ['山﨑水優']
    );

    if (userResult.rows.length === 0) {
      console.error('❌ 담당자 "山﨑水優"를 찾을 수 없습니다!');
      process.exit(1);
    }

    const userId = userResult.rows[0].id;
    console.log(`👤 담당자 ID 확인: ${userId}\n`);

    // Today's date
    const today = new Date().toISOString();

    let successCount = 0;
    let errorCount = 0;

    // Insert each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // CSV 컬럼: 담당자, 顧客名, 業種, Instagram ID, 電話番号
        const companyName = record['顧客名'] || null;
        const industry = record['業種'] === '不明' ? null : record['業種'] || null;
        const instagram = record['Instagram ID'] === '不明' ? null : record['Instagram ID'] || null;
        const phone = record['電話番号'] || null;
        const manager = record['担当者'] || '山﨑水優';

        // Check if already exists by phone or company name
        if (phone) {
          const existingResult = await pool.query(
            `SELECT id FROM retargeting_customers WHERE phone = $1`,
            [phone]
          );
          
          if (existingResult.rows.length > 0) {
            console.log(`⚠️  ${i + 1}. 스킵 (이미 존재): ${companyName || '이름없음'} (전화: ${phone})`);
            continue;
          }
        }

        // Insert into retargeting_customers
        await pool.query(
          `INSERT INTO retargeting_customers (
            company_name,
            customer_name,
            industry,
            phone,
            instagram,
            manager,
            status,
            last_contact_date,
            registered_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            companyName,
            null, // customer_name은 비워둠
            industry,
            phone,
            instagram,
            manager,
            '시작', // status
            today, // last_contact_date
            today // registered_at
          ]
        );

        successCount++;
        console.log(`✅ ${i + 1}. ${companyName || '이름없음'} - ${industry || '업종없음'} (${phone || '전화없음'})`);
        
      } catch (err) {
        errorCount++;
        console.error(`❌ ${i + 1}. 실패: ${record['顧客名']} - ${err.message}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 임포트 완료!');
    console.log(`   ✅ 성공: ${successCount}건`);
    console.log(`   ❌ 실패: ${errorCount}건`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the import
importRetargetingData()
  .then(() => {
    console.log('\n🎉 모든 작업 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 치명적 오류:', error);
    process.exit(1);
  });

