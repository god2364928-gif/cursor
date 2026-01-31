-- 거래내역에 은행명 컬럼 추가
ALTER TABLE accounting_transactions 
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(50) DEFAULT 'PayPay';

-- 기존 데이터를 모두 PayPay 은행으로 설정
UPDATE accounting_transactions 
SET bank_name = 'PayPay' 
WHERE bank_name IS NULL;

-- 은행명을 NOT NULL로 변경
ALTER TABLE accounting_transactions 
ALTER COLUMN bank_name SET NOT NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_bank_name 
ON accounting_transactions(bank_name);

-- 자동 매칭 규칙 테이블 생성 (이미 있으면 무시)
CREATE TABLE IF NOT EXISTS accounting_auto_match_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  assigned_user_id UUID REFERENCES users(id),
  payment_method VARCHAR(50),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 자동 매칭 규칙 인덱스
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_keyword 
ON accounting_auto_match_rules(keyword);
