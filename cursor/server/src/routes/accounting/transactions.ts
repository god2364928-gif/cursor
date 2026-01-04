import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'
import multer from 'multer'
import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'
import { validateDateRange } from '../../utils/dateValidator'
import { toJSTDateString } from '../../utils/dateHelper'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/transactions', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, startDate, endDate, limit = 100, offset = 0 } = req.query
    const year = fiscalYear ? Number(fiscalYear) : null

    console.log('GET /transactions query params:', { fiscalYear, startDate, endDate, limit, offset })

    // 날짜 유효성 검증 및 보정
    const { validatedStartDate, validatedEndDate } = validateDateRange(
      startDate as string,
      endDate as string
    )

    let query = `
      SELECT 
        t.id, t.transaction_date, t.transaction_time, t.fiscal_year, t.transaction_type, t.category,
        t.payment_method, t.item_name, t.amount, t.memo, t.attachment_url,
        t.created_at,
        e.name as employee_name,
        c.account_name,
        t.assigned_user_id,
        u.name as assigned_user_name
      FROM accounting_transactions t
      LEFT JOIN accounting_employees e ON t.employee_id = e.id
      LEFT JOIN accounting_capital c ON t.account_id = c.id
      LEFT JOIN users u ON t.assigned_user_id = u.id
    `
    const params: any[] = []
    const conditions: string[] = []
    
    // fiscalYear나 startDate/endDate 중 하나만 사용
    if (validatedStartDate && validatedEndDate) {
      // startDate와 endDate로 필터링 (날짜만 비교, 시간 무시)
      // ::date 형변환으로 시간 부분 제거하여 31일 전체 데이터 포함
      conditions.push(`t.transaction_date::date >= $${params.length + 1}::date`)
      params.push(validatedStartDate)
      conditions.push(`t.transaction_date::date <= $${params.length + 1}::date`)
      params.push(validatedEndDate)
    } else if (year) {
      // fiscalYear로 필터링
      conditions.push(`t.fiscal_year = $${params.length + 1}`)
      params.push(year)
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    
    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(Number(limit), Number(offset))

    console.log('Final SQL query:', query)
    console.log('Query params:', params)

    const result = await pool.query(query, params)
    
    const formatDate = (value: any) => {
      if (!value) return null
      if (value instanceof Date) {
        return value.toISOString().slice(0, 10)
      }
      const str = String(value)
      const tIndex = str.indexOf('T')
      return tIndex >= 0 ? str.slice(0, tIndex) : str
    }

    const formatTime = (value: any) => {
      if (!value) return null
      const str = String(value).trim()
      if (!str) return null
      return str.slice(0, 5)
    }
    const normalizePaymentMethodValue = (value: any) => {
      if (!value) return null
      const str = String(value)
      if (str === '현금' || str === '은행' || str === '현금/은행') return '계좌이체'
      if (str === 'Stripe') return '페이팔'
      return str
    }

    res.json(result.rows.map((r: any) => ({
      id: r.id,
      transactionDate: formatDate(r.transaction_date),
      transactionTime: formatTime(r.transaction_time),
      fiscalYear: r.fiscal_year,
      transactionType: r.transaction_type,
      category: r.category,
      paymentMethod: normalizePaymentMethodValue(r.payment_method),
      itemName: r.item_name,
      amount: Number(r.amount),
      employeeName: r.employee_name,
      accountName: r.account_name,
      assignedUserId: r.assigned_user_id,
      assignedUserName: r.assigned_user_name,
      memo: r.memo,
      attachmentUrl: r.attachment_url,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Transactions fetch error:', error)
    res.status(500).json({ error: '거래내역을 불러오지 못했습니다' })
  }
})

router.post('/transactions', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const {
      transactionDate,
      transactionTime,
      transactionType,
      category,
      paymentMethod,
      itemName,
      amount,
      employeeId,
      accountId,
      assignedUserId,
      memo,
      attachmentUrl,
    } = req.body

    const normalizeTime = (value?: string | null) => {
      if (!value) return null
      const trimmed = String(value).trim()
      if (!trimmed) return null
      return trimmed.length === 5 ? `${trimmed}:00` : trimmed
    }

    const normalizedTime = normalizeTime(transactionTime)
    const normalizedPaymentMethod =
      paymentMethod === '현금' || paymentMethod === '은행' || paymentMethod === '현금/은행'
        ? '계좌이체'
        : paymentMethod === 'Stripe'
        ? '페이팔'
        : paymentMethod

    const result = await pool.query(
      `INSERT INTO accounting_transactions 
       (transaction_date, transaction_time, transaction_type, category, payment_method, item_name, amount, employee_id, account_id, assigned_user_id, memo, attachment_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        transactionDate,
        normalizedTime,
        transactionType,
        category,
        normalizedPaymentMethod,
        itemName,
        amount,
        employeeId || null,
        accountId || null,
        assignedUserId || null,
        memo || null,
        attachmentUrl || null,
      ]
    )

    const transaction = result.rows[0]

    // 자동화: 매출 카테고리면 accounting_sales에 반영
    const salesCategories = ['셀마플', '코코마케']
    if (transactionType === '입금' && salesCategories.includes(category)) {
      const fiscalYear = transaction.fiscal_year
      const dateStr = toJSTDateString(new Date(transactionDate))
      const month = dateStr ? dateStr.slice(0, 7) + '-01' : null
      
      if (month) {
        await pool.query(
          `INSERT INTO accounting_sales (fiscal_year, transaction_month, channel, sales_category, total_amount)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [fiscalYear, month, normalizedPaymentMethod, category, amount]
        )
      }
    }

    // 자동화: 계좌 잔액 갱신
    if (accountId) {
      const balanceChange = transactionType === '입금' ? amount : -amount
      await pool.query(
        `UPDATE accounting_capital
         SET current_balance = current_balance + $1, last_updated = NOW()
         WHERE id = $2`,
        [balanceChange, accountId]
      )
    }

    res.json({ success: true, transaction })
  } catch (error) {
    console.error('Transaction create error:', error)
    res.status(500).json({ error: '거래내역 추가에 실패했습니다' })
  }
})

