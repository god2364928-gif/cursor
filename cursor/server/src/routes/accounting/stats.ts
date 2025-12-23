import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'
import { toJSTDateString } from '../../utils/dateHelper'

const router = Router()

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
    const { fiscalYear, startDate, endDate } = req.query
    const year = fiscalYear ? Number(fiscalYear) : new Date().getMonth() >= 9 ? new Date().getFullYear() + 1 : new Date().getFullYear()

    // 날짜 필터 사용 (startDate, endDate가 있으면 사용, 없으면 회계연도 사용)
    let dateCondition = ''
    let dateParams: any[] = []
    
    if (startDate && endDate) {
      dateCondition = 'transaction_date BETWEEN $1 AND $2'
      dateParams = [startDate, endDate]
    } else {
      // 회계연도로 필터링
      const fiscalStartDate = `${year - 1}-10-01`
      const fiscalEndDate = `${year}-09-30`
      dateCondition = 'transaction_date BETWEEN $1 AND $2'
      dateParams = [fiscalStartDate, fiscalEndDate]
    }

    // 병렬 쿼리 실행으로 성능 최적화
    const [
      salesByCategoryResult,
      expensesResult,
      accountsResult,
      latestCapitalResult,
      depositsResult
    ] = await Promise.all([
      // 매출 카테고리별 (합계는 여기서 계산)
      pool.query(
        `SELECT 
          category,
          COALESCE(SUM(amount), 0) as total
         FROM accounting_transactions
         WHERE ${dateCondition} AND category IN ('셀마플', '코코마케') AND transaction_type = '입금'
         GROUP BY category`,
        dateParams
      ),
      // 지출 카테고리별
      pool.query(
        `SELECT 
          category,
          COALESCE(SUM(amount), 0) as total
         FROM accounting_transactions
         WHERE ${dateCondition} AND transaction_type = '출금'
         GROUP BY category`,
        dateParams
      ),
      // 계좌 잔액
      pool.query(
        `SELECT account_name, account_type, current_balance
         FROM accounting_capital
         ORDER BY account_type, account_name`
      ),
      // 최신 자본금
      pool.query(
        `SELECT amount, balance_date
         FROM capital_balance
         ORDER BY balance_date DESC
         LIMIT 1`
      ),
      // 보증금 합계
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total_deposits
         FROM deposits`
      )
    ])

    const latestCapitalBalance = latestCapitalResult.rows[0] ? Number(latestCapitalResult.rows[0].amount) : 0
    const totalDeposits = Number(depositsResult.rows[0]?.total_deposits || 0)
    const totalAssets = latestCapitalBalance + totalDeposits

    // 최근 12개월 계산 (JST 기준)
    const now = new Date()
    const nowStr = toJSTDateString(now)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const twelveMonthsAgoStr = toJSTDateString(twelveMonthsAgo)

    // 월별 데이터 병렬 쿼리
    const [
      monthlySalesResult,
      monthlyExpensesResult,
      monthlyExpensesByCategoryResult,
      monthlySalesByCategoryResult
    ] = await Promise.all([
      // 월별 매출 추이
      pool.query(
        `SELECT 
          TO_CHAR(transaction_date, 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0) as total
         FROM accounting_transactions
         WHERE transaction_date BETWEEN $1 AND $2 AND category IN ('셀마플', '코코마케') AND transaction_type = '입금'
         GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
         ORDER BY month`,
        [twelveMonthsAgoStr, nowStr]
      ),
      // 월별 지출 추이
      pool.query(
        `SELECT 
          TO_CHAR(transaction_date, 'YYYY-MM') as month,
          COALESCE(SUM(amount), 0) as total
         FROM accounting_transactions
         WHERE transaction_date BETWEEN $1 AND $2 AND transaction_type = '출금'
         GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
         ORDER BY month`,
        [twelveMonthsAgoStr, nowStr]
      ),
      // 월별 카테고리별 지출
      pool.query(
        `SELECT 
          TO_CHAR(transaction_date, 'YYYY-MM') as month,
          category,
          COALESCE(SUM(amount), 0) as total
         FROM accounting_transactions
         WHERE transaction_date BETWEEN $1 AND $2 AND transaction_type = '출금'
         GROUP BY TO_CHAR(transaction_date, 'YYYY-MM'), category
         ORDER BY month, category`,
        [twelveMonthsAgoStr, nowStr]
      ),
      // 월별 카테고리별 매출
      pool.query(
        `SELECT 
          TO_CHAR(transaction_date, 'YYYY-MM') as month,
          category,
          COALESCE(SUM(amount), 0) as total
         FROM accounting_transactions
         WHERE transaction_date BETWEEN $1 AND $2 AND category IN ('셀마플', '코코마케') AND transaction_type = '입금'
         GROUP BY TO_CHAR(transaction_date, 'YYYY-MM'), category
         ORDER BY month, category`,
        [twelveMonthsAgoStr, nowStr]
      )
    ])

    // 매출 합계 계산 (카테고리별 합산)
    const totalSales = salesByCategoryResult.rows.reduce((sum: number, row: any) => sum + Number(row.total), 0)
    
    const salesByCategory = salesByCategoryResult.rows.reduce((acc: any, row: any) => {
      acc[row.category] = Number(row.total)
      return acc
    }, {})
    
    const expensesByCategory = expensesResult.rows.reduce((acc: any, row: any) => {
      acc[row.category] = Number(row.total)
      return acc
    }, {})
    const totalExpenses = Object.values(expensesByCategory).reduce((sum: number, val: any) => sum + val, 0)

    // 월별 데이터를 맵으로 변환
    const salesByMonth = monthlySalesResult.rows.reduce((acc: any, row: any) => {
      acc[row.month] = Number(row.total)
      return acc
    }, {})
    
    const expensesByMonth = monthlyExpensesResult.rows.reduce((acc: any, row: any) => {
      acc[row.month] = Number(row.total)
      return acc
    }, {})

    // 모든 월 목록 생성
    const allMonths = new Set([
      ...Object.keys(salesByMonth),
      ...Object.keys(expensesByMonth)
    ])

    // 월별 데이터 통합
    const monthlyData = Array.from(allMonths).sort().map(month => ({
      month,
      sales: salesByMonth[month] || 0,
      expenses: expensesByMonth[month] || 0,
      profit: (salesByMonth[month] || 0) - (expensesByMonth[month] || 0)
    }))

    // 월별 카테고리별 지출 데이터 변환
    const monthlyExpensesByCategory = monthlyExpensesByCategoryResult.rows.reduce((acc: any, row: any) => {
      if (!acc[row.month]) {
        acc[row.month] = {}
      }
      acc[row.month][row.category] = Number(row.total)
      return acc
    }, {})

    // 월별 카테고리별 매출 데이터 변환
    const monthlySalesByCategory = monthlySalesByCategoryResult.rows.reduce((acc: any, row: any) => {
      if (!acc[row.month]) {
        acc[row.month] = {}
      }
      acc[row.month][row.category] = Number(row.total)
      return acc
    }, {})

    res.json({
      fiscalYear: year,
      totalSales,
      totalExpenses,
      netProfit: totalSales - totalExpenses,
      salesByCategory,
      expensesByCategory,
      accounts: accountsResult.rows.map((r: any) => ({
        accountName: r.account_name,
        accountType: r.account_type,
        balance: Number(r.current_balance),
      })),
      // 총자산 정보
      latestCapitalBalance,
      latestCapitalDate: latestCapitalResult.rows[0]?.balance_date || null,
      totalDeposits,
      totalAssets,
      monthlyData,
      monthlyExpensesByCategory,
      monthlySalesByCategory
    })
  } catch (error) {
    console.error('Dashboard summary error:', error)
    res.status(500).json({ error: '대시보드 데이터를 불러오지 못했습니다' })
  }
})

export default router

