-- Add user_name column to customer_history table
ALTER TABLE customer_history ADD COLUMN IF NOT EXISTS user_name VARCHAR(100);


