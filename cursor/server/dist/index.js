"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const customers_1 = __importDefault(require("./routes/customers"));
const retargeting_1 = __importDefault(require("./routes/retargeting"));
const sales_1 = __importDefault(require("./routes/sales"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const perf_1 = __importDefault(require("./routes/perf"));
dotenv_1.default.config();
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
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log(`Origin: ${req.headers.origin}`);
    next();
});
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/customers', customers_1.default);
app.use('/api/retargeting', retargeting_1.default);
app.use('/api/sales', sales_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/perf', perf_1.default);
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
        res.status(500).json({ error: error.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`CORS enabled for all origins`);
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