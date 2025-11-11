import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import multer from 'multer'
import iconv from 'iconv-lite'
import { parse } from 'csv-parse/sync'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// Admin 권한 체크 미들웨어
const adminOnly = (req: AuthRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin 권한이 필요합니다' })
  }
  next()
}

// 비밀번호 검증 (Hot1012!)
router.post('/verify-password', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  const { password } = req.body
  
  if (password === 'Hot1012!') {
    return res.json({ success: true })
  }
  
  return res.status(401).json({ success: false, error: '비밀번호가 일치하지 않습니다' })
})

// ========== 대시보드 요약 ==========
router.get('/dashboard', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear } = req.query
    const year = fiscalYear ? Number(fiscalYear) : new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()

    // 매출 합계
    const salesResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_sales
       FROM accounting_transactions
       WHERE fiscal_year = $1 AND category IN ('셀마플 매출', '코코마케 매출')`,
      [year]
    )

    // 지출 합계
    const expensesResult = await pool.query(
      `SELECT 
        category,
        COALESCE(SUM(amount), 0) as total
       FROM accounting_transactions
       WHERE fiscal_year = $1 AND transaction_type = '출금'
       GROUP BY category`,
      [year]
    )

    // 계좌 잔액
    const accountsResult = await pool.query(
      `SELECT account_name, account_type, current_balance
       FROM accounting_capital
       ORDER BY account_type, account_name`
    )

    // 월별 매출 추이
    const monthlySalesResult = await pool.query(
      `SELECT 
        TO_CHAR(transaction_date, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as total
       FROM accounting_transactions
       WHERE fiscal_year = $1 AND category = '매출'
       GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
       ORDER BY month`,
      [year]
    )

    const totalSales = Number(salesResult.rows[0]?.total_sales || 0)
    const expensesByCategory = expensesResult.rows.reduce((acc: any, row: any) => {
      acc[row.category] = Number(row.total)
      return acc
    }, {})
    const totalExpenses = Object.values(expensesByCategory).reduce((sum: number, val: any) => sum + val, 0)

    res.json({
      fiscalYear: year,
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      expensesByCategory,
      accounts: accountsResult.rows.map((r: any) => ({
        accountName: r.account_name,
        accountType: r.account_type,
        balance: Number(r.current_balance),
      })),
      monthlySales: monthlySalesResult.rows.map((r: any) => ({
        month: r.month,
        amount: Number(r.total),
      })),
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    res.status(500).json({ error: '대시보드 데이터를 불러오지 못했습니다' })
  }
})

// ========== 거래내역 (Transactions) ==========
router.get('/transactions', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, limit = 100, offset = 0 } = req.query
    const year = fiscalYear ? Number(fiscalYear) : null

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
    
    if (year) {
      query += ` WHERE t.fiscal_year = $1`
      params.push(year)
    }
    
    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(Number(limit), Number(offset))

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
      if (str === '현금' || str === '은행') return '현금/은행'
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
      paymentMethod === '현금' || paymentMethod === '은행' ? '현금/은행' : paymentMethod

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
    const salesCategories = ['셀마플 매출', '코코마케 매출']
    if (transactionType === '입금' && salesCategories.includes(category)) {
      const fiscalYear = transaction.fiscal_year
      const month = new Date(transactionDate).toISOString().slice(0, 7) + '-01'
      
      await pool.query(
        `INSERT INTO accounting_sales (fiscal_year, transaction_month, channel, sales_category, total_amount)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING`,
        [fiscalYear, month, normalizedPaymentMethod, category, amount]
      )
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
      paymentMethod === '현금' || paymentMethod === '은행' ? '현금/은행' : paymentMethod

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
router.post('/transactions/upload-csv', authMiddleware, adminOnly, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV 파일을 업로드해 주세요' })
    }

    // 다양한 인코딩 시도
    let utf8Content: string | null = null
    const encodings = ['CP932', 'SHIFT_JIS', 'EUC-JP', 'UTF-8']
    
    for (const encoding of encodings) {
      try {
        const decoded = iconv.decode(req.file.buffer, encoding)
        // 일본어 문자가 제대로 보이는지 확인
        if (decoded.includes('お') || decoded.includes('ご') || /[\u3040-\u309F\u30A0-\u30FF]/.test(decoded)) {
          utf8Content = decoded
          console.log(`Successfully decoded with ${encoding}`)
          break
        }
      } catch (e) {
        console.log(`Failed to decode with ${encoding}`)
        continue
      }
    }
    
    // 모든 인코딩 실패 시 UTF-8로 시도
    if (!utf8Content) {
      utf8Content = iconv.decode(req.file.buffer, 'UTF-8')
    }
    
    // CSV 파싱
    const records = parse(utf8Content, {
      skip_empty_lines: true,
      relax_column_count: true,
      trim: false,
      bom: true
    }) as string[][]

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
        let paymentMethod = '현금/은행'
        if (description.includes('PayPay') || description.includes('ﾍﾟｲﾍﾟｲ') || description.includes('ペイペイ')) {
          paymentMethod = 'PayPay'
        } else if (description.includes('Stripe') || description.includes('ｽﾄﾗｲﾌﾟ')) {
          paymentMethod = 'Stripe'
        } else if (description.includes('Vデビット') || description.includes('Vﾃﾞﾋﾞｯﾄ') || description.toUpperCase().includes('CARD')) {
          paymentMethod = '카드'
        }

        let category = '기타'
        const descUpper = description.toUpperCase()
        if (isDeposit) {
          if (descUpper.includes('COCO') || description.includes('ココ') || description.includes('ｺｺ')) {
            category = '코코마케 매출'
          } else {
            category = '셀마플 매출'
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

        // DB 삽입
        const result = await pool.query(
          `INSERT INTO accounting_transactions 
           (transaction_date, transaction_time, transaction_type, category, payment_method, item_name, amount, assigned_user_id, memo)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [transactionDate, transactionTime, transactionType, category, paymentMethod, itemName, amount, null, memoClean]
        )

        imported.push(result.rows[0])
      } catch (lineError) {
        console.error('CSV line parse error:', lineError)
        errors.push({ row: cols, error: String(lineError) })
      }
    }

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

