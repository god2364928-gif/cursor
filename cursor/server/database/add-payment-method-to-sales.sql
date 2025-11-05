-- Add payment_method column to sales table
ALTER TABLE sales 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- Add index for payment_method
CREATE INDEX IF NOT EXISTS idx_sales_payment_method ON sales(payment_method);

