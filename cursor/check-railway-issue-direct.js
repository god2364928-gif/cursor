const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway'
})

async function checkRailwayIssue() {
  try {
    console.log('🔍 Railway 데이터베이스 직접 확인 중...\n')
    
    // 문제 레코드 ID (Railway 로그에서 확인된 ID)
    const recordId = '3c8f16b2-2472-47a7-a0db-f3b513013f84'
    
    // 1. 레코드 조회
    console.log(`1️⃣ 문제 레코드 조회 (ID: ${recordId})...`)
    const recordResult = await pool.query(
      `SELECT id, date, manager_name, company_name, customer_name, account_id, phone, industry, memo, user_id
       FROM sales_tracking 
       WHERE id = $1`,
      [recordId]
    )
    
    if (recordResult.rows.length === 0) {
      console.log('❌ 레코드를 찾을 수 없습니다.')
      process.exit(1)
    }
    
    const record = recordResult.rows[0]
    console.log('📊 원본 레코드:')
    console.log(JSON.stringify(record, null, 2))
    console.log('')
    
    // 2. 테이블 스키마 확인
    console.log('2️⃣ retargeting_customers 테이블 스키마 확인...')
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length, ordinal_position
      FROM information_schema.columns
      WHERE table_name = 'retargeting_customers'
      ORDER BY ordinal_position
    `)
    
    console.log('📋 테이블 스키마 (INSERT 순서대로):')
    const insertOrder = ['company_name', 'industry', 'customer_name', 'phone', 'region', 'inflow_path', 
                        'manager', 'manager_team', 'status', 'registered_at', 'memo', 'sales_tracking_id']
    insertOrder.forEach((colName, idx) => {
      const col = schemaResult.rows.find(r => r.column_name === colName)
      if (col) {
        console.log(`   [$${idx + 1}] ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} - ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`)
      }
    })
    console.log('')
    
    // 3. 실제 코드 로직 시뮬레이션 (배포된 코드와 동일)
    console.log('3️⃣ 실제 코드 로직으로 값 처리...')
    
    const safeTrim = (value) => {
      if (value === null || value === undefined) return ''
      if (typeof value !== 'string') {
        const str = String(value)
        return str === 'null' || str === 'undefined' ? '' : str.trim()
      }
      const trimmed = value.trim()
      return trimmed === 'null' || trimmed === 'undefined' ? '' : trimmed
    }
    
    console.log('   원본 데이터:')
    console.log(`     company_name: ${JSON.stringify(record.company_name)} (${typeof record.company_name})`)
    console.log(`     customer_name: ${JSON.stringify(record.customer_name)} (${typeof record.customer_name})`)
    console.log(`     account_id: ${JSON.stringify(record.account_id)} (${typeof record.account_id})`)
    console.log(`     phone: ${JSON.stringify(record.phone)} (${typeof record.phone})`)
    console.log('')
    
    const companyNameRaw = safeTrim(record.company_name)
    const customerNameRaw = safeTrim(record.customer_name)
    const accountIdRaw = safeTrim(record.account_id)
    
    console.log('   safeTrim 결과:')
    console.log(`     companyNameRaw: "${companyNameRaw}"`)
    console.log(`     customerNameRaw: "${customerNameRaw}"`)
    console.log(`     accountIdRaw: "${accountIdRaw}"`)
    console.log('')
    
    const companyName = (companyNameRaw || customerNameRaw || accountIdRaw || '未設定')
    const customerName = (customerNameRaw || accountIdRaw || '未設定')
    
    console.log('   값 결정:')
    console.log(`     companyName: "${companyName}"`)
    console.log(`     customerName: "${customerName}"`)
    console.log('')
    
    const phoneRaw = safeTrim(record.phone)
    const phone = phoneRaw || '00000000000'
    const phoneFinal = phone.length > 20 ? phone.substring(0, 20) : phone
    const companyNameFinal = companyName.length > 255 ? companyName.substring(0, 255) : companyName
    const customerNameFinal = customerName.length > 100 ? customerName.substring(0, 100) : customerName
    const industry = record.industry || null
    const managerName = safeTrim(record.manager_name)
    
    const finalCompanyName = companyNameFinal.trim() || '未設定'
    const finalCustomerName = customerNameFinal.trim() || '未設定'
    const finalPhone = phoneFinal.trim() || '00000000000'
    
    console.log('   최종 처리:')
    console.log(`     finalCompanyName: "${finalCompanyName}"`)
    console.log(`     finalCustomerName: "${finalCustomerName}"`)
    console.log(`     finalPhone: "${finalPhone}"`)
    console.log(`     managerName: "${managerName}"`)
    console.log('')
    
    // 트랜잭션 내부 로직
    let safeCompanyName = finalCompanyName
    let safeCustomerName = finalCustomerName
    let safePhone = finalPhone
    let safeManagerName = managerName
    
    if (!safeCompanyName || safeCompanyName === null || safeCompanyName === undefined || safeCompanyName === '') {
      safeCompanyName = '未設定'
      console.warn('   ⚠️ WARNING: safeCompanyName was invalid, using default')
    }
    if (!safeCustomerName || safeCustomerName === null || safeCustomerName === undefined || safeCustomerName === '') {
      safeCustomerName = '未設定'
      console.warn('   ⚠️ WARNING: safeCustomerName was invalid, using default')
    }
    if (!safePhone || safePhone === null || safePhone === undefined || safePhone === '') {
      safePhone = '00000000000'
      console.warn('   ⚠️ WARNING: safePhone was invalid, using default')
    }
    if (!safeManagerName || safeManagerName === null || safeManagerName === undefined || safeManagerName === '') {
      safeManagerName = record.manager_name || ''
      console.warn('   ⚠️ WARNING: safeManagerName was invalid, using record.manager_name')
    }
    
    safeCompanyName = String(safeCompanyName).trim() || '未設定'
    safeCustomerName = String(safeCustomerName).trim() || '未設定'
    safePhone = String(safePhone).trim() || '00000000000'
    safeManagerName = String(safeManagerName).trim() || (record.manager_name || '')
    
    console.log('   safe 변수 생성 후:')
    console.log(`     safeCompanyName: "${safeCompanyName}" (${typeof safeCompanyName})`)
    console.log(`     safeCustomerName: "${safeCustomerName}" (${typeof safeCustomerName})`)
    console.log(`     safePhone: "${safePhone}" (${typeof safePhone})`)
    console.log(`     safeManagerName: "${safeManagerName}" (${typeof safeManagerName})`)
    console.log('')
    
    // finalInsert 변수들
    let finalInsertCompanyName = safeCompanyName
    let finalInsertCustomerName = safeCustomerName
    let finalInsertPhone = safePhone
    let finalInsertManagerName = safeManagerName
    
    if (finalInsertCompanyName === null || finalInsertCompanyName === undefined || finalInsertCompanyName === '') {
      finalInsertCompanyName = '未設定'
      console.warn('   ⚠️ WARNING: finalInsertCompanyName was invalid')
    }
    if (finalInsertCustomerName === null || finalInsertCustomerName === undefined || finalInsertCustomerName === '') {
      finalInsertCustomerName = '未設定'
      console.warn('   ⚠️ WARNING: finalInsertCustomerName was invalid')
    }
    if (finalInsertPhone === null || finalInsertPhone === undefined || finalInsertPhone === '') {
      finalInsertPhone = '00000000000'
      console.warn('   ⚠️ WARNING: finalInsertPhone was invalid')
    }
    if (finalInsertManagerName === null || finalInsertManagerName === undefined || finalInsertManagerName === '') {
      finalInsertManagerName = record.manager_name || ''
      console.warn('   ⚠️ WARNING: finalInsertManagerName was invalid')
    }
    
    finalInsertCompanyName = String(finalInsertCompanyName).trim() || '未設定'
    finalInsertCustomerName = String(finalInsertCustomerName).trim() || '未設定'
    finalInsertPhone = String(finalInsertPhone).trim() || '00000000000'
    finalInsertManagerName = String(finalInsertManagerName).trim() || (record.manager_name || '')
    
    console.log('   finalInsert 변수:')
    console.log(`     finalInsertCompanyName: "${finalInsertCompanyName}" (${typeof finalInsertCompanyName}, null: ${finalInsertCompanyName === null}, undefined: ${finalInsertCompanyName === undefined})`)
    console.log(`     finalInsertCustomerName: "${finalInsertCustomerName}" (${typeof finalInsertCustomerName}, null: ${finalInsertCustomerName === null}, undefined: ${finalInsertCustomerName === undefined})`)
    console.log(`     finalInsertPhone: "${finalInsertPhone}" (${typeof finalInsertPhone})`)
    console.log(`     finalInsertManagerName: "${finalInsertManagerName}" (${typeof finalInsertManagerName})`)
    console.log('')
    
    const registeredAtDate = record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    
    const insertValues = [
      finalInsertCompanyName,
      industry,
      finalInsertCustomerName,
      finalInsertPhone,
      null, // region
      null, // inflow_path
      finalInsertManagerName,
      null, // manager_team
      '시작', // status
      registeredAtDate,
      record.memo || null, // memo
      recordId // sales_tracking_id
    ]
    
    console.log('4️⃣ INSERT 값 확인:')
    const paramNames = ['company_name', 'industry', 'customer_name', 'phone', 'region', 'inflow_path', 
                       'manager', 'manager_team', 'status', 'registered_at', 'memo', 'sales_tracking_id']
    insertValues.forEach((v, i) => {
      const valueStr = v === null ? 'null' : JSON.stringify(v)
      const typeStr = typeof v
      const nullCheck = v === null ? ' ❌ NULL!' : ''
      const emptyCheck = (typeof v === 'string' && v === '') ? ' ⚠️ EMPTY!' : ''
      console.log(`   [$${i + 1}] ${paramNames[i]}: ${valueStr} ${typeStr}${nullCheck}${emptyCheck}`)
    })
    console.log('')
    
    // customer_name 체크
    if (insertValues[2] === null || insertValues[2] === undefined || insertValues[2] === '') {
      console.error('❌ CRITICAL: customer_name이 null, undefined, 또는 빈 문자열입니다!')
      console.error(`   finalInsertCustomerName: ${JSON.stringify(finalInsertCustomerName)}`)
      console.error(`   insertValues[2]: ${JSON.stringify(insertValues[2])}`)
      process.exit(1)
    }
    
    // 5. 실제 INSERT 테스트
    console.log('5️⃣ 실제 INSERT 테스트...')
    
    // 기존 레코드 삭제 (있다면)
    await pool.query('DELETE FROM retargeting_customers WHERE sales_tracking_id = $1', [recordId])
    
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      const result = await client.query(
        `INSERT INTO retargeting_customers (
          company_name, industry, customer_name, phone, region, inflow_path,
          manager, manager_team, status, registered_at, memo, sales_tracking_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, company_name, customer_name, phone, manager, status`,
        insertValues
      )
      
      await client.query('COMMIT')
      console.log('✅ INSERT 성공!')
      console.log('   생성된 레코드:')
      console.log(JSON.stringify(result.rows[0], null, 2))
      console.log('')
      
      // 테스트 데이터 삭제
      await client.query('DELETE FROM retargeting_customers WHERE id = $1', [result.rows[0].id])
      console.log('✅ 테스트 데이터 삭제 완료')
      
    } catch (insertError) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('❌ INSERT 실패!')
      console.error(`   메시지: ${insertError.message}`)
      console.error(`   코드: ${insertError.code}`)
      console.error(`   상세: ${insertError.detail}`)
      console.error(`   제약조건: ${insertError.constraint}`)
      console.error('')
      console.error('   🔍 전달된 값 재확인:')
      insertValues.forEach((v, i) => {
        console.error(`     [$${i + 1}] ${paramNames[i]}: ${v === null ? 'null' : JSON.stringify(v)} (${typeof v})`)
      })
      throw insertError
    } finally {
      client.release()
    }
    
    console.log('\n✅ 모든 테스트 통과! 로컬 코드 로직은 정상입니다.')
    console.log('💡 문제는 배포된 코드가 최신이 아니거나, 빌드 과정에서 문제가 있을 수 있습니다.')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 오류:', error)
    console.error('메시지:', error.message)
    console.error('스택:', error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

checkRailwayIssue()

