-- =============================
-- 대시보드 성능 최적화 인덱스
-- =============================
-- 작성일: 2025-01-22
-- 목적: performance-stats API 조회 성능 향상

-- 기간 조회 성능 향상을 위한 필수 인덱스
CREATE INDEX IF NOT EXISTS idx_sales_contract_date ON sales(contract_date);
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_assigned_at ON inquiry_leads(assigned_at);
CREATE INDEX IF NOT EXISTS idx_customer_history_created_at ON customer_history(created_at);
CREATE INDEX IF NOT EXISTS idx_retargeting_history_created_at ON retargeting_history(created_at);

-- 상태 필터링 성능 향상
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_status ON inquiry_leads(status);

-- 담당자별 조회 성능 향상 (복합 인덱스)
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_assignee_assigned_at ON inquiry_leads(assignee_id, assigned_at);
CREATE INDEX IF NOT EXISTS idx_customer_history_user_created_at ON customer_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_retargeting_history_user_created_at ON retargeting_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user_contract_date ON sales(user_id, contract_date);

-- sales_tracking 파이프라인 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_sales_tracking_status ON sales_tracking(status);
CREATE INDEX IF NOT EXISTS idx_sales_tracking_manager_status ON sales_tracking(manager_name, status);

