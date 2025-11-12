-- Add hire_date column to users table

ALTER TABLE users
ADD COLUMN IF NOT EXISTS hire_date DATE;

CREATE INDEX IF NOT EXISTS idx_users_hire_date ON users(hire_date);

