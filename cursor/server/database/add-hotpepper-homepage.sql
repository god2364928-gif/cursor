-- Add official_homepage column to hotpepper_restaurants table
ALTER TABLE hotpepper_restaurants 
ADD COLUMN IF NOT EXISTS official_homepage TEXT;

-- Update timestamp
COMMENT ON COLUMN hotpepper_restaurants.official_homepage IS 'Official homepage URL of the restaurant (crawled from HotPepper detail page)';

