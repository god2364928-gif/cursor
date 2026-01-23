"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nullSafe_1 = require("../utils/nullSafe");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
// Helper function to decode file name
const decodeFileName = (fileName) => {
    try {
        // Try latin1 to utf8 conversion (common issue with multer and multipart/form-data)
        const utf8Decoded = Buffer.from(fileName, 'latin1').toString('utf8');
        // If the conversion made a difference, use it
        if (utf8Decoded !== fileName) {
            return utf8Decoded;
        }
        // Otherwise try URL decoding
        return decodeURIComponent(fileName);
    }
    catch (e) {
        // If decoding fails, return as is
        return fileName;
    }
};
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});
// Create customer
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { companyName, industry, customerName, phone1, phone2, phone3, customerType, businessModel, region, homepage, blog, instagram, otherChannel, mainKeywords, monthlyBudget, contractStartDate, contractExpirationDate, productType, paymentDate, status, inflowPath, manager, managerTeam, memo } = req.body;
        // null-safe 처리: 빈 문자열도 기본값으로 처리 (DB NOT NULL 제약조건 대응, 필수값 검증 제거)
        // DB에 NOT NULL 제약조건이 있으므로 빈 문자열일 때 기본값 사용
        const safeCompanyName = (0, nullSafe_1.safeStringWithLength)(companyName || '', '未設定', 255);
        const safeIndustry = industry || null;
        const safeCustomerName = (0, nullSafe_1.safeStringWithLength)(customerName || '', '未設定', 100);
        const safePhone1 = (0, nullSafe_1.formatPhoneNumber)(phone1) || '00000000000';
        const safePhone2 = (0, nullSafe_1.formatPhoneNumber)(phone2) || null;
        const safePhone3 = (0, nullSafe_1.formatPhoneNumber)(phone3) || null;
        // 담당자와 팀을 자동으로 설정 (없으면 현재 사용자 정보)
        const finalManager = manager || req.user?.name;
        const finalTeam = managerTeam || req.user?.team;
        const result = await db_1.pool.query(`INSERT INTO customers (
        company_name, industry, customer_name, title, phone1, phone2, phone3,
        customer_type, business_model, region, homepage, blog, instagram,
        other_channel, kpi_data_url, top_exposure_count, requirements,
        main_keywords, monthly_budget, contract_start_date,
        contract_expiration_date, product_type, payment_date, status,
        inflow_path, manager, manager_team, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      RETURNING *`, [
            safeCompanyName, safeIndustry, safeCustomerName, req.body.title || null, safePhone1, safePhone2, safePhone3,
            customerType || null, businessModel || null, region || null,
            homepage || null, blog || null, instagram || null,
            otherChannel || null, req.body.kpiDataUrl || null, req.body.topExposureCount || 0,
            req.body.requirements || null, mainKeywords || null,
            monthlyBudget || 0, contractStartDate || null,
            contractExpirationDate || null, productType || null,
            paymentDate || null, status || '契約中',
            inflowPath || null, finalManager, finalTeam,
            memo || null
        ]);
        res.json({ id: result.rows[0].id });
    }
    catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get all customers
