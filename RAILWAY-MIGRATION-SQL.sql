-- Railway 프로덕션 데이터베이스 마이그레이션
-- sales_tracking 테이블 생성

-- UUID 확장이 없다면 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sales tracking table (영업 이력)
CREATE TABLE IF NOT EXISTS sales_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  manager_name VARCHAR(100) NOT NULL,
  account_id VARCHAR(255),
  customer_name VARCHAR(255),
  industry VARCHAR(100),
  contact_method VARCHAR(50), -- DM, LINE, 電話, メール, フォーム
  status VARCHAR(50) NOT NULL, -- 未返信, 返信済み, 商談中, 契約, NG
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  memo TEXT,
  memo_note TEXT,
  user_id UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sales_tracking_date ON sales_tracking(date);
CREATE INDEX IF NOT EXISTS idx_sales_tracking_user ON sales_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_tracking_manager ON sales_tracking(manager_name);
CREATE INDEX IF NOT EXISTS idx_sales_tracking_account ON sales_tracking(account_id);
CREATE INDEX IF NOT EXISTS idx_sales_tracking_customer ON sales_tracking(customer_name);

-- 테이블 생성 확인
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'sales_tracking'
) AS table_exists;
