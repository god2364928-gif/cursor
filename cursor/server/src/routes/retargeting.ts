import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import multer from 'multer'
import * as XLSX from 'xlsx'
import { parse as parseCsvSync } from 'csv-parse/sync'

// Date 객체를 한국 시간대(KST)의 YYYY-MM-DD 문자열로 변환하는 헬퍼 함수
const toKSTDateString = (date: Date | string | null | undefined): string | null => {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return null; // 유효하지 않은 날짜

  const offset = d.getTimezoneOffset() * 60 * 1000; 
  const kstOffset = 9 * 60 * 60 * 1000; 
  const kstTime = d.getTime() + offset + kstOffset; 
  const kstDate = new Date(kstTime);

  const year = kstDate.getFullYear();
  const month = (kstDate.getMonth() + 1).toString().padStart(2, '0');
  const day = kstDate.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const router = Router()

// Helper function to decode file name
const decodeFileName = (fileName: string): string => {
  try {
    // Try to decode if it's URL encoded
    return decodeURIComponent(fileName)
  } catch (e) {
    // If decoding fails, return as is
    return fileName
  }
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
})

// Get all retargeting customers
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM retargeting_customers ORDER BY registered_at DESC'
    )
    
    // Convert snake_case to camelCase
    const customers = result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      industry: row.industry,
      customerName: row.customer_name,
      phone: row.phone,
      region: row.region,
      inflowPath: row.inflow_path,
      manager: row.manager,
      managerTeam: row.manager_team,
      status: row.status,
      contractHistoryCategory: row.contract_history_category,
      lastContactDate: row.last_contact_date,
      memo: row.memo,
      homepage: row.homepage,
      instagram: row.instagram,
      mainKeywords: row.main_keywords || [],
      registeredAt: toKSTDateString(row.registered_at)
    }))
    
    res.json(customers)
  } catch (error) {
    console.error('Error fetching retargeting customers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Create new retargeting customer
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { companyName, industry, customerName, phone, region, inflowPath, manager, managerTeam, status, registeredAt, contractHistoryCategory } = req.body
    
    const result = await pool.query(
      `INSERT INTO retargeting_customers (
        company_name, industry, customer_name, phone, region, inflow_path,
        manager, manager_team, status, registered_at, contract_history_category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [companyName, industry, customerName, phone || null, region || null, inflowPath || null,
       manager, managerTeam || null, status || '시작', registeredAt || new Date().toISOString().split('T')[0], contractHistoryCategory || null]
    )
    
    const customer = result.rows[0]
    const camelCaseCustomer = {
      id: customer.id,
      companyName: customer.company_name,
      industry: customer.industry,
      customerName: customer.customer_name,
      phone: customer.phone,
      region: customer.region,
      inflowPath: customer.inflow_path,
      manager: customer.manager,
      managerTeam: customer.manager_team,
      status: customer.status,
      contractHistoryCategory: customer.contract_history_category,
      lastContactDate: toKSTDateString(customer.last_contact_date),
      memo: customer.memo,
      homepage: customer.homepage,
      instagram: customer.instagram,
      mainKeywords: customer.main_keywords || [],
      registeredAt: toKSTDateString(customer.registered_at)
    }
    
    res.json(camelCaseCustomer)
  } catch (error) {
    console.error('Error creating retargeting customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get single retargeting customer
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query('SELECT * FROM retargeting_customers WHERE id = $1', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    const customer = result.rows[0]
    const camelCaseCustomer = {
      id: customer.id,
      companyName: customer.company_name,
      industry: customer.industry,
      customerName: customer.customer_name,
      phone: customer.phone,
      region: customer.region,
      inflowPath: customer.inflow_path,
      manager: customer.manager,
      managerTeam: customer.manager_team,
      status: customer.status,
      contractHistoryCategory: customer.contract_history_category,
      nextContactDate: toKSTDateString(customer.next_contact_date),
      lastContactDate: toKSTDateString(customer.last_contact_date),
      memo: customer.memo,
      homepage: customer.homepage,
      instagram: customer.instagram,
      mainKeywords: customer.main_keywords || [],
      registeredAt: toKSTDateString(customer.registered_at)
    }
    
    res.json(camelCaseCustomer)
  } catch (error) {
    console.error('Error fetching retargeting customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update retargeting customer
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { companyName, industry, customerName, phone, region, inflowPath, manager, managerTeam, status, lastContactDate, contractHistoryCategory, memo, homepage, instagram, mainKeywords, registeredAt } = req.body
    
    // Check if retargeting customer exists and get manager info
    const customerResult = await pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id])
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }
    
    const customer = customerResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    // Trim spaces for comparison
    const userName = req.user?.name?.trim() || ''
    const customerManager = customer.manager?.trim() || ''
    
    if (req.user?.role !== 'admin' && customerManager !== userName) {
      return res.status(403).json({ message: 'You can only edit retargeting customers assigned to you' })
    }
    
    await pool.query(
      `UPDATE retargeting_customers SET
        company_name = $1, industry = $2, customer_name = $3, phone = $4,
        region = $5, inflow_path = $6, manager = $7, manager_team = $8,
        status = $9, last_contact_date = $10, contract_history_category = $11,
        memo = $12, homepage = $13, instagram = $14, main_keywords = $15, registered_at = $16
      WHERE id = $17`,
      [companyName, industry, customerName, phone || null, region, inflowPath,
       manager, managerTeam, status, lastContactDate, contractHistoryCategory, memo, homepage, instagram, mainKeywords, registeredAt, id]
    )
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating retargeting customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete retargeting customer
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // Check if retargeting customer exists and get manager info
    const customerResult = await pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id])
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }
    
    const customer = customerResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    // Trim spaces for comparison
    const userName = req.user?.name?.trim() || ''
    const customerManager = customer.manager?.trim() || ''
    
    if (req.user?.role !== 'admin' && customerManager !== userName) {
      return res.status(403).json({ message: 'You can only delete retargeting customers assigned to you' })
    }
    
    await pool.query('DELETE FROM retargeting_customers WHERE id = $1', [id])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting retargeting customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get customer history
router.get('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'SELECT * FROM retargeting_history WHERE retargeting_customer_id = $1 ORDER BY created_at DESC',
      [id]
    )
    
    const history = result.rows.map(row => ({
      id: row.id,
      retargetingCustomerId: row.retargeting_customer_id,
      userId: row.user_id,
      userName: row.user_name,
      type: row.type,
      content: row.content,
      createdAt: row.created_at,
      isPinned: false
    }))
    
    res.json(history)
  } catch (error) {
    console.error('Error fetching retargeting history:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Add history
router.post('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { type, content } = req.body
    
    // Check if retargeting customer exists and get manager info
    const customerResult = await pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id])
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }
    
    const customer = customerResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    // Trim spaces for comparison
    const userName = req.user?.name?.trim() || ''
    const customerManager = customer.manager?.trim() || ''
    
    console.log('Retargeting history permission check:', {
      userRole: req.user?.role,
      userName: userName,
      customerManager: customerManager,
      isAdmin: req.user?.role === 'admin',
      managerMatch: customerManager === userName,
      userNameLength: userName.length,
      managerLength: customerManager.length
    })
    
    if (req.user?.role !== 'admin' && customerManager !== userName) {
      console.log('Permission denied:', { customerManager, userName, match: false })
      return res.status(403).json({ message: 'You can only add history to retargeting customers assigned to you' })
    }
    
    const result = await pool.query(
      'INSERT INTO retargeting_history (retargeting_customer_id, user_id, user_name, type, content) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, req.user?.id, req.user?.name, type, content]
    )
    
    const historyItem = result.rows[0]
    const camelCaseHistory = {
      id: historyItem.id,
      retargetingCustomerId: historyItem.retargeting_customer_id,
      userId: historyItem.user_id,
      userName: historyItem.user_name,
      type: historyItem.type,
      content: historyItem.content,
      createdAt: historyItem.created_at
    }
    
    res.json(camelCaseHistory)
  } catch (error) {
    console.error('Error adding retargeting history:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete history (admin only)
router.delete('/:id/history/:historyId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }
    
    const { id, historyId } = req.params
    
    // Check if history exists and belongs to this retargeting customer
    const historyCheck = await pool.query(
      'SELECT id FROM retargeting_history WHERE id = $1 AND retargeting_customer_id = $2',
      [historyId, id]
    )
    
    if (historyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'History not found' })
    }
    
    // Delete history
    await pool.query('DELETE FROM retargeting_history WHERE id = $1', [historyId])
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting retargeting history:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Toggle history pin status
router.patch('/:id/history/:historyId/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, historyId } = req.params
    const { isPinned } = req.body
    
    // 히스토리가 해당 리타겟팅 고객에 속하는지 확인
    const historyCheck = await pool.query(
      'SELECT id FROM retargeting_history WHERE id = $1 AND retargeting_customer_id = $2',
      [historyId, id]
    )
    
    if (historyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'History not found' })
    }
    
    // 고정 상태 업데이트
    const result = await pool.query(
      'UPDATE retargeting_history SET is_pinned = $1 WHERE id = $2 RETURNING *',
      [isPinned, historyId]
    )
    
    res.json({ 
      id: result.rows[0].id,
      isPinned: result.rows[0].is_pinned 
    })
  } catch (error) {
    console.error('Error toggling retargeting history pin:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Convert to regular customer
router.post('/:id/convert', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { monthlyBudget, contractStartDate, contractExpirationDate } = req.body
    
    // Get retargeting customer
    const retargetingResult = await pool.query('SELECT * FROM retargeting_customers WHERE id = $1', [id])
    
    if (retargetingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }
    
    const retargetingCustomer = retargetingResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    if (req.user?.role !== 'admin' && retargetingCustomer.manager !== req.user?.name) {
      return res.status(403).json({ message: 'You can only convert retargeting customers assigned to you' })
    }
    
    // Insert into customers table
    const customerResult = await pool.query(
      `INSERT INTO customers (
        company_name, industry, customer_name, phone1,
        region, inflow_path, manager, manager_team,
        monthly_budget, contract_start_date, contract_expiration_date,
        status, homepage, instagram, main_keywords, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        retargetingCustomer.company_name,
        retargetingCustomer.industry,
        retargetingCustomer.customer_name,
        retargetingCustomer.phone,
        retargetingCustomer.region,
        retargetingCustomer.inflow_path,
        retargetingCustomer.manager,
        retargetingCustomer.manager_team,
        monthlyBudget,
        contractStartDate,
        contractExpirationDate,
        '계약중',
        retargetingCustomer.homepage,
        retargetingCustomer.instagram,
        retargetingCustomer.main_keywords,
        retargetingCustomer.memo
      ]
    )
    
    const newCustomer = customerResult.rows[0]
    
    // 리타겟팅 히스토리를 고객 히스토리로 이동
    const historyResult = await pool.query(
      'SELECT * FROM retargeting_history WHERE retargeting_customer_id = $1',
      [id]
    )
    
    if (historyResult.rows.length > 0) {
      for (const history of historyResult.rows) {
        // 히스토리 타입 매핑: 부재중 -> 통화시도, 통화성공 -> 통화성공, 카톡 -> 카톡, 메모 -> 메모
        let mappedType = history.type
        if (history.type === 'missed_call') {
          mappedType = 'call_attempt'
        }
        
        // user_id가 NULL이면 기본값 사용
        const userId = history.user_id || req.user?.id
        const userName = history.user_name || req.user?.name || 'Unknown'
        
        await pool.query(
          `INSERT INTO customer_history (
            customer_id, user_id, user_name, type, content, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newCustomer.id,
            userId,
            userName,
            mappedType,
            history.content,
            history.created_at
          ]
        )
      }
    }
    
    // Delete retargeting customer after conversion
    await pool.query('DELETE FROM retargeting_customers WHERE id = $1', [id])
    
    const customer = newCustomer
    const camelCaseCustomer = {
      id: customer.id,
      companyName: customer.company_name,
      industry: customer.industry,
      customerName: customer.customer_name,
      phone1: customer.phone1,
      region: customer.region,
      inflowPath: customer.inflow_path,
      manager: customer.manager,
      managerTeam: customer.manager_team,
      status: customer.status,
      monthlyBudget: customer.monthly_budget,
      contractStartDate: customer.contract_start_date,
      contractExpirationDate: customer.contract_expiration_date,
      registeredAt: customer.registration_date
    }
    
    res.json(camelCaseCustomer)
  } catch (error) {
    console.error('Error converting retargeting customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get personal statistics
router.get('/stats/personal', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT manager, 
        COUNT(*) as total,
        COUNT(CASE WHEN status = '시작' THEN 1 END) as start,
        COUNT(CASE WHEN status = '인지' THEN 1 END) as awareness,
        COUNT(CASE WHEN status = '흥미' THEN 1 END) as interest,
        COUNT(CASE WHEN status = '욕망' THEN 1 END) as desire,
        COUNT(CASE WHEN status = '계약완료' THEN 1 END) as completed
      FROM retargeting_customers
      GROUP BY manager
      ORDER BY manager`
    )
    
    const stats = result.rows.map(row => ({
      manager: row.manager,
      total: parseInt(row.total),
      start: parseInt(row.start),
      awareness: parseInt(row.awareness),
      interest: parseInt(row.interest),
      desire: parseInt(row.desire),
      completed: parseInt(row.completed)
    }))
    
    res.json(stats)
  } catch (error) {
    console.error('Error fetching personal stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// File upload endpoints
// Upload file
router.post('/:id/files', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    const { id } = req.params

    // Check if retargeting customer exists and user has permission
    const customerResult = await pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id])
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }

    const customer = customerResult.rows[0]
    const userName = req.user?.name?.trim() || ''
    const customerManager = customer.manager?.trim() || ''

    // Check permission: admin or assigned manager
    if (req.user?.role !== 'admin' && customerManager !== userName) {
      return res.status(403).json({ message: 'You can only upload files to retargeting customers assigned to you' })
    }

    // Convert file buffer to Base64
    const fileDataBase64 = req.file.buffer.toString('base64')

    // Decode file name to handle Korean/Japanese characters
    const decodedFileName = decodeFileName(req.file.originalname)

    // Insert file into database
    const result = await pool.query(
      `INSERT INTO retargeting_files (retargeting_customer_id, user_id, file_name, original_name, file_type, file_size, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, retargeting_customer_id, user_id, file_name, original_name, file_type, file_size, created_at`,
      [
        id,
        req.user?.id,
        decodedFileName,
        decodedFileName,
        req.file.mimetype || 'application/octet-stream',
        req.file.size,
        fileDataBase64
      ]
    )

    const file = result.rows[0]
    const camelCaseFile = {
      id: file.id,
      retargetingCustomerId: file.retargeting_customer_id,
      userId: file.user_id,
      fileName: file.file_name,
      originalName: file.original_name,
      fileType: file.file_type,
      fileSize: file.file_size,
      createdAt: file.created_at
    }

    res.json(camelCaseFile)
  } catch (error: any) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 20MB limit' })
    }
    console.error('Error uploading file:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get all files for a retargeting customer
router.get('/:id/files', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'SELECT id, retargeting_customer_id, user_id, file_name, original_name, file_type, file_size, created_at FROM retargeting_files WHERE retargeting_customer_id = $1 ORDER BY created_at DESC',
      [id]
    )

    const files = result.rows.map(row => ({
      id: row.id,
      retargetingCustomerId: row.retargeting_customer_id,
      userId: row.user_id,
      fileName: row.file_name,
      originalName: row.original_name,
      fileType: row.file_type,
      fileSize: row.file_size,
      createdAt: row.created_at
    }))

    res.json(files)
  } catch (error) {
    console.error('Error fetching files:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Download file
router.get('/:id/files/:fileId/download', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, fileId } = req.params

    const result = await pool.query(
      'SELECT file_name, original_name, file_type, file_data FROM retargeting_files WHERE id = $1 AND retargeting_customer_id = $2',
      [fileId, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    const file = result.rows[0]
    const fileBuffer = Buffer.from(file.file_data, 'base64')

    res.setHeader('Content-Type', file.file_type)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`)
    res.send(fileBuffer)
  } catch (error) {
    console.error('Error downloading file:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Rename file
router.patch('/:id/files/:fileId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, fileId } = req.params
    const { fileName } = req.body

    if (!fileName || !fileName.trim()) {
      return res.status(400).json({ message: 'File name is required' })
    }

    // Check if file exists
    const fileCheck = await pool.query(
      'SELECT retargeting_customer_id FROM retargeting_files WHERE id = $1',
      [fileId]
    )

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    // Check if retargeting customer exists and user has permission
    const customerResult = await pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id])
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }

    const customer = customerResult.rows[0]
    const userName = req.user?.name?.trim() || ''
    const customerManager = customer.manager?.trim() || ''

    // Check permission: admin or assigned manager
    if (req.user?.role !== 'admin' && customerManager !== userName) {
      return res.status(403).json({ message: 'You can only rename files for retargeting customers assigned to you' })
    }

    await pool.query(
      'UPDATE retargeting_files SET file_name = $1 WHERE id = $2',
      [fileName.trim(), fileId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error renaming file:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete file
router.delete('/:id/files/:fileId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, fileId } = req.params

    // Check if file exists
    const fileCheck = await pool.query(
      'SELECT retargeting_customer_id FROM retargeting_files WHERE id = $1',
      [fileId]
    )

    if (fileCheck.rows.length === 0) {
      return res.status(404).json({ message: 'File not found' })
    }

    // Check if retargeting customer exists and user has permission
    const customerResult = await pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id])
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Retargeting customer not found' })
    }

    const customer = customerResult.rows[0]
    const userName = req.user?.name?.trim() || ''
    const customerManager = customer.manager?.trim() || ''

    // Check permission: admin or assigned manager
    if (req.user?.role !== 'admin' && customerManager !== userName) {
      return res.status(403).json({ message: 'You can only delete files for retargeting customers assigned to you' })
    }

    await pool.query('DELETE FROM retargeting_files WHERE id = $1', [fileId])

    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router

// ============================
// Import (CSV/XLSX upload)
// ============================

function normalizePhone(input: any): string | null {
  if (input === null || input === undefined) return null
  let s = String(input).trim()
  if (!s) return null
  s = s.replace(/\s+/g, '').replace(/-/g, '')
  if (/^\d+(?:\.\d+)?e\+\d+$/i.test(s)) {
    const num = Number(s)
    if (!Number.isNaN(num)) s = Math.round(num).toString()
  }
  s = s.replace(/[^0-9]/g, '')
  if (!s) return null
  if (!s.startsWith('0') && (s.length === 9 || s.length === 10 || s.length === 11)) {
    s = '0' + s
  }
  if (s.length > 15) s = s.slice(0, 15)
  return s
}

function extractInstagramId(value: string | null | undefined): string | null {
  if (!value) return null
  const s = String(value).trim()
  if (!s) return null
  const at = s.startsWith('@') ? s.slice(1) : s
  try {
    const u = new URL(at.includes('://') ? at : `https://instagram.com/${at}`)
    const parts = u.pathname.split('/').filter(Boolean)
    return parts[0] || null
  } catch {
    return at
  }
}

function toDateYYYYMMDD(str: string | null | undefined): string | null {
  if (!str) return null
  const s = String(str).trim()
  if (!s) return null
  const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (m) {
    const y = m[1]
    const mo = m[2].padStart(2, '0')
    const d = m[3].padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  const dt = new Date(s)
  if (!isNaN(dt.getTime())) {
    const y = dt.getFullYear()
    const mo = String(dt.getMonth() + 1).padStart(2, '0')
    const d = String(dt.getDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }
  return null
}

router.post('/import', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    const name = req.file.originalname.toLowerCase()
    let rows: any[] = []

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
    } else {
      const text = req.file.buffer.toString('utf8')
      rows = parseCsvSync(text, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true, bom: true }) as any[]
    }

    let inserted = 0
    let updated = 0
    let processed = 0

    for (const row of rows) {
      processed++
      const manager = ((row['担当者'] || row['\uFEFF担当者'] || '') as string).trim()
      let companyName = (row['商号'] || '').trim()
      let customerName = (row['顧客名'] || '').trim()
      const industry = (row['業種'] || '').trim() || null
      const region = (row['地域'] || '').trim() || null
      const inflowPath = (row['流入経路'] || '').trim() || null
      const contractHistoryCategory = (row['契約履歴'] || '').trim() || null
      const category = (row['カテゴリ'] || '').trim()
      const registeredAt = toDateYYYYMMDD((row['登録日'] || (row as any)['\uFEFF登録日']) as string)
      const lastContactDate = toDateYYYYMMDD(row['最終連絡日'])
      const homepage = (row['ホームページ'] || '').trim() || null
      const instagram = extractInstagramId(row['Instagram'])
      const memo = (row['メモ'] || '').trim() || null
      const phone = normalizePhone(row['電話番号'])

      if (!companyName && !customerName) continue
      if (!customerName) customerName = ''

      let status: string | null = null
      if (category === '開始') status = '시작'

      // Upsert by instagram or phone if exists
      let existing: any = null
      if (instagram) {
        const r = await pool.query('SELECT id FROM retargeting_customers WHERE instagram = $1', [instagram])
        existing = r.rows[0]
      }
      if (!existing && phone) {
        const r = await pool.query('SELECT id FROM retargeting_customers WHERE phone = $1', [phone])
        existing = r.rows[0]
      }

      if (existing) {
        await pool.query(
          `UPDATE retargeting_customers SET
            company_name = COALESCE($1, company_name),
            industry = COALESCE($2, industry),
            customer_name = COALESCE($3, customer_name),
            region = COALESCE($4, region),
            inflow_path = COALESCE($5, inflow_path),
            manager = COALESCE($6, manager),
            contract_history_category = COALESCE($7, contract_history_category),
            status = COALESCE($8, status),
            registered_at = COALESCE($9, registered_at),
            last_contact_date = COALESCE($10, last_contact_date, $9),
            homepage = COALESCE($11, homepage),
            instagram = COALESCE($12, instagram),
            memo = COALESCE($13, memo)
          WHERE id = $14`,
          [
            companyName || null,
            industry,
            customerName || null,
            region,
            inflowPath,
            manager || null,
            contractHistoryCategory,
            status,
            registeredAt,
            lastContactDate,
            homepage,
            instagram,
            memo,
            existing.id
          ]
        )
        updated++
      } else {
        await pool.query(
          `INSERT INTO retargeting_customers (
            company_name, industry, customer_name, phone, region, inflow_path,
            manager, manager_team, status, registered_at, contract_history_category,
            homepage, instagram, memo, last_contact_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11, $12, $13, $14)`,
          [
            companyName,
            industry,
            customerName,
            phone,
            region,
            inflowPath,
            manager || null,
            status || '시작',
            registeredAt,
            contractHistoryCategory,
            homepage,
            instagram,
            memo,
            lastContactDate || registeredAt
          ]
        )
        inserted++
      }
    }

    res.json({ processed, inserted, updated })
  } catch (error) {
    console.error('Error importing retargeting:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})