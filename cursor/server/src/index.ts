import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { pool } from './db'

// Force rebuild - timestamp: 1731476108
import authRoutes from './routes/auth'
import customersRoutes from './routes/customers'
import retargetingRoutes from './routes/retargeting'
import salesRoutes from './routes/sales'
import dashboardRoutes from './routes/dashboard'
import perfRoutes from './routes/perf'
import salesTrackingRoutes from './routes/salesTracking'
import globalSearchRoutes from './routes/globalSearch'
import integrationsRoutes from './routes/integrations'
import accountOptimizationRoutes from './routes/accountOptimization'
import meetingRoutes from './routes/meeting'
import keywordAnalysisRoutes from './routes/keywordAnalysis'
import accountingRoutes from './routes/accounting/index'
import paypayRoutes from './routes/paypay'
import totalSalesRoutes from './routes/accounting/totalSales'
import monthlyPayrollRoutes from './routes/monthlyPayroll'
import invoicesRoutes from './routes/invoices'
import receiptsRoutes from './routes/receipts'
import excludedPartnersRoutes from './routes/excludedPartners'
import lineUploadRoutes from './routes/lineUpload'
import hotpepperRoutes from './routes/hotpepper'
import recruitRoutes from './routes/recruit'
import restaurantsRoutes from './routes/restaurants'
import inquiryLeadsRoutes from './routes/inquiryLeads'
import { importRecentCalls } from './services/cpiImportService'
import { autoMigrateSalesTracking, autoMigrateHotpepper, autoMigrateSalesAmountFields } from './migrations/autoMigrate'

dotenv.config()

// Debug: Check if globalSearch.js has correct code (only in production)
if (process.env.NODE_ENV === 'production' || true) {
  try {
    const globalSearchPath = path.join(__dirname, 'routes/globalSearch.js')
    if (fs.existsSync(globalSearchPath)) {
      const content = fs.readFileSync(globalSearchPath, 'utf8')
      if (content.includes('retargeting_customers')) {
        const retargetingSection = content.match(/retargeting_customers[\s\S]{0,300}LIMIT 10/)?.[0] || ''
        const hasPhone1 = retargetingSection.includes('phone1')
        if (hasPhone1) {
          console.error('❌ ERROR: globalSearch.js still contains phone1 for retargeting_customers!')
          console.error('Retargeting section:', retargetingSection.substring(0, 200))
        } else {
          console.log('✅ OK: globalSearch.js uses phone only for retargeting_customers')
        }
      }
    } else {
      console.log('⚠️ globalSearch.js not found at:', globalSearchPath)
    }
  } catch (e) {
    console.error('Debug check failed:', e)
  }
}

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests from any origin (for development/debugging)
    callback(null, true)
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json())

// Add request logging for debugging
app.use((req, res, next) => {
  const startTime = Date.now()
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log(`Origin: ${req.headers.origin}`)
  
  res.on('finish', () => {
    const duration = Date.now() - startTime
    console.log(`[${req.method} ${req.path}] ${res.statusCode} ${duration}ms`)
  })
  
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/retargeting', retargetingRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/perf', perfRoutes)
app.use('/api/sales-tracking', salesTrackingRoutes)
app.use('/api/global-search', globalSearchRoutes)
app.use('/api/integrations', integrationsRoutes)
app.use('/api/account-optimization', accountOptimizationRoutes)
app.use('/api/meeting', meetingRoutes)
app.use('/api/keyword-analysis', keywordAnalysisRoutes)
app.use('/api/accounting', accountingRoutes)
app.use('/api/paypay', paypayRoutes)
app.use('/api/total-sales', totalSalesRoutes)
app.use('/api/monthly-payroll', monthlyPayrollRoutes)
app.use('/api/invoices', invoicesRoutes)
app.use('/api/receipts', receiptsRoutes)
app.use('/api/excluded-partners', excludedPartnersRoutes)
app.use('/api/line-upload', lineUploadRoutes)
app.use('/api/hotpepper', hotpepperRoutes)  // 하위 호환성 유지
app.use('/api/recruit', recruitRoutes)       // 통합 API
app.use('/api/restaurants', restaurantsRoutes) // 음식점 CRM
app.use('/api/inquiry-leads', inquiryLeadsRoutes) // 문의 배정 시스템

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Temporary test endpoint to check data
app.get('/api/test/customers', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM customers')
    res.json({ count: result.rows[0].count, message: 'Database connection OK' })
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) })
  }
})

// Start server with auto-migration
async function startServer() {
  // 자동 마이그레이션 실행
  await autoMigrateSalesTracking()
  await autoMigrateHotpepper()
  await autoMigrateSalesAmountFields()
  
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`CORS enabled for all origins`)
  })

  // CPI 스케줄러 (외부 시스템 호출 + DB 작업)
  // - 개발서버에서는 기본 OFF (속도 흔들림/외부 호출 방지)
  // - 운영에서는 기본 ON (환경변수가 있고, 별도 OFF 설정이 없을 때)
  // - 강제 ON/OFF: ENABLE_CPI_SCHEDULER=1 또는 0
  const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase()
  const enableCpiScheduler =
    typeof process.env.ENABLE_CPI_SCHEDULER === 'string'
      ? process.env.ENABLE_CPI_SCHEDULER === '1'
      : nodeEnv === 'production'
  const token = process.env.CPI_API_TOKEN
  const base = process.env.CPI_API_BASE

  if (enableCpiScheduler && token && base) {
    console.log('CPI scheduler enabled (every 1 min)')
    setInterval(async () => {
      try {
        const now = new Date()
        const since = new Date(now.getTime() - 6 * 60 * 60 * 1000) // last 6 hours
        const result = await importRecentCalls(since, now)
        if (result.inserted > 0 || result.updated > 0 || result.skipped > 0) {
          console.log(`[CPI] Scheduled import: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`)
        }
      } catch (e) {
        console.error('[CPI] scheduler error:', e)
      }
    }, 60 * 1000)
  } else {
    console.log('CPI scheduler disabled')
    if (enableCpiScheduler && (!token || !base)) {
      console.warn('⚠️  CPI scheduler requested but CPI_API_TOKEN or CPI_API_BASE is missing')
    }
  }
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...')
  pool.end()
  process.exit(0)
})

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})


// Force Railway redeploy - Optimized build system
// Timestamp: 2025-11-14 20:00:00
// Changes:
// - Removed 16 unnecessary files
// - Optimized Railway build configuration
// - Enforced clean build (no cache)
// Deploy: 2025-11-14 16:14:28 - Manual redeploy
// Deploy: 2025-11-22 08:26:33 - 프로젝트 정리 후 재배포
// Force rebuild 1766393763
// Deploy 1766448614
// Tue Dec 23 09:44:44 JST 2025
