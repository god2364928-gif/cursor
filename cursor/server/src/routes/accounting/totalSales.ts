import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'

const router = Router()

// 특정 회계연도의 전체 데이터 조회
router.get('/:fiscalYear', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear } = req.params
    
    const result = await pool.query(
      `SELECT fiscal_year, month, payment_method, amount, is_fee 
       FROM total_sales 
       WHERE fiscal_year = $1 
       ORDER BY month, payment_method, is_fee`,
      [fiscalYear]
    )
    
    // 데이터를 월별로 그룹화하고 피벗
    const monthlyData: { [key: number]: any } = {}
    
    result.rows.forEach((row: any) => {
      const month = row.month
      if (!monthlyData[month]) {
        monthlyData[month] = {
          id: `${fiscalYear}-${month}`,
          month: month,
          bank_transfer: 0,
          bank_transfer_fee: 0,
          paypay: 0,
          paypay_fee: 0,
          paypal: 0,
          paypal_fee: 0,
          stripe: 0,
          stripe_fee: 0
        }
      }
      
      const amount = parseFloat(row.amount) || 0
      const paymentMethod = row.payment_method.toLowerCase()
      const isFee = row.is_fee
      
      // 결제 방법별로 매핑
      if (paymentMethod === '계좌이체' || paymentMethod === 'bank' || paymentMethod === 'bank_transfer') {
        if (isFee) {
          monthlyData[month].bank_transfer_fee = amount
        } else {
          monthlyData[month].bank_transfer = amount
        }
      } else if (paymentMethod === 'paypay') {
        if (isFee) {
          monthlyData[month].paypay_fee = amount
        } else {
          monthlyData[month].paypay = amount
        }
      } else if (paymentMethod === 'paypal') {
        if (isFee) {
          monthlyData[month].paypal_fee = amount
        } else {
          monthlyData[month].paypal = amount
        }
      } else if (paymentMethod.includes('strip')) { // 'strip', 'strip1', 'stripe'
        if (isFee) {
          monthlyData[month].stripe_fee += amount
        } else {
          monthlyData[month].stripe += amount
        }
      }
    })
    
    // 월별로 정렬된 배열로 변환
    const sortedData = Object.values(monthlyData).sort((a: any, b: any) => a.month - b.month)
    
    res.json(sortedData)
  } catch (error) {
    console.error('Error fetching total sales:', error)
    res.status(500).json({ error: '전체매출 조회 실패' })
  }
})

// 특정 셀 데이터 업데이트
router.put('/update', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { fiscalYear, month, paymentMethod, isFee, amount } = req.body
    
    const result = await pool.query(
      `INSERT INTO total_sales (fiscal_year, month, payment_method, amount, is_fee)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fiscal_year, month, payment_method, is_fee)
       DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [fiscalYear, month, paymentMethod, amount || 0, isFee]
    )
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating total sales:', error)
    res.status(500).json({ error: '전체매출 업데이트 실패' })
  }
})

// CSV 데이터 일괄 입력
router.post('/bulk-insert', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { data } = req.body // data is an array of { fiscalYear, month, paymentMethod, amount, isFee }
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: '유효한 데이터가 없습니다' })
    }
    
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      
      for (const item of data) {
        await client.query(
          `INSERT INTO total_sales (fiscal_year, month, payment_method, amount, is_fee)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (fiscal_year, month, payment_method, is_fee)
           DO UPDATE SET amount = EXCLUDED.amount, updated_at = CURRENT_TIMESTAMP`,
          [item.fiscalYear, item.month, item.paymentMethod, item.amount || 0, item.isFee]
        )
      }
      
      await client.query('COMMIT')
      res.json({ success: true, count: data.length })
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('Error bulk inserting total sales:', error)
    res.status(500).json({ error: '일괄 입력 실패' })
  }
})

export default router

