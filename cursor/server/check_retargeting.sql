-- 1. 12월 신규매출 확인
SELECT 
  '12월 신규매출' as category,
  s.id,
  s.company_name,
  s.amount,
  s.contract_date,
  u.name as user_name
FROM sales s
LEFT JOIN users u ON s.user_id = u.id
WHERE s.sales_type = '신규매출'
AND s.contract_date BETWEEN '2025-12-01' AND '2025-12-31'
ORDER BY s.contract_date;

-- 2. retargeting_customers에 해당 회사가 있는지 확인
SELECT 
  '리타겟팅 고객' as category,
  rc.id,
  rc.company_name,
  rc.manager,
  rc.status
FROM retargeting_customers rc
WHERE rc.status NOT IN ('ゴミ箱', '휴지통')
ORDER BY rc.company_name;

-- 3. 현재 JOIN 쿼리 결과 (리타겟팅 계약건)
SELECT 
  '현재 JOIN 결과' as category,
  COUNT(DISTINCT rc.id) as retargeting_contract_count,
  STRING_AGG(DISTINCT rc.company_name, ', ') as matched_companies
FROM retargeting_customers rc
JOIN sales s ON rc.company_name = s.company_name AND s.sales_type = '신규매출'
WHERE s.contract_date BETWEEN '2025-12-01' AND '2025-12-31';
