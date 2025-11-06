-- Add payment_method column to sales table if it doesn't exist
ALTER TABLE sales
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