// Get all customers with filtering
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const view = String(req.query.view || '').trim();
        const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
        const manager = typeof req.query.manager === 'string' ? req.query.manager.trim() : '';
        const where = [];
        const params = [];
        if (status) {
            params.push(status);
            where.push(`status = $${params.length}`);
        }
        if (manager) {
            params.push(manager);
            where.push(`manager = $${params.length}`);
        }
        const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
        // list view: 빠른 목록 표시용 (필요한 필드만)
        if (view === 'list') {
            const result = await db_1.pool.query(`SELECT
          id,
          company_name,
          customer_name,
          industry,
          phone1,
          phone2,
          phone3,
          instagram,
          monthly_budget,
          status,
          inflow_path,
          manager,
          manager_team,
          to_char(contract_start_date, 'YYYY-MM-DD') AS contract_start_date_str,
          to_char(contract_expiration_date, 'YYYY-MM-DD') AS contract_expiration_date_str,
          to_char(registration_date, 'YYYY-MM-DD') AS registration_date_str
         FROM customers
         ${whereClause}
         ORDER BY registration_date DESC`, params);
            const customers = result.rows.map(row => ({
                id: row.id,
                companyName: row.company_name,
                industry: row.industry,
                customerName: row.customer_name,
                phone1: row.phone1,
                phone2: row.phone2,
                phone3: row.phone3,
                instagram: row.instagram,
                monthlyBudget: row.monthly_budget,
                contractStartDate: row.contract_start_date_str || row.contract_start_date,
                contractExpirationDate: row.contract_expiration_date_str || row.contract_expiration_date,
                status: row.status,
                inflowPath: row.inflow_path,
                manager: row.manager,
                managerTeam: row.manager_team,
                registrationDate: row.registration_date_str || row.registration_date
            }));
            return res.json(customers);
        }
        const result = await db_1.pool.query(`SELECT 
        id, company_name, industry, customer_name, title, phone1, phone2, phone3,
        customer_type, business_model, region, homepage, blog, instagram,
        contract_history_category, other_channel, kpi_data_url, top_exposure_count, requirements,
        main_keywords, monthly_budget, operating_period,
        to_char(contract_start_date, 'YYYY-MM-DD') AS contract_start_date_str,
        to_char(contract_expiration_date, 'YYYY-MM-DD') AS contract_expiration_date_str,
        product_type,
        to_char(payment_date, 'YYYY-MM-DD') AS payment_date_str,
        status, inflow_path, manager, manager_team,
        to_char(registration_date, 'YYYY-MM-DD') AS registration_date_str,
        last_contact, last_talk, last_call, memo
       FROM customers
       ${whereClause}
       ORDER BY registration_date DESC`, params);
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
        }));
        res.json(customers);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get single customer
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`SELECT 
        id, company_name, industry, customer_name, title, phone1, phone2, phone3,
        customer_type, business_model, region, homepage, blog, instagram,
        contract_history_category, other_channel, kpi_data_url, top_exposure_count, requirements,
        main_keywords, monthly_budget, operating_period,
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
       FROM customers WHERE id = $1`, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const row = result.rows[0];
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
        };
        res.json(customer);
    }
    catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get customer history
