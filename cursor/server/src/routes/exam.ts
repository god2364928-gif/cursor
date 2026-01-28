import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// 본인의 시험 답변 조회
router.get('/my-answers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id

    const result = await pool.query(
      'SELECT id, answers, is_submitted, submitted_at, created_at, updated_at FROM exam_answers WHERE user_id = $1',
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({ answers: null, isSubmitted: false })
    }

    const examData = result.rows[0]
    res.json({
      answers: examData.answers,
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
    const { answers } = req.body

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Invalid answers format' })
    }

    // 이미 제출된 답변이 있는지 확인
    const existingResult = await pool.query(
      'SELECT is_submitted FROM exam_answers WHERE user_id = $1',
      [userId]
    )

    if (existingResult.rows.length > 0 && existingResult.rows[0].is_submitted) {
      return res.status(400).json({ message: 'Already submitted. Cannot modify answers.' })
    }

    // UPSERT: 임시 저장 (is_submitted = false)
    const result = await pool.query(
      `INSERT INTO exam_answers (user_id, answers, is_submitted)
       VALUES ($1, $2, false)
       ON CONFLICT (user_id)
       DO UPDATE SET answers = $2, updated_at = NOW()
       RETURNING id, answers, is_submitted, updated_at`,
      [userId, JSON.stringify(answers)]
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
    const { answers } = req.body

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'Invalid answers format' })
    }

    // 이미 제출된 답변이 있는지 확인
    const existingResult = await pool.query(
      'SELECT is_submitted FROM exam_answers WHERE user_id = $1',
      [userId]
    )

    if (existingResult.rows.length > 0 && existingResult.rows[0].is_submitted) {
      return res.status(400).json({ message: 'Already submitted. Cannot modify answers.' })
    }

    // UPSERT: 최종 제출 (is_submitted = true)
    const result = await pool.query(
      `INSERT INTO exam_answers (user_id, answers, is_submitted, submitted_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET answers = $2, is_submitted = true, submitted_at = NOW(), updated_at = NOW()
       RETURNING id, answers, is_submitted, submitted_at, updated_at`,
      [userId, JSON.stringify(answers)]
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

    // 사용자 정보와 함께 답변 조회
    const result = await pool.query(
      `SELECT 
        ea.id, 
        ea.answers, 
        ea.is_submitted, 
        ea.submitted_at, 
        ea.created_at, 
        ea.updated_at,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM exam_answers ea
      JOIN users u ON ea.user_id = u.id
      WHERE ea.user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      return res.json({ 
        answers: null, 
        isSubmitted: false,
        message: 'No exam answers found for this user'
      })
    }

    const examData = result.rows[0]
    res.json({
      answers: examData.answers,
      isSubmitted: examData.is_submitted,
      submittedAt: examData.submitted_at,
      createdAt: examData.created_at,
      updatedAt: examData.updated_at,
      user: {
        name: examData.user_name,
        email: examData.user_email,
        role: examData.user_role
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
        ea.is_submitted,
        ea.submitted_at
      FROM users u
      LEFT JOIN exam_answers ea ON u.id = ea.user_id
      ORDER BY u.name`
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching submission status:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