// ========== 직원 (Employees) ==========
router.get('/employees', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM accounting_employees ORDER BY employment_status, hire_date`
    )
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      position: r.position,
      hireDate: r.hire_date,
      baseSalary: Number(r.base_salary),
      incentiveRate: Number(r.incentive_rate),
      employmentStatus: r.employment_status,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Employees fetch error:', error)
    res.status(500).json({ error: '직원 목록을 불러오지 못했습니다' })
  }
})

router.post('/employees', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, position, hireDate, baseSalary, incentiveRate } = req.body
    
    const result = await pool.query(
      `INSERT INTO accounting_employees (name, position, hire_date, base_salary, incentive_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, position, hireDate, baseSalary || 0, incentiveRate || 0]
    )
    
    res.json({ success: true, employee: result.rows[0] })
  } catch (error) {
    console.error('Employee create error:', error)
    res.status(500).json({ error: '직원 추가에 실패했습니다' })
  }
})

router.put('/employees/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, position, hireDate, baseSalary, incentiveRate, employmentStatus } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_employees
       SET name = $1, position = $2, hire_date = $3, base_salary = $4, incentive_rate = $5, employment_status = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, position, hireDate, baseSalary, incentiveRate, employmentStatus, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '직원을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, employee: result.rows[0] })
  } catch (error) {
    console.error('Employee update error:', error)
    res.status(500).json({ error: '직원 정보 수정에 실패했습니다' })
  }
})

router.delete('/employees/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_employees WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Employee delete error:', error)
    res.status(500).json({ error: '직원 삭제에 실패했습니다' })
  }
})

// ========== 급여 (Payroll) ==========
router.get('/payroll', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMonth } = req.query
    
    let query = `
      SELECT 
        p.id, p.payment_month, p.base_salary, p.incentive, p.other_payments, p.total_amount, p.payment_status,
        e.id as employee_id, e.name as employee_name, e.position, e.incentive_rate
      FROM accounting_payroll p
      JOIN accounting_employees e ON p.employee_id = e.id
    `
    const params: any[] = []
    
    if (paymentMonth) {
      query += ` WHERE p.payment_month = $1`
      params.push(paymentMonth)
    }
    
    query += ` ORDER BY p.payment_month DESC, e.name`
    
    const result = await pool.query(query, params)
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      paymentMonth: r.payment_month,
      employeeId: r.employee_id,
      employeeName: r.employee_name,
      position: r.position,
      baseSalary: Number(r.base_salary),
      incentive: Number(r.incentive),
      otherPayments: Number(r.other_payments),
      totalAmount: Number(r.total_amount),
      paymentStatus: r.payment_status,
      incentiveRate: Number(r.incentive_rate),
    })))
  } catch (error) {
    console.error('Payroll fetch error:', error)
    res.status(500).json({ error: '급여 목록을 불러오지 못했습니다' })
  }
})

// 급여 자동 생성 (특정 월의 모든 재직 직원)
router.post('/payroll/generate', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMonth } = req.body // YYYY-MM-01 형식
    
    if (!paymentMonth) {
      return res.status(400).json({ error: '지급월을 입력해 주세요' })
    }

    // 재직 중인 직원 목록
    const employeesResult = await pool.query(
      `SELECT id, name, base_salary, incentive_rate FROM accounting_employees WHERE employment_status = '재직'`
    )

    // 해당 월 매출 합계
    const salesResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_sales
       FROM accounting_transactions
       WHERE TO_CHAR(transaction_date, 'YYYY-MM') = $1 AND category IN ('셀마플 매출', '코코마케 매출')`,
      [paymentMonth.slice(0, 7)]
    )
    const totalSales = Number(salesResult.rows[0]?.total_sales || 0)

    const created: any[] = []
    for (const emp of employeesResult.rows) {
      const baseSalary = Number(emp.base_salary)
      const incentive = Math.round(totalSales * (Number(emp.incentive_rate) / 100))

      // 중복 방지
      const existing = await pool.query(
        `SELECT id FROM accounting_payroll WHERE employee_id = $1 AND payment_month = $2`,
        [emp.id, paymentMonth]
      )

      if (existing.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO accounting_payroll (employee_id, payment_month, base_salary, incentive, other_payments, payment_status)
           VALUES ($1, $2, $3, $4, 0, '미지급')
           RETURNING *`,
          [emp.id, paymentMonth, baseSalary, incentive]
        )
        created.push(insertResult.rows[0])
      }
    }

    res.json({ success: true, count: created.length, payrolls: created })
  } catch (error) {
    console.error('Payroll generate error:', error)
    res.status(500).json({ error: '급여 자동 생성에 실패했습니다' })
  }
})

