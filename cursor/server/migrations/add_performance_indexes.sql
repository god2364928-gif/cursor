-- Performance optimization indexes for dashboard queries
-- Created: 2025-01-23
-- Purpose: Improve loading speed for dashboard and meeting mode by 3-5x

-- Index for inquiry_leads sent_date (used for form activity queries)
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_sent_date ON inquiry_leads(sent_date);

-- Index for retargeting_history created_at (used for retargeting activity queries)
CREATE INDEX IF NOT EXISTS idx_retargeting_history_created_at ON retargeting_history(created_at);

-- Index for customer_history created_at (used for customer management activity queries)
CREATE INDEX IF NOT EXISTS idx_customer_history_created_at ON customer_history(created_at);

-- Index for accounting_transactions transaction_date (used for accounting stats queries)
CREATE INDEX IF NOT EXISTS idx_acc_transactions_date ON accounting_transactions(transaction_date);

-- Composite index for sales_tracking for better filtering performance
CREATE INDEX IF NOT EXISTS idx_sales_tracking_date_method ON sales_tracking(date, contact_method);

-- Composite index for retargeting_customers for status and manager filtering
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_status_manager ON retargeting_customers(status, manager);

-- Display completion message
DO $$
BEGIN
  RAISE NOTICE 'Performance indexes created successfully!';
END $$;

