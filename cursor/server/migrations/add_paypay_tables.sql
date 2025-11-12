-- PayPay 매출 테이블
CREATE TABLE IF NOT EXISTS paypay_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  category VARCHAR(50) NOT NULL,
  user_id VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  receipt_number VARCHAR(100),
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PayPay 지출 테이블
CREATE TABLE IF NOT EXISTS paypay_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TIMESTAMP NOT NULL,
  item VARCHAR(200) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_paypay_sales_date ON paypay_sales(date);
CREATE INDEX IF NOT EXISTS idx_paypay_expenses_date ON paypay_expenses(date);

