-- ============================================================
-- expense_requests 스키마 완화 (멱등)
--   1) category CHECK 제약 제거: 신규 카테고리(transport, dining, meal,
--      reimburse, welfare, health_checkup, other, corp_card) 허용.
--      검증은 앱 계층에서 수행. DROP IF EXISTS 라 반복 실행 안전.
--   2) used_at NOT NULL 해제: upload-first 흐름에서 draft 는 사용일 없이
--      먼저 생성되고 OCR/제출 시 채워진다. DROP NOT NULL 은 멱등.
-- ============================================================
ALTER TABLE expense_requests DROP CONSTRAINT IF EXISTS expense_requests_category_check;
ALTER TABLE expense_requests ALTER COLUMN used_at DROP NOT NULL;
-- 3) freee 파일박스 업로드 실패 사유 저장 컬럼 (진단용). ADD IF NOT EXISTS 라 멱등.
ALTER TABLE expense_requests ADD COLUMN IF NOT EXISTS freee_error TEXT;
