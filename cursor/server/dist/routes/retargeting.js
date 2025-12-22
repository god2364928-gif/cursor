"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nullSafe_1 = require("../utils/nullSafe");
const dateHelper_1 = require("../utils/dateHelper");
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const sync_1 = require("csv-parse/sync");
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
// Get all retargeting customers
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const result = await db_1.pool.query('SELECT * FROM retargeting_customers ORDER BY registered_at DESC');
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
            registeredAt: (0, dateHelper_1.toKSTDateString)(row.registered_at)
        }));
        res.json(customers);
    }
    catch (error) {
        console.error('Error fetching retargeting customers:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create new retargeting customer
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { companyName, industry, customerName, phone, region, inflowPath, manager, managerTeam, status, registeredAt, contractHistoryCategory } = req.body;
        // null-safe 처리: 빈 문자열도 기본값으로 처리 (DB NOT NULL 제약조건 대응)
        const safeCompanyName = (0, nullSafe_1.safeStringWithLength)(companyName || '', '未設定', 255);
        const safeIndustry = industry || null;
        const safeCustomerName = (0, nullSafe_1.safeStringWithLength)(customerName || '', '未設定', 100);
        const safePhone = (0, nullSafe_1.formatPhoneNumber)(phone) || '00000000000';
        const result = await db_1.pool.query(`INSERT INTO retargeting_customers (
        company_name, industry, customer_name, phone, region, inflow_path,
        manager, manager_team, status, registered_at, contract_history_category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`, [safeCompanyName, safeIndustry, safeCustomerName, safePhone, region || null, inflowPath || null,
            manager, managerTeam || null, status || '시작', registeredAt || new Date().toISOString().split('T')[0], contractHistoryCategory || null]);
        const customer = result.rows[0];
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
            lastContactDate: (0, dateHelper_1.toKSTDateString)(customer.last_contact_date),
            memo: customer.memo,
            homepage: customer.homepage,
            instagram: customer.instagram,
            mainKeywords: customer.main_keywords || [],
            registeredAt: (0, dateHelper_1.toKSTDateString)(customer.registered_at)
        };
        res.json(camelCaseCustomer);
    }
    catch (error) {
        console.error('Error creating retargeting customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get single retargeting customer
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query('SELECT * FROM retargeting_customers WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        const customer = result.rows[0];
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
            nextContactDate: (0, dateHelper_1.toKSTDateString)(customer.next_contact_date),
            lastContactDate: (0, dateHelper_1.toKSTDateString)(customer.last_contact_date),
            memo: customer.memo,
            homepage: customer.homepage,
            instagram: customer.instagram,
            mainKeywords: customer.main_keywords || [],
            registeredAt: (0, dateHelper_1.toKSTDateString)(customer.registered_at)
        };
        res.json(camelCaseCustomer);
    }
    catch (error) {
        console.error('Error fetching retargeting customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update retargeting customer
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { companyName, industry, customerName, phone, region, inflowPath, manager, managerTeam, status, lastContactDate, contractHistoryCategory, memo, homepage, instagram, mainKeywords, registeredAt } = req.body;
        // Check if retargeting customer exists and get manager info
        const customerResult = await db_1.pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const customer = customerResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        // Trim spaces for comparison
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only edit retargeting customers assigned to you' });
        }
        // null-safe 처리: 빈 문자열도 기본값으로 처리 (DB NOT NULL 제약조건 대응)
        const safeCompanyName = (0, nullSafe_1.safeStringWithLength)(companyName || '', '未設定', 255);
        const safeIndustry = industry || null;
        const safeCustomerName = (0, nullSafe_1.safeStringWithLength)(customerName || '', '未設定', 100);
        const safePhone = (0, nullSafe_1.safeStringWithLength)(phone || '', '00000000000', 20);
        await db_1.pool.query(`UPDATE retargeting_customers SET
        company_name = $1, industry = $2, customer_name = $3, phone = $4,
        region = $5, inflow_path = $6, manager = $7, manager_team = $8,
        status = $9, last_contact_date = $10, contract_history_category = $11,
        memo = $12, homepage = $13, instagram = $14, main_keywords = $15, registered_at = $16
      WHERE id = $17`, [safeCompanyName, safeIndustry, safeCustomerName, safePhone, region, inflowPath,
            manager, managerTeam, status, lastContactDate, contractHistoryCategory, memo, homepage, instagram, mainKeywords, registeredAt, id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating retargeting customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete retargeting customer
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if retargeting customer exists and get manager info and sales_tracking_id
        const customerResult = await db_1.pool.query('SELECT manager, sales_tracking_id FROM retargeting_customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const customer = customerResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        // Trim spaces for comparison
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Admin can delete any retargeting customer, managers can only delete their own
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only delete retargeting customers assigned to you' });
        }
        // Log deletion info for statistics tracking
        if (customer.sales_tracking_id) {
            console.log(`[DELETE RETARGETING] Deleting retargeting customer ${id} with sales_tracking_id: ${customer.sales_tracking_id}`);
            console.log(`[DELETE RETARGETING] This will remove this record from retargeting count statistics`);
        }
        await db_1.pool.query('DELETE FROM retargeting_customers WHERE id = $1', [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting retargeting customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get customer history
router.get('/:id/history', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query('SELECT * FROM retargeting_history WHERE retargeting_customer_id = $1 ORDER BY is_pinned DESC, created_at DESC', [id]);
        const history = result.rows.map(row => ({
            id: row.id,
            retargetingCustomerId: row.retargeting_customer_id,
            userId: row.user_id,
            userName: row.user_name,
            type: row.type,
            content: row.content,
            createdAt: row.created_at,
            isPinned: row.is_pinned || false
        }));
        res.json(history);
    }
    catch (error) {
        console.error('Error fetching retargeting history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Add history
router.post('/:id/history', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content } = req.body;
        // Check if retargeting customer exists and get manager info
        const customerResult = await db_1.pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const customer = customerResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        // Trim spaces for comparison
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only add history to retargeting customers assigned to you' });
        }
        const result = await db_1.pool.query('INSERT INTO retargeting_history (retargeting_customer_id, user_id, user_name, type, content) VALUES ($1, $2, $3, $4, $5) RETURNING *', [id, req.user?.id, req.user?.name, type, content]);
        const historyItem = result.rows[0];
        const camelCaseHistory = {
            id: historyItem.id,
            retargetingCustomerId: historyItem.retargeting_customer_id,
            userId: historyItem.user_id,
            userName: historyItem.user_name,
            type: historyItem.type,
            content: historyItem.content,
            createdAt: historyItem.created_at
        };
        res.json(camelCaseHistory);
    }
    catch (error) {
        console.error('Error adding retargeting history:', error);
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
        // Check if history exists and belongs to this retargeting customer
        const historyCheck = await db_1.pool.query('SELECT id FROM retargeting_history WHERE id = $1 AND retargeting_customer_id = $2', [historyId, id]);
        if (historyCheck.rows.length === 0) {
            return res.status(404).json({ message: 'History not found' });
        }
        // Delete history
        await db_1.pool.query('DELETE FROM retargeting_history WHERE id = $1', [historyId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting retargeting history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Toggle history pin status
router.patch('/:id/history/:historyId/pin', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id, historyId } = req.params;
        const { isPinned } = req.body;
        // 히스토리가 해당 리타겟팅 고객에 속하는지 확인
        const historyCheck = await db_1.pool.query('SELECT id FROM retargeting_history WHERE id = $1 AND retargeting_customer_id = $2', [historyId, id]);
        if (historyCheck.rows.length === 0) {
            return res.status(404).json({ message: 'History not found' });
        }
        // 고정 상태 업데이트
        const result = await db_1.pool.query('UPDATE retargeting_history SET is_pinned = $1 WHERE id = $2 RETURNING *', [isPinned, historyId]);
        res.json({
            id: result.rows[0].id,
            isPinned: result.rows[0].is_pinned
        });
    }
    catch (error) {
        console.error('Error toggling retargeting history pin:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Convert to regular customer
router.post('/:id/convert', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { monthlyBudget, contractStartDate, contractExpirationDate } = req.body;
        // Get retargeting customer
        const retargetingResult = await db_1.pool.query('SELECT * FROM retargeting_customers WHERE id = $1', [id]);
        if (retargetingResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const retargetingCustomer = retargetingResult.rows[0];
        // Check if user is the manager of this customer (or admin)
        if (req.user?.role !== 'admin' && retargetingCustomer.manager !== req.user?.name) {
            return res.status(403).json({ message: 'You can only convert retargeting customers assigned to you' });
        }
        // Insert into customers table
        const customerResult = await db_1.pool.query(`INSERT INTO customers (
        company_name, industry, customer_name, phone1,
        region, inflow_path, manager, manager_team,
        monthly_budget, contract_start_date, contract_expiration_date,
        status, homepage, instagram, main_keywords, memo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`, [
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
            '契約中',
            retargetingCustomer.homepage,
            retargetingCustomer.instagram,
            retargetingCustomer.main_keywords,
            retargetingCustomer.memo
        ]);
        const newCustomer = customerResult.rows[0];
        // 리타겟팅 히스토리를 고객 히스토리로 이동
        const historyResult = await db_1.pool.query('SELECT * FROM retargeting_history WHERE retargeting_customer_id = $1', [id]);
        if (historyResult.rows.length > 0) {
            for (const history of historyResult.rows) {
                // 히스토리 타입 매핑: 부재중 -> 통화시도, 통화성공 -> 통화성공, 카톡 -> 카톡, 메모 -> 메모
                let mappedType = history.type;
                if (history.type === 'missed_call') {
                    mappedType = 'call_attempt';
                }
                // user_id가 NULL이면 기본값 사용
                const userId = history.user_id || req.user?.id;
                const userName = history.user_name || req.user?.name || 'Unknown';
                await db_1.pool.query(`INSERT INTO customer_history (
            customer_id, user_id, user_name, type, content, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                    newCustomer.id,
                    userId,
                    userName,
                    mappedType,
                    history.content,
                    history.created_at
                ]);
            }
        }
        // Delete retargeting customer after conversion
        await db_1.pool.query('DELETE FROM retargeting_customers WHERE id = $1', [id]);
        const customer = newCustomer;
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
        };
        res.json(camelCaseCustomer);
    }
    catch (error) {
        console.error('Error converting retargeting customer:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get personal statistics
router.get('/stats/personal', auth_1.authMiddleware, async (req, res) => {
    try {
        const result = await db_1.pool.query(`SELECT 
        manager,
        -- 진행 중인 고객 (휴지통 제외)
        SUM(CASE WHEN status NOT IN ('ゴミ箱', '휴지통', 'trash') THEN 1 ELSE 0 END) AS total_active,
        -- 상태별 집계 (한·일 표기 모두 포함)
        SUM(CASE WHEN status IN ('시작', '開始') THEN 1 ELSE 0 END) AS start_count,
        SUM(CASE WHEN status IN ('인지', '認知') THEN 1 ELSE 0 END) AS awareness_count,
        SUM(CASE WHEN status IN ('흥미', '興味') THEN 1 ELSE 0 END) AS interest_count,
        SUM(CASE WHEN status IN ('욕망', '欲求') THEN 1 ELSE 0 END) AS desire_count,
        SUM(CASE WHEN status IN ('계약완료', '契約完了', '契約中', '購入') THEN 1 ELSE 0 END) AS completed_count,
        SUM(CASE WHEN status IN ('ゴミ箱', '휴지통', 'trash') THEN 1 ELSE 0 END) AS trash_count
      FROM retargeting_customers
      GROUP BY manager
      ORDER BY manager`);
        const stats = result.rows.map(row => ({
            manager: row.manager,
            total: parseInt(row.total_active) || 0,
            start: parseInt(row.start_count) || 0,
            awareness: parseInt(row.awareness_count) || 0,
            interest: parseInt(row.interest_count) || 0,
            desire: parseInt(row.desire_count) || 0,
            completed: parseInt(row.completed_count) || 0,
            trash: parseInt(row.trash_count) || 0
        }));
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching personal stats:', error);
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
        // Check if retargeting customer exists and user has permission
        const customerResult = await db_1.pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const customer = customerResult.rows[0];
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Check permission: admin or assigned manager
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only upload files to retargeting customers assigned to you' });
        }
        // Convert file buffer to Base64
        const fileDataBase64 = req.file.buffer.toString('base64');
        // Decode file name to handle Korean/Japanese characters
        const decodedFileName = decodeFileName(req.file.originalname);
        // Insert file into database
        const result = await db_1.pool.query(`INSERT INTO retargeting_files (retargeting_customer_id, user_id, file_name, original_name, file_type, file_size, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, retargeting_customer_id, user_id, file_name, original_name, file_type, file_size, created_at`, [
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
            retargetingCustomerId: file.retargeting_customer_id,
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
// Get all files for a retargeting customer
router.get('/:id/files', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query('SELECT id, retargeting_customer_id, user_id, file_name, original_name, file_type, file_size, created_at FROM retargeting_files WHERE retargeting_customer_id = $1 ORDER BY created_at DESC', [id]);
        const files = result.rows.map(row => ({
            id: row.id,
            retargetingCustomerId: row.retargeting_customer_id,
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
        const result = await db_1.pool.query('SELECT file_name, original_name, file_type, file_data FROM retargeting_files WHERE id = $1 AND retargeting_customer_id = $2', [fileId, id]);
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
        const fileCheck = await db_1.pool.query('SELECT retargeting_customer_id FROM retargeting_files WHERE id = $1', [fileId]);
        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        // Check if retargeting customer exists and user has permission
        const customerResult = await db_1.pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const customer = customerResult.rows[0];
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Check permission: admin or assigned manager
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only rename files for retargeting customers assigned to you' });
        }
        await db_1.pool.query('UPDATE retargeting_files SET file_name = $1 WHERE id = $2', [fileName.trim(), fileId]);
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
        const fileCheck = await db_1.pool.query('SELECT retargeting_customer_id FROM retargeting_files WHERE id = $1', [fileId]);
        if (fileCheck.rows.length === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        // Check if retargeting customer exists and user has permission
        const customerResult = await db_1.pool.query('SELECT manager FROM retargeting_customers WHERE id = $1', [id]);
        if (customerResult.rows.length === 0) {
            return res.status(404).json({ message: 'Retargeting customer not found' });
        }
        const customer = customerResult.rows[0];
        const userName = req.user?.name?.trim() || '';
        const customerManager = customer.manager?.trim() || '';
        // Check permission: admin or assigned manager
        if (req.user?.role !== 'admin' && customerManager !== userName) {
            return res.status(403).json({ message: 'You can only delete files for retargeting customers assigned to you' });
        }
        await db_1.pool.query('DELETE FROM retargeting_files WHERE id = $1', [fileId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
// ============================
// Import (CSV/XLSX upload)
// ============================
function normalizePhone(input) {
    if (input === null || input === undefined)
        return null;
    let s = String(input).trim();
    if (!s)
        return null;
    s = s.replace(/\s+/g, '').replace(/-/g, '');
    if (/^\d+(?:\.\d+)?e\+\d+$/i.test(s)) {
        const num = Number(s);
        if (!Number.isNaN(num))
            s = Math.round(num).toString();
    }
    s = s.replace(/[^0-9]/g, '');
    if (!s)
        return null;
    if (!s.startsWith('0') && (s.length === 9 || s.length === 10 || s.length === 11)) {
        s = '0' + s;
    }
    if (s.length > 15)
        s = s.slice(0, 15);
    return s;
}
function extractInstagramId(value) {
    if (!value)
        return null;
    const s = String(value).trim();
    if (!s)
        return null;
    const at = s.startsWith('@') ? s.slice(1) : s;
    try {
        const u = new URL(at.includes('://') ? at : `https://instagram.com/${at}`);
        const parts = u.pathname.split('/').filter(Boolean);
        return parts[0] || null;
    }
    catch {
        return at;
    }
}
function toDateYYYYMMDD(str) {
    if (!str)
        return null;
    const s = String(str).trim();
    if (!s)
        return null;
    const m = s.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
    if (m) {
        const y = m[1];
        const mo = m[2].padStart(2, '0');
        const d = m[3].padStart(2, '0');
        return `${y}-${mo}-${d}`;
    }
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const d = String(dt.getDate()).padStart(2, '0');
        return `${y}-${mo}-${d}`;
    }
    return null;
}
router.post('/import', auth_1.authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: 'No file uploaded' });
        const name = req.file.originalname.toLowerCase();
        let rows = [];
        if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
            const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        }
        else {
            const text = req.file.buffer.toString('utf8');
            rows = (0, sync_1.parse)(text, { columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true, bom: true });
        }
        let inserted = 0;
        let updated = 0;
        let processed = 0;
        for (const row of rows) {
            processed++;
            const manager = (row['担当者'] || row['\uFEFF担当者'] || '').trim();
            let companyName = (row['商号'] || '').trim();
            let customerName = (row['顧客名'] || '').trim();
            const industry = (row['業種'] || '').trim() || null;
            const region = (row['地域'] || '').trim() || null;
            const inflowPath = (row['流入経路'] || '').trim() || null;
            const contractHistoryCategory = (row['契約履歴'] || '').trim() || null;
            const category = (row['カテゴリ'] || '').trim();
            const registeredAt = toDateYYYYMMDD((row['登録日'] || row['\uFEFF登録日']));
            const lastContactDate = toDateYYYYMMDD(row['最終連絡日']);
            const homepage = (row['ホームページ'] || '').trim() || null;
            const instagram = extractInstagramId(row['Instagram']);
            const memo = (row['メモ'] || '').trim() || null;
            const phone = (0, nullSafe_1.formatPhoneNumber)(row['電話番号']) || normalizePhone(row['電話番号']);
            if (!companyName && !customerName)
                continue;
            if (!customerName)
                customerName = '';
            let status = null;
            if (category === '開始')
                status = '시작';
            // Upsert by instagram or phone if exists
            let existing = null;
            if (instagram) {
                const r = await db_1.pool.query('SELECT id FROM retargeting_customers WHERE instagram = $1', [instagram]);
                existing = r.rows[0];
            }
            if (!existing && phone) {
                const r = await db_1.pool.query('SELECT id FROM retargeting_customers WHERE phone = $1', [phone]);
                existing = r.rows[0];
            }
            if (existing) {
                await db_1.pool.query(`UPDATE retargeting_customers SET
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
          WHERE id = $14`, [
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
                ]);
                updated++;
            }
            else {
                await db_1.pool.query(`INSERT INTO retargeting_customers (
            company_name, industry, customer_name, phone, region, inflow_path,
            manager, manager_team, status, registered_at, contract_history_category,
            homepage, instagram, memo, last_contact_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11, $12, $13, $14)`, [
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
                ]);
                inserted++;
            }
        }
        res.json({ processed, inserted, updated });
    }
    catch (error) {
        console.error('Error importing retargeting:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
//# sourceMappingURL=retargeting.js.map