-- 매출 금액 필드 개선: 총액 우선 저장, 세금 별도 저장 방식
-- total_amount: 사용자가 입력한 세금 포함 총액 (기준값)
-- tax_amount: 세액 (총액 기준 계산)
-- net_amount: 공급가액 (총액 - 세액)

-- 1. 새 컬럼 추가
ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_amount INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS tax_amount INTEGER;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS net_amount INTEGER;

-- 2. 기존 데이터 마이그레이션
-- 기존 amount는 세금 제외 금액(net_amount)으로 저장되어 있음
-- tax_amount = floor(net_amount * 0.1)
-- total_amount = net_amount + tax_amount
UPDATE sales
SET 
  net_amount = amount,
  tax_amount = FLOOR(amount * 0.1),
  total_amount = amount + FLOOR(amount * 0.1)
WHERE net_amount IS NULL AND amount IS NOT NULL;

-- 3. 기본값 설정 (향후 데이터를 위해)
-- net_amount를 NOT NULL로 변경하지 않음 (유연성 유지)

-- 4. 인덱스 추가 (보고서 성능 향상)
CREATE INDEX IF NOT EXISTS idx_sales_total_amount ON sales(total_amount);
CREATE INDEX IF NOT EXISTS idx_sales_net_amount ON sales(net_amount);
