-- freee 청구서 발급 내역 테이블
CREATE TABLE IF NOT EXISTS freee_invoices (
  id SERIAL PRIMARY KEY,
  freee_invoice_id BIGINT NOT NULL,
  freee_company_id BIGINT NOT NULL,
  partner_name VARCHAR(255) NOT NULL,
  partner_zipcode VARCHAR(20),
  partner_address TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  issued_by_user_id UUID REFERENCES users(id) NOT NULL,
  issued_by_user_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_freee_invoices_user ON freee_invoices(issued_by_user_id);
CREATE INDEX IF NOT EXISTS idx_freee_invoices_date ON freee_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_freee_invoices_created ON freee_invoices(created_at DESC);

-- 청구서 품목 상세 테이블
CREATE TABLE IF NOT EXISTS freee_invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES freee_invoices(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_freee_invoice_items_invoice ON freee_invoice_items(invoice_id);

