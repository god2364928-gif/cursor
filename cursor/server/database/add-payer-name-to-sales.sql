-- Add payer_name column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payer_name VARCHAR(200);