// Bulk transactions import
router.post('/transactions/bulk', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { transactions } = req.body
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: '유효한 거래 데이터가 없습니다' })
    }
    
    let imported = 0
    let failed = 0
    
    for (const tx of transactions) {
      try {
        const {
          transactionDate,
          transactionType,
          category,
          paymentMethod,
          itemName,
          amount,
          memo,
          assignedUserId
        } = tx
        
        // Normalize payment method
        const normalizedPaymentMethod =
          paymentMethod === '현금' || paymentMethod === '은행' || paymentMethod === '현금/은행'
            ? '계좌이체'
            : paymentMethod === 'Stripe'
            ? '페이팔'
            : paymentMethod
        
        const result = await pool.query(
          `INSERT INTO accounting_transactions 
           (transaction_date, transaction_type, category, payment_method, item_name, amount, memo, assigned_user_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            transactionDate,
            transactionType,
            category || '지정없음',
            normalizedPaymentMethod,
            itemName,
            amount,
            memo || null,
            assignedUserId || null
          ]
        )
        
        const transaction = result.rows[0]
        
        // 자동화: 매출 카테고리면 accounting_sales에 반영
        const salesCategories = ['셀마플', '코코마케']
        if (transactionType === '입금' && salesCategories.includes(category)) {
          const fiscalYear = transaction.fiscal_year
          const dateStr = toJSTDateString(new Date(transactionDate))
          const month = dateStr ? dateStr.slice(0, 7) + '-01' : null
          
          if (month) {
            await pool.query(
              `INSERT INTO accounting_sales (fiscal_year, transaction_month, channel, sales_category, total_amount)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT DO NOTHING`,
              [fiscalYear, month, normalizedPaymentMethod, category, amount]
            )
          }
        }
        
        imported++
      } catch (error) {
        console.error('Transaction import error:', error)
        failed++
      }
    }
    
    res.json({ 
      success: true, 
      imported, 
      failed,
      message: `${imported}건 가져오기 성공${failed > 0 ? `, ${failed}건 실패` : ''}`
    })
  } catch (error) {
    console.error('Bulk transaction import error:', error)
    res.status(500).json({ error: '일괄 가져오기에 실패했습니다' })
  }
})

// Bulk update transactions (일괄 변경)
router.post('/transactions/bulk-update', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionIds, updates } = req.body
    
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: '선택된 거래내역이 없습니다' })
    }
    
    if (!updates || (Object.keys(updates).length === 0)) {
      return res.status(400).json({ error: '변경할 내용이 없습니다' })
    }
    
    const { category, assignedUserId } = updates
    
    let updatedCount = 0
    
    for (const transactionId of transactionIds) {
      try {
        // 기존 데이터 조회
        const existingResult = await pool.query(
          `SELECT * FROM accounting_transactions WHERE id = $1`,
          [transactionId]
        )
        
        if (existingResult.rows.length === 0) continue
        
        const existing = existingResult.rows[0]
        
        // 업데이트할 필드 결정
        const newCategory = category || existing.category
        const newAssignedUserId = assignedUserId !== undefined ? assignedUserId : existing.assigned_user_id
        
        // 업데이트 실행
        await pool.query(
          `UPDATE accounting_transactions 
           SET category = $1, 
               assigned_user_id = $2
           WHERE id = $3`,
          [newCategory, newAssignedUserId, transactionId]
        )
        
        updatedCount++
      } catch (error) {
        console.error(`Failed to update transaction ${transactionId}:`, error)
      }
    }
    
    res.json({ 
      success: true, 
      updated: updatedCount,
      message: `${updatedCount}건 업데이트 완료`
    })
  } catch (error) {
    console.error('Bulk transaction update error:', error)
    res.status(500).json({ error: '일괄 업데이트에 실패했습니다' })
  }
})

// Bulk delete transactions (일괄 삭제)
router.post('/transactions/bulk-delete', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { transactionIds } = req.body
    
    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: '선택된 거래내역이 없습니다' })
    }
    
    let deletedCount = 0
    
    for (const transactionId of transactionIds) {
      try {
        await pool.query(
          `DELETE FROM accounting_transactions WHERE id = $1`,
          [transactionId]
        )
        deletedCount++
      } catch (error) {
        console.error(`Failed to delete transaction ${transactionId}:`, error)
      }
    }
    
    res.json({ 
      success: true, 
      deleted: deletedCount,
      message: `${deletedCount}건 삭제 완료`
    })
  } catch (error) {
    console.error('Bulk transaction delete error:', error)
    res.status(500).json({ error: '일괄 삭제에 실패했습니다' })
  }
})

router.put('/transactions/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const {
      transactionDate,
      transactionTime,
      transactionType,
      category,
      paymentMethod,
      itemName,
      amount,
      memo,
      assignedUserId,
    } = req.body

    const normalizeTime = (value?: string | null) => {
      if (!value) return null
      const trimmed = String(value).trim()
      if (!trimmed) return null
      return trimmed.length === 5 ? `${trimmed}:00` : trimmed
    }

    const normalizedTime = normalizeTime(transactionTime)
    const normalizedPaymentMethod =
      paymentMethod === '현금' || paymentMethod === '은행' || paymentMethod === '현금/은행'
        ? '계좌이체'
        : paymentMethod === 'Stripe'
        ? '페이팔'
        : paymentMethod

    const result = await pool.query(
      `UPDATE accounting_transactions
       SET transaction_date = $1,
           transaction_time = $2,
           transaction_type = $3,
           category = $4,
           payment_method = $5,
           item_name = $6,
           amount = $7,
           memo = $8,
           assigned_user_id = $9,
           updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        transactionDate,
        normalizedTime,
        transactionType,
        category,
        normalizedPaymentMethod,
        itemName,
        amount,
        memo || null,
        assignedUserId || null,
        id,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '거래내역을 찾을 수 없습니다' })
    }

    res.json({ success: true, transaction: result.rows[0] })
  } catch (error) {
    console.error('Transaction update error:', error)
    res.status(500).json({ error: '거래내역 수정에 실패했습니다' })
  }
})

