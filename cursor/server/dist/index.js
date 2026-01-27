"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
// Force rebuild - timestamp: 1737028800
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const retargeting_1 = __importDefault(require("./routes/retargeting"));
const sales_1 = __importDefault(require("./routes/sales"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const perf_1 = __importDefault(require("./routes/perf"));
const salesTracking_1 = __importDefault(require("./routes/salesTracking"));
const globalSearch_1 = __importDefault(require("./routes/globalSearch"));
const integrations_1 = __importDefault(require("./routes/integrations"));
const accountOptimization_1 = __importDefault(require("./routes/accountOptimization"));
const meeting_1 = __importDefault(require("./routes/meeting"));
const keywordAnalysis_1 = __importDefault(require("./routes/keywordAnalysis"));
const index_1 = __importDefault(require("./routes/accounting/index"));
const paypay_1 = __importDefault(require("./routes/paypay"));
const totalSales_1 = __importDefault(require("./routes/accounting/totalSales"));
const monthlyPayroll_1 = __importDefault(require("./routes/monthlyPayroll"));
const invoices_1 = __importDefault(require("./routes/invoices"));
const receipts_1 = __importDefault(require("./routes/receipts"));
const excludedPartners_1 = __importDefault(require("./routes/excludedPartners"));
const lineUpload_1 = __importDefault(require("./routes/lineUpload"));
const hotpepper_1 = __importDefault(require("./routes/hotpepper"));
const recruit_1 = __importDefault(require("./routes/recruit"));
const restaurants_1 = __importDefault(require("./routes/restaurants"));
const inquiryLeads_1 = __importDefault(require("./routes/inquiryLeads"));
const cpiImportService_1 = require("./services/cpiImportService");
const autoMigrate_1 = require("./migrations/autoMigrate");
const gmailService_1 = require("./services/gmailService");
const depositParser_1 = require("./utils/depositParser");
const slackClient_1 = require("./utils/slackClient");
dotenv_1.default.config();
// Debug: Check if globalSearch.js has correct code (only in production)
if (process.env.NODE_ENV === 'production' || true) {
    try {
        const globalSearchPath = path_1.default.join(__dirname, 'routes/globalSearch.js');
        if (fs_1.default.existsSync(globalSearchPath)) {
            const content = fs_1.default.readFileSync(globalSearchPath, 'utf8');
            if (content.includes('retargeting_customers')) {
                const retargetingSection = content.match(/retargeting_customers[\s\S]{0,300}LIMIT 10/)?.[0] || '';
                const hasPhone1 = retargetingSection.includes('phone1');
                if (hasPhone1) {
                    console.error('❌ ERROR: globalSearch.js still contains phone1 for retargeting_customers!');
                    console.error('Retargeting section:', retargetingSection.substring(0, 200));
                }
                else {
                    console.log('✅ OK: globalSearch.js uses phone only for retargeting_customers');
                }
            }
        }
        else {
            console.log('⚠️ globalSearch.js not found at:', globalSearchPath);
        }
    }
    catch (e) {
        console.error('Debug check failed:', e);
    }
}
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '5001', 10);
// Middleware
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests from any origin (for development/debugging)
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 200,
    maxAge: 86400
};
app.use((0, cors_1.default)(corsOptions));
app.options('*', (0, cors_1.default)(corsOptions));
app.use(express_1.default.json());
// Add request logging for debugging
app.use((req, res, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`Origin: ${req.headers.origin}`);
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${req.method} ${req.path}] ${res.statusCode} ${duration}ms`);
    });
    next();
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/retargeting', retargeting_1.default);
app.use('/api/sales', sales_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/perf', perf_1.default);
app.use('/api/sales-tracking', salesTracking_1.default);
app.use('/api/global-search', globalSearch_1.default);
app.use('/api/integrations', integrations_1.default);
app.use('/api/account-optimization', accountOptimization_1.default);
app.use('/api/meeting', meeting_1.default);
app.use('/api/keyword-analysis', keywordAnalysis_1.default);
app.use('/api/accounting', index_1.default);
app.use('/api/paypay', paypay_1.default);
app.use('/api/total-sales', totalSales_1.default);
app.use('/api/monthly-payroll', monthlyPayroll_1.default);
app.use('/api/invoices', invoices_1.default);
app.use('/api/receipts', receipts_1.default);
app.use('/api/excluded-partners', excludedPartners_1.default);
app.use('/api/line-upload', lineUpload_1.default);
app.use('/api/hotpepper', hotpepper_1.default); // 하위 호환성 유지
app.use('/api/recruit', recruit_1.default); // 통합 API
app.use('/api/restaurants', restaurants_1.default); // 음식점 CRM
app.use('/api/inquiry-leads', inquiryLeads_1.default); // 문의 배정 시스템
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Temporary test endpoint to check data
app.get('/api/test/customers', async (req, res) => {
    try {
        const result = await db_1.pool.query('SELECT COUNT(*) FROM customers');
        res.json({ count: result.rows[0].count, message: 'Database connection OK' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});
// Start server with auto-migration
async function startServer() {
    // 자동 마이그레이션 실행
    await (0, autoMigrate_1.autoMigrateSalesTracking)();
    await (0, autoMigrate_1.autoMigrateHotpepper)();
    await (0, autoMigrate_1.autoMigrateSalesAmountFields)();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`CORS enabled for all origins`);
    });
    // CPI 스케줄러 (외부 시스템 호출 + DB 작업)
    // - 개발서버에서는 기본 OFF (속도 흔들림/외부 호출 방지)
    // - 운영에서는 기본 ON (환경변수가 있고, 별도 OFF 설정이 없을 때)
    // - 강제 ON/OFF: ENABLE_CPI_SCHEDULER=1 또는 0
    const nodeEnv = (process.env.NODE_ENV || 'development').toLowerCase();
    const enableCpiScheduler = typeof process.env.ENABLE_CPI_SCHEDULER === 'string'
        ? process.env.ENABLE_CPI_SCHEDULER === '1'
        : nodeEnv === 'production';
    const token = process.env.CPI_API_TOKEN;
    const base = process.env.CPI_API_BASE;
    if (enableCpiScheduler && token && base) {
        console.log('CPI scheduler enabled (every 1 min)');
        setInterval(async () => {
            try {
                const now = new Date();
                const since = new Date(now.getTime() - 6 * 60 * 60 * 1000); // last 6 hours
                const result = await (0, cpiImportService_1.importRecentCalls)(since, now);
                if (result.inserted > 0 || result.updated > 0 || result.skipped > 0) {
                    console.log(`[CPI] Scheduled import: inserted=${result.inserted}, updated=${result.updated}, skipped=${result.skipped}`);
                }
            }
            catch (e) {
                console.error('[CPI] scheduler error:', e);
            }
        }, 60 * 1000);
    }
    else {
        console.log('CPI scheduler disabled');
        if (enableCpiScheduler && (!token || !base)) {
            console.warn('⚠️  CPI scheduler requested but CPI_API_TOKEN or CPI_API_BASE is missing');
        }
    }
    // Gmail 입금 알림 체크 스케줄러
    // - 개발서버에서는 기본 OFF
    // - 운영에서는 기본 ON
    // - 강제 ON/OFF: ENABLE_GMAIL_DEPOSIT_CHECK=1 또는 0
    const enableGmailDepositCheck = typeof process.env.ENABLE_GMAIL_DEPOSIT_CHECK === 'string'
        ? process.env.ENABLE_GMAIL_DEPOSIT_CHECK === '1'
        : nodeEnv === 'production';
    if (enableGmailDepositCheck) {
        console.log('Gmail deposit check scheduler enabled (every 5 min)');
        // 즉시 한 번 실행
        checkDepositEmailsAndNotify();
        // 5분마다 실행
        setInterval(async () => {
            await checkDepositEmailsAndNotify();
        }, 5 * 60 * 1000); // 5분 = 300,000ms
    }
    else {
        console.log('Gmail deposit check scheduler disabled');
    }
}
/**
 * 입금 메일 체크 및 Slack 알림 전송
 */
async function checkDepositEmailsAndNotify() {
    try {
        const emails = await (0, gmailService_1.checkDepositEmails)();
        if (emails.length === 0) {
            return;
        }
        console.log(`📬 Processing ${emails.length} deposit email(s)...`);
        for (const email of emails) {
            try {
                // 메일 본문 파싱
                const depositInfo = (0, depositParser_1.parseDepositEmail)(email.body);
                if (!depositInfo) {
                    console.log(`⚠️ Could not parse email: ${email.subject}`);
                    // 파싱 실패해도 읽음 처리 (반복 알림 방지)
                    await (0, gmailService_1.markAsRead)(email.id);
                    continue;
                }
                // Slack 알림 전송
                const sent = await (0, slackClient_1.sendDepositNotification)({
                    depositor_name: depositInfo.depositor_name,
                    amount: depositInfo.amount,
                    email_subject: email.subject,
                    email_date: email.date
                });
                if (sent) {
                    // 성공적으로 전송했으면 메일을 읽음으로 표시
                    await (0, gmailService_1.markAsRead)(email.id);
                }
            }
            catch (error) {
                console.error(`❌ Failed to process email ${email.id}:`, error.message);
            }
        }
        console.log(`✅ Processed ${emails.length} deposit email(s)`);
    }
    catch (error) {
        console.error('[Gmail] Deposit check error:', error.message);
    }
}
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing connections...');
    db_1.pool.end();
    process.exit(0);
});
// Handle errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
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
//# sourceMappingURL=index.js.map