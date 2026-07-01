-- ============================================================
-- expense_requests.category CHECK 제약 완화 (멱등)
--   신규 카테고리(transport, dining, meal, reimburse, welfare,
--   health_checkup, other, corp_card)를 허용하기 위해
--   기존 CHECK 제약을 제거하고, 카테고리 검증은 앱 계층에서 수행한다.
--   DROP IF EXISTS 이므로 몇 번 실행해도 안전(비파괴적).
-- ============================================================
ALTER TABLE expense_requests DROP CONSTRAINT IF EXISTS expense_requests_category_check;
