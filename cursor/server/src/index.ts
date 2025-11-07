import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { pool } from './db'
import authRoutes from './routes/auth'
import customersRoutes from './routes/customers'
import retargetingRoutes from './routes/retargeting'
import salesRoutes from './routes/sales'
import dashboardRoutes from './routes/dashboard'
import perfRoutes from './routes/perf'
import salesTrackingRoutes from './routes/salesTracking'
import globalSearchRoutes from './routes/globalSearch'
import integrationsRoutes from './routes/integrations'
import { importRecentCalls } from './services/cpiImportService'
import { autoMigrateSalesTracking } from './migrations/autoMigrate'

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
const PORT = process.env.PORT || 5000

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
  
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`CORS enabled for all origins`)
  })

  // Start CPI scheduler (every 1 min)
  // 환경변수가 없어도 스케줄러는 시작하되, 에러 메시지로 환경변수 부재를 알림
  const token = process.env.CPI_API_TOKEN
  const base = process.env.CPI_API_BASE
  
  console.log('CPI scheduler enabled (every 1 min)')
  if (!token || !base) {
    console.warn('⚠️  CPI_API_TOKEN or CPI_API_BASE not set - CPI import will fail until environment variables are configured')
  }
  
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


