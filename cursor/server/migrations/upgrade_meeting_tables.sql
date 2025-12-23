-- user_targets 테이블에 5개 방식별 목표 컬럼 추가
ALTER TABLE user_targets 
  ADD COLUMN IF NOT EXISTS target_form INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_dm INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_line INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_phone INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS target_email INTEGER DEFAULT 0;

-- target_new_sales는 이제 5개의 합계로 자동 계산하지 않고 유지 (하위 호환성)
-- target_retargeting은 리타겟팅 연락 목표로 사용

COMMENT ON COLUMN user_targets.target_form IS '주간 폼 활동 목표';
COMMENT ON COLUMN user_targets.target_dm IS '주간 DM 활동 목표';
COMMENT ON COLUMN user_targets.target_line IS '주간 라인 활동 목표';
COMMENT ON COLUMN user_targets.target_phone IS '주간 전화 활동 목표';
COMMENT ON COLUMN user_targets.target_email IS '주간 메일 활동 목표';
