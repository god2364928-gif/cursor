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

// 날짜 변환: 2025/01/06 -> 2025-01-06
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
  'Nakamura Sakura': '中村さくら', // CSV에 없을 수도 있지만 추가
}

async function importData() {
  const client = await pool.connect()
  
  try {
    console.log('Starting CSV import...')
    
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
    const csvPath = path.join(projectRoot, '../営業・リターゲティング管理 - 営業履歴_2025.csv')
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`)
    }
    
    console.log(`Reading CSV file: ${csvPath}`)
    const records = parseCSV(csvPath)
    console.log(`Found ${records.length} records in CSV`)
    
    // 3. 데이터 변환 및 삽입
    let inserted = 0
    let skipped = 0
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
        
        // 데이터 삽입
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
            memo_note,
            user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          dateStr,
          dbManagerName, // DB에 저장할 때는 매핑된 이름 사용
          record['アカウントID'] || null,
          record['顧客名'] || null,
          record['業種'] || null,
          record['営業方法'] || null,
          record['ステータス'] || '未返信',
          record['先方担当者'] || null,
          record['電話番号'] || null,
          record['メモ'] || null,
          record['メモ不可（個人シートにて反映）'] || null,
          userId
        ])
        
        inserted++
        
        if (inserted % 1000 === 0) {
          console.log(`Progress: ${inserted} records inserted...`)
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
    console.log(`Skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)
    
    if (unmatchedManagers.size > 0) {
      console.log(`\n⚠️  Unmatched managers (${unmatchedManagers.size}):`)
      Array.from(unmatchedManagers).slice(0, 10).forEach(name => {
        console.log(`  - ${name}`)
      })
      if (unmatchedManagers.size > 10) {
        console.log(`  ... and ${unmatchedManagers.size - 10} more`)
      }
      console.log('\nPlease check if these manager names exist in the users table.')
    }
    
    // 4. 최종 데이터 확인
    const countResult = await client.query('SELECT COUNT(*) FROM sales_tracking')
    console.log(`\nTotal records in sales_tracking table: ${countResult.rows[0].count}`)
    
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
