-- Add is_pinned column to customer_history table
ALTER TABLE customer_history
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Add is_pinned column to retargeting_history table
ALTER TABLE retargeting_history
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_history_is_pinned ON customer_history(is_pinned);
CREATE INDEX IF NOT EXISTS idx_retargeting_history_is_pinned ON retargeting_history(is_pinned);

