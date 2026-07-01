-- =============================
-- 전체 마이그레이션 스크립트
-- =============================
-- 이 스크립트를 Railway 대시보드의 PostgreSQL Query 탭에서 실행하세요
-- 또는: psql $DATABASE_URL -f full-migration.sql

-- =============================
-- 1. 카테고리 및 결제수단 이름 변경
-- =============================

-- 카테고리 이름 변경
UPDATE accounting_transactions
SET category = '셀마플'
WHERE category = '셀마플 매출';

UPDATE accounting_transactions
SET category = '코코마케'
WHERE category = '코코마케 매출';

-- 결제수단 이름 변경
UPDATE accounting_transactions
SET payment_method = '계좌이체'
WHERE payment_method IN ('현금/은행', '현금', '은행');

UPDATE accounting_transactions
SET payment_method = '페이팔'
WHERE payment_method = 'Stripe';

-- 정기지출 테이블도 업데이트
UPDATE accounting_recurring_expenses
SET payment_method = '계좌이체'
WHERE payment_method IN ('현금/은행', '현금', '은행', '계좌');

UPDATE accounting_recurring_expenses
SET payment_method = '페이팔'
WHERE payment_method = 'Stripe';

-- =============================
-- 2. 자동 매칭 규칙 테이블 생성
-- =============================

CREATE TABLE IF NOT EXISTS accounting_auto_match_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  assigned_user_id UUID REFERENCES users(id),
  payment_method VARCHAR(50),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(keyword)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_keyword ON accounting_auto_match_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_active ON accounting_auto_match_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_priority ON accounting_auto_match_rules(priority DESC);

-- 예시 데이터 추가
INSERT INTO accounting_auto_match_rules (keyword, category, assigned_user_id, priority)
VALUES 
  ('face', '운영비', NULL, 10),
  ('PayPay', '기타', NULL, 5),
  ('ペイペイ', '기타', NULL, 5)
ON CONFLICT (keyword) DO NOTHING;

-- 테이블 설명 추가
COMMENT ON TABLE accounting_auto_match_rules IS 'CSV 업로드 시 항목명 키워드 기반 자동 카테고리/담당자 매칭 규칙';
COMMENT ON COLUMN accounting_auto_match_rules.keyword IS '항목명에서 찾을 키워드 (대소문자 구분 없음, 부분 일치)';
COMMENT ON COLUMN accounting_auto_match_rules.priority IS '우선순위. 숫자가 클수록 먼저 매칭';

-- =============================
-- 3. 마이그레이션 결과 확인
-- =============================

-- 거래내역 카테고리 분포
SELECT 
  '✅ 거래내역 카테고리' as table_name,
  category,
  COUNT(*) as count
FROM accounting_transactions
GROUP BY category
ORDER BY category;

-- 거래내역 결제수단 분포
SELECT 
  '✅ 거래내역 결제수단' as table_name,
  payment_method,
  COUNT(*) as count
FROM accounting_transactions
GROUP BY payment_method
ORDER BY payment_method;

-- 자동 매칭 규칙 확인
SELECT 
  '✅ 자동 매칭 규칙' as table_name,
  keyword,
  category,
  priority,
  is_active
FROM accounting_auto_match_rules
ORDER BY priority DESC, keyword;

-- 마이그레이션 완료 메시지
SELECT '🎉 마이그레이션이 성공적으로 완료되었습니다!' as message;

