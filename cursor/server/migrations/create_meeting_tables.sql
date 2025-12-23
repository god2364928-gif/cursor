-- user_targets 테이블: 담당자별 목표 관리
CREATE TABLE IF NOT EXISTS user_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  year INTEGER NOT NULL,
  week_or_month INTEGER NOT NULL,
  -- 활동 목표
  target_new_sales INTEGER DEFAULT 0,
  target_retargeting INTEGER DEFAULT 0,
  target_existing INTEGER DEFAULT 0,
  -- 매출 목표
  target_revenue INTEGER DEFAULT 0,
  target_contracts INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, period_type, year, week_or_month)
);

-- meeting_logs 테이블: 회의 기록 관리
CREATE TABLE IF NOT EXISTS meeting_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meeting_type VARCHAR(10) NOT NULL CHECK (meeting_type IN ('weekly', 'monthly')),
  year INTEGER NOT NULL,
  week_or_month INTEGER NOT NULL,
  -- 회고 및 계획
  reflection TEXT,
  action_plan TEXT,
  -- 스냅샷 데이터 (회의 당시의 실적)
  snapshot_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, meeting_type, year, week_or_month)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_user_targets_user_period ON user_targets(user_id, period_type, year, week_or_month);
CREATE INDEX IF NOT EXISTS idx_meeting_logs_user_meeting ON meeting_logs(user_id, meeting_type, year, week_or_month);

COMMENT ON TABLE user_targets IS '담당자별 주간/월간 목표 관리';
COMMENT ON TABLE meeting_logs IS '회의 회고 및 계획 기록';
