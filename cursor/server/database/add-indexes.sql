-- Add missing indexes for better query performance

-- Customer history user_id index for JOIN queries
CREATE INDEX IF NOT EXISTS idx_customer_history_user_id ON customer_history(user_id);

-- Sales sales_type index for dashboard queries
CREATE INDEX IF NOT EXISTS idx_sales_sales_type ON sales(sales_type);

