-- =============================
-- 회계 소프트웨어 스키마 (10월 결산 기준)
-- =============================

-- 회계연도 계산 헬퍼 함수
CREATE OR REPLACE FUNCTION get_fiscal_year(transaction_date DATE)
RETURNS INTEGER AS $$
BEGIN
  IF EXTRACT(MONTH FROM transaction_date) >= 10 THEN
    RETURN EXTRACT(YEAR FROM transaction_date) + 1;
  ELSE
    RETURN EXTRACT(YEAR FROM transaction_date);
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. 자본금 및 계좌 (Capital & Accounts)
CREATE TABLE IF NOT EXISTS accounting_capital (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_name VARCHAR(100) NOT NULL UNIQUE, -- '메인계좌', 'PayPay', '현금', '보증금'
  account_type VARCHAR(50) NOT NULL, -- '자본금', '예금', '고정자산'
  initial_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 직원 (Employees)
CREATE TABLE IF NOT EXISTS accounting_employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  position VARCHAR(50) NOT NULL, -- '매니저', '스태프', '알바'
  hire_date DATE NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  incentive_rate DECIMAL(5, 2) NOT NULL DEFAULT 0, -- 인센티브율 (%)
  employment_status VARCHAR(20) NOT NULL DEFAULT '재직', -- '재직', '퇴사', '휴직'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. 거래내역 (Transactions)
CREATE TABLE IF NOT EXISTS accounting_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE NOT NULL,
  transaction_time TIME,
  fiscal_year INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN EXTRACT(MONTH FROM transaction_date) >= 10 
      THEN EXTRACT(YEAR FROM transaction_date)::INTEGER + 1
      ELSE EXTRACT(YEAR FROM transaction_date)::INTEGER
    END
  ) STORED,
  transaction_type VARCHAR(10) NOT NULL, -- '입금' or '출금'
  category VARCHAR(50) NOT NULL, -- '셀마플 매출', '코코마케 매출', '운영비', '급여', '월세', '기타'
  payment_method VARCHAR(50) NOT NULL, -- '현금/은행', 'PayPay', 'Stripe', '카드'
  item_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  employee_id UUID REFERENCES accounting_employees(id),
  account_id UUID REFERENCES accounting_capital(id),
  assigned_user_id UUID REFERENCES users(id),
  memo TEXT,
  attachment_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 매출 (Sales)
CREATE TABLE IF NOT EXISTS accounting_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fiscal_year INTEGER NOT NULL,
  transaction_month DATE NOT NULL, -- YYYY-MM-01 형식
  channel VARCHAR(50) NOT NULL, -- 'PayPay', 'Stripe', '현금', '카드'
  sales_category VARCHAR(50) NOT NULL, -- '서비스', '상품', '기타'
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 급여 (Payroll)
CREATE TABLE IF NOT EXISTS accounting_payroll (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES accounting_employees(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL, -- YYYY-MM-01 형식
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  incentive DECIMAL(12, 2) NOT NULL DEFAULT 0,
  other_payments DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (base_salary + incentive + other_payments) STORED,
  payment_status VARCHAR(20) NOT NULL DEFAULT '미지급', -- '지급완료', '미지급'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 정기지출 (Recurring Expenses)
CREATE TABLE IF NOT EXISTS accounting_recurring_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name VARCHAR(255) NOT NULL,
  monthly_amount DECIMAL(12, 2) NOT NULL,
  payment_day INTEGER NOT NULL, -- 1~31
  payment_method VARCHAR(50) NOT NULL, -- '계좌', 'PayPay', '카드' 등
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_date ON accounting_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_fiscal_year ON accounting_transactions(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_category ON accounting_transactions(category);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_employee ON accounting_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_assigned_user ON accounting_transactions(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_accounting_sales_fiscal_year ON accounting_sales(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_accounting_sales_month ON accounting_sales(transaction_month);
CREATE INDEX IF NOT EXISTS idx_accounting_payroll_employee ON accounting_payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_accounting_payroll_month ON accounting_payroll(payment_month);

