-- Add last_contact_at column to sales_tracking table (마지막 연락 시간)
-- This column tracks when the user last contacted the customer

ALTER TABLE sales_tracking 
ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMP;

-- Create index for date range filtering on last_contact_at
CREATE INDEX IF NOT EXISTS idx_sales_tracking_last_contact ON sales_tracking(last_contact_at);

-- Add comment for documentation
COMMENT ON COLUMN sales_tracking.last_contact_at IS 'Timestamp of the last contact with the customer';
