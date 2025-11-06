-- Add company_name column to sales_tracking table
ALTER TABLE sales_tracking
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Create index for company_name
CREATE INDEX IF NOT EXISTS idx_sales_tracking_company_name ON sales_tracking(company_name);

