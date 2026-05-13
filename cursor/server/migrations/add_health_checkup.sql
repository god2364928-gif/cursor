-- ============================================================
-- health_checkup_requests : 健康診断申請 (사후 보고 흐름)
--   일본 규정: 정규직 / 1년 1회 / 임의 의료기관 / 1만 엔 한도 회사 부담
--   사용자가 수검 완료 후 영수증·결과서·금액을 등록 → 관리자 검토 → reimbursed
-- ============================================================
CREATE TABLE IF NOT EXISTS health_checkup_requests (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fiscal_year       INTEGER NOT NULL,                         -- 검진 연도 (exam_date 기준)
  exam_date         DATE NOT NULL,                            -- 受診日
  hospital_name     TEXT NOT NULL,
  hospital_address  TEXT,
  checked_items     JSONB NOT NULL DEFAULT '{"basic":[],"skipped":[]}'::jsonb,
  amount_paid       INTEGER NOT NULL CHECK (amount_paid >= 0),         -- 본인이 실제 결제한 금액 (¥)
  amount_reimbursed INTEGER NOT NULL DEFAULT 0 CHECK (amount_reimbursed >= 0), -- 회사 부담 확정액 (관리자 검토 시 갱신)
  status            TEXT NOT NULL DEFAULT 'submitted'
                    CHECK (status IN ('submitted', 'reviewed', 'reimbursed', 'rejected')),
  vacation_granted  BOOLEAN NOT NULL DEFAULT FALSE,           -- vacation_requests 에 1일 자동 부여 완료 여부
  vacation_request_id INTEGER,                                -- 부여한 vacation_requests.id (멱등성·삭제 추적용)
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  reject_reason     TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checkup_user ON health_checkup_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_health_checkup_year ON health_checkup_requests(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_health_checkup_status ON health_checkup_requests(status);

-- 같은 연도에 동일 사용자가 중복 보고하는 것을 방지 (rejected 는 제외 — 재제출 허용)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_health_checkup_user_year
  ON health_checkup_requests(user_id, fiscal_year)
  WHERE status <> 'rejected';

-- ============================================================
-- health_checkup_files : 첨부 파일 (영수증 / 결과서)
--   monthly_payroll_files 와 동일 패턴 — file_data 는 Base64 TEXT 저장
-- ============================================================
CREATE TABLE IF NOT EXISTS health_checkup_files (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES health_checkup_requests(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('receipt', 'result')),
  file_name     VARCHAR(255) NOT NULL,
  file_size     INTEGER NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_data     TEXT NOT NULL,                                -- Base64 encoded
  uploaded_by   UUID REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checkup_files_req ON health_checkup_files(request_id);
CREATE INDEX IF NOT EXISTS idx_health_checkup_files_kind ON health_checkup_files(request_id, kind);
