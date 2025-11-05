-- Add sales_tracking_id column to retargeting_customers table
-- This column tracks which sales tracking record was moved to retargeting
ALTER TABLE retargeting_customers
ADD COLUMN IF NOT EXISTS sales_tracking_id UUID REFERENCES sales_tracking(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_sales_tracking_id 
ON retargeting_customers(sales_tracking_id);

-- Add index for date-based queries with sales_tracking_id
CREATE INDEX IF NOT EXISTS idx_retargeting_customers_registered_at_sales_tracking_id 
ON retargeting_customers(registered_at, sales_tracking_id) 
WHERE sales_tracking_id IS NOT NULL;

