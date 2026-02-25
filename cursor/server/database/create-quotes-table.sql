-- 견적서(見積書) 테이블 생성

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  quote_number VARCHAR(100) NOT NULL,
  partner_name VARCHAR(255) NOT NULL,
  partner_title VARCHAR(10) DEFAULT '御中',
  quote_title VARCHAR(255) DEFAULT 'COCOマーケ利用料',
  quote_date DATE NOT NULL,
  delivery_date VARCHAR(255),
  delivery_place TEXT,
  payment_terms VARCHAR(255),
  quote_expiry VARCHAR(255) DEFAULT '発行日より2週間',
  total_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  tax_entry_method VARCHAR(20) NOT NULL DEFAULT 'exclusive',
  memo TEXT,
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP,
  cancelled_by_user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_is_cancelled ON quotes(is_cancelled);

-- 견적서 품목 테이블
CREATE TABLE IF NOT EXISTS quote_items (
  id SERIAL PRIMARY KEY,
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price INTEGER NOT NULL,
  tax_rate INTEGER DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
