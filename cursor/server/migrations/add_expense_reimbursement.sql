-- ============================================================
-- 経費申請・精算 (expense reimbursement)
--   전자장부보존법(電帳法) 대응 경비 신청/정산 흐름
--   FK 타입: users.id = UUID (education/health 마이그레이션 기준)
--   ★순서 주의: expense_requests.subscription_id 가 expense_subscriptions 를
--     FK 참조하므로 expense_subscriptions 를 먼저 생성한다.
--   모든 객체는 IF NOT EXISTS (멱등).
-- ============================================================

-- ============================================================
-- expense_subscriptions: 정기결제 마스터 (AIツール 등)
--   ★expense_requests 보다 먼저 생성 (FK 참조 대상)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_subscriptions (
  id            SERIAL PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 영수증 첨부 책임자
  service_name  TEXT NOT NULL,
  card_label    TEXT,                    -- 결제 카드
  category      TEXT NOT NULL DEFAULT 'corp_card',
  cycle         TEXT NOT NULL DEFAULT 'month' CHECK (cycle IN ('month','year')),
  billing_day   INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  amount        INTEGER,                 -- 예상 금액 (税込)
  tax_rate      INTEGER NOT NULL DEFAULT 10,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_sub_active ON expense_subscriptions(active) WHERE active;

-- ============================================================
-- expense_requests: 경비 신청 (메인)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_requests (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('transport','meal','reimburse','corp_card')),
  settlement_type   TEXT NOT NULL CHECK (settlement_type IN ('reimburse_required','already_paid')),
  used_at           DATE NOT NULL,                       -- ★電帳法 검색키
  amount_incl_tax   INTEGER NOT NULL CHECK (amount_incl_tax >= 0),  -- ★검색키 (税込, ¥)
  tax_rate          INTEGER NOT NULL DEFAULT 10 CHECK (tax_rate IN (0,8,10)),
  amount_tax        INTEGER NOT NULL DEFAULT 0,
  reduced_tax       BOOLEAN NOT NULL DEFAULT FALSE,      -- 8%軽減 여부 (tax_r8 판정용)
  vendor_name       TEXT,                                -- ★検索키 (取引先/점포명)
  invoice_number    TEXT,                                -- "T..." (freee OCR prefill)
  account_item_id   INTEGER,                             -- freee 勘定科目 (매핑/수정값)
  tax_code          INTEGER,                             -- freee 税区分 코드 (deal 생성 시 확정)
  purpose           TEXT,
  memo              TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN (
                      'draft','awaiting_receipt','pending','approved',
                      'payment_pending','paid','completed','recorded',
                      'rejected','cancelled')),
  meta              JSONB NOT NULL DEFAULT '{}',         -- 카테고리별 확장필드
  freee_receipt_id  BIGINT,                              -- 파일박스 receipt id
  freee_deal_id     BIGINT,                              -- 生成された 取引 id
  ocr_status        TEXT NOT NULL DEFAULT 'none'
                    CHECK (ocr_status IN ('none','pending','done','failed')),
  subscription_id   INTEGER REFERENCES expense_subscriptions(id) ON DELETE SET NULL,
  billing_month     TEXT,                                -- 정기결제 초안 멱등키 (YYYY-MM)
  approver_id       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  reject_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                           -- ★真実性 (소프트삭제)
);
CREATE INDEX IF NOT EXISTS idx_expense_req_user   ON expense_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_req_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_req_used   ON expense_requests(used_at);       -- 검색요건
CREATE INDEX IF NOT EXISTS idx_expense_req_vendor ON expense_requests(vendor_name);   -- 검색요건
CREATE INDEX IF NOT EXISTS idx_expense_req_amount ON expense_requests(amount_incl_tax);
-- 정기결제 초안 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_expense_subscription_month
  ON expense_requests(subscription_id, billing_month)
  WHERE subscription_id IS NOT NULL;

-- ============================================================
-- expense_attachments: 영수증 첨부 (Base64 사본 + 電帳法 메타)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_attachments (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  file_data     TEXT NOT NULL,          -- Base64 (education_files 패턴)
  file_hash     TEXT NOT NULL,          -- SHA-256 (電帳法 真実性)
  uploaded_by   UUID REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_att_req ON expense_attachments(request_id);

-- ============================================================
-- expense_payments: 精算あり 지급 (立替 이체 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_payments (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  payee_account TEXT,                    -- 지급 계좌 (매번 입력, meta 백업)
  paid_amount   INTEGER NOT NULL CHECK (paid_amount >= 0),
  paid_at       TIMESTAMPTZ,
  paid_by       UUID REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_pay_req ON expense_payments(request_id);

-- ============================================================
-- expense_status_history: 상태 변경 이력 (★電帳法 真実性)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_status_history (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  actor_id      UUID REFERENCES users(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_hist_req ON expense_status_history(request_id);

-- ============================================================
-- expense_freee_map: 카테고리·세율 → freee 계정과목 매핑 (담당자 편집)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_freee_map (
  id               SERIAL PRIMARY KEY,
  category         TEXT NOT NULL,
  subtype          TEXT,                 -- meal: 'meeting'/'entertainment', transport: 'taxi' 등
  account_item_id  INTEGER NOT NULL,     -- freee 勘定科目 id
  account_item_name TEXT,
  updated_by       UUID REFERENCES users(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, subtype)
);
