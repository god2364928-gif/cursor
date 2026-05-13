-- ============================================================
-- education_requests : 教育費支援申請 (사전 신청 + 사후 증빙 흐름)
--   일본 규정: 직무관련 학원 / 도서 / 온라인 강의 지원
--   ¥50,000 이상 신청 시 CEO 승인 필요
--   상태 흐름: draft → pending → approved → paid → evidence_pending → completed
--               (어느 단계든 rejected / cancelled / refunded 가능)
-- ============================================================
CREATE TABLE IF NOT EXISTS education_requests (
  id                    SERIAL PRIMARY KEY,
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fiscal_year           INTEGER NOT NULL,                       -- 신청 연도 (start_date 기준)
  course_type           TEXT NOT NULL
                        CHECK (course_type IN ('offline', 'online', 'book')),
  schedule_type         TEXT NOT NULL
                        CHECK (schedule_type IN ('after_work', 'weekend', 'self_paced')),
  provider              TEXT NOT NULL,                          -- 受講機関 (학원/플랫폼/서점)
  course_name           TEXT NOT NULL,                          -- 과정명/도서명
  course_url            TEXT,                                   -- 강의/도서 링크
  start_date            DATE NOT NULL,
  end_date              DATE NOT NULL,
  cost                  INTEGER NOT NULL CHECK (cost >= 0),     -- 신청 금액 (¥)
  reimbursed_amount     INTEGER NOT NULL DEFAULT 0 CHECK (reimbursed_amount >= 0), -- 회사 실제 지급액
  relevance             TEXT NOT NULL,                          -- 현재 업무 및 직무 유관성
  study_plan            TEXT NOT NULL,                          -- 수강 계획서
  status                TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft',              -- 임시저장
                          'pending',            -- 승인대기
                          'approved',           -- 승인됨 (결제대기)
                          'paid',               -- 결제완료 (수강중)
                          'evidence_pending',   -- 증빙대기 (수강완료, 증빙업로드 필요)
                          'completed',          -- 완료
                          'rejected',           -- 반려
                          'cancelled',          -- 취소
                          'refunded'            -- 반환 (증빙실패 → 지원금 반환)
                        )),
  ceo_approval_required BOOLEAN NOT NULL DEFAULT FALSE,         -- ¥50,000 이상이면 true
  ceo_approved_at       TIMESTAMPTZ,
  ceo_approved_by       UUID REFERENCES users(id),
  approver_id           UUID REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  paid_at               TIMESTAMPTZ,
  evidence_due_date     DATE,                                   -- 증빙 마감일 (end_date + 14일)
  completed_at          TIMESTAMPTZ,
  reject_reason         TEXT,
  refund_reason         TEXT,
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_education_req_user ON education_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_education_req_year ON education_requests(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_education_req_status ON education_requests(status);
CREATE INDEX IF NOT EXISTS idx_education_req_ceo ON education_requests(ceo_approval_required) WHERE ceo_approval_required;

-- ============================================================
-- education_files : 첨부 파일 (수료증 / 독서기록 / 진도캡처)
--   health_checkup_files / monthly_payroll_files 와 동일 패턴 — Base64 TEXT 저장
--   kind:
--     - 'certificate' : 학원/오프라인 수료증
--     - 'book_record' : 도서 구매 독서기록 (사진/캡처/노션링크/PDF)
--     - 'progress'    : 온라인 강의 진도율 캡처 (80% 이상)
--     - 'receipt'     : 영수증 (선택)
-- ============================================================
CREATE TABLE IF NOT EXISTS education_files (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES education_requests(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL
                CHECK (kind IN ('certificate', 'book_record', 'progress', 'receipt')),
  file_name     VARCHAR(255) NOT NULL,
  file_size     INTEGER NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  file_data     TEXT NOT NULL,                                  -- Base64 encoded
  uploaded_by   UUID REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_files_req ON education_files(request_id);
CREATE INDEX IF NOT EXISTS idx_education_files_kind ON education_files(request_id, kind);
