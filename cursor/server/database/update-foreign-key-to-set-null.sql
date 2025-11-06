-- Update foreign key constraint to ON DELETE SET NULL
-- This allows sales_tracking records to be deleted without violating the constraint
-- The retargeting_customers records will have their sales_tracking_id set to NULL automatically

ALTER TABLE retargeting_customers
DROP CONSTRAINT IF EXISTS retargeting_customers_sales_tracking_id_fkey;

ALTER TABLE retargeting_customers
ADD CONSTRAINT retargeting_customers_sales_tracking_id_fkey
FOREIGN KEY (sales_tracking_id)
REFERENCES sales_tracking(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

