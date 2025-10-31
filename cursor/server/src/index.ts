import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pool } from './db'
import authRoutes from './routes/auth'
import customersRoutes from './routes/customers'
import retargetingRoutes from './routes/retargeting'
import salesRoutes from './routes/sales'
import dashboardRoutes from './routes/dashboard'
import perfRoutes from './routes/perf'

dotenv.config()

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
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  console.log(`Origin: ${req.headers.origin}`)
  next()
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/customers', customersRoutes)
app.use('/api/retargeting', retargetingRoutes)
app.use('/api/sales', salesRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/perf', perfRoutes)

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
    res.status(500).json({ error: error.message })
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
  console.log(`CORS enabled for all origins`)
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


