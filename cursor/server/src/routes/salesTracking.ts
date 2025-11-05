import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Get all sales tracking records (with search)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const search = req.query.search as string || ''
    
    let query = `
      SELECT 
        id,
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
        user_id,
        created_at,
        updated_at
      FROM sales_tracking
    `
    
    const params: any[] = []
    
    if (search) {
      query += ` WHERE 
        manager_name ILIKE $1 OR 
        account_id ILIKE $1 OR 
        customer_name ILIKE $1 OR
        industry ILIKE $1
      `
      params.push(`%${search}%`)
    }
    
    query += ` ORDER BY date DESC, created_at DESC`
    
    const result = await pool.query(query, params)
    
    res.json(result.rows)
  } catch (error: any) {
    console.error('Error fetching sales tracking:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    })
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message,
      detail: error.detail
    })
  }
})

// Get single sales tracking record
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'SELECT * FROM sales_tracking WHERE id = $1',
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching sales tracking record:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Create new sales tracking record
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      date,
      managerName,
      accountId,
      customerName,
      industry,
      contactMethod,
      status,
      contactPerson,
      phone,
      memo,
      memoNote
    } = req.body
    
    if (!date || !managerName || !status) {
      return res.status(400).json({ message: 'Date, manager name, and status are required' })
    }
    
    const result = await pool.query(
      `INSERT INTO sales_tracking (
        date, manager_name, account_id, customer_name, industry,
        contact_method, status, contact_person, phone, memo, memo_note, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        date,
        managerName,
        accountId || null,
        customerName || null,
        industry || null,
        contactMethod || null,
        status,
        contactPerson || null,
        phone || null,
        memo || null,
        memoNote || null,
        req.user?.id
      ]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error creating sales tracking record:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update sales tracking record (only owner can update)
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // Check if record exists and get user_id
    const recordResult = await pool.query(
      'SELECT user_id FROM sales_tracking WHERE id = $1',
      [id]
    )
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' })
    }
    
    // Check if user is the owner (or admin)
    const recordUserId = recordResult.rows[0].user_id
    if (req.user?.role !== 'admin' && req.user?.id !== recordUserId) {
      return res.status(403).json({ message: 'You can only edit your own records' })
    }
    
    const {
      date,
      managerName,
      accountId,
      customerName,
      industry,
      contactMethod,
      status,
      contactPerson,
      phone,
      memo,
      memoNote
    } = req.body
    
    await pool.query(
      `UPDATE sales_tracking SET
        date = $1,
        manager_name = $2,
        account_id = $3,
        customer_name = $4,
        industry = $5,
        contact_method = $6,
        status = $7,
        contact_person = $8,
        phone = $9,
        memo = $10,
        memo_note = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12`,
      [
        date,
        managerName,
        accountId || null,
        customerName || null,
        industry || null,
        contactMethod || null,
        status,
        contactPerson || null,
        phone || null,
        memo || null,
        memoNote || null,
        id
      ]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating sales tracking record:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete sales tracking record (only owner can delete)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // Check if record exists and get user_id
    const recordResult = await pool.query(
      'SELECT user_id FROM sales_tracking WHERE id = $1',
      [id]
    )
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' })
    }
    
    // Check if user is the owner (or admin)
    const recordUserId = recordResult.rows[0].user_id
    if (req.user?.role !== 'admin' && req.user?.id !== recordUserId) {
      return res.status(403).json({ message: 'You can only delete your own records' })
    }
    
    await pool.query('DELETE FROM sales_tracking WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting sales tracking record:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Move sales tracking record to retargeting (only owner can move)
router.post('/:id/move-to-retargeting', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // Get sales tracking record
    const recordResult = await pool.query('SELECT * FROM sales_tracking WHERE id = $1', [id])
    
    if (recordResult.rows.length === 0) {
      return res.status(404).json({ message: 'Sales tracking record not found' })
    }
    
    const record = recordResult.rows[0]
    
    // Check if user is the owner of this record (or admin)
    if (req.user?.role !== 'admin' && record.user_id !== req.user?.id) {
      return res.status(403).json({ message: 'You can only move your own records' })
    }
    
    // Create retargeting customer from sales tracking record
    const retargetingResult = await pool.query(
      `INSERT INTO retargeting_customers (
        company_name, industry, customer_name, phone, region, inflow_path,
        manager, manager_team, status, registered_at, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        record.customer_name || record.account_id || null, // company_name
        record.industry || null,
        record.customer_name || null,
        record.phone || null,
        null, // region
        null, // inflow_path
        record.manager_name,
        null, // manager_team
        '시작', // status
        record.date || new Date().toISOString().split('T')[0], // registered_at
        record.memo || null
      ]
    )
    
    const retargetingCustomer = retargetingResult.rows[0]
    
    // Sales tracking record remains unchanged (not deleted)
    
    res.json({ 
      success: true, 
      retargetingId: retargetingCustomer.id,
      message: 'Successfully moved to retargeting'
    })
  } catch (error: any) {
    console.error('Error moving to retargeting:', error)
    res.status(500).json({ message: 'Internal server error', error: error.message })
  }
})

