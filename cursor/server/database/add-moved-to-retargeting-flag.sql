-- Add moved_to_retargeting flag to sales_tracking table
ALTER TABLE sales_tracking 
ADD COLUMN IF NOT EXISTS moved_to_retargeting BOOLEAN DEFAULT FALSE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sales_tracking_moved 
ON sales_tracking(moved_to_retargeting);

-- Update existing records that were moved to retargeting
-- (기존에 이동된 데이터는 없으므로 이 단계는 스킵)

