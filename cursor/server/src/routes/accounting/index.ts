import { Router } from 'express'
import statsRouter from './stats'
import transactionsRouter from './transactions'
import employeesRouter from './employees'
import payrollRouter from './payroll'
import capitalRouter from './capital'
import totalSalesRouter from './totalSales'

const router = Router()

// 통계 & 대시보드
router.use('/', statsRouter)

// 거래 내역
router.use('/', transactionsRouter)

// 직원 관리
router.use('/', employeesRouter)

// 급여
router.use('/', payrollRouter)

// 자본금, 정기지출, 보증금, 자동매칭 규칙
router.use('/', capitalRouter)

// 전체 매출
router.use('/total-sales', totalSalesRouter)

export default router

