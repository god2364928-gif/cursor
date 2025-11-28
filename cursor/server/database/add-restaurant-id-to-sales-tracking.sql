-- Add restaurant_id column to sales_tracking table for linking to restaurants (Recruit search)
-- This allows tracking which sales_tracking records came from the recruit search feature

ALTER TABLE sales_tracking
ADD COLUMN IF NOT EXISTS restaurant_id INTEGER REFERENCES restaurants(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_tracking_restaurant_id ON sales_tracking(restaurant_id);

-- Comment for documentation
COMMENT ON COLUMN sales_tracking.restaurant_id IS 'Reference to restaurants table for records created from Recruit search';

