"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all sales tracking records (with search)
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const search = req.query.search || '';
        let query = `
      SELECT 
        id,
        date,
        manager_name,
        company_name,
        account_id,
        customer_name,
        industry,
        contact_method,
        status,
        contact_person,
        phone,
        memo,
        memo_note,
        user_id,
        created_at,
        updated_at
      FROM sales_tracking
    `;
        const params = [];
        if (search) {
            query += ` WHERE 
        manager_name ILIKE $1 OR 
        company_name ILIKE $1 OR
        account_id ILIKE $1 OR 
        customer_name ILIKE $1 OR
        industry ILIKE $1
      `;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY date DESC, created_at DESC`;
        const result = await db_1.pool.query(query, params);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching sales tracking:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint
        });
        res.status(500).json({
            message: 'Internal server error',
            error: error.message,
            detail: error.detail
        });
    }
});
// Get single sales tracking record
router.get('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query('SELECT * FROM sales_tracking WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error fetching sales tracking record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Create new sales tracking record
router.post('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const { date, managerName, companyName, accountId, customerName, industry, contactMethod, status, contactPerson, phone, memo, memoNote } = req.body;
        if (!date || !managerName || !status) {
            return res.status(400).json({ message: 'Date, manager name, and status are required' });
        }
        const result = await db_1.pool.query(`INSERT INTO sales_tracking (
        date, manager_name, company_name, account_id, customer_name, industry,
        contact_method, status, contact_person, phone, memo, memo_note, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`, [
            date,
            managerName,
            companyName || null,
            accountId || null,
            customerName || null,
            industry || null,
            contactMethod || null,
            status,
            contactPerson || null,
            phone || null,
            memo || null,
            memoNote || null,
            req.user?.id
        ]);
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error creating sales tracking record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Update sales tracking record (only owner can update)
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if record exists and get user_id
        const recordResult = await db_1.pool.query('SELECT user_id FROM sales_tracking WHERE id = $1', [id]);
        if (recordResult.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }
        // Check if user is the owner (or admin)
        const recordUserId = recordResult.rows[0].user_id;
        if (req.user?.role !== 'admin' && req.user?.id !== recordUserId) {
            return res.status(403).json({ message: 'You can only edit your own records' });
        }
        const { date, managerName, companyName, accountId, customerName, industry, contactMethod, status, contactPerson, phone, memo, memoNote } = req.body;
        await db_1.pool.query(`UPDATE sales_tracking SET
        date = $1,
        manager_name = $2,
        company_name = $3,
        account_id = $4,
        customer_name = $5,
        industry = $6,
        contact_method = $7,
        status = $8,
        contact_person = $9,
        phone = $10,
        memo = $11,
        memo_note = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13`, [
            date,
            managerName,
            companyName || null,
            accountId || null,
            customerName || null,
            industry || null,
            contactMethod || null,
            status,
            contactPerson || null,
            phone || null,
            memo || null,
            memoNote || null,
            id
        ]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating sales tracking record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Delete sales tracking record (only owner can delete)
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    const client = await db_1.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;
        console.log(`[DELETE] Attempting to delete sales_tracking record: ${id}`);
        console.log(`[DELETE] User: ${req.user?.name} (${req.user?.id}), Role: ${req.user?.role}`);
        // Check if record exists and get user_id
        const recordResult = await client.query('SELECT user_id, manager_name FROM sales_tracking WHERE id = $1', [id]);
        if (recordResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log(`[DELETE] Record not found: ${id}`);
            return res.status(404).json({ message: 'Record not found' });
        }
        const record = recordResult.rows[0];
        console.log(`[DELETE] Record found: manager=${record.manager_name}, user_id=${record.user_id}`);
        // Check if user is the owner (or admin)
        if (req.user?.role !== 'admin' && req.user?.id !== record.user_id) {
            await client.query('ROLLBACK');
            console.log(`[DELETE] Permission denied: user_id mismatch (${req.user?.id} vs ${record.user_id})`);
            return res.status(403).json({ message: 'You can only delete your own records' });
        }
        // Check if this record is referenced by retargeting_customers (foreign key constraint)
        const retargetingCheck = await client.query('SELECT id, manager FROM retargeting_customers WHERE sales_tracking_id = $1', [id]);
        if (retargetingCheck.rows.length > 0) {
            console.log(`[DELETE] Found ${retargetingCheck.rows.length} retargeting_customers records referencing this sales_tracking record`);
            // Set sales_tracking_id to NULL to preserve retargeting data
            await client.query('UPDATE retargeting_customers SET sales_tracking_id = NULL WHERE sales_tracking_id = $1', [id]);
            console.log(`[DELETE] Updated retargeting_customers: set sales_tracking_id to NULL`);
        }
        // Now delete the sales tracking record
        const deleteResult = await client.query('DELETE FROM sales_tracking WHERE id = $1 RETURNING id', [id]);
        if (deleteResult.rows.length === 0) {
            await client.query('ROLLBACK');
            console.log(`[DELETE] Failed to delete record: ${id}`);
            return res.status(500).json({ message: 'Failed to delete record' });
        }
        await client.query('COMMIT');
        console.log(`[DELETE] Successfully deleted record: ${id}`);
        res.json({ success: true });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('[DELETE] Error deleting sales tracking record:', error);
        console.error('[DELETE] Error details:', {
            message: error.message,
            code: error.code,
            detail: error.detail,
            hint: error.hint,
            stack: error.stack
        });
        res.status(500).json({
            message: 'Internal server error',
            error: error.message,
            detail: error.detail
        });
    }
    finally {
        client.release();
    }
});
// Move sales tracking record to retargeting (only owner can move)
router.post('/:id/move-to-retargeting', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`[MOVE-TO-RETARGETING] Attempting to move sales_tracking record: ${id}`);
        console.log(`[MOVE-TO-RETARGETING] User: ${req.user?.name} (${req.user?.id}), Role: ${req.user?.role}`);
        // Get sales tracking record
        const recordResult = await db_1.pool.query('SELECT * FROM sales_tracking WHERE id = $1', [id]);
        if (recordResult.rows.length === 0) {
            console.log(`[MOVE-TO-RETARGETING] Record not found: ${id}`);
            return res.status(404).json({ message: 'Sales tracking record not found' });
        }
        const record = recordResult.rows[0];
        console.log(`[MOVE-TO-RETARGETING] Record found:`, {
            id: record.id,
            company_name: record.company_name,
            customer_name: record.customer_name,
            account_id: record.account_id,
            phone: record.phone,
            manager_name: record.manager_name,
            industry: record.industry,
            date: record.date
        });
        // Check if user is the owner of this record (or admin)
        // manager_name으로도 체크 (기존 데이터 호환성)
        const isOwner = req.user?.role === 'admin'
            || record.user_id === req.user?.id
            || record.manager_name === req.user?.name;
        if (!isOwner) {
            console.log(`[MOVE-TO-RETARGETING] Permission denied:`, {
                userRole: req.user?.role,
                userId: req.user?.id,
                userName: req.user?.name,
                recordUserId: record.user_id,
                recordManagerName: record.manager_name
            });
            return res.status(403).json({ message: 'You can only move your own records' });
        }
        console.log(`[MOVE-TO-RETARGETING] Permission granted:`, {
            userRole: req.user?.role,
            userId: req.user?.id,
            userName: req.user?.name,
            recordUserId: record.user_id,
            recordManagerName: record.manager_name
        });
        // 이미 리타겟팅으로 이동된 경우 중복 체크
        const existingCheck = await db_1.pool.query('SELECT id FROM retargeting_customers WHERE sales_tracking_id = $1', [id]);
        if (existingCheck.rows.length > 0) {
            console.log(`[MOVE-TO-RETARGETING] Already moved to retargeting: ${existingCheck.rows[0].id}`);
            return res.status(400).json({
                message: '이미 리타겟팅으로 이동된 레코드입니다',
                retargetingId: existingCheck.rows[0].id
            });
        }
        // 필수 필드 준비 (NOT NULL 제약 조건 처리)
        // 안전하게 null/undefined/빈 문자열 처리 - 절대 null이 반환되지 않도록 보장
        const safeTrim = (value) => {
            if (value === null || value === undefined)
                return '';
            if (typeof value !== 'string') {
                const str = String(value);
                return str === 'null' || str === 'undefined' ? '' : str.trim();
            }
            const trimmed = value.trim();
            return trimmed === 'null' || trimmed === 'undefined' ? '' : trimmed;
        };
        // 원본 데이터 로깅 (디버깅용)
        console.log('[MOVE-TO-RETARGETING] 원본 레코드 필드:', {
            company_name: record.company_name,
            customer_name: record.customer_name,
            account_id: record.account_id,
            phone: record.phone,
            company_name_type: typeof record.company_name,
            customer_name_type: typeof record.customer_name,
            account_id_type: typeof record.account_id,
            phone_type: typeof record.phone
        });
        // company_name: company_name, customer_name, account_id, 또는 기본값 사용 (company_name 우선)
        const companyNameRaw = safeTrim(record.company_name);
        const customerNameRaw = safeTrim(record.customer_name);
        const accountIdRaw = safeTrim(record.account_id);
        console.log('[MOVE-TO-RETARGETING] safeTrim 결과:', {
            companyNameRaw: `"${companyNameRaw}"`,
            customerNameRaw: `"${customerNameRaw}"`,
            accountIdRaw: `"${accountIdRaw}"`
        });
        // 절대 null이 되지 않도록 보장 (빈 문자열도 기본값으로 대체)
        const companyName = (companyNameRaw || customerNameRaw || accountIdRaw || '未設定');
        const customerName = (customerNameRaw || accountIdRaw || '未設定');
        console.log('[MOVE-TO-RETARGETING] 값 결정 후:', {
            companyName: `"${companyName}"`,
            customerName: `"${customerName}"`
        });
        // phone: phone 필드가 있으면 사용, 없으면 기본값 (NOT NULL 제약 조건, VARCHAR(20) 제한)
        const phoneRaw = safeTrim(record.phone);
        const phone = phoneRaw || '00000000000';
        console.log('[MOVE-TO-RETARGETING] phone 처리:', {
            phoneRaw: `"${phoneRaw}"`,
            phone: `"${phone}"`
        });
        // phone 필드 길이 제한 확인 (VARCHAR(20))
        const phoneFinal = phone.length > 20 ? phone.substring(0, 20) : phone;
        // company_name과 customer_name도 길이 제한 확인
        const companyNameFinal = companyName.length > 255 ? companyName.substring(0, 255) : companyName;
        const customerNameFinal = customerName.length > 100 ? customerName.substring(0, 100) : customerName;
        console.log('[MOVE-TO-RETARGETING] 길이 제한 후:', {
            companyNameFinal: `"${companyNameFinal}"`,
            customerNameFinal: `"${customerNameFinal}"`,
            phoneFinal: `"${phoneFinal}"`
        });
        // industry: 있으면 사용, 없으면 null
        const industry = record.industry || null;
        // manager_name: 필수
        const managerName = safeTrim(record.manager_name);
        if (!managerName) {
            console.error('[MOVE-TO-RETARGETING] Error: manager_name is required but not found', {
                recordManagerName: record.manager_name,
                managerNameAfterTrim: managerName
            });
            return res.status(400).json({ message: 'Manager name is required' });
        }
        // 최종 검증: 필수 필드가 비어있지 않은지 확인 (추가 안전장치)
        const finalCompanyName = companyNameFinal.trim() || '未設定';
        const finalCustomerName = customerNameFinal.trim() || '未設定';
        const finalPhone = phoneFinal.trim() || '00000000000';
        console.log('[MOVE-TO-RETARGETING] 최종 검증 전 값:', {
            finalCompanyName,
            finalCustomerName,
            finalPhone,
            managerName
        });
        if (!finalCompanyName || finalCompanyName === '') {
            console.error('[MOVE-TO-RETARGETING] Error: companyName is empty after processing', {
                originalCustomerName: record.customer_name,
                originalAccountId: record.account_id,
                companyNameFinal,
                finalCompanyName
            });
            return res.status(400).json({ message: 'Company name cannot be empty' });
        }
        if (!finalCustomerName || finalCustomerName === '') {
            console.error('[MOVE-TO-RETARGETING] Error: customerName is empty after processing', {
                originalCustomerName: record.customer_name,
                originalAccountId: record.account_id,
                customerNameFinal,
                finalCustomerName
            });
            return res.status(400).json({ message: 'Customer name cannot be empty' });
        }
        if (!finalPhone || finalPhone === '') {
            console.error('[MOVE-TO-RETARGETING] Error: phone is empty after processing', {
                originalPhone: record.phone,
                phoneFinal,
                finalPhone
            });
            return res.status(400).json({ message: 'Phone cannot be empty' });
        }
        console.log(`[MOVE-TO-RETARGETING] Prepared values:`, {
            original: {
                customer_name: record.customer_name,
                account_id: record.account_id,
                phone: record.phone,
                manager_name: record.manager_name
            },
            processed: {
                companyName: finalCompanyName,
                customerName: finalCustomerName,
                phone: finalPhone,
                industry,
                manager: managerName
            }
        });
        // Create retargeting customer from sales tracking record
        // 트랜잭션으로 안전하게 처리
        // insertValues를 try 블록 밖에서 선언하여 catch 블록에서도 접근 가능하도록 함
        let insertValues = [];
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            // 최종 값들을 명시적으로 문자열로 변환하여 null이 들어가지 않도록 보장
            // 추가 안전장치: 모든 값이 유효한지 재확인
            // 절대 null이 반환되지 않도록 다중 안전장치 적용
            let safeCompanyName = finalCompanyName;
            let safeCustomerName = finalCustomerName;
            let safePhone = finalPhone;
            let safeManagerName = managerName;
            // null/undefined 체크 및 기본값 설정
            if (!safeCompanyName || safeCompanyName === null || safeCompanyName === undefined || safeCompanyName === '') {
                safeCompanyName = '未設定';
                console.warn('[MOVE-TO-RETARGETING] WARNING: safeCompanyName was invalid, using default');
            }
            if (!safeCustomerName || safeCustomerName === null || safeCustomerName === undefined || safeCustomerName === '') {
                safeCustomerName = '未設定';
                console.warn('[MOVE-TO-RETARGETING] WARNING: safeCustomerName was invalid, using default');
            }
            if (!safePhone || safePhone === null || safePhone === undefined || safePhone === '') {
                safePhone = '00000000000';
                console.warn('[MOVE-TO-RETARGETING] WARNING: safePhone was invalid, using default');
            }
            if (!safeManagerName || safeManagerName === null || safeManagerName === undefined || safeManagerName === '') {
                safeManagerName = record.manager_name || '';
                console.warn('[MOVE-TO-RETARGETING] WARNING: safeManagerName was invalid, using record.manager_name');
            }
            // 문자열로 변환 (다중 안전장치)
            safeCompanyName = String(safeCompanyName).trim() || '未設定';
            safeCustomerName = String(safeCustomerName).trim() || '未設定';
            safePhone = String(safePhone).trim() || '00000000000';
            safeManagerName = String(safeManagerName).trim() || (record.manager_name || '');
            console.log('[MOVE-TO-RETARGETING] safe 변수 생성 후:', {
                safeCompanyName: `"${safeCompanyName}"`,
                safeCustomerName: `"${safeCustomerName}"`,
                safePhone: `"${safePhone}"`,
                safeManagerName: `"${safeManagerName}"`
            });
            // 최종 안전 검증
            if (!safeCompanyName || safeCompanyName === '' || safeCompanyName === 'null') {
                console.error('[MOVE-TO-RETARGETING] CRITICAL: safeCompanyName is invalid:', safeCompanyName);
                throw new Error('Company name is invalid after processing');
            }
            if (!safeCustomerName || safeCustomerName === '' || safeCustomerName === 'null') {
                console.error('[MOVE-TO-RETARGETING] CRITICAL: safeCustomerName is invalid:', safeCustomerName);
                throw new Error('Customer name is invalid after processing');
            }
            if (!safePhone || safePhone === '' || safePhone === 'null') {
                console.error('[MOVE-TO-RETARGETING] CRITICAL: safePhone is invalid:', safePhone);
                throw new Error('Phone is invalid after processing');
            }
            if (!safeManagerName || safeManagerName === '') {
                console.error('[MOVE-TO-RETARGETING] CRITICAL: safeManagerName is invalid:', safeManagerName);
                throw new Error('Manager name is invalid after processing');
            }
            // INSERT 직전 최종 검증 (null 체크 강화) - 절대 null이 들어가지 않도록 보장
            // 이 부분이 실행되기 전에 이미 safeCompanyName, safeCustomerName 등이 검증되었지만,
            // 혹시 모를 경우를 대비해 한 번 더 검증
            let finalInsertCompanyName = safeCompanyName;
            let finalInsertCustomerName = safeCustomerName;
            let finalInsertPhone = safePhone;
            let finalInsertManagerName = safeManagerName;
            // null/undefined 체크 및 기본값 설정 (이중 안전장치)
            if (finalInsertCompanyName === null || finalInsertCompanyName === undefined || finalInsertCompanyName === '') {
                finalInsertCompanyName = '未設定';
                console.warn('[MOVE-TO-RETARGETING] WARNING: finalInsertCompanyName was null/undefined/empty, using default');
            }
            if (finalInsertCustomerName === null || finalInsertCustomerName === undefined || finalInsertCustomerName === '') {
                finalInsertCustomerName = '未設定';
                console.warn('[MOVE-TO-RETARGETING] WARNING: finalInsertCustomerName was null/undefined/empty, using default');
            }
            if (finalInsertPhone === null || finalInsertPhone === undefined || finalInsertPhone === '') {
                finalInsertPhone = '00000000000';
                console.warn('[MOVE-TO-RETARGETING] WARNING: finalInsertPhone was null/undefined/empty, using default');
            }
            if (finalInsertManagerName === null || finalInsertManagerName === undefined || finalInsertManagerName === '') {
                finalInsertManagerName = record.manager_name || '';
                console.warn('[MOVE-TO-RETARGETING] WARNING: finalInsertManagerName was null/undefined/empty, using record.manager_name');
            }
            // 문자열로 변환 (혹시 모를 경우 대비)
            finalInsertCompanyName = String(finalInsertCompanyName).trim() || '未設定';
            finalInsertCustomerName = String(finalInsertCustomerName).trim() || '未設定';
            finalInsertPhone = String(finalInsertPhone).trim() || '00000000000';
            finalInsertManagerName = String(finalInsertManagerName).trim() || (record.manager_name || '');
            // 최종 null 체크 (이게 통과하지 못하면 에러)
            if (!finalInsertCompanyName || finalInsertCompanyName === '' || finalInsertCompanyName === 'null') {
                throw new Error(`CRITICAL: finalInsertCompanyName is invalid: ${JSON.stringify(finalInsertCompanyName)}`);
            }
            if (!finalInsertCustomerName || finalInsertCustomerName === '' || finalInsertCustomerName === 'null') {
                throw new Error(`CRITICAL: finalInsertCustomerName is invalid: ${JSON.stringify(finalInsertCustomerName)}`);
            }
            if (!finalInsertPhone || finalInsertPhone === '' || finalInsertPhone === 'null') {
                throw new Error(`CRITICAL: finalInsertPhone is invalid: ${JSON.stringify(finalInsertPhone)}`);
            }
            if (!finalInsertManagerName || finalInsertManagerName === '') {
                throw new Error(`CRITICAL: finalInsertManagerName is invalid: ${JSON.stringify(finalInsertManagerName)}`);
            }
            const registeredAtDate = record.date ? new Date(record.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
            // insertValues 배열 생성 (절대 null이 들어가지 않도록 보장)
            insertValues = [
                finalInsertCompanyName, // company_name (NOT NULL) - 최종 검증 완료
                industry, // industry
                finalInsertCustomerName, // customer_name (NOT NULL) - 최종 검증 완료
                finalInsertPhone, // phone (NOT NULL, VARCHAR(20)) - 최종 검증 완료
                null, // region
                null, // inflow_path
                finalInsertManagerName, // manager - 최종 검증 완료
                null, // manager_team
                '시작', // status
                registeredAtDate, // registered_at (YYYY-MM-DD 형식)
                record.memo || null, // memo
                id // sales_tracking_id - 작업에서 직접 이동한 기록 추적
            ];
            // INSERT 직전 최종 검증: customer_name이 절대 null이 아닌지 확인
            if (insertValues[2] === null || insertValues[2] === undefined) {
                console.error('[MOVE-TO-RETARGETING] CRITICAL: insertValues[2] (customer_name) is null or undefined!');
                console.error('[MOVE-TO-RETARGETING] finalInsertCustomerName:', finalInsertCustomerName);
                console.error('[MOVE-TO-RETARGETING] insertValues[2]:', insertValues[2]);
                throw new Error(`CRITICAL: customer_name cannot be null or undefined in insertValues array`);
            }
            // INSERT 전 최종 검증 로그
            console.log(`[MOVE-TO-RETARGETING] Final insert values (before query):`, {
                company_name: insertValues[0],
                customer_name: insertValues[2],
                phone: insertValues[3],
                manager: insertValues[6],
                allValues: insertValues.map((v, i) => {
                    const paramNames = ['company_name', 'industry', 'customer_name', 'phone', 'region', 'inflow_path',
                        'manager', 'manager_team', 'status', 'registered_at', 'memo', 'sales_tracking_id'];
                    return {
                        param: paramNames[i],
                        value: v === null ? 'null' : JSON.stringify(v),
                        type: typeof v,
                        isNull: v === null,
                        isUndefined: v === undefined,
                        isEmpty: typeof v === 'string' && v === ''
                    };
                })
            });
            // INSERT 실행
            const retargetingResult = await client.query(`INSERT INTO retargeting_customers (
          company_name, industry, customer_name, phone, region, inflow_path,
          manager, manager_team, status, registered_at, memo, sales_tracking_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`, insertValues);
            await client.query('COMMIT');
            const retargetingCustomer = retargetingResult.rows[0];
            console.log(`[MOVE-TO-RETARGETING] Successfully created retargeting customer: ${retargetingCustomer.id}`);
            // Sales tracking record remains unchanged (not deleted)
            res.json({
                success: true,
                retargetingId: retargetingCustomer.id,
                message: 'Successfully moved to retargeting'
            });
        }
        catch (insertError) {
            await client.query('ROLLBACK').catch(err => {
                console.error('[MOVE-TO-RETARGETING] Rollback error:', err);
            });
            // 상세한 오류 로깅
            console.error('[MOVE-TO-RETARGETING] ========== ERROR START ==========');
            console.error('[MOVE-TO-RETARGETING] INSERT 오류 발생!');
            console.error('[MOVE-TO-RETARGETING] 오류 메시지:', insertError.message);
            console.error('[MOVE-TO-RETARGETING] 오류 코드:', insertError.code);
            console.error('[MOVE-TO-RETARGETING] 오류 상세:', insertError.detail);
            console.error('[MOVE-TO-RETARGETING] 제약조건:', insertError.constraint);
            console.error('[MOVE-TO-RETARGETING] 오류 힌트:', insertError.hint);
            console.error('[MOVE-TO-RETARGETING] 오류 위치:', insertError.position);
            console.error('[MOVE-TO-RETARGETING] 오류 스택:', insertError.stack);
            console.error('[MOVE-TO-RETARGETING] 전체 오류 객체:', JSON.stringify(insertError, Object.getOwnPropertyNames(insertError), 2));
            if (insertValues && insertValues.length > 0) {
                console.error('[MOVE-TO-RETARGETING] 실제 전달된 값 재확인:');
                const paramNames = ['company_name', 'industry', 'customer_name', 'phone', 'region', 'inflow_path',
                    'manager', 'manager_team', 'status', 'registered_at', 'memo', 'sales_tracking_id'];
                insertValues.forEach((v, i) => {
                    console.error(`   [$${i + 1}] ${paramNames[i]}: ${v === null ? 'null' : JSON.stringify(v)} (타입: ${typeof v}, null: ${v === null}, undefined: ${v === undefined}, 빈문자열: ${v === ''})`);
                });
            }
            else {
                console.error('[MOVE-TO-RETARGETING] insertValues가 비어있거나 정의되지 않았습니다!');
            }
            console.error('[MOVE-TO-RETARGETING] ========== ERROR END ==========');
            throw insertError;
        }
        finally {
            client.release();
        }
    }
    catch (error) {
        console.error('[MOVE-TO-RETARGETING] ========== ERROR START ==========');
        console.error('[MOVE-TO-RETARGETING] Error moving to retargeting:', error);
        console.error('[MOVE-TO-RETARGETING] Error type:', typeof error);
        console.error('[MOVE-TO-RETARGETING] Error message:', error.message);
        console.error('[MOVE-TO-RETARGETING] Error code:', error.code);
        console.error('[MOVE-TO-RETARGETING] Error detail:', error.detail);
        console.error('[MOVE-TO-RETARGETING] Error hint:', error.hint);
        console.error('[MOVE-TO-RETARGETING] Error constraint:', error.constraint);
        console.error('[MOVE-TO-RETARGETING] Error position:', error.position);
        console.error('[MOVE-TO-RETARGETING] Error stack:', error.stack);
        console.error('[MOVE-TO-RETARGETING] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        console.error('[MOVE-TO-RETARGETING] ========== ERROR END ==========');
        res.status(500).json({
            message: 'Internal server error',
            error: error.message || 'Unknown error',
            detail: error.detail || null,
            code: error.code || null,
            constraint: error.constraint || null
        });
    }
});
// Get monthly statistics per manager
router.get('/stats/monthly', auth_1.authMiddleware, async (req, res) => {
    // 강제로 stdout에 즉시 출력 (Railway 로그 확인용)
    process.stdout.write('\n=== 월별 통계 API 호출됨 ===\n');
    console.error('\n=== 월별 통계 API 호출됨 (stderr) ===\n');
    try {
        const { month, year } = req.query;
        process.stdout.write(`요청 파라미터: year=${year}, month=${month}\n`);
        console.error(`요청 파라미터: year=${year}, month=${month}`);
        if (!month || !year) {
            process.stdout.write('❌ Month and year are required\n');
            return res.status(400).json({ message: 'Month and year are required' });
        }
        const yearNum = parseInt(String(year), 10);
        const monthNum = parseInt(String(month), 10);
        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            process.stdout.write(`❌ Invalid year or month: ${yearNum}, ${monthNum}\n`);
            return res.status(400).json({ message: 'Invalid year or month' });
        }
        // 월별 통계 집계
        // CSV 집계 로직:
        // - 電話数: contact_method = '電話'인 건수
        // - 送付数: contact_method IN ('DM', 'LINE', 'メール', 'フォーム')인 건수
        // - 合計数: 電話数 + 送付数
        // - 返信数: status = '返信済み'인 건수
        // - 返信率: (返信数 / 合計数) * 100
        // - リタ獲得数: 合計수 (동일)
        // - 商談中: status = '商談中'인 건수
        // - 契約: status = '契約'인 건수
        // - NG: status = 'NG'인 건수
        process.stdout.write('\n=== 월별 통계 조회 시작 ===\n');
        console.log('=== 월별 통계 조회 시작 ===');
        console.log(`조회 년도: ${yearNum}, 월: ${monthNum}`);
        process.stdout.write(`조회 년도: ${yearNum}, 월: ${monthNum}\n`);
        // 디버깅: 선택한 월의 status 값 확인 (2025년 11월 기준)
        const debugResult = await db_1.pool.query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
      GROUP BY status
      ORDER BY status
    `, [yearNum, monthNum]);
        console.log(`📊 ${yearNum}년 ${monthNum}월의 status 값 목록:`);
        if (debugResult.rows.length === 0) {
            console.log('  ⚠️ 해당 월에 데이터가 없습니다.');
        }
        else {
            debugResult.rows.forEach(row => {
                const isReply = row.status && row.status.includes('返信') && row.status !== '未返信';
                console.log(`  - "${row.status}": ${row.count}건 ${isReply ? '✅ (회신)' : ''}`);
            });
        }
        // 전체 레코드 수 확인
        const totalRecordsResult = await db_1.pool.query(`
      SELECT COUNT(*) as total
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
    `, [yearNum, monthNum]);
        console.log(`📈 전체 레코드 수: ${totalRecordsResult.rows[0].total}`);
        // 회신수 집계를 위한 테스트 쿼리 - 모든 "返信" 포함 상태 확인
        const replyTestResult = await db_1.pool.query(`
      SELECT 
        manager_name,
        status,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND (status LIKE '%返信%' OR status = '返信あり' OR status = '返信済み')
        AND status != '未返信'
      GROUP BY manager_name, status
      ORDER BY manager_name, status
    `, [yearNum, monthNum]);
        console.log('🔍 "返信"이 포함된 레코드 상세 (未返信 제외):');
        if (replyTestResult.rows.length === 0) {
            console.log('  ⚠️ 해당 월에 "返信"이 포함된 레코드가 없습니다.');
        }
        else {
            replyTestResult.rows.forEach(row => {
                console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건`);
            });
        }
        // 실제 데이터베이스의 status 값 바이트 확인 (디버깅용)
        const byteCheckResult = await db_1.pool.query(`
      SELECT DISTINCT 
        status,
        encode(status::bytea, 'hex') as status_bytes,
        length(status) as status_length,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND status LIKE '%返%' OR status LIKE '%信%'
      GROUP BY status
      ORDER BY status
    `, [yearNum, monthNum]);
        console.log('🔤 Status 값의 바이트 확인 (返 또는 信 포함):');
        byteCheckResult.rows.forEach(row => {
            console.log(`  "${row.status}" (길이: ${row.status_length}, 바이트: ${row.status_bytes}): ${row.count}건`);
        });
        // 집계 쿼리: 가장 단순한 방법으로 회신수 집계
        // 먼저 실제로 회신 레코드가 있는지 확인
        const replyCheckQuery = await db_1.pool.query(`
      SELECT 
        manager_name,
        status,
        COUNT(*) as count
      FROM sales_tracking
      WHERE 
        EXTRACT(YEAR FROM date) = $1 AND
        EXTRACT(MONTH FROM date) = $2
        AND status != '未返信'
        AND (status LIKE '%返%' OR status LIKE '%信%')
      GROUP BY manager_name, status
      ORDER BY manager_name, status
    `, [yearNum, monthNum]);
        console.log('🔍 회신 가능한 모든 레코드 (未返信 제외, 返 또는 信 포함):');
        replyCheckQuery.rows.forEach(row => {
            console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건`);
        });
        // 실제로 石黒杏奈의 11월 返信あり 레코드 확인
        const ishiguroReplyCheck = await db_1.pool.query(`
      SELECT 
        id,
        date,
        status,
        customer_name,
        account_id,
        encode(status::bytea, 'hex') as status_bytes
      FROM sales_tracking
      WHERE 
        manager_name = '石黒杏奈'
        AND EXTRACT(YEAR FROM date) = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND status LIKE '%返信%'
      ORDER BY date
      LIMIT 20
    `, [yearNum, monthNum]);
        process.stdout.write(`\n🔍 石黒杏奈의 11월 返信 레코드 (${ishiguroReplyCheck.rows.length}건):\n`);
        console.error(`\n🔍 石黒杏奈의 11월 返信 레코드 (${ishiguroReplyCheck.rows.length}건):`);
        ishiguroReplyCheck.rows.forEach((record, idx) => {
            process.stdout.write(`  ${idx + 1}. ID: ${record.id}, Date: ${record.date}, Status: "${record.status}", Customer: ${record.customer_name || record.account_id || 'N/A'}, Bytes: ${record.status_bytes}\n`);
            console.error(`  ${idx + 1}. ID: ${record.id}, Date: ${record.date}, Status: "${record.status}", Customer: ${record.customer_name || record.account_id || 'N/A'}, Bytes: ${record.status_bytes}`);
        });
        // 返信あり 정확히 일치하는 레코드 확인
        const exactMatchCheck = await db_1.pool.query(`
      SELECT COUNT(*) as count
      FROM sales_tracking
      WHERE 
        manager_name = '石黒杏奈'
        AND EXTRACT(YEAR FROM date) = $1
        AND EXTRACT(MONTH FROM date) = $2
        AND status = '返信あり'
    `, [yearNum, monthNum]);
        process.stdout.write(`\n✅ 石黒杏奈의 11월 status = '返信あり' 정확 일치: ${exactMatchCheck.rows[0].count}건\n`);
        console.error(`\n✅ 石黒杏奈의 11월 status = '返信あり' 정확 일치: ${exactMatchCheck.rows[0].count}건`);
        const result = await db_1.pool.query(`
      SELECT 
        st.manager_name,
        COUNT(*) FILTER (WHERE st.contact_method = '電話') as phone_count,
        COUNT(*) FILTER (WHERE st.contact_method IN ('DM', 'LINE', 'メール', 'フォーム')) as send_count,
        COUNT(*) as total_count,
        -- 회신수: 返信あり를 찾기 위한 다양한 조건
        COUNT(*) FILTER (WHERE st.status = '返信あり') as reply_count_exact,
        COUNT(*) FILTER (WHERE st.status LIKE '%返信あり%') as reply_count_like_ari,
        COUNT(*) FILTER (WHERE st.status LIKE '%返信%') as reply_count_like_all,
        COUNT(*) FILTER (WHERE st.status != '未返信') as reply_count_not_no_reply,
        -- 최종 회신수: 返信あり를 찾기 (정확 일치 또는 포함)
        COUNT(*) FILTER (WHERE st.status = '返信あり' OR st.status LIKE '%返信あり%') as reply_count,
        COUNT(*) FILTER (WHERE st.status = '商談中') as negotiation_count,
        COUNT(*) FILTER (WHERE st.status = '契約') as contract_count
      FROM sales_tracking st
      JOIN users u ON u.name = st.manager_name
      WHERE 
        EXTRACT(YEAR FROM st.date) = $1 AND
        EXTRACT(MONTH FROM st.date) = $2 AND
        u.role = 'marketer'
      GROUP BY st.manager_name
      ORDER BY st.manager_name
    `, [yearNum, monthNum]);
        // 리타획득수 집계: 작업에서 직접 리타겟팅으로 옮긴 건만 집계
        // sales_tracking_id가 있는 retargeting_customers 레코드 중에서
        // 해당 월의 sales_tracking 레코드와 매칭되는 것만 집계
        const retargetingCountResult = await db_1.pool.query(`
      SELECT 
        st.manager_name,
        COUNT(DISTINCT rc.id) as retargeting_count
      FROM sales_tracking st
      INNER JOIN retargeting_customers rc ON rc.sales_tracking_id = st.id
      JOIN users u ON u.name = st.manager_name
      WHERE 
        EXTRACT(YEAR FROM st.date) = $1 AND
        EXTRACT(MONTH FROM st.date) = $2 AND
        u.role = 'marketer'
        AND rc.sales_tracking_id IS NOT NULL
      GROUP BY st.manager_name
    `, [yearNum, monthNum]);
        // 디버깅: 리타획득수 집계 결과 확인
        process.stdout.write(`\n📊 리타획득수 집계 결과: ${retargetingCountResult.rows.length}명의 담당자\n`);
        console.error(`\n📊 리타획득수 집계 결과: ${retargetingCountResult.rows.length}명의 담당자`);
        retargetingCountResult.rows.forEach(row => {
            process.stdout.write(`   - ${row.manager_name}: ${row.retargeting_count}건\n`);
            console.error(`   - ${row.manager_name}: ${row.retargeting_count}건`);
        });
        // 리타획득수를 맵으로 변환하여 빠른 조회 가능하도록
        const retargetingCountMap = new Map();
        retargetingCountResult.rows.forEach(row => {
            const count = parseInt(row.retargeting_count) || 0;
            retargetingCountMap.set(row.manager_name, count);
            // 디버깅: 맵에 저장된 값 확인
            process.stdout.write(`   [맵 저장] ${row.manager_name} => ${count}\n`);
            console.error(`   [맵 저장] ${row.manager_name} => ${count}`);
        });
        // 추가 디버깅: 각 담당자별로 status 분포 확인 (마케터만)
        console.log('📊 담당자별 status 분포 (마케터만):');
        const statusDistribution = await db_1.pool.query(`
      SELECT 
        st.manager_name,
        st.status,
        COUNT(*) as count
      FROM sales_tracking st
      JOIN users u ON u.name = st.manager_name
      WHERE 
        EXTRACT(YEAR FROM st.date) = $1 AND
        EXTRACT(MONTH FROM st.date) = $2 AND
        u.role = 'marketer'
      GROUP BY st.manager_name, st.status
      ORDER BY st.manager_name, st.status
    `, [yearNum, monthNum]);
        statusDistribution.rows.forEach(row => {
            const isReply = row.status && row.status.includes('返信') && row.status !== '未返信';
            console.log(`  ${row.manager_name} - "${row.status}": ${row.count}건 ${isReply ? '✅ (회신)' : ''}`);
        });
        console.log('📋 집계 결과 (상세):');
        result.rows.forEach(row => {
            process.stdout.write(`  ${row.manager_name}:\n`);
            process.stdout.write(`    - 총: ${row.total_count}건\n`);
            process.stdout.write(`    - reply_count (최종): ${row.reply_count}건\n`);
            process.stdout.write(`    - reply_count_exact (status = '返信あり'): ${row.reply_count_exact}건\n`);
            process.stdout.write(`    - reply_count_like_ari ('%返信あり%'): ${row.reply_count_like_ari}건\n`);
            process.stdout.write(`    - reply_count_like_all ('%返信%'): ${row.reply_count_like_all}건\n`);
            console.error(`  ${row.manager_name}:`);
            console.error(`    - 총: ${row.total_count}건`);
            console.error(`    - reply_count (최종): ${row.reply_count}건`);
            console.error(`    - reply_count_exact (status = '返信あり'): ${row.reply_count_exact}건`);
            console.error(`    - reply_count_like_ari ('%返信あり%'): ${row.reply_count_like_ari}건`);
            console.error(`    - reply_count_like_all ('%返信%'): ${row.reply_count_like_all}건`);
        });
        // 추가: 각 담당자별로 실제 회신 레코드 확인 (LIKE 검색으로 한자 차이 문제 해결)
        console.log('🔍 실제 회신 레코드 확인 (담당자별):');
        for (const row of result.rows) {
            const replyRecords = await db_1.pool.query(`
        SELECT id, date, status, customer_name, encode(status::bytea, 'hex') as status_bytes
        FROM sales_tracking
        WHERE 
          manager_name = $1
          AND EXTRACT(YEAR FROM date) = $2
          AND EXTRACT(MONTH FROM date) = $3
          AND status LIKE '%返%'
          AND status LIKE '%信%'
          AND status NOT LIKE '%未返信%'
        LIMIT 5
      `, [row.manager_name, yearNum, monthNum]);
            if (replyRecords.rows.length > 0) {
                console.log(`  ${row.manager_name}: ${replyRecords.rows.length}건의 회신 레코드 발견`);
                replyRecords.rows.forEach(record => {
                    console.log(`    - ID: ${record.id}, Status: "${record.status}" (바이트: ${record.status_bytes}), Customer: ${record.customer_name || 'N/A'}`);
                });
            }
            else {
                console.log(`  ${row.manager_name}: 회신 레코드 없음 (집계된 회신수: ${row.reply_count})`);
            }
        }
        console.log('=== 월별 통계 조회 완료 ===');
        // 계산 필드 추가
        const stats = result.rows.map(row => {
            const total = parseInt(row.total_count) || 0;
            // reply_count 사용 (status = '返信あり' OR status LIKE '%返信あり%')
            let reply = parseInt(row.reply_count) || 0;
            // 디버깅: 각 담당자별 집계 값 로그
            process.stdout.write(`  [${row.manager_name}] exact: ${row.reply_count_exact}, like_ari: ${row.reply_count_like_ari}, like_all: ${row.reply_count_like_all}, 최종: ${reply}\n`);
            console.error(`  [${row.manager_name}] exact: ${row.reply_count_exact}, like_ari: ${row.reply_count_like_ari}, like_all: ${row.reply_count_like_all}, 최종: ${reply}`);
            const replyRate = total > 0 ? ((reply / total) * 100).toFixed(1) : '0.0';
            // 리타획득수: 맵에서 조회, 없으면 0 (작업에서 직접 이동한 건만 집계)
            // 안전장치: 명시적으로 0으로 설정 (혹시 모를 오류 방지)
            let retargetingCount = 0;
            if (retargetingCountMap.has(row.manager_name)) {
                const mapValue = retargetingCountMap.get(row.manager_name);
                retargetingCount = (mapValue !== undefined && mapValue !== null && !isNaN(mapValue)) ? parseInt(String(mapValue)) : 0;
            }
            // 안전장치: retargetingCount가 0이 아닌 경우 경고 및 0으로 강제 설정
            if (retargetingCount !== 0) {
                process.stdout.write(`   ⚠️ 경고: ${row.manager_name}의 리타획득수가 0이 아닙니다: ${retargetingCount} -> 0으로 강제 설정\n`);
                console.error(`   ⚠️ 경고: ${row.manager_name}의 리타획득수가 0이 아닙니다: ${retargetingCount} -> 0으로 강제 설정`);
                retargetingCount = 0;
            }
            // 디버깅: 각 담당자별 리타획득수 확인
            process.stdout.write(`   [${row.manager_name}] 리타획득수: ${retargetingCount} (맵에 존재: ${retargetingCountMap.has(row.manager_name)})\n`);
            console.error(`   [${row.manager_name}] 리타획득수: ${retargetingCount} (맵에 존재: ${retargetingCountMap.has(row.manager_name)})`);
            return {
                manager: row.manager_name,
                phoneCount: parseInt(row.phone_count) || 0,
                sendCount: parseInt(row.send_count) || 0,
                totalCount: total,
                replyCount: reply,
                replyRate: `${replyRate}%`,
                retargetingCount: 0, // 작업에서 직접 이동한 건만 집계 (현재는 항상 0)
                negotiationCount: parseInt(row.negotiation_count) || 0,
                contractCount: parseInt(row.contract_count) || 0
            };
        });
        // 디버깅 정보를 응답에 포함 (항상 포함하여 문제 진단)
        const debugInfo = {
            statusValues: debugResult.rows.map(r => ({ status: r.status, count: parseInt(r.count) })),
            replyTestResults: replyTestResult.rows.map(r => ({ manager: r.manager_name, status: r.status, count: parseInt(r.count) })),
            statusDistribution: statusDistribution.rows.map(r => ({
                manager: r.manager_name,
                status: r.status,
                count: parseInt(r.count),
                isReply: r.status && r.status.includes('返信') && r.status !== '未返信'
            })),
            totalRecords: parseInt(totalRecordsResult.rows[0].total),
            ishiguroReplyCount: ishiguroReplyCheck.rows.length,
            ishiguroExactMatch: parseInt(exactMatchCheck.rows[0].count),
            ishiguroReplyRecords: ishiguroReplyCheck.rows.map(r => ({
                id: r.id,
                date: r.date,
                status: r.status,
                statusBytes: r.status_bytes,
                customer: r.customer_name || r.account_id || 'N/A'
            }))
        };
        process.stdout.write(`\n📤 응답 전송: stats=${stats.length}개, debug 정보 포함\n`);
        console.error(`\n📤 응답 전송: stats=${stats.length}개, debug 정보 포함`);
        // 디버깅: 각 담당자별 리타획득수 확인
        process.stdout.write(`\n📊 최종 응답에 포함될 리타획득수:\n`);
        console.error(`\n📊 최종 응답에 포함될 리타획득수:`);
        stats.forEach(stat => {
            process.stdout.write(`   - ${stat.manager}: ${stat.retargetingCount}\n`);
            console.error(`   - ${stat.manager}: ${stat.retargetingCount}`);
            if (stat.retargetingCount !== 0) {
                process.stdout.write(`     ⚠️ 경고: 리타획득수가 0이 아닙니다!\n`);
                console.error(`     ⚠️ 경고: 리타획득수가 0이 아닙니다!`);
            }
        });
        // 응답 구조: stats 배열과 debug 정보를 함께 반환
        const responseData = {
            stats,
            debug: debugInfo
        };
        res.json(responseData);
    }
    catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=salesTracking.js.map