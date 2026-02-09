"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const nullSafe_1 = require("../utils/nullSafe");
const dateHelper_1 = require("../utils/dateHelper");
const dateHelper_2 = require("../utils/dateHelper");
const router = (0, express_1.Router)();
const mapInflowPathFromContactMethod = (contactMethod) => {
    console.log('[mapInflowPathFromContactMethod] Input:', { contactMethod, type: typeof contactMethod });
    if (!contactMethod) {
        console.log('[mapInflowPathFromContactMethod] Empty input, returning null');
        return null;
    }
    const normalized = contactMethod.trim();
    console.log('[mapInflowPathFromContactMethod] Normalized:', { normalized, length: normalized.length });
    if (!normalized)
        return null;
    if (normalized === '없음' || normalized === 'なし')
        return null;
    if (normalized.startsWith('아웃바운드('))
        return normalized;
    const normalizedLower = normalized.toLowerCase();
    const mapping = {
        전화: '아웃바운드(전화)',
        電話: '아웃바운드(전화)',
        phone: '아웃바운드(전화)',
        tel: '아웃바운드(전화)',
        라인: '아웃바운드(라인)',
        ライン: '아웃바운드(라인)',
        LINE: '아웃바운드(라인)',
        line: '아웃바운드(라인)',
        DM: '아웃바운드(DM)',
        dm: '아웃바운드(DM)',
        폼: '아웃바운드(폼)',
        フォーム: '아웃바운드(폼)',
        form: '아웃바운드(폼)',
        메일: '아웃바운드(메일)',
        メール: '아웃바운드(메일)',
        mail: '아웃바운드(메일)',
        email: '아웃바운드(메일)'
    };
    if (mapping[normalized]) {
        console.log('[mapInflowPathFromContactMethod] Exact match found:', mapping[normalized]);
        return mapping[normalized];
    }
    if (mapping[normalizedLower]) {
        console.log('[mapInflowPathFromContactMethod] Lowercase match found:', mapping[normalizedLower]);
        return mapping[normalizedLower];
    }
    const result = `아웃바운드(${normalized})`;
    console.log('[mapInflowPathFromContactMethod] No match, creating default:', result);
    return result;
};
// Get all sales tracking records (with search and date filtering)
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        const startDate = (req.query.startDate || '').trim();
        const endDate = (req.query.endDate || '').trim();
        const lastContactStartDate = (req.query.lastContactStartDate || '').trim();
        const lastContactEndDate = (req.query.lastContactEndDate || '').trim();
        // 추가 필터 파라미터
        const managerFilter = (req.query.manager || '').trim();
        const statusFilter = (req.query.status || '').trim();
        const contactMethodFilter = (req.query.contactMethod || '').trim();
        const movedToRetargetingFilter = (req.query.movedToRetargeting || '').trim();
        const rawLimit = req.query.limit;
        const limit = typeof rawLimit === 'string' && rawLimit.toLowerCase() === 'all'
            ? null
            : (() => {
                const parsed = parseInt(String(rawLimit ?? '500'), 10);
                return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
            })();
        const offset = limit === null
            ? 0
            : Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0);
        const params = [];
        let query = `
      SELECT 
        st.id,
        st.date,
        st.occurred_at,
        st.manager_name,
        st.company_name,
        st.account_id,
        st.customer_name,
        st.industry,
        st.contact_method,
        st.status,
        st.contact_person,
        st.phone,
        st.memo,
        st.memo_note,
        st.user_id,
        st.created_at,
        st.updated_at,
        st.moved_to_retargeting,
        st.restaurant_id,
        st.last_contact_at,
        COALESCE(h.latest_round, 0) as latest_round`;
        let orderClause = '';
        if (search) {
            query += `,
        CASE
          WHEN st.manager_name = $1 OR st.company_name = $1 OR st.account_id = $1 OR st.customer_name = $1 OR st.industry = $1 OR st.phone = $1
               OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(st.phone, '[^0-9]', '', 'g') = regexp_replace($1, '[^0-9]', '', 'g')) THEN 1
          WHEN st.manager_name ILIKE $2 OR st.company_name ILIKE $2 OR st.account_id ILIKE $2 OR st.customer_name ILIKE $2 OR st.industry ILIKE $2 OR st.phone ILIKE $2
               OR (regexp_replace($2, '[^0-9]', '', 'g') <> '' AND regexp_replace(st.phone, '[^0-9]', '', 'g') LIKE regexp_replace($2, '[^0-9]', '', 'g') || '') THEN 2
          WHEN st.manager_name ILIKE $3 OR st.company_name ILIKE $3 OR st.account_id ILIKE $3 OR st.customer_name ILIKE $3 OR st.industry ILIKE $3 OR st.phone ILIKE $3
               OR (regexp_replace($1, '[^0-9]', '', 'g') <> '' AND regexp_replace(st.phone, '[^0-9]', '', 'g') LIKE '%' || regexp_replace($1, '[^0-9]', '', 'g') || '%') THEN 3
          ELSE 999
        END as match_priority`;
        }
        query += ` FROM sales_tracking st
      LEFT JOIN (
        SELECT sales_tracking_id, MAX(round) as latest_round
        FROM sales_tracking_history
        GROUP BY sales_tracking_id
      ) h ON h.sales_tracking_id = st.id`;
        const whereConditions = [];
        if (search) {
            const kw = search.trim();
            params.push(kw, `${kw}%`, `%${kw}%`);
            const paramIdx1 = params.length - 2;
            const paramIdx2 = params.length - 1;
            const paramIdx3 = params.length;
            whereConditions.push(`(
        (st.manager_name = $${paramIdx1} OR st.company_name = $${paramIdx1} OR st.account_id = $${paramIdx1} OR st.customer_name = $${paramIdx1} OR st.industry = $${paramIdx1} OR st.phone = $${paramIdx1}
         OR (regexp_replace($${paramIdx1}, '[^0-9]', '', 'g') <> '' AND regexp_replace(st.phone, '[^0-9]', '', 'g') = regexp_replace($${paramIdx1}, '[^0-9]', '', 'g'))) OR
        (st.manager_name ILIKE $${paramIdx2} OR st.company_name ILIKE $${paramIdx2} OR st.account_id ILIKE $${paramIdx2} OR st.customer_name ILIKE $${paramIdx2} OR st.industry ILIKE $${paramIdx2} OR st.phone ILIKE $${paramIdx2}
         OR (regexp_replace($${paramIdx2}, '[^0-9]', '', 'g') <> '' AND regexp_replace(st.phone, '[^0-9]', '', 'g') LIKE regexp_replace($${paramIdx2}, '[^0-9]', '', 'g') || '')) OR
        (st.manager_name ILIKE $${paramIdx3} OR st.company_name ILIKE $${paramIdx3} OR st.account_id ILIKE $${paramIdx3} OR st.customer_name ILIKE $${paramIdx3} OR st.industry ILIKE $${paramIdx3} OR st.phone ILIKE $${paramIdx3}
         OR (regexp_replace($${paramIdx1}, '[^0-9]', '', 'g') <> '' AND regexp_replace(st.phone, '[^0-9]', '', 'g') LIKE '%' || regexp_replace($${paramIdx1}, '[^0-9]', '', 'g') || '%'))
      )`);
            orderClause = ` ORDER BY match_priority, st.date DESC, COALESCE(st.occurred_at, st.date::timestamp) DESC`;
        }
        else {
            orderClause = ` ORDER BY st.date DESC, COALESCE(st.occurred_at, st.date::timestamp) DESC`;
        }
        // Date range filtering (for record date)
        if (startDate) {
            params.push(startDate);
            whereConditions.push(`st.date >= $${params.length}`);
        }
        if (endDate) {
            params.push(endDate);
            whereConditions.push(`st.date <= $${params.length}`);
        }
        // Last contact date filtering
        if (lastContactStartDate) {
            params.push(lastContactStartDate);
            whereConditions.push(`st.last_contact_at >= $${params.length}::date`);
        }
        if (lastContactEndDate) {
            params.push(lastContactEndDate);
            whereConditions.push(`st.last_contact_at < ($${params.length}::date + interval '1 day')`);
        }
        // 담당자 필터
        if (managerFilter && managerFilter !== 'all') {
            params.push(managerFilter);
            whereConditions.push(`st.manager_name = $${params.length}`);
        }
        // 진행현황 필터
        if (statusFilter && statusFilter !== 'all') {
            params.push(statusFilter);
            whereConditions.push(`st.status = $${params.length}`);
        }
        // 영업방법 필터
        if (contactMethodFilter && contactMethodFilter !== 'all') {
            if (contactMethodFilter === 'none') {
                whereConditions.push(`(st.contact_method IS NULL OR TRIM(st.contact_method) = '')`);
            }
            else {
                params.push(contactMethodFilter);
                whereConditions.push(`st.contact_method = $${params.length}`);
            }
        }
        // 리타겟팅 이동 여부 필터
        if (movedToRetargetingFilter && movedToRetargetingFilter !== 'all') {
            if (movedToRetargetingFilter === 'moved') {
                whereConditions.push(`st.moved_to_retargeting = TRUE`);
            }
            else if (movedToRetargetingFilter === 'notMoved') {
                whereConditions.push(`(st.moved_to_retargeting IS NULL OR st.moved_to_retargeting = FALSE)`);
            }
        }
        // 차수 필터
        const roundFilter = (req.query.round || '').trim();
        if (roundFilter && roundFilter !== 'all') {
            const roundNum = parseInt(roundFilter, 10);
            if (!isNaN(roundNum)) {
                if (roundNum === 0) {
                    // 0차 = 히스토리가 없는 레코드
                    whereConditions.push(`h.latest_round IS NULL`);
                }
                else {
                    params.push(roundNum);
                    whereConditions.push(`h.latest_round = $${params.length}`);
                }
            }
        }
        const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';
        if (whereClause) {
            query += whereClause;
        }
        // COUNT 쿼리 (LIMIT/OFFSET 적용 전에 실행)
        const countQuery = `SELECT COUNT(*) FROM sales_tracking st
      LEFT JOIN (
        SELECT sales_tracking_id, MAX(round) as latest_round
        FROM sales_tracking_history
        GROUP BY sales_tracking_id
      ) h ON h.sales_tracking_id = st.id${whereClause}`;
        const countParams = [...params]; // LIMIT/OFFSET 추가 전의 파라미터 복사
        const countResult = await db_1.pool.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count, 10);
        query += orderClause;
        if (limit !== null) {
            params.push(limit, offset);
            query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
        }
        const result = await db_1.pool.query(query, params);
        const rows = result.rows.map(({ customer_name: _ignored, ...rest }) => rest);
        const hasMore = limit !== null && result.rows.length === limit;
        res.json({ rows, hasMore, totalCount });
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
        const { date, managerName, companyName, accountId, industry, contactMethod, status, contactPerson, phone, memo, memoNote } = req.body;
        if (!date || !managerName || !status) {
            return res.status(400).json({ message: 'Date, manager name, and status are required' });
        }
        const occurredAt = new Date();
        const occurredAtStr = (0, dateHelper_2.toSeoulTimestampString)(new Date());
        const result = await db_1.pool.query(`INSERT INTO sales_tracking (
        date, occurred_at, manager_name, company_name, account_id, customer_name, industry,
        contact_method, status, contact_person, phone, memo, memo_note, user_id
      ) VALUES ($1, $2, $3, $4, $5, '', $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`, [
            date,
            occurredAtStr,
            managerName,
            companyName || null,
            accountId || null,
            industry || null,
            contactMethod || null,
            status,
            contactPerson || null,
            (0, nullSafe_1.formatPhoneNumber)(phone) || null,
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
// 일괄 메모 업데이트 (본인 담당 항목만)
router.put('/bulk-memo', auth_1.authMiddleware, async (req, res) => {
    try {
        const { ids, memo } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: '선택된 항목이 없습니다' });
        }
        if (typeof memo !== 'string') {
            return res.status(400).json({ message: '메모 내용이 필요합니다' });
        }
        // 본인이 작성한 레코드만 업데이트
        const result = await db_1.pool.query(`UPDATE sales_tracking 
       SET memo = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($2) AND user_id = $3
       RETURNING id`, [memo, ids, req.user?.id]);
        res.json({
            success: true,
            updated: result.rowCount,
            message: `${result.rowCount}건의 메모를 수정했습니다`
        });
    }
    catch (error) {
        console.error('Bulk memo update error:', error);
        res.status(500).json({ message: '일괄 메모 수정에 실패했습니다' });
    }
});
// 일괄 리타겟팅 이동 (본인 담당 항목만)
router.post('/bulk-move-to-retargeting', auth_1.authMiddleware, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: '선택된 항목이 없습니다' });
        }
        // 본인이 작성한 레코드만 조회
        const recordsResult = await db_1.pool.query(`SELECT id, company_name, customer_name, phone, account_id, contact_method, memo, industry, manager_name, date
       FROM sales_tracking 
       WHERE id = ANY($1) AND user_id = $2`, [ids, req.user?.id]);
        if (recordsResult.rows.length === 0) {
            return res.status(400).json({ message: '이동할 수 있는 항목이 없습니다' });
        }
        let successCount = 0;
        let failCount = 0;
        const errors = [];
        // 각 레코드를 리타겟팅으로 이동
        for (const record of recordsResult.rows) {
            try {
                const registeredAtDate = (record.date ? (0, dateHelper_1.toJSTDateString)(record.date) : null) || (0, dateHelper_1.getJSTTodayString)();
                // 리타겟팅 고객으로 추가
                const inflowPath = mapInflowPathFromContactMethod(record.contact_method);
                await db_1.pool.query(`INSERT INTO retargeting_customers 
           (company_name, industry, customer_name, phone, region, inflow_path, manager, manager_team, status, registered_at, memo, homepage, instagram, main_keywords, sales_tracking_id, last_contact_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`, [
                    record.company_name || '',
                    record.industry || null,
                    record.customer_name || record.company_name || '이름 없음',
                    record.phone || '',
                    null, // region
                    inflowPath, // inflow_path (유입경로)
                    record.manager_name || '',
                    null, // manager_team
                    '시작', // status
                    registeredAtDate, // registered_at
                    record.memo || null,
                    '', // homepage
                    record.account_id || '', // instagram (account_id를 instagram 필드에 저장)
                    null, // main_keywords
                    record.id, // sales_tracking_id
                    new Date().toISOString() // last_contact_date
                ]);
                // 영업이력에서 플래그 설정 (삭제하지 않음)
                await db_1.pool.query(`UPDATE sales_tracking SET moved_to_retargeting = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [record.id]);
                successCount++;
            }
            catch (error) {
                console.error(`Failed to move record ${record.id}:`, error);
                failCount++;
                errors.push(`${record.company_name || record.customer_name}: ${error.message}`);
            }
        }
        res.json({
            success: true,
            successCount,
            failCount,
            message: `${successCount}건을 리타겟팅으로 이동했습니다${failCount > 0 ? ` (실패: ${failCount}건)` : ''}`,
            errors: errors.length > 0 ? errors : undefined
        });
    }
    catch (error) {
        console.error('Bulk move to retargeting error:', error);
        res.status(500).json({ message: '리타겟팅 이동에 실패했습니다' });
    }
});
// Update sales tracking record (only owner can update)
router.put('/:id', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        // Check if record exists and get user_id, moved_to_retargeting
        const recordResult = await db_1.pool.query('SELECT user_id, moved_to_retargeting FROM sales_tracking WHERE id = $1', [id]);
        if (recordResult.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }
        // Check if user is the owner (or admin)
        const recordUserId = recordResult.rows[0].user_id;
        const movedToRetargeting = recordResult.rows[0].moved_to_retargeting;
        if (req.user?.role !== 'admin' && req.user?.id !== recordUserId) {
            return res.status(403).json({ message: 'You can only edit your own records' });
        }
        const { date, managerName, companyName, accountId, industry, contactMethod, status, contactPerson, phone, memo, memoNote } = req.body;
        // moved_to_retargeting인 경우 status만 업데이트
        if (movedToRetargeting) {
            await db_1.pool.query(`UPDATE sales_tracking SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`, [status, id]);
        }
        else {
            // 일반 레코드는 전체 업데이트
            await db_1.pool.query(`UPDATE sales_tracking SET
          date = $1,
          manager_name = $2,
          company_name = $3,
          account_id = $4,
          customer_name = '',
          industry = $5,
          contact_method = $6,
          status = $7,
          contact_person = $8,
          phone = $9,
          memo = $10,
          memo_note = $11,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $12`, [
                date,
                managerName,
                companyName || null,
                accountId || null,
                industry || null,
                contactMethod || null,
                status,
                contactPerson || null,
                (0, nullSafe_1.formatPhoneNumber)(phone) || null,
                memo || null,
                memoNote || null,
                id
            ]);
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating sales tracking record:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Reset last contact time (set to null) - Must be defined BEFORE /:id route
router.delete('/:id/contact', auth_1.authMiddleware, async (req, res) => {
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
            return res.status(403).json({ message: 'You can only update your own records' });
        }
        // Reset last_contact_at to null
        await db_1.pool.query(`UPDATE sales_tracking 
       SET last_contact_at = NULL, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`, [id]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error resetting last contact time:', error);
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
// Update last contact time (only owner can update)
router.patch('/:id/contact', auth_1.authMiddleware, async (req, res) => {
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
            return res.status(403).json({ message: 'You can only update your own records' });
        }
        // Update last_contact_at to current timestamp
        const result = await db_1.pool.query(`UPDATE sales_tracking 
       SET last_contact_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1
       RETURNING id, last_contact_at`, [id]);
        res.json({
            success: true,
            last_contact_at: result.rows[0].last_contact_at
        });
    }
    catch (error) {
        console.error('Error updating last contact time:', error);
        res.status(500).json({ message: 'Internal server error' });
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
        // null-safe 유틸리티 함수 사용으로 절대 null이 반환되지 않도록 보장
        console.log('[MOVE-TO-RETARGETING] 원본 레코드 필드:', {
            company_name: record.company_name,
            customer_name: record.customer_name,
            account_id: record.account_id,
            phone: record.phone,
            manager_name: record.manager_name
        });
        // company_name: 빈값이면 빈값 유지 (NOT NULL이지만 빈 문자열 허용)
        const rawCompanyName = record.company_name ? record.company_name.trim() : '';
        const rawCustomerName = record.customer_name ? record.customer_name.trim() : '';
        const companyNameFinal = rawCompanyName || rawCustomerName || '';
        const customerNameFinal = rawCustomerName || companyNameFinal;
        // phone: 빈값이면 빈값 유지 (NOT NULL이지만 빈 문자열 허용)
        const phoneFinal = record.phone ? record.phone.trim() : '';
        // industry: 있으면 사용, 없으면 null (빈 값 허용)
        const industry = record.industry ? record.industry.trim() : null;
        const industryFinal = (industry && industry !== '') ? industry : null;
        // instagram: account_id를 instagram 필드에 저장 (빈 값 허용)
        const instagram = (0, nullSafe_1.safeString)(record.account_id, '');
        const instagramFinal = (instagram && instagram !== '') ? instagram.trim() : null;
        // manager_name: 필수
        const managerName = (0, nullSafe_1.safeString)(record.manager_name, '');
        if (!managerName || managerName === '') {
            console.error('[MOVE-TO-RETARGETING] Error: manager_name is required but not found', {
                recordManagerName: record.manager_name,
                managerNameAfterSafe: managerName
            });
            return res.status(400).json({ message: 'Manager name is required' });
        }
        console.log('[MOVE-TO-RETARGETING] null-safe 처리 후:', {
            companyNameFinal,
            customerNameFinal,
            phoneFinal,
            managerName,
            industry: industryFinal,
            instagram: instagramFinal
        });
        // Create retargeting customer from sales tracking record
        // 트랜잭션으로 안전하게 처리
        // insertValues를 try 블록 밖에서 선언하여 catch 블록에서도 접근 가능하도록 함
        let insertValues = [];
        const client = await db_1.pool.connect();
        try {
            await client.query('BEGIN');
            const registeredAtDate = (record.date ? (0, dateHelper_1.toJSTDateString)(record.date) : null) || (0, dateHelper_1.getJSTTodayString)();
            const lastContactDate = new Date().toISOString(); // 이동한 날짜를 마지막 연락일로 설정
            // memo: 빈 값 허용
            const memoFinal = record.memo ? record.memo.trim() : null;
            const memoFinalValue = (memoFinal && memoFinal !== '') ? memoFinal : null;
            const inflowPath = mapInflowPathFromContactMethod(record.contact_method);
            // insertValues 배열 생성 (null-safe 유틸리티로 이미 처리된 값들 사용)
            insertValues = [
                companyNameFinal, // company_name (NOT NULL) - null-safe 처리 완료
                industryFinal, // industry (null 허용)
                customerNameFinal, // customer_name (NOT NULL) - null-safe 처리 완료
                phoneFinal, // phone (NOT NULL) - null-safe 처리 완료
                null, // region
                inflowPath, // inflow_path (유입경로)
                managerName, // manager - null-safe 처리 완료
                null, // manager_team
                '시작', // status
                registeredAtDate, // registered_at (YYYY-MM-DD 형식)
                memoFinalValue, // memo (null 허용)
                null, // homepage
                instagramFinal, // instagram (account_id에서 가져옴, null 허용)
                null, // main_keywords
                id, // sales_tracking_id
                lastContactDate // last_contact_date (이동한 날짜)
            ];
            // NOT NULL 필드 강제 검증 (인덱스: 6=manager만 필수)
            // company_name, customer_name, phone은 빈값 허용
            (0, nullSafe_1.validateInsertValues)(insertValues, [6], {
                6: managerName || record.manager_name || '' // manager만 필수
            });
            // INSERT 전 최종 검증 로그
            console.log(`[MOVE-TO-RETARGETING] Final insert values (before query):`, {
                company_name: insertValues[0],
                customer_name: insertValues[2],
                phone: insertValues[3],
                manager: insertValues[6],
                allValues: insertValues.map((v, i) => {
                    const paramNames = ['company_name', 'industry', 'customer_name', 'phone', 'region', 'inflow_path',
                        'manager', 'manager_team', 'status', 'registered_at', 'memo', 'homepage', 'instagram', 'main_keywords', 'sales_tracking_id'];
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
          manager, manager_team, status, registered_at, memo, homepage, instagram, main_keywords, sales_tracking_id, last_contact_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *`, insertValues);
            await client.query('COMMIT');
            const retargetingCustomer = retargetingResult.rows[0];
            console.log(`[MOVE-TO-RETARGETING] Successfully created retargeting customer: ${retargetingCustomer.id}`);
            // Sales tracking record에 moved_to_retargeting 플래그 설정
            await db_1.pool.query(`UPDATE sales_tracking SET moved_to_retargeting = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
            console.log(`[MOVE-TO-RETARGETING] Set moved_to_retargeting flag for sales_tracking record: ${id}`);
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
                    'manager', 'manager_team', 'status', 'registered_at', 'memo', 'homepage', 'instagram', 'main_keywords', 'sales_tracking_id'];
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
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ message: 'Month and year are required' });
        }
        const yearNum = parseInt(String(year), 10);
        const monthNum = parseInt(String(month), 10);
        if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).json({ message: 'Invalid year or month' });
        }
        // 날짜 범위 계산 (EXTRACT 대신 인덱스 활용 가능한 범위 비교)
        const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
        const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
        const nextYear = monthNum === 12 ? yearNum + 1 : yearNum;
        const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
        // 단일 쿼리: 통계 집계 + 리타겟팅 획득수를 CTE로 결합
        const result = await db_1.pool.query(`
      WITH stats AS (
        SELECT 
          st.manager_name,
          COUNT(*) FILTER (WHERE st.contact_method = '電話') as phone_count,
          COUNT(*) FILTER (
            WHERE st.contact_method IN ('DM', 'LINE', 'メール', 'フォーム')
              OR st.contact_method IS NULL
              OR TRIM(COALESCE(st.contact_method, '')) = ''
          ) as send_count,
          COUNT(*) as total_count,
          COUNT(*) FILTER (
            WHERE st.status LIKE '%返信%'
              AND st.status NOT LIKE '未返信%'
          ) as reply_count,
          COUNT(*) FILTER (WHERE st.status = '商談中') as negotiation_count,
          COUNT(*) FILTER (WHERE st.status = '契約') as contract_count
        FROM sales_tracking st
        WHERE st.date >= $1::date AND st.date < $2::date
        GROUP BY st.manager_name
      ),
      retarget AS (
        SELECT 
          st.manager_name,
          COUNT(DISTINCT rc.id) as retargeting_count
        FROM sales_tracking st
        INNER JOIN retargeting_customers rc ON rc.sales_tracking_id = st.id
        WHERE st.date >= $1::date AND st.date < $2::date
        GROUP BY st.manager_name
      )
      SELECT 
        s.manager_name,
        s.phone_count,
        s.send_count,
        s.total_count,
        s.reply_count,
        s.negotiation_count,
        s.contract_count,
        COALESCE(r.retargeting_count, 0) as retargeting_count
      FROM stats s
      LEFT JOIN retarget r ON s.manager_name = r.manager_name
      ORDER BY s.manager_name
    `, [startDate, endDate]);
        const stats = result.rows.map(row => {
            const total = parseInt(row.total_count) || 0;
            const reply = parseInt(row.reply_count) || 0;
            const replyRate = total > 0 ? ((reply / total) * 100).toFixed(1) : '0.0';
            return {
                manager: row.manager_name,
                phoneCount: parseInt(row.phone_count) || 0,
                sendCount: parseInt(row.send_count) || 0,
                totalCount: total,
                replyCount: reply,
                replyRate: `${replyRate}%`,
                retargetingCount: parseInt(row.retargeting_count) || 0,
                negotiationCount: parseInt(row.negotiation_count) || 0,
                contractCount: parseInt(row.contract_count) || 0
            };
        });
        res.json({ stats });
    }
    catch (error) {
        console.error('Error fetching monthly stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get daily statistics (overall or by manager)
router.get('/stats/daily', auth_1.authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, scope = 'overall', manager = 'all' } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }
        // days series (inclusive)
        // st_day is the truncated date
        const baseCTE = `
      WITH days AS (
        SELECT generate_series(date_trunc('day', $1::date), date_trunc('day', $2::date), interval '1 day') AS day
      ),
      agg AS (
        SELECT 
          date_trunc('day', st.date) AS st_day,
          st.manager_name,
          COUNT(*) FILTER (WHERE st.contact_method = '電話') AS phone_count,
          COUNT(*) FILTER (
            WHERE st.contact_method IN ('DM','LINE','メール','フォーム')
              OR st.contact_method IS NULL
              OR TRIM(COALESCE(st.contact_method, '')) = ''
          ) AS send_count,
          COUNT(*) AS total_count,
          COUNT(*) FILTER (
            WHERE st.status LIKE '%返信%'
              AND st.status NOT LIKE '未返信%'
          ) AS reply_count,
          COUNT(*) FILTER (WHERE st.status = '商談中') AS negotiation_count,
          COUNT(*) FILTER (WHERE st.status = '契約') AS contract_count
        FROM sales_tracking st
        WHERE st.date BETWEEN $1::date AND ($2::date + INTERVAL '1 day' - INTERVAL '1 second')
        GROUP BY st_day, st.manager_name
      ),
      retarget AS (
        SELECT date_trunc('day', rc.last_contact_date) AS st_day, st.manager_name, COUNT(DISTINCT rc.id) AS retargeting_count
        FROM sales_tracking st
        INNER JOIN retargeting_customers rc ON rc.sales_tracking_id = st.id
        WHERE rc.last_contact_date BETWEEN $1::date AND ($2::date + INTERVAL '1 day' - INTERVAL '1 second')
        GROUP BY st_day, st.manager_name
      )
    `;
        let query = '';
        const params = [startDate, endDate];
        if (String(scope) === 'by_manager') {
            // 날짜 x 담당자
            query = `
        ${baseCTE}
        SELECT 
          d.day AS date,
          a.manager_name AS manager,
          COALESCE(a.phone_count,0) AS phone_count,
          COALESCE(a.send_count,0) AS send_count,
          COALESCE(a.total_count,0) AS total_count,
          COALESCE(a.reply_count,0) AS reply_count,
          CASE WHEN COALESCE(a.total_count,0) > 0 THEN ROUND((COALESCE(a.reply_count,0)::numeric / a.total_count) * 100, 1) ELSE 0 END AS reply_rate,
          COALESCE(r.retargeting_count,0) AS retargeting_count,
          COALESCE(a.negotiation_count,0) AS negotiation_count,
          COALESCE(a.contract_count,0) AS contract_count
        FROM days d
        LEFT JOIN agg a ON a.st_day = d.day
        LEFT JOIN retarget r ON r.st_day = d.day AND r.manager_name = a.manager_name
        ${manager && manager !== 'all' ? 'WHERE a.manager_name = $3' : ''}
        ORDER BY date DESC, manager ASC
      `;
            if (manager && manager !== 'all')
                params.push(manager);
        }
        else {
            // 날짜 합계(담당자 합산)
            query = `
        ${baseCTE}
        SELECT 
          d.day AS date,
          COALESCE(SUM(a.phone_count),0) AS phone_count,
          COALESCE(SUM(a.send_count),0) AS send_count,
          COALESCE(SUM(a.total_count),0) AS total_count,
          COALESCE(SUM(a.reply_count),0) AS reply_count,
          CASE WHEN COALESCE(SUM(a.total_count),0) > 0 THEN ROUND((SUM(a.reply_count)::numeric / SUM(a.total_count)) * 100, 1) ELSE 0 END AS reply_rate,
          COALESCE(SUM(r.retargeting_count),0) AS retargeting_count,
          COALESCE(SUM(a.negotiation_count),0) AS negotiation_count,
          COALESCE(SUM(a.contract_count),0) AS contract_count
        FROM days d
        LEFT JOIN agg a ON a.st_day = d.day
        LEFT JOIN retarget r ON r.st_day = d.day AND r.manager_name = a.manager_name
        GROUP BY d.day
        ORDER BY d.day DESC
      `;
        }
        const result = await db_1.pool.query(query, params);
        const rows = result.rows.map((row) => ({
            date: row.date instanceof Date ? ((0, dateHelper_1.toJSTDateString)(row.date) || row.date) : row.date,
            manager: row.manager,
            phoneCount: parseInt(row.phone_count) || 0,
            sendCount: parseInt(row.send_count) || 0,
            totalCount: parseInt(row.total_count) || 0,
            replyCount: parseInt(row.reply_count) || 0,
            replyRate: `${(typeof row.reply_rate === 'number' ? row.reply_rate : parseFloat(row.reply_rate || '0')).toFixed(1)}%`,
            retargetingCount: parseInt(row.retargeting_count) || 0,
            negotiationCount: parseInt(row.negotiation_count) || 0,
            contractCount: parseInt(row.contract_count) || 0
        }));
        res.json(rows);
    }
    catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ===== 히스토리 API =====
// Get history for a sales tracking record
router.get('/:id/history', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`SELECT id, sales_tracking_id, round, contact_date, content, user_id, user_name, created_at
       FROM sales_tracking_history
       WHERE sales_tracking_id = $1
       ORDER BY round DESC, contact_date DESC`, [id]);
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching sales tracking history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Add history entry to a sales tracking record
router.post('/:id/history', auth_1.authMiddleware, async (req, res) => {
    const client = await db_1.pool.connect();
    try {
        const { id } = req.params;
        const { round, content } = req.body;
        if (!round || round < 1) {
            return res.status(400).json({ message: 'Valid round number is required' });
        }
        // Check if record exists and get user_id
        const recordResult = await client.query('SELECT user_id FROM sales_tracking WHERE id = $1', [id]);
        if (recordResult.rows.length === 0) {
            return res.status(404).json({ message: 'Record not found' });
        }
        // Check if user is the owner (or admin)
        const recordUserId = recordResult.rows[0].user_id;
        if (req.user?.role !== 'admin' && req.user?.id !== recordUserId) {
            return res.status(403).json({ message: 'You can only add history to your own records' });
        }
        await client.query('BEGIN');
        // Insert history entry (contact_date is automatically set to current timestamp)
        const historyResult = await client.query(`INSERT INTO sales_tracking_history (sales_tracking_id, round, content, user_id, user_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [id, round, content || null, req.user?.id, req.user?.name || '']);
        // Update last_contact_at in sales_tracking
        await client.query(`UPDATE sales_tracking 
       SET last_contact_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`, [id]);
        await client.query('COMMIT');
        res.json({
            success: true,
            history: historyResult.rows[0]
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding sales tracking history:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
    finally {
        client.release();
    }
});
// Bulk add history entries to multiple sales tracking records
router.post('/bulk-history', auth_1.authMiddleware, async (req, res) => {
    const client = await db_1.pool.connect();
    try {
        const { ids, round, content } = req.body;
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: '선택된 항목이 없습니다' });
        }
        if (!round || round < 1) {
            return res.status(400).json({ message: '차수를 입력해주세요' });
        }
        // Get records owned by the user
        const recordsResult = await client.query(`SELECT id FROM sales_tracking WHERE id = ANY($1) AND user_id = $2`, [ids, req.user?.id]);
        if (recordsResult.rows.length === 0) {
            return res.status(400).json({ message: '수정할 수 있는 항목이 없습니다' });
        }
        const validIds = recordsResult.rows.map(r => r.id);
        await client.query('BEGIN');
        // Insert history entries for all valid records
        const insertPromises = validIds.map(recordId => client.query(`INSERT INTO sales_tracking_history (sales_tracking_id, round, content, user_id, user_name)
         VALUES ($1, $2, $3, $4, $5)`, [recordId, round, content || null, req.user?.id, req.user?.name || '']));
        await Promise.all(insertPromises);
        // Update last_contact_at for all valid records
        await client.query(`UPDATE sales_tracking 
       SET last_contact_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1)`, [validIds]);
        await client.query('COMMIT');
        res.json({
            success: true,
            updated: validIds.length,
            message: `${validIds.length}건의 연락 기록을 추가했습니다`
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Bulk history add error:', error);
        res.status(500).json({ message: '일괄 기록 추가에 실패했습니다' });
    }
    finally {
        client.release();
    }
});
// Delete a history entry
router.delete('/history/:historyId', auth_1.authMiddleware, async (req, res) => {
    try {
        const { historyId } = req.params;
        // Get history entry and check ownership through sales_tracking
        const historyResult = await db_1.pool.query(`SELECT h.id, h.sales_tracking_id, st.user_id
       FROM sales_tracking_history h
       JOIN sales_tracking st ON h.sales_tracking_id = st.id
       WHERE h.id = $1`, [historyId]);
        if (historyResult.rows.length === 0) {
            return res.status(404).json({ message: 'History entry not found' });
        }
        // Check if user is the owner (or admin)
        const recordUserId = historyResult.rows[0].user_id;
        if (req.user?.role !== 'admin' && req.user?.id !== recordUserId) {
            return res.status(403).json({ message: 'You can only delete history from your own records' });
        }
        await db_1.pool.query('DELETE FROM sales_tracking_history WHERE id = $1', [historyId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting history entry:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// Get next round number for a sales tracking record
router.get('/:id/next-round', auth_1.authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`SELECT COALESCE(MAX(round), 0) + 1 as next_round
       FROM sales_tracking_history
       WHERE sales_tracking_id = $1`, [id]);
        res.json({ nextRound: result.rows[0].next_round });
    }
    catch (error) {
        console.error('Error getting next round:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=salesTracking.js.map