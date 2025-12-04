/**
 * 대용량 CSV 파일을 inquiry_leads 테이블에 초고속 마이그레이션
 * 배치 멀티-INSERT 방식 사용 (500개씩)
 * 
 * 실행: npm run import:csv
 */

import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import readline from 'readline'

// 설정
const CSV_FILE_PATH = path.join(__dirname, '..', '..', '..', 'found_forms_with_info.csv')
const DATABASE_URL = 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway'
const BATCH_SIZE = 500

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

interface LeadData {
  store_name: string
  url: string
  prefecture: string
  region: string
  genre: string
}

async function main() {
  console.log('🚀 초고속 CSV 마이그레이션 시작')
  console.log(`📁 파일: ${CSV_FILE_PATH}`)
  console.log(`📦 배치 크기: ${BATCH_SIZE}`)
  
  const startTime = Date.now()
  
  // 파일 스트림으로 읽기
  const fileStream = fs.createReadStream(CSV_FILE_PATH)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  })

  let isHeader = true
  let batch: LeadData[] = []
  let totalRows = 0
  let totalInserted = 0
  let totalSkipped = 0

  console.log('\n📥 데이터 처리 중...')

  for await (const line of rl) {
    // BOM 제거 및 헤더 스킵
    const cleanLine = line.replace(/^\ufeff/, '')
    
    if (isHeader) {
      isHeader = false
      continue
    }

    if (!cleanLine.trim()) continue

    // CSV 파싱
    const cols = parseCSVLine(cleanLine)
    if (cols.length < 5) continue

    const storeName = cols[0]?.trim() || ''
    if (!storeName) {
      totalSkipped++
      continue
    }

    batch.push({
      store_name: storeName,
      url: cols[1]?.trim() || '',
      prefecture: cols[2]?.trim() || '',
      region: cols[3]?.trim() || '',
      genre: cols[4]?.trim() || ''
    })
    totalRows++

    // 배치가 차면 DB에 저장
    if (batch.length >= BATCH_SIZE) {
      const inserted = await insertBatch(batch)
      totalInserted += inserted
      process.stdout.write(`\r⏳ 처리: ${totalRows.toLocaleString()}개 / 추가: ${totalInserted.toLocaleString()}개`)
      batch = []
    }
  }

  // 남은 배치 처리
  if (batch.length > 0) {
    const inserted = await insertBatch(batch)
    totalInserted += inserted
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  
  console.log('\n\n' + '='.repeat(50))
  console.log('✅ 마이그레이션 완료!')
  console.log('='.repeat(50))
  console.log(`📊 처리 결과:`)
  console.log(`   - 총 처리: ${totalRows.toLocaleString()}개`)
  console.log(`   - 신규 추가: ${totalInserted.toLocaleString()}개`)
  console.log(`   - 스킵: ${totalSkipped.toLocaleString()}개`)
  console.log(`   - 총 시간: ${totalTime}초`)
  console.log(`   - 속도: ${(totalRows / parseFloat(totalTime)).toFixed(0)}개/초`)

  await pool.end()
}

// 배치 INSERT (중복은 무시)
async function insertBatch(batch: LeadData[]): Promise<number> {
  if (batch.length === 0) return 0

  // VALUES 절 생성
  const values: any[] = []
  const placeholders: string[] = []
  
  batch.forEach((row, idx) => {
    const offset = idx * 5
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, 'PENDING')`)
    values.push(row.store_name, row.url, row.prefecture, row.region, row.genre)
  })

  try {
    // INSERT 하되, 중복되면 무시 (DO NOTHING)
    const result = await pool.query(`
      INSERT INTO inquiry_leads (store_name, url, prefecture, region, genre, status)
      VALUES ${placeholders.join(',\n')}
      ON CONFLICT (store_name, COALESCE(url, '')) DO NOTHING
    `, values)
    
    return result.rowCount || 0
  } catch (err: any) {
    // ON CONFLICT 오류 시 개별 처리
    if (err.message.includes('there is no unique')) {
      // UNIQUE 인덱스 없으면 그냥 INSERT
      const result = await pool.query(`
        INSERT INTO inquiry_leads (store_name, url, prefecture, region, genre, status)
        VALUES ${placeholders.join(',\n')}
      `, values)
      return result.rowCount || 0
    }
    console.error('\n❌ 배치 오류:', err.message)
    return 0
  }
}

// CSV 라인 파싱 (쉼표, 따옴표 처리)
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  
  return result
}

main().catch((err) => {
  console.error('❌ 치명적 오류:', err)
  process.exit(1)
})
