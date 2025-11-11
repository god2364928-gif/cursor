-- 기존에 리타겟팅으로 이동된 레코드들의 플래그 업데이트
-- sales_tracking_id가 retargeting_customers에 있으면 moved_to_retargeting을 TRUE로 설정

UPDATE sales_tracking st
SET moved_to_retargeting = TRUE,
    updated_at = CURRENT_TIMESTAMP
WHERE EXISTS (
  SELECT 1 
  FROM retargeting_customers rc 
  WHERE rc.sales_tracking_id = st.id
)
AND moved_to_retargeting = FALSE;

-- 업데이트된 레코드 수 확인
SELECT COUNT(*) as updated_count 
FROM sales_tracking st
WHERE moved_to_retargeting = TRUE
AND EXISTS (
  SELECT 1 
  FROM retargeting_customers rc 
  WHERE rc.sales_tracking_id = st.id
);

