import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import multer from 'multer'
import { parseLineChat, formatChatForHistory } from '../utils/lineParser'
import { getJSTTodayString } from '../utils/dateHelper'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // TXT 파일만 허용
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true)
    } else {
      cb(new Error('Only .txt files are allowed'))
    }
  }
})

/**
 * LINE 대화 업로드 엔드포인트
 * POST /api/line-upload
 * 
 * Body:
 * - file: LINE 대화 텍스트 파일
 * - category: 'sales_history' | 'retargeting' | 'customer_mgmt'
 */
router.post('/', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const { category } = req.body

    if (!category || !['sales_history', 'retargeting', 'customer_mgmt'].includes(category)) {
      return res.status(400).json({ message: 'Invalid category. Must be: sales_history, retargeting, or customer_mgmt' })
    }

    // 파일 내용 읽기 (UTF-8 또는 EUC-KR 시도)
    let text: string
    try {
      text = req.file.buffer.toString('utf-8')
    } catch (e) {
      // UTF-8 실패 시 다른 인코딩 시도
      try {
        // iconv-lite 없이 기본 처리
        text = req.file.buffer.toString('latin1')
      } catch (e2) {
        return res.status(400).json({ message: 'Failed to decode file. Please ensure it is a valid text file.' })
      }
    }

    // DEBUG: 업로드된 내용 로그
    console.log('\n====== LINE UPLOAD DEBUG ======')
    console.log('Category:', category)
    console.log('Content length:', text.length)
    console.log('Content preview (first 500 chars):')
    console.log(text.substring(0, 500))
    console.log('===============================\n')

    // LINE 대화 파싱
    const parsed = parseLineChat(text)

    // DEBUG: 파싱 결과 로그
    console.log('====== PARSE RESULT ======')
    console.log('Messages count:', parsed.messages.length)
    console.log('Participants:', parsed.participants)
    console.log('Date range:', parsed.dateRange)
    if (parsed.messages.length > 0) {
      console.log('First 3 messages:', parsed.messages.slice(0, 3))
    }
    console.log('==========================\n')

    if (parsed.messages.length === 0) {
      return res.status(400).json({ message: 'No messages found in the file. Please check the file format.' })
    }

    // 카테고리별 처리
    let result: any

    switch (category) {
      case 'sales_history':
        result = await handleSalesHistory(parsed, req)
        break
      case 'retargeting':
        result = await handleRetargeting(parsed, req)
        break
      case 'customer_mgmt':
        result = await handleCustomerManagement(parsed, req)
        break
    }

    res.json({
      success: true,
      category,
      ...result
    })
  } catch (error: any) {
    console.error('Error uploading LINE chat:', error)
    res.status(500).json({ message: error.message || 'Internal server error' })
  }
})

/**
 * 영업 이력: 새 고객으로 등록
 */
async function handleSalesHistory(parsed: any, req: AuthRequest) {
  const companyName = parsed.extractedCompanyName || '未設定'
  const customerName = parsed.extractedCustomerName || '未設定'
  const phone = parsed.extractedPhone || '00000000000'
  const memo = formatChatForHistory(parsed)

  // sales_tracking 테이블에 삽입
  const result = await pool.query(
    `INSERT INTO sales_tracking (
      company_name, customer_name, phone, manager, manager_team, 
      status, registered_at, memo, inflow_path
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING id, company_name, customer_name`,
    [
      companyName,
      customerName,
      phone,
      req.user?.name || 'Unknown',
      req.user?.team || null,
      '시작',
      getJSTTodayString(),
      memo,
      'LINE 대화'
    ]
  )

  return {
    action: 'created',
    id: result.rows[0].id,
    companyName: result.rows[0].company_name,
    customerName: result.rows[0].customer_name,
    messagesCount: parsed.messages.length
  }
}

/**
 * 리타겟팅: 상호명 매칭 → 히스토리 추가 + 마지막 연락일 업데이트
 */
async function handleRetargeting(parsed: any, req: AuthRequest) {
  const companyName = parsed.extractedCompanyName

  if (!companyName) {
    throw new Error('상호명을 찾을 수 없습니다. LINE 대화에 회사명이 포함되어 있는지 확인해주세요.')
  }

  // 상호명으로 고객 찾기
  const customerResult = await pool.query(
    'SELECT id, company_name, customer_name FROM retargeting_customers WHERE company_name ILIKE $1',
    [`%${companyName}%`]
  )

  if (customerResult.rows.length === 0) {
    throw new Error(`"${companyName}"과(와) 일치하는 리타겟팅 고객을 찾을 수 없습니다.`)
  }

  const customer = customerResult.rows[0]
  const historyContent = formatChatForHistory(parsed)

  // 히스토리 추가
  await pool.query(
    `INSERT INTO retargeting_history (
      retargeting_customer_id, user_id, user_name, type, content
    ) VALUES ($1, $2, $3, $4, $5)`,
    [customer.id, req.user?.id, req.user?.name, 'line_chat', historyContent]
  )

  // 마지막 연락일 업데이트
  const lastDate = parsed.dateRange.end || getJSTTodayString()
  await pool.query(
    'UPDATE retargeting_customers SET last_contact_date = $1 WHERE id = $2',
    [lastDate, customer.id]
  )

  return {
    action: 'updated',
    id: customer.id,
    companyName: customer.company_name,
    customerName: customer.customer_name,
    messagesCount: parsed.messages.length,
    lastContactDate: lastDate
  }
}

/**
 * 고객관리: 상호명 매칭 → 히스토리 추가 + 마지막 연락일 업데이트
 */
async function handleCustomerManagement(parsed: any, req: AuthRequest) {
  const companyName = parsed.extractedCompanyName

  if (!companyName) {
    throw new Error('상호명을 찾을 수 없습니다. LINE 대화에 회사명이 포함되어 있는지 확인해주세요.')
  }

  // 상호명으로 고객 찾기
  const customerResult = await pool.query(
    'SELECT id, company_name, customer_name FROM customers WHERE company_name ILIKE $1',
    [`%${companyName}%`]
  )

  if (customerResult.rows.length === 0) {
    throw new Error(`"${companyName}"과(와) 일치하는 고객을 찾을 수 없습니다.`)
  }

  const customer = customerResult.rows[0]
  const historyContent = formatChatForHistory(parsed)

  // 히스토리 추가
  await pool.query(
    `INSERT INTO customer_history (
      customer_id, user_id, type, content
    ) VALUES ($1, $2, $3, $4)`,
    [customer.id, req.user?.id, 'line_chat', historyContent]
  )

  // 마지막 연락일 업데이트
  const lastDate = parsed.dateRange.end || getJSTTodayString()
  await pool.query(
    'UPDATE customers SET last_contact = $1 WHERE id = $2',
    [lastDate, customer.id]
  )

  return {
    action: 'updated',
    id: customer.id,
    companyName: customer.company_name,
    customerName: customer.customer_name,
    messagesCount: parsed.messages.length,
    lastContactDate: lastDate
  }
}

export default router


