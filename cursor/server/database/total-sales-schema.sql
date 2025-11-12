-- 전체매출 테이블 생성
CREATE TABLE IF NOT EXISTS total_sales (
  id SERIAL PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,           -- 회계연도 (2023, 2024, 2025, 2026)
  month INTEGER NOT NULL,                 -- 월 (10=10월, 11=11월, ..., 9=9월)
  payment_method VARCHAR(50) NOT NULL,    -- 결제수단 (口座振込, PayPay, PayPal, strip, strip1, ココナラ)
  amount DECIMAL(15, 2) DEFAULT 0,        -- 금액
  is_fee BOOLEAN DEFAULT FALSE,           -- 수수료 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(fiscal_year, month, payment_method, is_fee)
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_total_sales_fiscal_year ON total_sales(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_total_sales_month ON total_sales(month);

