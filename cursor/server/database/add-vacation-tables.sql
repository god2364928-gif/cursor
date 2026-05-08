-- 휴가 관리 시스템 (일본 노동법 기준)

-- 휴가 부여 내역
-- - annual: 연차 자동 부여 (입사 6개월, 그 후 매년)
-- - special: 경조사/건강검진 등 특별 부여
-- - manual: 어드민 수동 부여/조정
CREATE TABLE IF NOT EXISTS vacation_grants (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grant_date DATE NOT NULL,
  expires_at DATE NOT NULL,
  days NUMERIC(4,1) NOT NULL,
  grant_type TEXT NOT NULL DEFAULT 'annual',
  service_years_at_grant NUMERIC(3,1),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vac_grants_user ON vacation_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_vac_grants_expiry ON vacation_grants(expires_at);
CREATE INDEX IF NOT EXISTS idx_vac_grants_user_type_date ON vacation_grants(user_id, grant_type, grant_date DESC);

-- 휴가 신청
CREATE TABLE IF NOT EXISTS vacation_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL,
  consumed_days NUMERIC(4,1) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approver_id INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vac_req_user ON vacation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_vac_req_status ON vacation_requests(status);
CREATE INDEX IF NOT EXISTS idx_vac_req_dates ON vacation_requests(start_date, end_date);

-- 일본 공휴일
CREATE TABLE IF NOT EXISTS jp_holidays (
  date DATE PRIMARY KEY,
  name TEXT NOT NULL
);