router.put('/payroll/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { baseSalary, incentive, otherPayments, paymentStatus } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_payroll
       SET base_salary = $1, incentive = $2, other_payments = $3, payment_status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [baseSalary, incentive, otherPayments, paymentStatus, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '급여 내역을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, payroll: result.rows[0] })
  } catch (error) {
    console.error('Payroll update error:', error)
    res.status(500).json({ error: '급여 수정에 실패했습니다' })
  }
})

router.delete('/payroll/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_payroll WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Payroll delete error:', error)
    res.status(500).json({ error: '급여 삭제에 실패했습니다' })
  }
})

// ========== 정기지출 (Recurring Expenses) ==========
router.get('/recurring-expenses', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM accounting_recurring_expenses WHERE is_active = true ORDER BY payment_day`
    )
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      itemName: r.item_name,
      monthlyAmount: Number(r.monthly_amount),
      paymentDay: r.payment_day,
      paymentMethod: r.payment_method,
      isActive: r.is_active,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Recurring expenses fetch error:', error)
    res.status(500).json({ error: '정기지출 목록을 불러오지 못했습니다' })
  }
})

router.post('/recurring-expenses', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { itemName, monthlyAmount, paymentDay, paymentMethod } = req.body
    
    const result = await pool.query(
      `INSERT INTO accounting_recurring_expenses (item_name, monthly_amount, payment_day, payment_method)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [itemName, monthlyAmount, paymentDay, paymentMethod]
    )
    
    res.json({ success: true, expense: result.rows[0] })
  } catch (error) {
    console.error('Recurring expense create error:', error)
    res.status(500).json({ error: '정기지출 추가에 실패했습니다' })
  }
})

router.put('/recurring-expenses/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { itemName, monthlyAmount, paymentDay, paymentMethod, isActive } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_recurring_expenses
       SET item_name = $1, monthly_amount = $2, payment_day = $3, payment_method = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [itemName, monthlyAmount, paymentDay, paymentMethod, isActive, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '정기지출을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, expense: result.rows[0] })
  } catch (error) {
    console.error('Recurring expense update error:', error)
    res.status(500).json({ error: '정기지출 수정에 실패했습니다' })
  }
})

router.delete('/recurring-expenses/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`UPDATE accounting_recurring_expenses SET is_active = false WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Recurring expense delete error:', error)
    res.status(500).json({ error: '정기지출 삭제에 실패했습니다' })
  }
})

// ========== 계좌 (Capital) ==========
router.get('/capital', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM accounting_capital ORDER BY account_type, account_name`
    )
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      accountName: r.account_name,
      accountType: r.account_type,
      initialBalance: Number(r.initial_balance),
      currentBalance: Number(r.current_balance),
      lastUpdated: r.last_updated,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Capital fetch error:', error)
    res.status(500).json({ error: '계좌 목록을 불러오지 못했습니다' })
  }
})

router.post('/capital', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { accountName, accountType, initialBalance } = req.body
    
    const result = await pool.query(
      `INSERT INTO accounting_capital (account_name, account_type, initial_balance, current_balance)
       VALUES ($1, $2, $3, $3)
       RETURNING *`,
      [accountName, accountType, initialBalance || 0]
    )
    
    res.json({ success: true, account: result.rows[0] })
  } catch (error: any) {
    console.error('Capital create error:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: '이미 존재하는 계좌명입니다' })
    }
    res.status(500).json({ error: '계좌 추가에 실패했습니다' })
  }
})

router.put('/capital/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { accountName, accountType, initialBalance } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_capital
       SET account_name = $1, account_type = $2, initial_balance = $3
       WHERE id = $4
       RETURNING *`,
      [accountName, accountType, initialBalance, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '계좌를 찾을 수 없습니다' })
    }
    
    res.json({ success: true, account: result.rows[0] })
  } catch (error) {
    console.error('Capital update error:', error)
    res.status(500).json({ error: '계좌 수정에 실패했습니다' })
  }
})

router.delete('/capital/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_capital WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Capital delete error:', error)
    res.status(500).json({ error: '계좌 삭제에 실패했습니다' })
  }
})

export default router