router.delete('/transactions/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // 삭제 전 거래 정보 조회 (잔액 복구용)
    const transactionResult = await pool.query(
      `SELECT transaction_type, amount, account_id FROM accounting_transactions WHERE id = $1`,
      [id]
    )
    
    if (transactionResult.rows.length === 0) {
      return res.status(404).json({ error: '거래내역을 찾을 수 없습니다' })
    }
    
    const { transaction_type, amount, account_id } = transactionResult.rows[0]
    
    // 삭제
    await pool.query(`DELETE FROM accounting_transactions WHERE id = $1`, [id])
    
    // 잔액 복구
    if (account_id) {
      const balanceChange = transaction_type === '입금' ? -amount : amount
      await pool.query(
        `UPDATE accounting_capital
         SET current_balance = current_balance + $1, last_updated = NOW()
         WHERE id = $2`,
        [balanceChange, account_id]
      )
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('Transaction delete error:', error)
    res.status(500).json({ error: '거래내역 삭제에 실패했습니다' })
  }
})

// ========== CSV 업로드 (은행 거래내역) ==========
router.post('/transactions/csv-upload', authMiddleware, adminOnly, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV 파일을 업로드해 주세요' })
    }

    console.log('=== CSV Upload Started ===')
    console.log('File size:', req.file.buffer.length)
    console.log('Timestamp:', new Date().toISOString())

    // 자동 매칭 규칙 로드
    const matchRulesResult = await pool.query(
      `SELECT keyword, category, assigned_user_id, payment_method, priority
       FROM accounting_auto_match_rules
       WHERE is_active = true
       ORDER BY priority DESC, keyword ASC`
    )
    const matchRules = matchRulesResult.rows
    console.log(`Loaded ${matchRules.length} auto-match rules`)

    // 자동 매칭 함수
    const applyAutoMatch = (itemName: string) => {
      const lowerItemName = itemName.toLowerCase()
      for (const rule of matchRules) {
        if (lowerItemName.includes(rule.keyword.toLowerCase())) {
          console.log(`Auto-match: "${itemName}" matched with keyword "${rule.keyword}"`)
          return {
            category: rule.category || undefined,
            assignedUserId: rule.assigned_user_id || undefined,
            paymentMethod: rule.payment_method || undefined
          }
        }
      }
      return {}
    }
    
    // 인코딩 감지: 가장 많은 일본어 문자를 올바르게 디코딩하는 인코딩 선택
    let utf8Content: string = ''
    let bestEncoding = 'UTF-8'
    let maxJapaneseChars = 0
    
    const encodings = ['SHIFT_JIS', 'CP932', 'EUC-JP', 'UTF-8']
    
    for (const encoding of encodings) {
      try {
        const decoded = iconv.decode(req.file.buffer, encoding)
        // 히라가나, 가타카나, 한자 개수 세기
        const japaneseCount = (decoded.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
        console.log(`${encoding}: ${japaneseCount} Japanese characters`)
        
        if (japaneseCount > maxJapaneseChars) {
          maxJapaneseChars = japaneseCount
          utf8Content = decoded
          bestEncoding = encoding
        }
      } catch (e) {
        console.log(`${encoding}: decode failed`)
      }
    }
    
    console.log(`Best encoding: ${bestEncoding} with ${maxJapaneseChars} Japanese characters`)
    
    // 최소 일본어 문자가 없으면 UTF-8로 재시도
    if (maxJapaneseChars === 0) {
      console.log('No Japanese characters detected, using UTF-8')
      utf8Content = iconv.decode(req.file.buffer, 'UTF-8')
    }
    
    // CSV 파싱
    const records = parse(utf8Content, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: false,
      bom: true
    }) as string[][]

    console.log(`Parsed ${records.length} rows`)

    if (!Array.isArray(records) || records.length < 2) {
      return res.status(400).json({ error: 'CSV 파일이 비어 있습니다' })
    }

    // 헤더 제거
    const dataLines = records.slice(1)
    const imported: any[] = []
    const errors: any[] = []

    for (const cols of dataLines) {
      try {
        if (cols.length < 11) continue

        const year = (cols[0] || '').trim()
        const month = (cols[1] || '').trim()
        const day = (cols[2] || '').trim()
        const hour = (cols[3] || '').trim()
        const minute = (cols[4] || '').trim()
        const second = (cols[5] || '').trim()
        const description = (cols[7] || '').trim()
        const sanitizeAmount = (value?: string) =>
          (value || '').replace(/[^\d.-]/g, '').replace(/\r/g, '')
        
        const paymentAmount = sanitizeAmount(cols[8])
        const depositAmount = sanitizeAmount(cols[9])
        const memo = cols[11]?.replace(/\r/g, '') || ''

        // 날짜 및 시간 생성
        const transactionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const transactionTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`
        
        // 입금 vs 출금 판단
        const isDeposit = depositAmount && depositAmount !== '' && Number(depositAmount) > 0
        const isPayment = paymentAmount && paymentAmount !== '' && Number(paymentAmount) > 0
        
        if (!isDeposit && !isPayment) continue

        const transactionType = isDeposit ? '입금' : '출금'
        const amount = isDeposit ? Number(depositAmount) : Number(paymentAmount)

        // 카테고리 자동 추론
        let paymentMethod = '계좌이체'
        if (description.includes('PayPay') || description.includes('ﾍﾟｲﾍﾟｲ') || description.includes('ペイペイ')) {
          paymentMethod = 'PayPay'
        } else if (description.includes('Stripe') || description.includes('ｽﾄﾗｲﾌﾟ') || description.includes('PayPal')) {
          paymentMethod = '페이팔'
        } else if (description.includes('Vデビット') || description.includes('Vﾃﾞﾋﾞｯﾄ') || description.toUpperCase().includes('CARD')) {
          paymentMethod = '카드'
        }

        let category = '기타'
        const descUpper = description.toUpperCase()
        if (isDeposit) {
          if (descUpper.includes('COCO') || description.includes('ココ') || description.includes('ｺｺ')) {
            category = '코코마케'
          } else {
            category = '셀마플'
          }
        } else if (isPayment) {
          if (description.includes('家賃') || description.includes('賃料') || description.toUpperCase().includes('RENT')) {
            category = '월세'
          } else if (description.includes('給与') || description.includes('給料') || description.includes('給與')) {
            category = '급여'
          } else {
            category = '운영비'
          }
        }

        const itemName = description || '(설명 없음)'
        const memoClean = memo || null

        // 자동 매칭 규칙 적용
        const autoMatch = applyAutoMatch(itemName)
        if (autoMatch.category) category = autoMatch.category
        if (autoMatch.paymentMethod) paymentMethod = autoMatch.paymentMethod
        const assignedUserId = autoMatch.assignedUserId || null

        console.log(`Importing: ${itemName.substring(0, 30)}... | Category: ${category} | AssignedUser: ${assignedUserId || 'none'}`)

        // DB 삽입
        const result = await pool.query(
          `INSERT INTO accounting_transactions 
           (transaction_date, transaction_time, transaction_type, category, payment_method, item_name, amount, assigned_user_id, memo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [transactionDate, transactionTime, transactionType, category, paymentMethod, itemName, amount, assignedUserId, memoClean]
        )

        imported.push(result.rows[0])
      } catch (lineError) {
        console.error('CSV line parse error:', lineError)
        errors.push({ row: cols, error: String(lineError) })
      }
    }

    console.log(`Import completed: ${imported.length} imported, ${errors.length} errors`)

    res.json({
      success: true,
      imported: imported.length,
      errors: errors.length,
      details: errors.length > 0 ? errors.slice(0, 5) : undefined,
    })
  } catch (error) {
    console.error('CSV upload error:', error)
    res.status(500).json({ error: 'CSV 업로드에 실패했습니다' })
  }
})

router.delete('/transactions/all', authMiddleware, adminOnly, async (_req: AuthRequest, res: Response) => {
  try {
    await pool.query('TRUNCATE accounting_sales, accounting_transactions RESTART IDENTITY')
    res.json({ success: true })
  } catch (error) {
    console.error('Transaction bulk delete error:', error)
    res.status(500).json({ error: '거래내역 초기화에 실패했습니다' })
  }
})


export default router
