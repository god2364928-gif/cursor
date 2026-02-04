import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// 본인의 시험 답변 조회
router.get('/my-answers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const examRound = parseInt(req.query.round as string) || 1

    const result = await pool.query(
      'SELECT id, answers, exam_round, is_submitted, submitted_at, created_at, updated_at FROM exam_answers WHERE user_id = $1 AND exam_round = $2',
      [userId, examRound]
    )

    if (result.rows.length === 0) {
      return res.json({ answers: null, isSubmitted: false, examRound })
    }

    const examData = result.rows[0]
    res.json({
      answers: examData.answers,
      examRound: examData.exam_round,
      isSubmitted: examData.is_submitted,
      submittedAt: examData.submitted_at,
      createdAt: examData.created_at,
      updatedAt: examData.updated_at
    })
  } catch (error) {
    console.error('Error fetching exam answers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 본인의 시험 답변 저장 (미제출 상태로 임시 저장)
router.post('/save-answers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { answers, examRound } = req.body
    const round = examRound || 1

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Invalid answers format' })
    }

    // 이미 제출된 답변이 있는지 확인
    const existingResult = await pool.query(
      'SELECT is_submitted FROM exam_answers WHERE user_id = $1 AND exam_round = $2',
      [userId, round]
    )

    if (existingResult.rows.length > 0 && existingResult.rows[0].is_submitted) {
      return res.status(400).json({ message: 'Already submitted. Cannot modify answers.' })
    }

    // UPSERT: 임시 저장 (is_submitted = false)
    const result = await pool.query(
      `INSERT INTO exam_answers (user_id, answers, exam_round, is_submitted)
       VALUES ($1, $2, $3, false)
       ON CONFLICT (user_id, exam_round)
       DO UPDATE SET answers = $2, updated_at = NOW()
       RETURNING id, answers, exam_round, is_submitted, updated_at`,
      [userId, JSON.stringify(answers), round]
    )

    res.json({
      message: 'Answers saved successfully',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error saving exam answers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 본인의 시험 답변 제출 (최종 제출, 이후 수정 불가)
router.post('/submit-answers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id
    const { answers, examRound } = req.body
    const round = examRound || 1

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Invalid answers format' })
    }

    // 이미 제출된 답변이 있는지 확인
    const existingResult = await pool.query(
      'SELECT is_submitted FROM exam_answers WHERE user_id = $1 AND exam_round = $2',
      [userId, round]
    )

    if (existingResult.rows.length > 0 && existingResult.rows[0].is_submitted) {
      return res.status(400).json({ message: 'Already submitted. Cannot modify answers.' })
    }

    // UPSERT: 최종 제출 (is_submitted = true)
    const result = await pool.query(
      `INSERT INTO exam_answers (user_id, answers, exam_round, is_submitted, submitted_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (user_id, exam_round)
       DO UPDATE SET answers = $2, is_submitted = true, submitted_at = NOW(), updated_at = NOW()
       RETURNING id, answers, exam_round, is_submitted, submitted_at, updated_at`,
      [userId, JSON.stringify(answers), round]
    )

    res.json({
      message: 'Answers submitted successfully',
      data: result.rows[0]
    })
  } catch (error) {
    console.error('Error submitting exam answers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 특정 사용자의 시험 답변 조회 (어드민 전용)
router.get('/user/:userId/answers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 어드민 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { userId } = req.params
    const examRound = parseInt(req.query.round as string) || null

    // 사용자 정보와 함께 답변 조회
    let query: string
    let params: any[]
    
    if (examRound) {
      // 특정 회차만 조회
      query = `SELECT 
        ea.id, 
        ea.answers, 
        ea.exam_round,
        ea.is_submitted, 
        ea.submitted_at, 
        ea.created_at, 
        ea.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM exam_answers ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.user_id = $1 AND ea.exam_round = $2
      ORDER BY ea.exam_round`
      params = [userId, examRound]
    } else {
      // 모든 회차 조회
      query = `SELECT 
        ea.id, 
        ea.answers, 
        ea.exam_round,
        ea.is_submitted, 
        ea.submitted_at, 
        ea.created_at, 
        ea.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM exam_answers ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.user_id = $1
      ORDER BY ea.exam_round`
      params = [userId]
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      // 사용자 정보만 조회
      const userResult = await pool.query(
        'SELECT name, email, role FROM users WHERE id = $1',
        [userId]
      )
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' })
      }

      return res.json({ 
        exams: [],
        user: {
          name: userResult.rows[0].name,
          email: userResult.rows[0].email,
          role: userResult.rows[0].role
        },
        message: 'No exam answers found for this user'
      })
    }

    const exams = result.rows.map(row => ({
      answers: row.answers,
      examRound: row.exam_round,
      isSubmitted: row.is_submitted,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    res.json({
      exams,
      user: {
        name: result.rows[0].user_name,
        email: result.rows[0].user_email,
        role: result.rows[0].user_role
      }
    })
  } catch (error) {
    console.error('Error fetching user exam answers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// 모든 직원의 시험 제출 현황 조회 (어드민 전용)
router.get('/all-submission-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 어드민 권한 확인
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const result = await pool.query(
      `SELECT 
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        ea.exam_round,
        ea.is_submitted,
        ea.submitted_at
      FROM users u
      LEFT JOIN exam_answers ea ON u.id = ea.user_id
      ORDER BY u.name, ea.exam_round`
    )

    // 사용자별로 그룹화
    const userMap = new Map()
    result.rows.forEach(row => {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          userId: row.user_id,
          userName: row.user_name,
          userEmail: row.user_email,
          userRole: row.user_role,
          exams: []
        })
      }
      
      if (row.exam_round) {
        userMap.get(row.user_id).exams.push({
          round: row.exam_round,
          isSubmitted: row.is_submitted,
          submittedAt: row.submitted_at
        })
      }
    })

    res.json(Array.from(userMap.values()))
  } catch (error) {
    console.error('Error fetching submission status:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
