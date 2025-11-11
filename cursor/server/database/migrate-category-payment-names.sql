-- =============================
-- 카테고리 및 결제수단 이름 변경 마이그레이션
-- =============================

-- 1. 카테고리 이름 변경
UPDATE accounting_transactions
SET category = '셀마플'
WHERE category = '셀마플 매출';

UPDATE accounting_transactions
SET category = '코코마케'
WHERE category = '코코마케 매출';

-- 2. 결제수단 이름 변경
UPDATE accounting_transactions
SET payment_method = '계좌이체'
WHERE payment_method IN ('현금/은행', '현금', '은행');

UPDATE accounting_transactions
SET payment_method = '페이팔'
WHERE payment_method = 'Stripe';

-- 3. 정기지출 테이블도 업데이트
UPDATE accounting_recurring_expenses
SET payment_method = '계좌이체'
WHERE payment_method IN ('현금/은행', '현금', '은행', '계좌');

UPDATE accounting_recurring_expenses
SET payment_method = '페이팔'
WHERE payment_method = 'Stripe';

-- 4. 자본금/계좌 테이블 확인 (필요시)
-- accounting_capital 테이블은 account_name이 자유 형식이므로 필요시 수동 업데이트

-- 완료 확인
SELECT 
  '거래내역 카테고리' as table_name,
  category,
  COUNT(*) as count
FROM accounting_transactions
GROUP BY category
ORDER BY category;

SELECT 
  '거래내역 결제수단' as table_name,
  payment_method,
  COUNT(*) as count
FROM accounting_transactions
GROUP BY payment_method
ORDER BY payment_method;