// Get monthly statistics per manager
router.get('/stats/monthly', authMiddleware, async (req: AuthRequest, res: Response) => {
  // 강제로 stdout에 즉시 출력 (Railway 로그 확인용)
  process.stdout.write('\n=== 월별 통계 API 호출됨 ===\n')
  console.error('\n=== 월별 통계 API 호출됨 (stderr) ===\n')
  
  try {
    const { month, year } = req.query
    
    process.stdout.write(`요청 파라미터: year=${year}, month=${month}\n`)
    console.error(`요청 파라미터: year=${year}, month=${month}`)
    
    if (!month || !year) {
      process.stdout.write('❌ Month and year are required\n')
      return res.status(400).json({ message: 'Month and year are required' })
    }
    
    const yearNum = parseInt(String(year), 10)
    const monthNum = parseInt(String(month), 10)
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      process.stdout.write(`❌ Invalid year or month: ${yearNum}, ${monthNum}\n`)
      return res.status(400).json({ message: 'Invalid year or month' })
    }
    
    // 월별 통계 집계
    // CSV 집계 로직:
    // - 電話数: contact_method = '電話'인 건수
    // - 送付数: contact_method IN ('DM', 'LINE', 'メール', 'フォーム')인 건수
    // - 合計数: 電話数 + 送付数
    // - 返信数: status = '返信済み'인 건수
    // - 返信率: (返信数 / 合計数) * 100
    // - リタ獲得数: 合計수 (동일)
    // - 商談中: status = '商談中'인 건수
    // - 契約: status = '契約'인 건수
    // - NG: status = 'NG'인 건수
    
    process.stdout.write('\n=== 월별 통계 조회 시작 ===\n')
    console.log('=== 월별 통계 조회 시작 ===')
    console.log(`조회 년도: ${yearNum}, 월: ${monthNum}`)
    process.stdout.write(`조회 년도: ${yearNum}, 월: ${monthNum}\n`)
    
    // 디버깅: 선택한 월의 status 값 확인 (2025년 11월 기준)
    const debugResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
      GROUP BY status
      ORDER BY status
    `, [yearNum, monthNum])
    console.log(`📊 ${yearNum}년 ${monthNum}월의 status 값 목록:`)
    if (debugResult.rows.length === 0) {
      console.log('  ⚠️ 해당 월에 데이터가 없습니다.')
    } else {
      debugResult.rows.forEach(row => {
        const isReply = row.status && row.status.includes('返信') && row.status !== '未返信'
        console.log(`  - "${row.status}": ${row.count}건 ${isReply ? '✅ (회신)' : ''}`)
      })
    }
    
    // 전체 레코드 수 확인
    const totalRecordsResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
    `, [yearNum, monthNum])
    console.log(`📈 전체 레코드 수: ${totalRecordsResult.rows[0].total}`)
    
    // 회신수 집계를 위한 테스트 쿼리 - 모든 "返信" 포함 상태 확인
    const replyTestResult = await pool.query(`
      SELECT 
        manager_name,
        status,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND (status LIKE '%返信%' OR status = '返信あり' OR status = '返信済み')
        AND status != '未返信'
      GROUP BY manager_name, status
      ORDER BY manager_name, status
    `, [yearNum, monthNum])
    
    console.log('🔍 "返信"이 포함된 레코드 상세 (未返信 제외):')
    if (replyTestResult.rows.length === 0) {
      console.log('  ⚠️ 해당 월에 "返信"이 포함된 레코드가 없습니다.')
    } else {
      replyTestResult.rows.forEach(row => {
        console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건`)
      })
    }
    
    // 실제 데이터베이스의 status 값 바이트 확인 (디버깅용)
    const byteCheckResult = await pool.query(`
      SELECT DISTINCT 
        status,
        encode(status::bytea, 'hex') as status_bytes,
        length(status) as status_length,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND status LIKE '%返%' OR status LIKE '%信%'
      GROUP BY status
      ORDER BY status
    `, [yearNum, monthNum])
    
    console.log('🔤 Status 값의 바이트 확인 (返 또는 信 포함):')
    byteCheckResult.rows.forEach(row => {
      console.log(`  "${row.status}" (길이: ${row.status_length}, 바이트: ${row.status_bytes}): ${row.count}건`)
    })
    
    // 집계 쿼리: 가장 단순한 방법으로 회신수 집계
    // 먼저 실제로 회신 레코드가 있는지 확인
    const replyCheckQuery = await pool.query(`
      SELECT 
        manager_name,
        status,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND status != '未返信'
        AND (status LIKE '%返%' OR status LIKE '%信%')
      GROUP BY manager_name, status
      ORDER BY manager_name, status
    `, [yearNum, monthNum])
    
    console.log('🔍 회신 가능한 모든 레코드 (未返信 제외, 返 또는 信 포함):')
    replyCheckQuery.rows.forEach(row => {
      console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건`)
    })
    
    // 실제로 石黒杏奈의 11월 返信あり 레코드 확인
    const ishiguroReplyCheck = await pool.query(`
      SELECT 
        id,
        date,
        status,
        customer_name,
        account_id,
        encode(status::bytea, 'hex') as status_bytes
      FROM sales_tracking
      WHERE 
        manager_name = '石黒杏奈'
        AND EXTRACT(YEAR FROM date) = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND status LIKE '%返信%'
      ORDER BY date
      LIMIT 20
    `, [yearNum, monthNum])
    
    process.stdout.write(`\n🔍 石黒杏奈의 11월 返信 레코드 (${ishiguroReplyCheck.rows.length}건):\n`)
    console.error(`\n🔍 石黒杏奈의 11월 返信 레코드 (${ishiguroReplyCheck.rows.length}건):`)
    ishiguroReplyCheck.rows.forEach((record, idx) => {
      process.stdout.write(`  ${idx + 1}. ID: ${record.id}, Date: ${record.date}, Status: "${record.status}", Customer: ${record.customer_name || record.account_id || 'N/A'}, Bytes: ${record.status_bytes}\n`)
      console.error(`  ${idx + 1}. ID: ${record.id}, Date: ${record.date}, Status: "${record.status}", Customer: ${record.customer_name || record.account_id || 'N/A'}, Bytes: ${record.status_bytes}`)
    })
    
    // 返信あり 정확히 일치하는 레코드 확인
    const exactMatchCheck = await pool.query(`
      SELECT COUNT(*) as count
      FROM sales_tracking
      WHERE 
        manager_name = '石黒杏奈'
        AND EXTRACT(YEAR FROM date) = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND status = '返信あり'
    `, [yearNum, monthNum])
    
    process.stdout.write(`\n✅ 石黒杏奈의 11월 status = '返信あり' 정확 일치: ${exactMatchCheck.rows[0].count}건\n`)
    console.error(`\n✅ 石黒杏奈의 11월 status = '返信あり' 정확 일치: ${exactMatchCheck.rows[0].count}건`)
    
    const result = await pool.query(`
      SELECT 
        st.manager_name,
        COUNT(*) FILTER (WHERE st.contact_method = '電話') as phone_count,
        COUNT(*) FILTER (WHERE st.contact_method IN ('DM', 'LINE', 'メール', 'フォーム')) as send_count,
        COUNT(*) as total_count,
        -- 회신수: 返信あり를 찾기 위한 다양한 조건
        COUNT(*) FILTER (WHERE st.status = '返信あり') as reply_count_exact,
        COUNT(*) FILTER (WHERE st.status LIKE '%返信あり%') as reply_count_like_ari,
        COUNT(*) FILTER (WHERE st.status LIKE '%返信%') as reply_count_like_all,
        COUNT(*) FILTER (WHERE st.status != '未返信') as reply_count_not_no_reply,
        -- 최종 회신수: 返信あり를 찾기 (정확 일치 또는 포함)
        COUNT(*) FILTER (WHERE st.status = '返信あり' OR st.status LIKE '%返信あり%') as reply_count,
        COUNT(*) FILTER (WHERE st.status = '商談中') as negotiation_count,
        COUNT(*) FILTER (WHERE st.status = '契約') as contract_count
      FROM sales_tracking st
      JOIN users u ON u.name = st.manager_name
      WHERE 
        EXTRACT(YEAR FROM st.date) = $1 AND
        EXTRACT(MONTH FROM st.date) = $2 AND
        u.role = 'marketer'
      GROUP BY st.manager_name
      ORDER BY st.manager_name
    `, [yearNum, monthNum])
    
    // 추가 디버깅: 각 담당자별로 status 분포 확인 (마케터만)
    console.log('📊 담당자별 status 분포 (마케터만):')
    const statusDistribution = await pool.query(`
      SELECT 
        st.manager_name,
        st.status,
        COUNT(*) as count
      FROM sales_tracking st
      JOIN users u ON u.name = st.manager_name
      WHERE 
        EXTRACT(YEAR FROM st.date) = $1 AND
        EXTRACT(MONTH FROM st.date) = $2 AND
        u.role = 'marketer'
      GROUP BY st.manager_name, st.status
      ORDER BY st.manager_name, st.status
    `, [yearNum, monthNum])
    
    statusDistribution.rows.forEach(row => {
      const isReply = row.status && row.status.includes('返信') && row.status !== '未返信'
      console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건 ${isReply ? '✅ (회신)' : ''}`)
    })
    
    console.log('📋 집계 결과 (상세):')
    result.rows.forEach(row => {
      process.stdout.write(`  ${row.manager_name}:\n`)
      process.stdout.write(`    - 총: ${row.total_count}건\n`)
      process.stdout.write(`    - reply_count (최종): ${row.reply_count}건\n`)
      process.stdout.write(`    - reply_count_exact (status = '返信あり'): ${row.reply_count_exact}건\n`)
      process.stdout.write(`    - reply_count_like_ari ('%返信あり%'): ${row.reply_count_like_ari}건\n`)
      process.stdout.write(`    - reply_count_like_all ('%返信%'): ${row.reply_count_like_all}건\n`)
      console.error(`  ${row.manager_name}:`)
      console.error(`    - 총: ${row.total_count}건`)
      console.error(`    - reply_count (최종): ${row.reply_count}건`)
      console.error(`    - reply_count_exact (status = '返信あり'): ${row.reply_count_exact}건`)
      console.error(`    - reply_count_like_ari ('%返信あり%'): ${row.reply_count_like_ari}건`)
      console.error(`    - reply_count_like_all ('%返信%'): ${row.reply_count_like_all}건`)
    })
    
    // 추가: 각 담당자별로 실제 회신 레코드 확인 (LIKE 검색으로 한자 차이 문제 해결)
    console.log('🔍 실제 회신 레코드 확인 (담당자별):')
    for (const row of result.rows) {
      const replyRecords = await pool.query(`
        SELECT id, date, status, customer_name, encode(status::bytea, 'hex') as status_bytes
        FROM sales_tracking
        WHERE 
          manager_name = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
          AND status LIKE '%返%'
          AND status LIKE '%信%'
          AND status NOT LIKE '%未返信%'
        LIMIT 5
      `, [row.manager_name, yearNum, monthNum])
      
      if (replyRecords.rows.length > 0) {
        console.log(`  ${row.manager_name}: ${replyRecords.rows.length}건의 회신 레코드 발견`)
        replyRecords.rows.forEach(record => {
          console.log(`    - ID: ${record.id}, Status: "${record.status}" (바이트: ${record.status_bytes}), Customer: ${record.customer_name || 'N/A'}`)
        })
      } else {
        console.log(`  ${row.manager_name}: 회신 레코드 없음 (집계된 회신수: ${row.reply_count})`)
      }
    }
    
    console.log('=== 월별 통계 조회 완료 ===')
    
    // 계산 필드 추가
    const stats = result.rows.map(row => {
      const total = parseInt(row.total_count) || 0
      // reply_count 사용 (status = '返信あり' OR status LIKE '%返信あり%')
      let reply = parseInt(row.reply_count) || 0
      
      // 디버깅: 각 담당자별 집계 값 로그
      process.stdout.write(`  [${row.manager_name}] exact: ${row.reply_count_exact}, like_ari: ${row.reply_count_like_ari}, like_all: ${row.reply_count_like_all}, 최종: ${reply}\n`)
      console.error(`  [${row.manager_name}] exact: ${row.reply_count_exact}, like_ari: ${row.reply_count_like_ari}, like_all: ${row.reply_count_like_all}, 최종: ${reply}`)
      
      const replyRate = total > 0 ? ((reply / total) * 100).toFixed(1) : '0.0'
      
      return {
        manager: row.manager_name,
        phoneCount: parseInt(row.phone_count) || 0,
        sendCount: parseInt(row.send_count) || 0,
        totalCount: total,
        replyCount: reply,
        replyRate: `${replyRate}%`,
        retargetingCount: total, // リタ獲得数 = 合計数
        negotiationCount: parseInt(row.negotiation_count) || 0,
        contractCount: parseInt(row.contract_count) || 0
      }
    })
    
    // 디버깅 정보를 응답에 포함 (항상 포함하여 문제 진단)
    const debugInfo = {
      statusValues: debugResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
      replyTestResults: replyTestResult.rows.map(r => ({ manager: r.manager_name, status: r.status, count: parseInt(r.count) })),
      statusDistribution: statusDistribution.rows.map(r => ({ 
        manager: r.manager_name, 
        status: r.status, 
        count: parseInt(r.count),
        isReply: r.status && r.status.includes('返信') && r.status !== '未返信'
      })),
      totalRecords: parseInt(totalRecordsResult.rows[0].total),
      ishiguroReplyCount: ishiguroReplyCheck.rows.length,
      ishiguroExactMatch: parseInt(exactMatchCheck.rows[0].count),
      ishiguroReplyRecords: ishiguroReplyCheck.rows.map(r => ({
        id: r.id,
        date: r.date,
        status: r.status,
        statusBytes: r.status_bytes,
        customer: r.customer_name || r.account_id || 'N/A'
      }))
    }
    
    process.stdout.write(`\n📤 응답 전송: stats=${stats.length}개, debug 정보 포함\n`)
    console.error(`\n📤 응답 전송: stats=${stats.length}개, debug 정보 포함`)
    
    // 응답 구조: stats 배열과 debug 정보를 함께 반환
    const responseData = {
      stats,
      debug: debugInfo
    }
    
    res.json(responseData)
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
