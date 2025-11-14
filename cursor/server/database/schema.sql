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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
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

-- Customer files table
CREATE TABLE IF NOT EXISTS customer_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Retargeting customer files table
CREATE TABLE IF NOT EXISTS retargeting_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  retargeting_customer_id UUID REFERENCES retargeting_customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_data TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  company_name VARCHAR(255),
  payer_name VARCHAR(200),
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
CREATE INDEX IF NOT EXISTS idx_customer_history_user_id ON customer_history(user_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_manager ON retargeting_customers(manager);
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_status ON retargeting_customers(status);
CREATE INDEX IF NOT EXISTS idx_retargeting_history_customer_id ON retargeting_history(retargeting_customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_contract_date ON sales(contract_date);
CREATE INDEX IF NOT EXISTS idx_sales_sales_type ON sales(sales_type);
CREATE INDEX IF NOT EXISTS idx_customer_files_customer_id ON customer_files(customer_id);
CREATE INDEX IF NOT EXISTS idx_retargeting_files_customer_id ON retargeting_files(retargeting_customer_id);

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

-- =============================
-- freee 청구서 (Invoices)
-- =============================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  company_id INTEGER NOT NULL,
  partner_id INTEGER,
  partner_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100) NOT NULL,
  freee_invoice_id INTEGER,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  tax_entry_method VARCHAR(20) NOT NULL,
  receipt_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

-- =============================
-- freee 영수증 (Receipts)
-- =============================
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  company_id INTEGER NOT NULL,
  partner_id INTEGER,
  partner_name VARCHAR(255) NOT NULL,
  receipt_number VARCHAR(100) NOT NULL,
  freee_receipt_id INTEGER,
  receipt_date DATE NOT NULL,
  issue_date DATE NOT NULL,
  total_amount INTEGER NOT NULL,
  tax_amount INTEGER NOT NULL,
  tax_entry_method VARCHAR(20) NOT NULL,
  invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_company_id ON receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_receipt_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);



