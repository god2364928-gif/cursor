import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Create customer
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyName, industry, customerName, phone1, phone2, phone3,
      customerType, businessModel, region, homepage, blog, instagram,
      otherChannel, mainKeywords, monthlyBudget, contractStartDate,
      contractExpirationDate, productType, paymentDate, status,
      inflowPath, manager, managerTeam, memo
    } = req.body
    
    // 필수 필드 검증
    if (!companyName || !customerName || !phone1) {
      return res.status(400).json({ message: 'Company name, customer name, and phone1 are required' })
    }
    
    // 담당자와 팀을 자동으로 설정 (없으면 현재 사용자 정보)
    const finalManager = manager || req.user?.name
    const finalTeam = managerTeam || req.user?.team
    
    const result = await pool.query(
      `INSERT INTO customers (
        company_name, industry, customer_name, title, phone1, phone2, phone3,
        customer_type, business_model, region, homepage, blog, instagram,
        other_channel, kpi_data_url, top_exposure_count, requirements,
        main_keywords, monthly_budget, contract_start_date,
        contract_expiration_date, product_type, payment_date, status,
        inflow_path, manager, manager_team, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`,
      [
        companyName, industry, customerName, req.body.title || null, phone1, phone2 || null, phone3 || null,
        customerType || null, businessModel || null, region || null,
        homepage || null, blog || null, instagram || null,
        otherChannel || null, req.body.kpiDataUrl || null, req.body.topExposureCount || 0,
        req.body.requirements || null, mainKeywords || null,
        monthlyBudget || 0, contractStartDate || null,
        contractExpirationDate || null, productType || null,
        paymentDate || null, status || '契約中',
        inflowPath || null, finalManager, finalTeam,
        memo || null
      ]
    )
    
    res.json({ id: result.rows[0].id })
  } catch (error) {
    console.error('Error creating customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get all customers
// Get all customers with filtering
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, company_name, industry, customer_name, title, phone1, phone2, phone3,
        customer_type, business_model, region, homepage, blog, instagram,
        contract_history_category, other_channel, kpi_data_url, top_exposure_count, requirements,
        main_keywords, monthly_budget,
        to_char(contract_start_date, 'YYYY-MM-DD') AS contract_start_date_str,
        to_char(contract_expiration_date, 'YYYY-MM-DD') AS contract_expiration_date_str,
        product_type,
        to_char(payment_date, 'YYYY-MM-DD') AS payment_date_str,
        status, inflow_path, manager, manager_team,
        to_char(registration_date, 'YYYY-MM-DD') AS registration_date_str,
        last_contact, last_talk, last_call, memo
       FROM customers
       ORDER BY registration_date DESC`
    )
    // Convert snake_case to camelCase
    const customers = result.rows.map(row => ({
      id: row.id,
      companyName: row.company_name,
      industry: row.industry,
      customerName: row.customer_name,
      title: row.title,
      phone1: row.phone1,
      phone2: row.phone2,
      phone3: row.phone3,
      customerType: row.customer_type,
      businessModel: row.business_model,
      region: row.region,
      operatingPeriod: row.operating_period,
      homepage: row.homepage,
      blog: row.blog,
      instagram: row.instagram,
      contractHistoryCategory: row.contract_history_category,
      otherChannel: row.other_channel,
      kpiDataUrl: row.kpi_data_url,
      topExposureCount: row.top_exposure_count,
      requirements: row.requirements,
      mainKeywords: row.main_keywords,
      monthlyBudget: row.monthly_budget,
      contractStartDate: row.contract_start_date_str || row.contract_start_date,
      contractExpirationDate: row.contract_expiration_date_str || row.contract_expiration_date,
      productType: row.product_type,
      paymentDate: row.payment_date_str || row.payment_date,
      status: row.status,
      inflowPath: row.inflow_path,
      manager: row.manager,
      managerTeam: row.manager_team,
      registrationDate: row.registration_date_str || row.registration_date,
      lastContact: row.last_contact,
      lastTalk: row.last_talk,
      lastCall: row.last_call,
      memo: row.memo
    }))
    res.json(customers)
  } catch (error) {
    console.error('Error fetching customers:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get single customer
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT 
        id, company_name, industry, customer_name, title, phone1, phone2, phone3,
        customer_type, business_model, region, homepage, blog, instagram,
        contract_history_category, other_channel, kpi_data_url, top_exposure_count, requirements,
        main_keywords, monthly_budget,
        to_char(contract_start_date, 'YYYY-MM-DD') AS contract_start_date_str,
        to_char(contract_expiration_date, 'YYYY-MM-DD') AS contract_expiration_date_str,
        product_type,
        to_char(payment_date, 'YYYY-MM-DD') AS payment_date_str,
        status, inflow_path, manager, manager_team,
        to_char(registration_date, 'YYYY-MM-DD') AS registration_date_str,
        to_char(last_contact, 'YYYY-MM-DD') AS last_contact_str,
        to_char(last_talk, 'YYYY-MM-DD') AS last_talk_str,
        to_char(last_call, 'YYYY-MM-DD') AS last_call_str,
        memo
       FROM customers WHERE id = $1`,
      [id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    const row = result.rows[0]
    const customer = {
      id: row.id,
      companyName: row.company_name,
      industry: row.industry,
      customerName: row.customer_name,
      title: row.title,
      phone1: row.phone1,
      phone2: row.phone2,
      phone3: row.phone3,
      customerType: row.customer_type,
      businessModel: row.business_model,
      region: row.region,
      operatingPeriod: row.operating_period,
      homepage: row.homepage,
      blog: row.blog,
      instagram: row.instagram,
      contractHistoryCategory: row.contract_history_category,
      otherChannel: row.other_channel,
      kpiDataUrl: row.kpi_data_url,
      topExposureCount: row.top_exposure_count,
      requirements: row.requirements,
      mainKeywords: row.main_keywords,
      monthlyBudget: row.monthly_budget,
      contractStartDate: row.contract_start_date_str || row.contract_start_date,
      contractExpirationDate: row.contract_expiration_date_str || row.contract_expiration_date,
      productType: row.product_type,
      paymentDate: row.payment_date_str || row.payment_date,
      status: row.status,
      inflowPath: row.inflow_path,
      manager: row.manager,
      managerTeam: row.manager_team,
      registrationDate: row.registration_date_str || row.registration_date,
      lastContact: row.last_contact_str || row.last_contact,
      lastTalk: row.last_talk_str || row.last_talk,
      lastCall: row.last_call_str || row.last_call,
      memo: row.memo
    }
    
    res.json(customer)
  } catch (error) {
    console.error('Error fetching customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get customer history
router.get('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT h.*, u.name as user_name 
       FROM customer_history h
       LEFT JOIN users u ON h.user_id = u.id
       WHERE h.customer_id = $1 
       ORDER BY h.is_pinned DESC, h.created_at DESC`,
      [id]
    )
    
    const history = result.rows.map(row => ({
      id: row.id,
      customerId: row.customer_id,
      userId: row.user_id,
      userName: row.user_name || 'Unknown',
      type: row.type,
      content: row.content,
      createdAt: row.created_at,
      isPinned: row.is_pinned || false
    }))
    
    res.json(history)
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Add history
router.post('/:id/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { type, content } = req.body
    
    // Check if customer exists and get manager info
    const customerResult = await pool.query('SELECT manager FROM customers WHERE id = $1', [id])
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    const customer = customerResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    console.log('History permission check:', {
      userRole: req.user?.role,
      userName: req.user?.name,
      customerManager: customer.manager,
      isAdmin: req.user?.role === 'admin',
      managerMatch: customer.manager === req.user?.name
    })
    
    if (req.user?.role !== 'admin' && customer.manager !== req.user?.name) {
      return res.status(403).json({ message: 'You can only add history to customers assigned to you' })
    }
    
    if (!type || !content) {
      return res.status(400).json({ message: 'Type and content are required' })
    }
    
    const result = await pool.query(
      'INSERT INTO customer_history (customer_id, user_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, req.user?.id, type, content]
    )
    
    res.json({ id: result.rows[0].id })
  } catch (error) {
    console.error('Error adding history:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Toggle history pin status
router.patch('/:id/history/:historyId/pin', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id, historyId } = req.params
    const { isPinned } = req.body
    
    // 히스토리가 해당 고객에 속하는지 확인
    const historyCheck = await pool.query(
      'SELECT id FROM customer_history WHERE id = $1 AND customer_id = $2',
      [historyId, id]
    )
    
    if (historyCheck.rows.length === 0) {
      return res.status(404).json({ message: 'History not found' })
    }
    
    // 고정 상태 업데이트
    const result = await pool.query(
      'UPDATE customer_history SET is_pinned = $1 WHERE id = $2 RETURNING *',
      [isPinned, historyId]
    )
    
    res.json({ 
      id: result.rows[0].id,
      isPinned: result.rows[0].is_pinned 
    })
  } catch (error) {
    console.error('Error toggling history pin:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update customer
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    // Check if customer exists and get manager info
    const customerResult = await pool.query('SELECT manager FROM customers WHERE id = $1', [id])
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    const customer = customerResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    if (req.user?.role !== 'admin' && customer.manager !== req.user?.name) {
      return res.status(403).json({ message: 'You can only edit customers assigned to you' })
    }
    
    // Build update query dynamically
    const setClause: string[] = []
    const values: any[] = []
    let paramCount = 1
    
    // Map camelCase to snake_case and build update statement
    const fieldMap: Record<string, string> = {
      companyName: 'company_name',
      industry: 'industry',
      customerName: 'customer_name',
      title: 'title',
      phone1: 'phone1',
      phone2: 'phone2',
      phone3: 'phone3',
      customerType: 'customer_type',
      businessModel: 'business_model',
      region: 'region',
      operatingPeriod: 'operating_period',
      homepage: 'homepage',
      blog: 'blog',
      instagram: 'instagram',
      otherChannel: 'other_channel',
      kpiDataUrl: 'kpi_data_url',
      topExposureCount: 'top_exposure_count',
      requirements: 'requirements',
      mainKeywords: 'main_keywords',
      monthlyBudget: 'monthly_budget',
      contractStartDate: 'contract_start_date',
      contractExpirationDate: 'contract_expiration_date',
      productType: 'product_type',
      paymentDate: 'payment_date',
      status: 'status',
      inflowPath: 'inflow_path',
      manager: 'manager',
      managerTeam: 'manager_team',
      contractHistoryCategory: 'contract_history_category',
      memo: 'memo'
    }
    
    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key]) {
        setClause.push(`${fieldMap[key]} = $${paramCount++}`)
        values.push(value)
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' })
    }
    
    values.push(id)
    const query = `UPDATE customers SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`
    
    const result = await pool.query(query, values)
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error updating customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Extend contract
router.post('/:id/extend', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    
    // Get current expiration date and manager info
    const customerResult = await pool.query(
      'SELECT contract_expiration_date, manager FROM customers WHERE id = $1',
      [id]
    )
    
    if (customerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    const customer = customerResult.rows[0]
    
    // Check if user is the manager of this customer (or admin)
    if (req.user?.role !== 'admin' && customer.manager !== req.user?.name) {
      return res.status(403).json({ message: 'You can only extend contracts for customers assigned to you' })
    }
    
    const oldExpirationDate = customer.contract_expiration_date
    // 날짜를 YYYY-MM-DD 형식으로 변환
    const formattedOldDate = oldExpirationDate instanceof Date 
      ? oldExpirationDate.toISOString().split('T')[0] 
      : oldExpirationDate.split('T')[0] || oldExpirationDate
    
    const oldDate = new Date(formattedOldDate)
    
    // Add 1 month
    const newDate = new Date(oldDate)
    newDate.setMonth(newDate.getMonth() + 1)
    
    const newExpirationDate = newDate.toISOString().split('T')[0]
    
    // Update expiration date
    await pool.query(
      'UPDATE customers SET contract_expiration_date = $1 WHERE id = $2',
      [newExpirationDate, id]
    )
    
    // Add history entry
    const content = `계약 1개월 연장 (${formattedOldDate} → ${newExpirationDate})`
    await pool.query(
      'INSERT INTO customer_history (customer_id, user_id, type, content) VALUES ($1, $2, $3, $4)',
      [id, req.user?.id, 'contract_extended', content]
    )
    
    res.json({ success: true, newExpirationDate })
  } catch (error) {
    console.error('Error extending contract:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Create new customer
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const {
      companyName, industry, customerName, phone1, phone2, phone3,
      manager, managerTeam, status, inflowChannel,
      monthlyBudget, contractStartDate, contractExpirationDate, productType,
      homepage, blog, instagram, otherChannels,
      mainKeywords, requirements, memo
    } = req.body
    
    const result = await pool.query(
      `INSERT INTO customers (
        company_name, industry, customer_name, phone1, phone2, phone3,
        manager, manager_team, status, inflow_channel,
        monthly_budget, contract_start_date, contract_expiration_date, product_type,
        homepage, blog, instagram, other_channels,
        main_keywords, requirements, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        companyName, industry, customerName, phone1, phone2, phone3,
        manager, managerTeam, status || '契約中', inflowChannel,
        monthlyBudget || 0, contractStartDate, contractExpirationDate, productType,
        homepage, blog, instagram, otherChannels,
        JSON.stringify(mainKeywords), requirements, memo
      ]
    )
    
    // Convert snake_case to camelCase
    const customer = result.rows[0]
    const camelCaseCustomer = {
      id: customer.id,
      companyName: customer.company_name,
      industry: customer.industry,
      customerName: customer.customer_name,
      phone1: customer.phone1,
      phone2: customer.phone2,
      phone3: customer.phone3,
      manager: customer.manager,
      managerTeam: customer.manager_team,
      status: customer.status,
      inflowChannel: customer.inflow_channel,
      monthlyBudget: customer.monthly_budget,
      contractStartDate: customer.contract_start_date,
      contractExpirationDate: customer.contract_expiration_date,
      productType: customer.product_type,
      homepage: customer.homepage,
      blog: customer.blog,
      instagram: customer.instagram,
      otherChannels: customer.other_channels,
      mainKeywords: customer.main_keywords,
      requirements: customer.requirements,
      memo: customer.memo,
      registrationDate: customer.registration_date
    }
    
    res.json(camelCaseCustomer)
  } catch (error) {
    console.error('Error creating customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete customer (admin only)
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }
    
    const { id } = req.params
    const result = await pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id])
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Customer not found' })
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('Error deleting customer:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router


