-- ============================================================
-- snack_fixed: 고정 구매 (매주 자동 신청 템플릿)
-- ============================================================
CREATE TABLE IF NOT EXISTS snack_fixed (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_url   TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  unit_price    INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note          TEXT,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_snack_fixed_user ON snack_fixed(user_id);
CREATE INDEX IF NOT EXISTS idx_snack_fixed_active ON snack_fixed(active) WHERE active;

-- ============================================================
-- snack_requests: 간식 신청
-- ============================================================
CREATE TABLE IF NOT EXISTS snack_requests (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_url   TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  unit_price    INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total         INTEGER GENERATED ALWAYS AS (unit_price * quantity) STORED,
  note          TEXT,
  week_start    DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'ordered', 'cancelled')),
  ordered_at    TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,
  fixed_id      INTEGER REFERENCES snack_fixed(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snack_req_week ON snack_requests(week_start);
CREATE INDEX IF NOT EXISTS idx_snack_req_user ON snack_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_snack_req_status ON snack_requests(status);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_snack_req_fixed_week
  ON snack_requests(fixed_id, week_start)
  WHERE fixed_id IS NOT NULL;
