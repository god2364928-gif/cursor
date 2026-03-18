import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { pool } from './db'

// Force rebuild - timestamp: 1737028800
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
import accountOptimization2Routes from './routes/accountOptimization2'
import imageConverterRoutes from './routes/imageConverter'
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
import examRoutes from './routes/exam'
import hashtagAnalysisRoutes from './routes/hashtagAnalysis'
import quotesRoutes from './routes/quotes'
import adminAuthRoutes from './routes/adminAuth'
import featureUsageRoutes from './routes/featureUsage'
import flagCheckRoutes from './routes/flagCheck'
import { superAdminOnly } from './middleware/superAdminOnly'
import { importRecentCalls } from './services/cpiImportService'
import { autoMigrateSalesTracking, autoMigrateHotpepper, autoMigrateSalesAmountFields } from './migrations/autoMigrate'
import { autoMigrateFeatureUsage } from './migrations/autoMigrateFeatureUsage'
import { autoMigrateExamOpenings } from './migrations/autoMigrateExamOpenings'
import { checkDepositEmails, markAsRead } from './services/gmailService'
import { parseDepositEmail } from './utils/depositParser'
import { sendDepositNotification } from './utils/slackClient'

dotenv.config()

// Debug: Check if globalSearch.js has correct code (only in production)
if (process.env.NODE_ENV === 'production') {
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
const PORT = parseInt(process.env.PORT || '5001', 10)

// Middleware
const ALLOWED_ORIGINS = [
  'https://www.hotseller-crm.com',
  'https://hotseller-crm.com',
  'http://localhost:5173',
  'http://localhost:3000',
]

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin not allowed - ${origin}`))
    }
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Disposition'],
  preflightContinue: false,
  optionsSuccessStatus: 200,
  maxAge: 86400
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

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
app.use('/api/account-optimization-2', accountOptimization2Routes)
app.use('/api/convert-image-to-base64', imageConverterRoutes)
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
app.use('/api/exam', examRoutes) // 역량 평가 시험
app.use('/api/hashtag-analysis', hashtagAnalysisRoutes)
app.use('/api/quotes', quotesRoutes)
app.use('/api/admin', adminAuthRoutes)
app.use('/api/admin/feature-usage', featureUsageRoutes)
app.use('/api/flag-check', flagCheckRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2026-02-25-v2', routes: ['hashtag-analysis'] })
})

// 입금 알림 진단 엔드포인트 (읽음처리/Slack 발송 없음, 어드민 전용)
app.get('/api/debug/deposit', superAdminOnly, async (req, res) => {
  const result: Record<string, unknown> = {}

  result.env = {
    GMAIL_CREDENTIALS_JSON: !!process.env.GMAIL_CREDENTIALS_JSON,
    GMAIL_TOKEN_JSON: !!process.env.GMAIL_TOKEN_JSON,
    SLACK_BOT_TOKEN: !!process.env.SLACK_BOT_TOKEN,
    DEPOSIT_SLACK_CHANNEL_ID: process.env.DEPOSIT_SLACK_CHANNEL_ID || '(not set)',
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID || '(not set)',
    ENABLE_GMAIL_DEPOSIT_CHECK: process.env.ENABLE_GMAIL_DEPOSIT_CHECK || '(not set)',
    NODE_ENV: process.env.NODE_ENV || '(not set)',
  }

  // Gmail API 직접 테스트 (오류 메시지 포함)
  try {
    const { google } = await import('googleapis')
    const fs = await import('fs')

    const CREDENTIALS_PATH = process.env.GMAIL_CREDENTIALS_PATH || './gmail-credentials.json'
    const TOKEN_PATH = process.env.GMAIL_TOKEN_PATH || './gmail-token.json'

    result.credentialsFileExists = fs.existsSync(CREDENTIALS_PATH)
    result.tokenFileExists = fs.existsSync(TOKEN_PATH)

    if (!result.credentialsFileExists || !result.tokenFileExists) {
      result.gmailStatus = 'FILE_MISSING'
    } else {
      const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'))
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'))
      const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web
      const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
      oAuth2Client.setCredentials(token)
      const gmail = google.gmail({ version: 'v1', auth: oAuth2Client })

      // 실제 Gmail API 호출 테스트
      try {
        const profileRes = await gmail.users.getProfile({ userId: 'me' })
        result.gmailConnectedAs = profileRes.data.emailAddress
        result.gmailStatus = 'OK'

        // 미읽음 "振込入金" 검색
        const listRes = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread 振込入金',
          maxResults: 10,
        })
        const messages = listRes.data.messages || []
        result.emailsFound = messages.length

        // 읽음/미읽음 관계없이 최근 "振込入金" 메일 확인
        const allListRes = await gmail.users.messages.list({
          userId: 'me',
          q: '振込入金',
          maxResults: 5,
        })
        result.recentDepositEmailsTotal = (allListRes.data.messages || []).length

        const parsed = []
        for (const msg of messages) {
          const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id!, format: 'full' })
          const headers = detail.data.payload?.headers || []
          const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || ''
          const date = headers.find(h => h.name?.toLowerCase() === 'date')?.value || ''
          parsed.push({ id: msg.id, subject, date })
        }
        result.parsedEmails = parsed
      } catch (apiError: any) {
        result.gmailStatus = 'API_ERROR'
        result.gmailError = apiError.message
        result.gmailErrorCode = apiError.code
      }
    }
  } catch (error: any) {
    result.gmailStatus = 'INIT_ERROR'
    result.gmailError = error.message
  }

  res.json(result)
})

// Start server with auto-migration
async function startServer() {
  // 자동 마이그레이션 실행
  await autoMigrateSalesTracking()
  await autoMigrateHotpepper()
  await autoMigrateSalesAmountFields()
  await autoMigrateFeatureUsage()
  await autoMigrateExamOpenings()
  
app.listen(PORT, '0.0.0.0', () => {
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

  // Gmail 입금 알림 체크 스케줄러
  // - 개발서버에서는 기본 OFF
  // - 운영에서는 기본 ON
  // - 강제 ON/OFF: ENABLE_GMAIL_DEPOSIT_CHECK=1 또는 0
  const enableGmailDepositCheck =
    typeof process.env.ENABLE_GMAIL_DEPOSIT_CHECK === 'string'
      ? process.env.ENABLE_GMAIL_DEPOSIT_CHECK === '1'
      : nodeEnv === 'production'

  if (enableGmailDepositCheck) {
    console.log('Gmail deposit check scheduler enabled (every 5 min)')
    
    // 즉시 한 번 실행
    checkDepositEmailsAndNotify()
    
    // 5분마다 실행
    setInterval(async () => {
      await checkDepositEmailsAndNotify()
    }, 5 * 60 * 1000) // 5분 = 300,000ms
  } else {
    console.log('Gmail deposit check scheduler disabled')
  }
}

/**
 * 입금 메일 체크 및 Slack 알림 전송
 */
async function checkDepositEmailsAndNotify() {
  try {
    const emails = await checkDepositEmails()
    
    if (emails.length === 0) {
      return
    }

    console.log(`📬 Processing ${emails.length} deposit email(s)...`)

    for (const email of emails) {
      try {
        // 메일 본문 파싱 (여러 건 가능)
        const depositInfos = parseDepositEmail(email.body)
        
        if (depositInfos.length === 0) {
          console.log(`⚠️ Could not parse email: ${email.subject}`)
          // 파싱 실패해도 읽음 처리 (반복 알림 방지)
          await markAsRead(email.id)
          continue
        }

        console.log(`💰 Found ${depositInfos.length} deposit(s) in email: ${email.subject}`)

        // 각 입금 내역마다 개별 Slack 알림 전송
        for (const depositInfo of depositInfos) {
          if (depositInfo.depositor_name.includes('ココナラ')) {
            console.log(`⏭️ Skipped (ココナラ): ${depositInfo.depositor_name} - ${depositInfo.amount}`)
            continue
          }

          try {
            const sent = await sendDepositNotification({
              depositor_name: depositInfo.depositor_name,
              amount: depositInfo.amount,
              email_subject: email.subject,
            })

            if (sent) {
              console.log(`✅ Slack notification sent: ${depositInfo.depositor_name} - ${depositInfo.amount}`)
            } else {
              console.log(`⚠️ Failed to send Slack notification: ${depositInfo.depositor_name}`)
            }
          } catch (notifError) {
            console.error(`❌ Error sending notification for ${depositInfo.depositor_name}:`, notifError)
          }
        }

        // 모든 알림 전송 후 메일 읽음 처리
        await markAsRead(email.id)
      } catch (error: any) {
        console.error(`❌ Failed to process email ${email.id}:`, error.message)
      }
    }

    console.log(`✅ Processed ${emails.length} deposit email(s)`)
  } catch (error: any) {
    console.error('[Gmail] Deposit check error:', error.message)
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
// Deploy: 2026-02-09 - 날짜 타임존 수정 + 월별통계 성능개선 재배포
// Deploy: 2026-02-25 - 해시태그 분석 라우트 추가 재배포