router.get('/:id/history', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`SELECT h.*, u.name as user_name 
       FROM customer_history h
       LEFT JOIN users u ON h.user_id = u.id
       WHERE h.customer_id = $1 
       ORDER BY h.is_pinned DESC, h.created_at DESC`, [id]);
        const history = result.rows.map(row => ({
            id: row.id,
            customerId: row.customer_id,
            userId: row.user_id,
            userName: row.user_name || 'Unknown',
            type: row.type,
            content: row.content,
            createdAt: row.created_at,
            isPinned: row.is_pinned || false
        }));
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Add history
router.post('/:id/history', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content } = req.body;
        // Check if customer exists and get manager info
        const customerResult = await db_1.pool.query('SELECT manager FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customerResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        // Trim spaces for comparison
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only add history to customers assigned to you' });
        }
        if (!type || !content) {
            return res.status(400).json({ message: 'Type and content are required' });
        }
        const result = await db_1.pool.query('INSERT INTO customer_history (customer_id, user_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *', [id, req.user?.id, type, content]);
        res.json({ id: result.rows[0].id });
    }
    catch (error) {
        console.error('Error adding history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete history (admin only)
router.delete('/:id/history/:historyId', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id, historyId } = req.params;
        // Check if history exists and belongs to this customer
        const historyCheck = await db_1.pool.query('SELECT id FROM customer_history WHERE id = $1 AND customer_id = $2', [historyId, id]);
        if (historyCheck.rows.length === 0) {
            return res.status(404).json({ message: 'History not found' });
        }
        // Delete history
        await db_1.pool.query('DELETE FROM customer_history WHERE id = $1', [historyId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Toggle history pin status
router.patch('/:id/history/:historyId/pin', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, historyId } = req.params;
        const { isPinned } = req.body;
        // 히스토리가 해당 고객에 속하는지 확인
        const historyCheck = await db_1.pool.query('SELECT id FROM customer_history WHERE id = $1 AND customer_id = $2', [historyId, id]);
        if (historyCheck.rows.length === 0) {
            return res.status(404).json({ message: 'History not found' });
        }
        // 고정 상태 업데이트
        const result = await db_1.pool.query('UPDATE customer_history SET is_pinned = $1 WHERE id = $2 RETURNING *', [isPinned, historyId]);
        res.json({
            id: result.rows[0].id,
            isPinned: result.rows[0].is_pinned
        });
    }
    catch (error) {
        console.error('Error toggling history pin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update customer
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Check if customer exists and get manager info
        const customerResult = await db_1.pool.query('SELECT manager FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customerResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        // Trim spaces for comparison
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only edit customers assigned to you' });
        }
        // Build update query dynamically
        const setClause = [];
        const values = [];
        let paramCount = 1;
        // Map camelCase to snake_case and build update statement
        const fieldMap = {
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
        };
        for (const [key, value] of Object.entries(updates)) {
            if (fieldMap[key]) {
                let processedValue = value;
                // NOT NULL 필드에 대한 null-safe 처리 (빈 문자열일 때 기본값 사용)
                if (fieldMap[key] === 'company_name' && (!value || value === '')) {
                    processedValue = '未設定';
                }
                else if (fieldMap[key] === 'customer_name' && (!value || value === '')) {
                    processedValue = '未設定';
                }
                else if (fieldMap[key] === 'phone1' && (!value || value === '')) {
                    processedValue = '00000000000';
                }
                else if (['phone1', 'phone2', 'phone3'].includes(fieldMap[key])) {
                    // 전화번호 포매팅 (phone1, phone2, phone3)
                    processedValue = (0, nullSafe_1.formatPhoneNumber)(value) || null;
                }
                setClause.push(`${fieldMap[key]} = $${paramCount++}`);
                values.push(processedValue);
            }
        }
        if (setClause.length === 0) {
            return res.status(400).json({ message: 'No valid fields to update' });
        }
        values.push(id);
        const query = `UPDATE customers SET ${setClause.join(', ')} WHERE id = $${paramCount} RETURNING *`;
        const result = await db_1.pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Extend contract
router.post('/:id/extend', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // Get current expiration date and manager info
        const customerResult = await db_1.pool.query('SELECT contract_expiration_date, manager FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customerResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        if (req.user?.role !== 'admin' && customer.manager !== req.user?.name) {
            return res.status(403).json({ message: 'You can only extend contracts for customers assigned to you' });
        }
        const oldExpirationDate = customer.contract_expiration_date;
        // 날짜를 YYYY-MM-DD 형식으로 변환
        const formattedOldDate = oldExpirationDate instanceof Date
            ? oldExpirationDate.toISOString().split('T')[0]
            : oldExpirationDate.split('T')[0] || oldExpirationDate;
        const oldDate = new Date(formattedOldDate);
        // Add 1 month
        const newDate = new Date(oldDate);
        newDate.setMonth(newDate.getMonth() + 1);
        const newExpirationDate = newDate.toISOString().split('T')[0];
        // Update expiration date
        await db_1.pool.query('UPDATE customers SET contract_expiration_date = $1 WHERE id = $2', [newExpirationDate, id]);
        // Add history entry
        const content = `契約1ヶ月延長 (${formattedOldDate} → ${newExpirationDate})`;
        await db_1.pool.query('INSERT INTO customer_history (customer_id, user_id, type, content) VALUES ($1, $2, $3, $4)', [id, req.user?.id, 'contract_extended', content]);
        res.json({ success: true, newExpirationDate });
    }
    catch (error) {
        console.error('Error extending contract:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create new customer
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { companyName, industry, customerName, phone1, phone2, phone3, manager, managerTeam, status, inflowChannel, monthlyBudget, contractStartDate, contractExpirationDate, productType, homepage, blog, instagram, otherChannels, mainKeywords, requirements, memo } = req.body;
        const result = await db_1.pool.query(`INSERT INTO customers (
        company_name, industry, customer_name, phone1, phone2, phone3,
        manager, manager_team, status, inflow_channel,
        monthly_budget, contract_start_date, contract_expiration_date, product_type,
        homepage, blog, instagram, other_channels,
        main_keywords, requirements, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`, [
            companyName, industry, customerName, phone1, phone2, phone3,
            manager, managerTeam, status || '契約中', inflowChannel,
            monthlyBudget || 0, contractStartDate, contractExpirationDate, productType,
            homepage, blog, instagram, otherChannels,
            JSON.stringify(mainKeywords), requirements, memo
        ]);
        // Convert snake_case to camelCase
        const customer = result.rows[0];
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
        };
        res.json(camelCaseCustomer);
    }
    catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete customer (admin only)
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        const { id } = req.params;
        const result = await db_1.pool.query('DELETE FROM customers WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// File upload endpoints
// Upload file
router.post('/:id/files', auth_1.authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const { id } = req.params;
        // Check if customer exists and user has permission
        const customerResult = await db_1.pool.query('SELECT manager FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customerResult.rows[0];
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Check permission: admin or assigned manager
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only upload files to customers assigned to you' });
        }
        // Convert file buffer to Base64
        const fileDataBase64 = req.file.buffer.toString('base64');
        // Decode file name to handle Korean/Japanese characters
        const decodedFileName = decodeFileName(req.file.originalname);
        // Insert file into database
        const result = await db_1.pool.query(`INSERT INTO customer_files (customer_id, user_id, file_name, original_name, file_type, file_size, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, customer_id, user_id, file_name, original_name, file_type, file_size, created_at`, [
            id,
            req.user?.id,
            decodedFileName,
            decodedFileName,
            req.file.mimetype || 'application/octet-stream',
            req.file.size,
            fileDataBase64
        ]);
        const file = result.rows[0];
        const camelCaseFile = {
            id: file.id,
            customerId: file.customer_id,
            userId: file.user_id,
            fileName: file.file_name,
            originalName: file.original_name,
            fileType: file.file_type,
            fileSize: file.file_size,
            createdAt: file.created_at
        };
        res.json(camelCaseFile);
    }
    catch (error) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size exceeds 20MB limit' });
        }
        console.error('Error uploading file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get all files for a customer
router.get('/:id/files', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query('SELECT id, customer_id, user_id, file_name, original_name, file_type, file_size, created_at FROM customer_files WHERE customer_id = $1 ORDER BY created_at DESC', [id]);
        const files = result.rows.map(row => ({
            id: row.id,
            customerId: row.customer_id,
            userId: row.user_id,
            fileName: row.file_name,
            originalName: row.original_name,
            fileType: row.file_type,
            fileSize: row.file_size,
            createdAt: row.created_at
        }));
        res.json(files);
    }
    catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Download file
router.get('/:id/files/:fileId/download', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, fileId } = req.params;
        const result = await db_1.pool.query('SELECT file_name, original_name, file_type, file_data FROM customer_files WHERE id = $1 AND customer_id = $2', [fileId, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        const file = result.rows[0];
        const fileBuffer = Buffer.from(file.file_data, 'base64');
        res.setHeader('Content-Type', file.file_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
        res.send(fileBuffer);
    }
    catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Rename file
router.patch('/:id/files/:fileId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, fileId } = req.params;
        const { fileName } = req.body;
        if (!fileName || !fileName.trim()) {
            return res.status(400).json({ message: 'File name is required' });
        }
        // Check if file exists
        const fileCheck = await db_1.pool.query('SELECT customer_id FROM customer_files WHERE id = $1', [fileId]);
        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        // Check if customer exists and user has permission
        const customerResult = await db_1.pool.query('SELECT manager FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customerResult.rows[0];
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Check permission: admin or assigned manager
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only rename files for customers assigned to you' });
        }
        await db_1.pool.query('UPDATE customer_files SET file_name = $1 WHERE id = $2', [fileName.trim(), fileId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error renaming file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete file
router.delete('/:id/files/:fileId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, fileId } = req.params;
        // Check if file exists
        const fileCheck = await db_1.pool.query('SELECT customer_id FROM customer_files WHERE id = $1', [fileId]);
        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        // Check if customer exists and user has permission
        const customerResult = await db_1.pool.query('SELECT manager FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = customerResult.rows[0];
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Check permission: admin or assigned manager
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only delete files for customers assigned to you' });
        }
        await db_1.pool.query('DELETE FROM customer_files WHERE id = $1', [fileId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get sales tracking history for a customer
// 영업 이력에서 가져온 연락 히스토리 조회
router.get('/:id/sales-history', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // 고객의 sales_tracking_id 조회
        const customerResult = await db_1.pool.query('SELECT sales_tracking_id FROM customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const salesTrackingId = customerResult.rows[0].sales_tracking_id;
        if (!salesTrackingId) {
            // 영업 이력에서 온 고객이 아닌 경우 빈 배열 반환
            return res.json([]);
        }
        // sales_tracking_history에서 히스토리 조회
        const historyResult = await db_1.pool.query(`SELECT id, sales_tracking_id, round, contact_date, content, user_id, user_name, created_at
       FROM sales_tracking_history
       WHERE sales_tracking_id = $1
       ORDER BY round DESC, contact_date DESC`, [salesTrackingId]);
        res.json(historyResult.rows);
    }
    catch (error) {
        console.error('Error fetching sales history for customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map