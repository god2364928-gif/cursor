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

// 월간 회의용: 해당 월에 속하는 주간 리타겟팅 고객 수 합산 조회
router.get('/weekly-sum-for-month', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query
    
    if (!year || !month) {
      return res.status(400).json({ message: 'year and month are required' })
    }

    const yearNum = parseInt(String(year), 10)
    const monthNum = parseInt(String(month), 10)

    // 해당 월에 속하는 주차 계산 (월요일 기준)
    // 해당 월의 첫째 날과 마지막 날
    const monthStart = new Date(yearNum, monthNum - 1, 1)
    const monthEnd = new Date(yearNum, monthNum, 0)

    // 각 주차의 월요일 날짜를 계산해서 해당 월에 속하는지 확인
    const getWeekNumber = (date: Date): number => {
      const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
      const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
      return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
    }

    const getMondayOfWeek = (y: number, week: number): Date => {
      const firstDayOfYear = new Date(y, 0, 1)
      const daysOffset = (week - 1) * 7
      const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
      const dayOfWeek = weekStart.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      weekStart.setDate(weekStart.getDate() + mondayOffset)
      return weekStart
    }

    // 해당 월에 속하는 주차 찾기
    const weeksInMonth: number[] = []
    for (let week = 1; week <= 53; week++) {
      const monday = getMondayOfWeek(yearNum, week)
      // 월요일이 해당 월에 속하면 이 주차를 포함
      if (monday.getMonth() + 1 === monthNum && monday.getFullYear() === yearNum) {
        weeksInMonth.push(week)
      }
    }

    // 연도가 바뀌는 경우도 고려 (예: 1월 1일이 목요일이면 1주차의 월요일은 전년도 12월)
    // 1월의 경우 전년도 마지막 주도 확인
    if (monthNum === 1) {
      for (let week = 52; week <= 53; week++) {
        const monday = getMondayOfWeek(yearNum - 1, week)
        const sunday = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
        // 해당 주의 일요일이 1월에 속하면 포함 가능
        if (sunday.getMonth() === 0 && sunday.getFullYear() === yearNum) {
          // 하지만 월요일 기준이므로 이 주는 전년도에 속함 - 스킵
        }
      }
    }

    if (weeksInMonth.length === 0) {
      return res.json({ weeks: [], data: {} })
    }

    // 해당 주차들의 데이터 조회
    const query = `
      SELECT 
        ut.user_id,
        u.name as user_name,
        ut.week_or_month as week,
        COALESCE(ut.target_retargeting_customers, 0) as target_retargeting_customers,
        COALESCE(ut.actual_retargeting_customers, 0) as actual_retargeting_customers
      FROM user_targets ut
      JOIN users u ON ut.user_id = u.id
      WHERE ut.period_type = 'weekly' 
        AND ut.year = $1 
        AND ut.week_or_month = ANY($2::int[])
        AND u.role = 'marketer'
      ORDER BY u.name, ut.week_or_month
    `
    const result = await pool.query(query, [yearNum, weeksInMonth])

    // 사용자별로 합산
    const userSums: Record<string, {
      userId: string
      userName: string
      totalTarget: number
      totalActual: number
      weeklyData: { week: number, target: number, actual: number }[]
    }> = {}

    for (const row of result.rows) {
      if (!userSums[row.user_id]) {
        userSums[row.user_id] = {
          userId: row.user_id,
          userName: row.user_name,
          totalTarget: 0,
          totalActual: 0,
          weeklyData: []
        }
      }
      userSums[row.user_id].totalTarget += parseInt(row.target_retargeting_customers) || 0
      userSums[row.user_id].totalActual += parseInt(row.actual_retargeting_customers) || 0
      userSums[row.user_id].weeklyData.push({
        week: row.week,
        target: parseInt(row.target_retargeting_customers) || 0,
        actual: parseInt(row.actual_retargeting_customers) || 0
      })
    }

    res.json({
      weeks: weeksInMonth,
      data: userSums
    })
  } catch (error) {
    console.error('Error fetching weekly sum for month:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 영업 이력 히스토리 기반 실적 집계
// sales_tracking_history 테이블에서 해당 기간 내 작성된 로그가 있는 고유 고객(sales_tracking_id) 수 집계
router.get('/sales-tracking-stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { periodType, year, weekOrMonth, userId } = req.query

    if (!periodType || !year || !weekOrMonth) {
      return res.status(400).json({ message: 'periodType, year, and weekOrMonth are required' })
    }

    const yearNum = parseInt(String(year), 10)
    const periodNum = parseInt(String(weekOrMonth), 10)

    // 기간의 시작일과 종료일 계산
    let startDate: Date
    let endDate: Date

    if (periodType === 'weekly') {
      // 주차의 시작일(월요일)과 종료일(일요일) 계산
      const firstDayOfYear = new Date(yearNum, 0, 1)
      const daysOffset = (periodNum - 1) * 7
      const weekStart = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
      const dayOfWeek = weekStart.getDay()
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      weekStart.setDate(weekStart.getDate() + mondayOffset)
      
      startDate = weekStart
      endDate = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // 월의 시작일과 종료일
      startDate = new Date(yearNum, periodNum - 1, 1)
      endDate = new Date(yearNum, periodNum, 0)
      endDate.setHours(23, 59, 59, 999)
    }

    const startDateStr = startDate.toISOString()
    const endDateStr = endDate.toISOString()

    // 담당자별 집계 쿼리
    // sales_tracking_history에서 해당 기간 내에 contact_date가 있는 고유 sales_tracking_id 수
    let query = `
      SELECT 
        u.id as user_id,
        u.name as user_name,
        COUNT(DISTINCT sth.sales_tracking_id) as unique_customers_contacted
      FROM users u
      LEFT JOIN (
        SELECT DISTINCT 
          sth.sales_tracking_id,
          st.user_id
        FROM sales_tracking_history sth
        JOIN sales_tracking st ON sth.sales_tracking_id = st.id
        WHERE sth.contact_date >= $1 AND sth.contact_date <= $2
      ) sth ON u.id = sth.user_id
      WHERE u.role = 'marketer'
    `
    const params: any[] = [startDateStr, endDateStr]

    if (userId) {
      query += ` AND u.id = $3`
      params.push(userId)
    }

    query += ` GROUP BY u.id, u.name ORDER BY u.name`

    const result = await pool.query(query, params)

    // 결과를 Map 형태로 반환
    const stats: Record<string, number> = {}
    for (const row of result.rows) {
      stats[row.user_id] = parseInt(row.unique_customers_contacted) || 0
    }

    res.json({
      periodType,
      year: yearNum,
      weekOrMonth: periodNum,
      startDate: startDateStr.split('T')[0],
      endDate: endDateStr.split('T')[0],
      stats
    })
  } catch (error) {
    console.error('Error fetching sales tracking stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 모든 마케터의 실적 데이터를 한 번에 조회 (벌크 API)
router.get('/all-marketers-performance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' })
    }

    // 1. 모든 마케터의 활동량 및 매출 통계 (한 번의 쿼리로)
    const statsQuery = `
      WITH all_manager_data_raw AS (
        -- 폼 활동
        SELECT u.id as user_id, u.name as manager_name, 'form' as metric_type, COUNT(*) as value
        FROM inquiry_leads il
        LEFT JOIN users u ON il.assignee_id = u.id
        WHERE il.sent_date BETWEEN $1 AND $2 AND il.status = 'COMPLETED' AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
        
        UNION ALL
        
        -- DM 활동
        SELECT u.id as user_id, u.name as manager_name, 'dm' as metric_type, COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2 AND st.contact_method = 'DM' AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
        
        UNION ALL
        
        -- 라인 활동
        SELECT u.id as user_id, u.name as manager_name, 'line' as metric_type, COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2 AND st.contact_method = 'LINE' AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
        
        UNION ALL
        
        -- 전화 활동
        SELECT u.id as user_id, u.name as manager_name, 'phone' as metric_type, COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2 AND st.contact_method = '電話' AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
        
        UNION ALL
        
        -- 메일 활동
        SELECT u.id as user_id, u.name as manager_name, 'mail' as metric_type, COUNT(*) as value
        FROM sales_tracking st
        LEFT JOIN users u ON st.user_id = u.id
        WHERE st.date BETWEEN $1 AND $2 AND st.contact_method = 'メール' AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
        
        UNION ALL
        
        -- 리타겟팅 활동
        SELECT u.id as user_id, u.name as manager_name, 'retargeting_contacts' as metric_type, COUNT(*) as value
        FROM retargeting_history rh
        LEFT JOIN users u ON rh.user_id = u.id
        WHERE rh.created_at BETWEEN $1 AND $2 AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
        
        UNION ALL
        
        -- 기존 고객 관리
        SELECT u.id as user_id, u.name as manager_name, 'existing_contacts' as metric_type, COUNT(*) as value
        FROM customer_history ch
        JOIN customers c ON ch.customer_id = c.id
        LEFT JOIN users u ON ch.user_id = u.id
        WHERE ch.created_at BETWEEN $1 AND $2 
        AND (TRIM(c.status) IN ('契約中', '購入', '계약중') OR c.status ILIKE '%契約中%' OR c.status ILIKE '%購入%' OR c.status ILIKE '%계약%')
        AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
      ),
      manager_sales_data AS (
        SELECT 
          u.id as user_id,
          u.name as manager_name,
          COUNT(CASE WHEN s.sales_type = '신규매출' THEN 1 END) as new_contract_count,
          COALESCE(SUM(CASE WHEN s.sales_type = '신규매출' THEN s.amount ELSE 0 END), 0) as new_sales,
          COUNT(CASE WHEN s.sales_type = '연장매출' THEN 1 END) as renewal_count,
          COALESCE(SUM(CASE WHEN s.sales_type = '연장매출' THEN s.amount ELSE 0 END), 0) as renewal_sales,
          COUNT(CASE WHEN s.sales_type = '해지매출' THEN 1 END) as termination_count,
          COALESCE(SUM(s.amount), 0) as total_sales
        FROM sales s
        LEFT JOIN users u ON s.user_id = u.id
        WHERE s.contract_date BETWEEN $1 AND $2 AND u.name IS NOT NULL AND u.role = 'marketer'
        GROUP BY u.id, u.name
      ),
      all_marketers AS (
        SELECT id as user_id, name as manager_name FROM users WHERE role = 'marketer'
      )
      SELECT 
        am.user_id,
        am.manager_name,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'form' THEN amd.value END), 0) as form_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'dm' THEN amd.value END), 0) as dm_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'line' THEN amd.value END), 0) as line_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'phone' THEN amd.value END), 0) as phone_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'mail' THEN amd.value END), 0) as mail_count,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'retargeting_contacts' THEN amd.value END), 0) as retargeting_contacts,
        COALESCE(SUM(CASE WHEN amd.metric_type = 'existing_contacts' THEN amd.value END), 0) as existing_contacts,
        COALESCE(msd.new_contract_count, 0) as new_contract_count,
        COALESCE(msd.new_sales, 0) as new_sales,
        COALESCE(msd.renewal_count, 0) as renewal_count,
        COALESCE(msd.renewal_sales, 0) as renewal_sales,
        COALESCE(msd.termination_count, 0) as termination_count,
        COALESCE(msd.total_sales, 0) as total_sales
      FROM all_marketers am
      LEFT JOIN all_manager_data_raw amd ON am.user_id = amd.user_id
      LEFT JOIN manager_sales_data msd ON am.user_id = msd.user_id
      GROUP BY am.user_id, am.manager_name, msd.new_contract_count, msd.new_sales, msd.renewal_count, msd.renewal_sales, msd.termination_count, msd.total_sales
      ORDER BY am.manager_name
    `

    // 2. 모든 마케터의 리타겟팅 알림 조회
    const alertsQuery = `
      SELECT 
        u.id as user_id,
        u.name as manager_name,
        COUNT(CASE WHEN rc.last_contact_date <= CURRENT_DATE - INTERVAL '23 days' 
                    AND rc.last_contact_date > CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as due_this_week,
        COUNT(CASE WHEN rc.last_contact_date <= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as overdue,
        COUNT(CASE WHEN rc.last_contact_date > CURRENT_DATE - INTERVAL '23 days' THEN 1 END) as upcoming
      FROM users u
      LEFT JOIN retargeting_customers rc ON (
        TRIM(rc.manager) = TRIM(u.name) OR REPLACE(TRIM(rc.manager), '﨑', '崎') = REPLACE(TRIM(u.name), '﨑', '崎')
      ) AND rc.status NOT IN ('ゴミ箱', '휴지통', '契約完了', '계약완료') AND rc.last_contact_date IS NOT NULL
      WHERE u.role = 'marketer'
      GROUP BY u.id, u.name
      ORDER BY u.name
    `

    const [statsResult, alertsResult] = await Promise.all([
      pool.query(statsQuery, [startDate, endDate]),
      pool.query(alertsQuery)
    ])

    // 결과를 user_id 기준 Map으로 변환
    const performanceByUser: Record<string, any> = {}

    for (const row of statsResult.rows) {
      const formCount = parseInt(row.form_count || '0')
      const dmCount = parseInt(row.dm_count || '0')
      const lineCount = parseInt(row.line_count || '0')
      const phoneCount = parseInt(row.phone_count || '0')
      const mailCount = parseInt(row.mail_count || '0')

      performanceByUser[row.user_id] = {
        managerName: row.manager_name,
        formCount,
        dmCount,
        lineCount,
        phoneCount,
        mailCount,
        retargetingContacts: parseInt(row.retargeting_contacts || '0'),
        existingContacts: parseInt(row.existing_contacts || '0'),
        newContractCount: parseInt(row.new_contract_count || '0'),
        newSales: parseInt(row.new_sales || '0'),
        renewalCount: parseInt(row.renewal_count || '0'),
        renewalSales: parseInt(row.renewal_sales || '0'),
        terminationCount: parseInt(row.termination_count || '0'),
        totalSales: parseInt(row.total_sales || '0')
      }
    }

    // 알림 데이터 병합
    for (const row of alertsResult.rows) {
      if (performanceByUser[row.user_id]) {
        performanceByUser[row.user_id].retargetingAlert = {
          dueThisWeek: parseInt(row.due_this_week || '0'),
          overdue: parseInt(row.overdue || '0'),
          upcoming: parseInt(row.upcoming || '0')
        }
      } else {
        performanceByUser[row.user_id] = {
          managerName: row.manager_name,
          formCount: 0, dmCount: 0, lineCount: 0, phoneCount: 0, mailCount: 0,
          retargetingContacts: 0, existingContacts: 0,
          newContractCount: 0, newSales: 0, renewalCount: 0, renewalSales: 0, terminationCount: 0, totalSales: 0,
          retargetingAlert: {
            dueThisWeek: parseInt(row.due_this_week || '0'),
            overdue: parseInt(row.overdue || '0'),
            upcoming: parseInt(row.upcoming || '0')
          }
        }
      }
    }

    res.json({
      startDate,
      endDate,
      performanceByUser
    })
  } catch (error) {
    console.error('Error fetching all marketers performance:', error)
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

