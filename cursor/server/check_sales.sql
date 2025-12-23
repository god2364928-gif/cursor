-- 12월 전체 매출 (대시보드)
SELECT 
  '12월 전체 (1~31일)' as period,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  SUM(CASE WHEN sales_type = '신규매출' THEN amount ELSE 0 END) as new_sales,
  SUM(CASE WHEN sales_type = '연장매출' THEN amount ELSE 0 END) as renewal_sales,
  SUM(CASE WHEN sales_type = '해지매출' THEN amount ELSE 0 END) as termination_sales
FROM sales
WHERE contract_date BETWEEN '2025-12-01' AND '2025-12-31'

UNION ALL

-- 12월 23일까지 (실적관리)
SELECT 
  '12월 23일까지' as period,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  SUM(CASE WHEN sales_type = '신규매출' THEN amount ELSE 0 END) as new_sales,
  SUM(CASE WHEN sales_type = '연장매출' THEN amount ELSE 0 END) as renewal_sales,
  SUM(CASE WHEN sales_type = '해지매출' THEN amount ELSE 0 END) as termination_sales
FROM sales
WHERE contract_date BETWEEN '2025-12-01' AND '2025-12-23'

UNION ALL

-- 12월 24일 이후
SELECT 
  '12월 24~31일' as period,
  COUNT(*) as count,
  SUM(amount) as total_amount,
  SUM(CASE WHEN sales_type = '신규매출' THEN amount ELSE 0 END) as new_sales,
  SUM(CASE WHEN sales_type = '연장매출' THEN amount ELSE 0 END) as renewal_sales,
  SUM(CASE WHEN sales_type = '해지매출' THEN amount ELSE 0 END) as termination_sales
FROM sales
WHERE contract_date BETWEEN '2025-12-24' AND '2025-12-31';
