-- Performance optimization indexes for accounting queries
-- Created: 2025-12-23

-- Composite index for transaction queries with date range and type
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_date_type 
ON accounting_transactions(transaction_date, transaction_type);

-- Composite index for transaction queries with date range and category
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_date_category 
ON accounting_transactions(transaction_date, category);

-- Index for assigned_user_id lookups
CREATE INDEX IF NOT EXISTS idx_accounting_transactions_assigned_user 
ON accounting_transactions(assigned_user_id);

-- Composite index for total_sales queries
CREATE INDEX IF NOT EXISTS idx_total_sales_year_month 
ON total_sales(fiscal_year, month);

-- Index for payment_method in total_sales
CREATE INDEX IF NOT EXISTS idx_total_sales_payment_method 
ON total_sales(payment_method);


