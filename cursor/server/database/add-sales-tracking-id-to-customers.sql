-- customers 테이블에 sales_tracking_id 컬럼 추가
-- 영업 이력 → 리타겟팅 → 고객 관리까지 히스토리 연결

ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS sales_tracking_id UUID REFERENCES sales_tracking(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_customers_sales_tracking_id 
  ON customers(sales_tracking_id);

COMMENT ON COLUMN customers.sales_tracking_id IS '원본 영업 이력 ID (히스토리 연결용)';
