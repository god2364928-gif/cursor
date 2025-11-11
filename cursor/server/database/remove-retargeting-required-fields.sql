-- Remove NOT NULL constraint from retargeting_customers table
-- Allow company_name and customer_name to be optional

ALTER TABLE retargeting_customers
ALTER COLUMN company_name DROP NOT NULL;

ALTER TABLE retargeting_customers
ALTER COLUMN customer_name DROP NOT NULL;

-- Also make phone optional for flexibility
ALTER TABLE retargeting_customers
ALTER COLUMN phone DROP NOT NULL;

