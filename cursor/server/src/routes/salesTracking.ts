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

// Get monthly statistics per manager
router.get('/stats/monthly', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query
    
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' })
    }
    
    const yearNum = parseInt(String(year), 10)
    const monthNum = parseInt(String(month), 10)
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
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
    
    console.log('=== 월별 통계 조회 시작 ===')
    console.log(`조회 년도: ${yearNum}, 월: ${monthNum}`)
    
    // 디버깅: 실제 데이터의 status 값 확인
    const debugResult = await pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
      GROUP BY status
      ORDER BY status
    `, [yearNum, monthNum])
    console.log('📊 데이터베이스의 status 값 목록:')
    debugResult.rows.forEach(row => {
      console.log(`  - "${row.status}": ${row.count}건`)
    })
    
    // 전체 레코드 수 확인
    const totalRecordsResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
    `, [yearNum, monthNum])
    console.log(`📈 전체 레코드 수: ${totalRecordsResult.rows[0].total}`)
    
    // 회신수 집계를 위한 테스트 쿼리
    const replyTestResult = await pool.query(`
      SELECT 
        manager_name,
        status,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND (status LIKE '%返信%' OR status = '返信済み' OR status = '返信あり')
      GROUP BY manager_name, status
      ORDER BY manager_name, status
    `, [yearNum, monthNum])
    
    console.log('🔍 "返信"이 포함된 레코드 상세:')
    replyTestResult.rows.forEach(row => {
      console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건`)
    })
    
    const result = await pool.query(`
      SELECT 
        manager_name,
        COUNT(*) FILTER (WHERE contact_method = '電話') as phone_count,
        COUNT(*) FILTER (WHERE contact_method IN ('DM', 'LINE', 'メール', 'フォーム')) as send_count,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE TRIM(status) LIKE '%返信%' AND TRIM(status) != '未返信') as reply_count,
        COUNT(*) FILTER (WHERE status = '商談中') as negotiation_count,
        COUNT(*) FILTER (WHERE status = '契約') as contract_count,
        COUNT(*) FILTER (WHERE status = 'NG') as ng_count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
      GROUP BY manager_name
      ORDER BY manager_name
    `, [yearNum, monthNum])
    
    console.log('📋 집계 결과:')
    result.rows.forEach(row => {
      console.log(`  ${row.manager_name}: 총 ${row.total_count}건, 회신 ${row.reply_count}건`)
    })
    console.log('=== 월별 통계 조회 완료 ===')
    
    // reply_count는 이미 status = '返信済み'인 건수를 카운트하고 있음
    // 회신율 계산: (reply_count / total_count) * 100
    
    // 계산 필드 추가
    const stats = result.rows.map(row => {
      const total = parseInt(row.total_count) || 0
      const reply = parseInt(row.reply_count) || 0
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
        contractCount: parseInt(row.contract_count) || 0,
        ngCount: parseInt(row.ng_count) || 0
      }
    })
    
    // 디버깅 정보를 응답에 포함 (개발 환경에서만)
    const debugInfo = {
      statusValues: debugResult.rows.map(r => ({ status: r.status, count: r.count })),
      replyTestResults: replyTestResult.rows.map(r => ({ manager: r.manager_name, status: r.status, count: r.count })),
      totalRecords: totalRecordsResult.rows[0].total
    }
    
    res.json({
      stats,
      debug: process.env.NODE_ENV !== 'production' ? debugInfo : undefined
    })
  } catch (error) {
    console.error('Error fetching monthly stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
