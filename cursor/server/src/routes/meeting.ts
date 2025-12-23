import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// 목표 조회
router.get('/targets', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { periodType, year, weekOrMonth } = req.query

    const query = `
      SELECT ut.*, u.name as user_name
      FROM user_targets ut
      JOIN users u ON ut.user_id = u.id
      WHERE ut.period_type = $1 AND ut.year = $2 AND ut.week_or_month = $3
      AND u.role = 'marketer'
      ORDER BY u.name
    `
    const result = await pool.query(query, [periodType, year, weekOrMonth])

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching targets:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 목표 생성/수정
router.post('/targets', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      userId, 
      periodType, 
      year, 
      weekOrMonth,
      targetNewSales,
      targetRetargeting,
      targetExisting,
      targetRevenue,
      targetContracts,
      targetNewRevenue,
      targetNewContracts,
      targetRetargetingCustomers,
      actualRetargetingCustomers,
      // 5개 방식별 목표 추가
      targetForm,
      targetDm,
      targetLine,
      targetPhone,
      targetEmail
    } = req.body

    const query = `
      INSERT INTO user_targets (
        user_id, period_type, year, week_or_month,
        target_new_sales, target_retargeting, target_existing,
        target_revenue, target_contracts,
        target_new_revenue, target_new_contracts,
        target_retargeting_customers, actual_retargeting_customers,
        target_form, target_dm, target_line, target_phone, target_email,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, period_type, year, week_or_month)
      DO UPDATE SET
        target_new_sales = $5,
        target_retargeting = $6,
        target_existing = $7,
        target_revenue = $8,
        target_contracts = $9,
        target_new_revenue = $10,
        target_new_contracts = $11,
        target_retargeting_customers = $12,
        actual_retargeting_customers = $13,
        target_form = $14,
        target_dm = $15,
        target_line = $16,
        target_phone = $17,
        target_email = $18,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `
    
    const result = await pool.query(query, [
      userId, periodType, year, weekOrMonth,
      targetNewSales, targetRetargeting, targetExisting,
      targetRevenue, targetContracts,
      targetNewRevenue || 0, targetNewContracts || 0,
      targetRetargetingCustomers || 0, actualRetargetingCustomers || 0,
      targetForm || 0, targetDm || 0, targetLine || 0, targetPhone || 0, targetEmail || 0
    ])

    // 주간 목표 저장 시, 해당 월의 목표를 자동으로 4배로 계산하여 업데이트
    if (periodType === 'weekly') {
      // 해당 주차가 속한 월 계산
      const monthForWeek = Math.ceil(weekOrMonth / 4.33) // 대략적인 월 계산
      const actualMonth = weekOrMonth <= 4 ? 1 :
                          weekOrMonth <= 9 ? 2 :
                          weekOrMonth <= 13 ? 3 :
                          weekOrMonth <= 17 ? 4 :
                          weekOrMonth <= 22 ? 5 :
                          weekOrMonth <= 26 ? 6 :
                          weekOrMonth <= 30 ? 7 :
                          weekOrMonth <= 35 ? 8 :
                          weekOrMonth <= 39 ? 9 :
                          weekOrMonth <= 43 ? 10 :
                          weekOrMonth <= 48 ? 11 : 12

      // 월간 목표를 주간 목표 × 4로 자동 계산
      const monthlyQuery = `
        INSERT INTO user_targets (
          user_id, period_type, year, week_or_month,
          target_new_sales, target_retargeting, target_existing,
          target_revenue, target_contracts,
          target_new_revenue, target_new_contracts,
          target_retargeting_customers, actual_retargeting_customers,
          target_form, target_dm, target_line, target_phone, target_email,
          updated_at
        ) VALUES ($1, 'monthly', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, period_type, year, week_or_month)
        DO UPDATE SET
          target_new_sales = $4,
          target_retargeting = $5,
          target_existing = $6,
          target_retargeting_customers = $11,
          actual_retargeting_customers = $12,
          target_form = $13,
          target_dm = $14,
          target_line = $15,
          target_phone = $16,
          target_email = $17,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `
      
      await pool.query(monthlyQuery, [
        userId, year, actualMonth,
        targetNewSales * 4,
        targetRetargeting * 4,
        targetExisting * 4,
        targetRevenue || 0, // 총매출은 자동 계산하지 않음 (사용자가 직접 입력)
        targetContracts || 0, // 총계약도 자동 계산하지 않음
        targetNewRevenue || 0, // 신규매출도 자동 계산하지 않음
        targetNewContracts || 0, // 신규계약도 자동 계산하지 않음
        (targetRetargetingCustomers || 0) * 4, // 리타겟팅 고객 수도 × 4
        (actualRetargetingCustomers || 0) * 4, // 실적도 × 4
        (targetForm || 0) * 4,
        (targetDm || 0) * 4,
        (targetLine || 0) * 4,
        (targetPhone || 0) * 4,
        (targetEmail || 0) * 4
      ])
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error saving target:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 회의 로그 조회
router.get('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { meetingType, year, weekOrMonth } = req.query

    const query = `
      SELECT ml.*, u.name as user_name
      FROM meeting_logs ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.meeting_type = $1 AND ml.year = $2 AND ml.week_or_month = $3
      AND u.role = 'marketer'
      ORDER BY u.name
    `
    const result = await pool.query(query, [meetingType, year, weekOrMonth])

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching meeting logs:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 회의 로그 저장
router.post('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      userId,
      meetingType,
      year,
      weekOrMonth,
      reflection,
      actionPlan,
      snapshotData
    } = req.body

    const query = `
      INSERT INTO meeting_logs (
        user_id, meeting_type, year, week_or_month,
        reflection, action_plan, snapshot_data, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, meeting_type, year, week_or_month)
      DO UPDATE SET
        reflection = $5,
        action_plan = $6,
        snapshot_data = $7,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `

    const result = await pool.query(query, [
      userId, meetingType, year, weekOrMonth,
      reflection, actionPlan, JSON.stringify(snapshotData)
    ])

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error saving meeting log:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 욕망 단계 고객 조회
router.get('/desire-customers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { manager } = req.query

    let query = `
      SELECT 
        rc.company_name,
        rc.manager,
        rc.last_contact_date,
        rc.status
      FROM retargeting_customers rc
      WHERE rc.status IN ('欲求', '욕망')
      AND rc.status NOT IN ('ゴミ箱', '휴지통', '契約完了', '계약완료')
    `

    const params: any[] = []

    if (manager && manager !== 'all') {
      query += ` AND (TRIM(rc.manager) = TRIM($1) OR REPLACE(TRIM(rc.manager), '﨑', '崎') = REPLACE(TRIM($1), '﨑', '崎'))`
      params.push(manager)
    }

    query += ` ORDER BY rc.last_contact_date DESC NULLS LAST`

    const result = await pool.query(query, params)

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching desire customers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router

