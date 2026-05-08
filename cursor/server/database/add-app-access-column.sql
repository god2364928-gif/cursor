-- users.app_access 컬럼 추가 (CRM/ERP/Admin 영역 권한)
-- 값 형식: 콤마 분리 (예: 'crm,erp', 'erp', 'admin,crm,erp')

ALTER TABLE users ADD COLUMN IF NOT EXISTS app_access TEXT NOT NULL DEFAULT 'erp';

-- 기존 사용자 백필
-- - admin: 모든 영역 접근
-- - 그 외: 현재 CRM을 쓰던 사용자들이므로 일단 crm + erp 둘 다 부여
--   (퇴행 방지 — 이후 사무보조 등은 어드민이 EmployeesTab에서 'erp'로 개별 변경)
UPDATE users
SET app_access = CASE
  WHEN role = 'admin' THEN 'admin,crm,erp'
  ELSE 'crm,erp'
END
WHERE app_access IS NULL OR app_access = '' OR app_access = 'erp';

CREATE INDEX IF NOT EXISTS idx_users_app_access ON users(app_access);
