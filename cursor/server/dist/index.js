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
const keywordAnalysis_1 = __importDefault(require("./routes/keywordAnalysis"));
const cpiImportService_1 = require("./services/cpiImportService");
const autoMigrate_1 = require("./migrations/autoMigrate");
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
const PORT = process.env.PORT || 5000;
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
app.use('/api/keyword-analysis', keywordAnalysis_1.default);
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
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`CORS enabled for all origins`);
    });
    // Start CPI scheduler (every 1 min)
    // 환경변수가 없어도 스케줄러는 시작하되, 에러 메시지로 환경변수 부재를 알림
    const token = process.env.CPI_API_TOKEN;
    const base = process.env.CPI_API_BASE;
    console.log('CPI scheduler enabled (every 1 min)');
    if (!token || !base) {
        console.warn('⚠️  CPI_API_TOKEN or CPI_API_BASE not set - CPI import will fail until environment variables are configured');
    }
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
//# sourceMappingURL=index.js.map