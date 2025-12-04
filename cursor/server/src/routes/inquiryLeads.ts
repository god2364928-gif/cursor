import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import multer from 'multer'
import csv from 'csv-parser'
import { Readable } from 'stream'

const router = Router()

// Multer configuration for CSV upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
})

// Status enum
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC']

/**
 * KPI 통계 조회
 * GET /api/inquiry-leads/stats
 */
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 전체 데이터 수
    const totalResult = await pool.query('SELECT COUNT(*) FROM inquiry_leads')
    const total = parseInt(totalResult.rows[0].count)

    // 미배정 데이터 수
    const unassignedResult = await pool.query(
      "SELECT COUNT(*) FROM inquiry_leads WHERE assignee_id IS NULL AND status = 'PENDING'"
    )
    const unassigned = parseInt(unassignedResult.rows[0].count)

    // 금주 완료 수 (이번 주 월요일부터) - 완료/홈페이지없음/문의하기없음/기타 모두 포함
    const weekStartResult = await pool.query(`
      SELECT COUNT(*) FROM inquiry_leads 
      WHERE status IN ('COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC')
      AND updated_at >= date_trunc('week', CURRENT_TIMESTAMP)
    `)
    const completedThisWeek = parseInt(weekStartResult.rows[0].count)

    // 전체 진행률 (완료 / 배정된 전체)
    const assignedResult = await pool.query(
      "SELECT COUNT(*) FROM inquiry_leads WHERE assignee_id IS NOT NULL"
    )
    const assigned = parseInt(assignedResult.rows[0].count)
    
    const completedResult = await pool.query(
      "SELECT COUNT(*) FROM inquiry_leads WHERE status IN ('COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC')"
    )
    const completed = parseInt(completedResult.rows[0].count)
    
    const progressRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0

    // 담당자별 통계
    const assigneeStatsResult = await pool.query(`
      SELECT 
        u.id,
        u.name,
        COUNT(il.id) as total_assigned,
        COUNT(CASE WHEN il.status IN ('COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC') THEN 1 END) as completed,
        COUNT(CASE WHEN il.assigned_at >= date_trunc('week', CURRENT_TIMESTAMP) THEN 1 END) as assigned_this_week,
        COUNT(CASE WHEN il.status IN ('COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC') 
                   AND il.updated_at >= date_trunc('week', CURRENT_TIMESTAMP) THEN 1 END) as completed_this_week
      FROM users u
      LEFT JOIN inquiry_leads il ON u.id = il.assignee_id
      WHERE u.role != 'admin' OR il.assignee_id IS NOT NULL
      GROUP BY u.id, u.name
      HAVING COUNT(il.id) > 0
      ORDER BY u.name
    `)

    res.json({
      total,
      unassigned,
      completedThisWeek,
      progressRate,
      assigneeStats: assigneeStatsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        totalAssigned: parseInt(row.total_assigned),
        completed: parseInt(row.completed),
        assignedThisWeek: parseInt(row.assigned_this_week),
        completedThisWeek: parseInt(row.completed_this_week),
        weeklyProgress: row.assigned_this_week > 0 
          ? Math.round((parseInt(row.completed_this_week) / parseInt(row.assigned_this_week)) * 100)
          : 0
      }))
    })
  } catch (error) {
    console.error('Error fetching inquiry leads stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 목록 조회 (필터/페이지네이션)
 * GET /api/inquiry-leads
 */
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      page = '1', 
      limit = '50',
      assigneeId,
      status,
      prefecture,
      search
    } = req.query

    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    let whereConditions: string[] = []
    let params: any[] = []
    let paramIndex = 1

    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        whereConditions.push('il.assignee_id IS NULL')
      } else {
        whereConditions.push(`il.assignee_id = $${paramIndex++}`)
        params.push(assigneeId)
      }
    }

    if (status) {
      whereConditions.push(`il.status = $${paramIndex++}`)
      params.push(status)
    }

    if (prefecture) {
      whereConditions.push(`il.prefecture = $${paramIndex++}`)
      params.push(prefecture)
    }

    if (search) {
      whereConditions.push(`il.store_name ILIKE $${paramIndex++}`)
      params.push(`%${search}%`)
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : ''

    // Count query
    const countQuery = `
      SELECT COUNT(*) FROM inquiry_leads il
      ${whereClause}
    `
    const countResult = await pool.query(countQuery, params)
    const totalCount = parseInt(countResult.rows[0].count)

    // Data query
    const dataQuery = `
      SELECT 
        il.id,
        il.store_name,
        il.url,
        il.prefecture,
        il.region,
        il.genre,
        il.assignee_id,
        u.name as assignee_name,
        il.status,
        il.memo,
        il.sent_date,
        il.assigned_at,
        il.created_at,
        il.updated_at
      FROM inquiry_leads il
      LEFT JOIN users u ON il.assignee_id = u.id
      ${whereClause}
      ORDER BY il.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `
    params.push(limitNum, offset)
    
    const dataResult = await pool.query(dataQuery, params)

    res.json({
      data: dataResult.rows.map(row => ({
        id: row.id,
        storeName: row.store_name,
        url: row.url,
        prefecture: row.prefecture,
        region: row.region,
        genre: row.genre,
        assigneeId: row.assignee_id,
        assigneeName: row.assignee_name,
        status: row.status,
        memo: row.memo,
        sentDate: row.sent_date,
        assignedAt: row.assigned_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    })
  } catch (error) {
    console.error('Error fetching inquiry leads:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * CSV 일괄 등록
 * POST /api/inquiry-leads/import
 */
router.post('/import', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'CSV file is required' })
    }

    const results: any[] = []
    const stream = Readable.from(req.file.buffer.toString())
    
    await new Promise<void>((resolve, reject) => {
      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve())
        .on('error', reject)
    })

    if (results.length === 0) {
      return res.status(400).json({ message: 'CSV file is empty' })
    }

    // Batch insert
    let insertedCount = 0
    let skippedCount = 0

    for (const row of results) {
      try {
        // CSV 컬럼 매핑: 가게명, 홈페이지(문의하기), 도도부현, 지역, 장르
        const storeName = row['가게명'] || row['store_name'] || ''
        const url = row['홈페이지(문의하기)'] || row['url'] || ''
        const prefecture = row['도도부현'] || row['prefecture'] || ''
        const region = row['지역'] || row['region'] || ''
        const genre = row['장르'] || row['genre'] || ''

        if (!storeName) {
          skippedCount++
          continue
        }

        await pool.query(`
          INSERT INTO inquiry_leads (store_name, url, prefecture, region, genre, status)
          VALUES ($1, $2, $3, $4, $5, 'PENDING')
        `, [storeName, url, prefecture, region, genre])

        insertedCount++
      } catch (error) {
        console.error('Error inserting row:', error)
        skippedCount++
      }
    }

    res.json({
      success: true,
      inserted: insertedCount,
      skipped: skippedCount,
      total: results.length
    })
  } catch (error) {
    console.error('Error importing CSV:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 일괄 배정
 * POST /api/inquiry-leads/bulk-assign
 */
router.post('/bulk-assign', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { assigneeId, count = 250 } = req.body

    if (!assigneeId) {
      return res.status(400).json({ message: 'assigneeId is required' })
    }

    // 담당자 존재 확인
    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [assigneeId])
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // 미배정 데이터 중 count개 랜덤으로 가져오기
    const leadsResult = await pool.query(`
      SELECT id FROM inquiry_leads 
      WHERE assignee_id IS NULL AND status = 'PENDING'
      ORDER BY RANDOM()
      LIMIT $1
    `, [count])

    if (leadsResult.rows.length === 0) {
      return res.status(400).json({ message: 'No unassigned leads available' })
    }

    const leadIds = leadsResult.rows.map(row => row.id)

    // 배정 업데이트
    await pool.query(`
      UPDATE inquiry_leads 
      SET 
        assignee_id = $1,
        assigned_at = CURRENT_TIMESTAMP,
        status = 'IN_PROGRESS'
      WHERE id = ANY($2)
    `, [assigneeId, leadIds])

    res.json({
      success: true,
      assignedCount: leadIds.length,
      assigneeName: userResult.rows[0].name
    })
  } catch (error) {
    console.error('Error bulk assigning leads:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 개별 업데이트 (상태/담당자/메모)
 * PUT /api/inquiry-leads/:id
 */
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { status, assigneeId, memo } = req.body

    // 리드 존재 확인
    const leadResult = await pool.query('SELECT id FROM inquiry_leads WHERE id = $1', [id])
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ message: 'Lead not found' })
    }

    // 상태 유효성 검사
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}` })
    }

    // 업데이트 쿼리 구성
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
      
      // 완료 상태(완료/홈페이지없음/문의하기없음/기타)로 변경 시 전송날짜 기록
      const completedStatuses = ['COMPLETED', 'NO_SITE', 'NO_FORM', 'ETC']
      if (completedStatuses.includes(status)) {
        updates.push(`sent_date = CURRENT_DATE`)
      }
    }

    if (assigneeId !== undefined) {
      if (assigneeId === null) {
        updates.push(`assignee_id = NULL, assigned_at = NULL`)
      } else {
        // 담당자가 배정되면 상태도 자동으로 진행중으로 변경
        updates.push(`assignee_id = $${paramIndex++}, assigned_at = COALESCE(assigned_at, CURRENT_TIMESTAMP), status = 'IN_PROGRESS'`)
        params.push(assigneeId)
      }
    }

    if (memo !== undefined) {
      updates.push(`memo = $${paramIndex++}`)
      params.push(memo)
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No fields to update' })
    }

    params.push(id)
    await pool.query(`
      UPDATE inquiry_leads 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `, params)

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating inquiry lead:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 담당자 목록 조회
 * GET /api/inquiry-leads/assignees
 * ?marketersOnly=true 로 마케터만 조회 가능 (일괄 배정용)
 */
router.get('/assignees', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const marketersOnly = req.query.marketersOnly === 'true'
    
    const result = await pool.query(`
      SELECT id, name, team, role 
      FROM users 
      WHERE role != 'admin'
      ${marketersOnly ? "AND role = 'marketer'" : ''}
      ORDER BY name
    `)

    res.json(result.rows.map(row => ({
      id: row.id,
      name: row.name,
      team: row.team
    })))
  } catch (error) {
    console.error('Error fetching assignees:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

/**
 * 도도부현 목록 조회 (필터용)
 * GET /api/inquiry-leads/prefectures
 */
router.get('/prefectures', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT prefecture 
      FROM inquiry_leads 
      WHERE prefecture IS NOT NULL AND prefecture != ''
      ORDER BY prefecture
    `)

    res.json(result.rows.map(row => row.prefecture))
  } catch (error) {
    console.error('Error fetching prefectures:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router

