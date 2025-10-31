-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  team VARCHAR(100),
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  customer_name VARCHAR(100) NOT NULL,
  title VARCHAR(50),
  phone1 VARCHAR(20) NOT NULL,
  phone2 VARCHAR(20),
  phone3 VARCHAR(20),
  customer_type VARCHAR(50),
  business_model VARCHAR(50),
  region VARCHAR(100),
  contract_history_category VARCHAR(100),
  operating_period VARCHAR(50),
  homepage TEXT,
  blog TEXT,
  instagram VARCHAR(255),
  other_channel TEXT,
  kpi_data_url TEXT,
  top_exposure_count INTEGER DEFAULT 0,
  requirements TEXT,
  main_keywords TEXT[],
  monthly_budget INTEGER DEFAULT 0,
  contract_start_date DATE,
  contract_expiration_date DATE,
  product_type VARCHAR(100),
  payment_date INTEGER,
  status VARCHAR(50) NOT NULL,
  inflow_path VARCHAR(100),
  manager VARCHAR(100),
  manager_team VARCHAR(100),
  registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contact TIMESTAMP,
  last_talk TIMESTAMP,
  last_call TIMESTAMP,
  memo TEXT
);

-- Customer history table
CREATE TABLE IF NOT EXISTS customer_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retargeting customers table
CREATE TABLE IF NOT EXISTS retargeting_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  customer_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  region VARCHAR(100),
  inflow_path VARCHAR(100),
  manager VARCHAR(100),
  manager_team VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT '시작', -- 시작, 인지, 흥미, 욕망, 계약완료, 휴지통
  last_contact_date TIMESTAMP,
  memo TEXT,
  homepage VARCHAR(500),
  instagram VARCHAR(500),
  main_keywords TEXT[],
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retargeting history table
CREATE TABLE IF NOT EXISTS retargeting_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retargeting_customer_id UUID REFERENCES retargeting_customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  company_name VARCHAR(255),
  sales_type VARCHAR(50) NOT NULL,
  source_type VARCHAR(50),
  amount INTEGER NOT NULL,
  contract_date DATE NOT NULL,
  marketing_content TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_manager ON customers(manager);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customer_history_customer_id ON customer_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_manager ON retargeting_customers(manager);
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_status ON retargeting_customers(status);
CREATE INDEX IF NOT EXISTS idx_retargeting_history_customer_id ON retargeting_history(retargeting_customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_contract_date ON sales(contract_date);

-- =============================
-- Performance tracking (real payments)
-- =============================

-- Payment types (new/renew/oneoff)
CREATE TABLE IF NOT EXISTS payment_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(20) UNIQUE NOT NULL,
  label VARCHAR(50) NOT NULL
);

-- Services (product/service master)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) UNIQUE NOT NULL,
  category VARCHAR(100)
);

-- Payments (actual revenue records)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  manager_user_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),

  company_name VARCHAR(255),
  title VARCHAR(300),
  payer_name VARCHAR(200),

  paid_at TIMESTAMP,
  created_at TIMESTAMP,

  gross_amount_jpy INTEGER,
  net_amount_jpy INTEGER,
  incentive_amount_jpy INTEGER,
  incentive_month VARCHAR(7), -- YYYY-MM

  payment_type_id UUID REFERENCES payment_types(id),
  fiscal_year_text VARCHAR(50),
  source_note_url TEXT,

  inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful indexes for reporting
CREATE INDEX IF NOT EXISTS idx_payments_paid_at ON payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_payments_manager ON payments(manager_user_id);
CREATE INDEX IF NOT EXISTS idx_payments_service ON payments(service_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type_id);


