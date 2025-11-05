const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')
require('dotenv').config()

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:xodrn123@localhost:5432/crm_db'

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') 
    ? false 
    : { rejectUnauthorized: false }
})

// CSV 파일 파싱 및 데이터 변환
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    trim: true
  })
  
  return records
}

// 날짜 변환: 2025/11/05 -> 2025-11-05
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === '') return null
  return dateStr.replace(/\//g, '-')
}

// CSV의 영어 담당자명 -> DB의 일본어/한글 이름 매핑
const managerNameMapping = {
  'Ishii Hitomi': '石井瞳',
  'Yamasaki Miyu': '山﨑水優',
  'Yamashita Minami': '山下南',
  'Ishiguro Anna': '石黒杏奈',
  'Ando Aoi': '安藤葵',
  'Kim Jeyi': 'JEYI',
  'Nakamura Sakura': '中村さくら',
}

async function importData() {
  const client = await pool.connect()
  
  try {
    console.log('Starting CSV import for 무제 2.csv...')
    
    // 1. 사용자 목록 조회 (담당자명 매칭용)
    const usersResult = await client.query('SELECT id, name FROM users')
    const users = usersResult.rows
    console.log(`Found ${users.length} users in database`)
    
    // 담당자명 -> user_id 매핑 생성
    const managerToUserId = new Map()
    users.forEach(user => {
      managerToUserId.set(user.name, user.id)
    })
    
    // 2. CSV 파일 읽기
    // 프로젝트 루트 디렉토리에서 CSV 파일 찾기
    const projectRoot = path.resolve(__dirname, '../..')
    const csvPath = path.join(projectRoot, '../무제 2.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }
    
    console.log(`Reading CSV file: ${csvPath}`)
    const records = parseCSV(csvPath)
    console.log(`Found ${records.length} records in CSV`)
    
    // 3. 데이터 변환 및 삽입
    let inserted = 0
    let skipped = 0
    let updated = 0
    let errors = 0
    const unmatchedManagers = new Set()
    
    await client.query('BEGIN')
    
    for (const record of records) {
      try {
        const csvManagerName = (record['担当者名'] || '').trim()
        
        // 담당자명이 없으면 스킵
        if (!csvManagerName) {
          skipped++
          continue
        }
        
        // 영어 이름 -> 일본어/한글 이름 변환
        const dbManagerName = managerNameMapping[csvManagerName] || csvManagerName
        
        // user_id 찾기 (DB 이름으로 매칭)
        const userId = managerToUserId.get(dbManagerName)
        
        if (!userId) {
          unmatchedManagers.add(`${csvManagerName} (-> ${dbManagerName})`)
          skipped++
          continue
        }
        
        // 날짜 파싱
        const dateStr = parseDate(record['日付'])
        if (!dateStr) {
          skipped++
          continue
        }
        
        // 날짜가 2025/11/05가 아니면 스킵 (요구사항: 2025/11/05 데이터만)
        if (dateStr !== '2025-11-05') {
          skipped++
          continue
        }
        
        const accountId = (record['アカウントID'] || '').trim() || null
        const customerName = (record['顧客名'] || '').trim() || null
        const industry = (record['業種'] || '').trim() || null
        const contactMethod = (record['営業方法'] || '').trim() || null
        const status = (record['ステータス'] || '').trim() || '未返信'
        const contactPerson = (record['先方担当者'] || '').trim() || null
        const phone = (record['電話番号'] || '').trim() || null
        const memo = (record['メモ'] || '').trim() || null
        
        // 중복 체크: account_id, date, manager_name 조합으로 확인
        let existing = null
        if (accountId) {
          const existingResult = await client.query(`
            SELECT id FROM sales_tracking 
            WHERE account_id = $1 AND date = $2 AND manager_name = $3
          `, [accountId, dateStr, dbManagerName])
          existing = existingResult.rows[0]
        }
        
        if (existing) {
          // 이미 존재하면 업데이트 (선택사항: 업데이트하지 않고 스킵할 수도 있음)
          await client.query(`
            UPDATE sales_tracking SET
              customer_name = $1,
              industry = $2,
              contact_method = $3,
              status = $4,
              contact_person = $5,
              phone = $6,
              memo = $7,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
          `, [
            customerName,
            industry,
            contactMethod,
            status,
            contactPerson,
            phone,
            memo,
            existing.id
          ])
          updated++
        } else {
          // 새 레코드 삽입
          await client.query(`
            INSERT INTO sales_tracking (
              date,
              manager_name,
              account_id,
              customer_name,
              industry,
              contact_method,
              status,
              contact_person,
              phone,
              memo,
              user_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          `, [
            dateStr,
            dbManagerName,
            accountId,
            customerName,
            industry,
            contactMethod,
            status,
            contactPerson,
            phone,
            memo,
            userId
          ])
          
          inserted++
        }
        
        if ((inserted + updated) % 100 === 0) {
          console.log(`Progress: ${inserted} inserted, ${updated} updated...`)
        }
        
      } catch (error) {
        errors++
        console.error(`Error processing record:`, error.message)
        console.error('Record:', record)
      }
    }
    
    await client.query('COMMIT')
    
    console.log('\n=== Import Summary ===')
    console.log(`Total records in CSV: ${records.length}`)
    console.log(`Successfully inserted: ${inserted}`)
    console.log(`Updated (duplicates): ${updated}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)
    
    if (unmatchedManagers.size > 0) {
      console.log(`\n⚠️  Unmatched managers (${unmatchedManagers.size}):`)
      Array.from(unmatchedManagers).forEach(name => {
        console.log(`  - ${name}`)
      })
      console.log('\nPlease check if these manager names exist in the users table.')
    }
    
    // 4. 최종 데이터 확인
    const countResult = await client.query(`
      SELECT COUNT(*) FROM sales_tracking WHERE date = '2025-11-05'
    `)
    console.log(`\nTotal records for 2025-11-05 in sales_tracking table: ${countResult.rows[0].count}`)
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Import failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

importData()
  .then(() => {
    console.log('\n✅ Import completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Import failed:', error)
    process.exit(1)
  })

