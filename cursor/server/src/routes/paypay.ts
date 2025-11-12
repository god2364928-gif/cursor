import { Router } from 'express'
import { Pool } from 'pg'

const router = Router()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// 직원명 매핑
const STAFF_MAPPING: { [key: string]: string } = {
  '미유': '山﨑水優',
  '히토미': '石井瞳',
  '미나미': '山下南',
  '제이': 'JEYI'
}

// 매출 목록 조회
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, category, name } = req.query

    let query = 'SELECT * FROM paypay_sales WHERE 1=1'
    const params: any[] = []
    let paramCount = 1

    if (startDate) {
      query += ` AND date >= $${paramCount}`
      params.push(startDate)
      paramCount++
    }

    if (endDate) {
      query += ` AND date <= $${paramCount}`
      params.push(endDate)
      paramCount++
    }

    if (category) {
      if (category === 'NOT_셀마플') {
        query += ` AND category != $${paramCount}`
        params.push('셀마플')
        paramCount++
      } else {
        query += ` AND category = $${paramCount}`
        params.push(category)
        paramCount++
      }
    }

    if (name) {
      query += ` AND name ILIKE $${paramCount}`
      params.push(`%${name}%`)
      paramCount++
    }

    query += ' ORDER BY date DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('PayPay sales fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch sales data' })
  }
})

// 매출 일괄 등록
router.post('/sales/bulk', async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { sales } = req.body

    await client.query('BEGIN')

    for (const sale of sales) {
      // 카테고리는 '셀마플'로 고정
      // 이름(name)은 입금자명 사용, 담당자명 매핑 적용
      let name = sale.name
      if (STAFF_MAPPING[name]) {
        name = STAFF_MAPPING[name]
      }

      await client.query(
        `INSERT INTO paypay_sales (date, category, user_id, name, receipt_number, amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sale.date, '셀마플', sale.user_id, name, sale.receipt_number, sale.amount]
      )
    }

    await client.query('COMMIT')
    res.json({ success: true, count: sales.length })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('PayPay sales bulk insert error:', error)
    res.status(500).json({ error: 'Failed to insert sales data' })
  } finally {
    client.release()
  }
})

// 지출 목록 조회
router.get('/expenses', async (req, res) => {
  try {
    const { startDate, endDate } = req.query

    let query = 'SELECT * FROM paypay_expenses WHERE 1=1'
    const params: any[] = []
    let paramCount = 1

    if (startDate) {
      query += ` AND date >= $${paramCount}`
      params.push(startDate)
      paramCount++
    }

    if (endDate) {
      query += ` AND date <= $${paramCount}`
      params.push(endDate)
      paramCount++
    }

    query += ' ORDER BY date DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error('PayPay expenses fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch expenses data' })
  }
})

// 지출 추가
router.post('/expenses', async (req, res) => {
  try {
    const { date, item, amount, memo } = req.body

    const result = await pool.query(
      `INSERT INTO paypay_expenses (date, item, amount, memo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date, item, amount, memo || null]
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error('PayPay expense create error:', error)
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

// 지출 수정
router.put('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { date, item, amount, memo } = req.body

    const result = await pool.query(
      `UPDATE paypay_expenses
       SET date = $1, item = $2, amount = $3, memo = $4
       WHERE id = $5
       RETURNING *`,
      [date, item, amount, memo, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('PayPay expense update error:', error)
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

// 지출 삭제
router.delete('/expenses/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM paypay_expenses WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('PayPay expense delete error:', error)
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

// 매출 수정
router.put('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { memo } = req.body

    const result = await pool.query(
      `UPDATE paypay_sales
       SET memo = $1
       WHERE id = $2
       RETURNING *`,
      [memo, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('PayPay sale update error:', error)
    res.status(500).json({ error: 'Failed to update sale' })
  }
})

// 매출 삭제
router.delete('/sales/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM paypay_sales WHERE id = $1 RETURNING *',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('PayPay sale delete error:', error)
    res.status(500).json({ error: 'Failed to delete sale' })
  }
})

// 요약 정보 조회 (전체 기간 고정)
router.get('/summary', async (req, res) => {
  try {
    // 날짜 필터 무시, 전체 기간 합계
    const salesQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM paypay_sales'
    const expensesQuery = 'SELECT COALESCE(SUM(amount), 0) as total FROM paypay_expenses'

    const salesResult = await pool.query(salesQuery)
    const expensesResult = await pool.query(expensesQuery)

    const totalSales = parseFloat(salesResult.rows[0].total)
    const totalExpenses = parseFloat(expensesResult.rows[0].total)
    const balance = totalSales - totalExpenses

    res.json({
      totalSales,
      totalExpenses,
      balance
    })
  } catch (error) {
    console.error('PayPay summary fetch error:', error)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

export default router

