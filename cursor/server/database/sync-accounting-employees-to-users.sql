-- Migrate accounting_employees data to users table
-- This updates users table with data from accounting_employees based on name matching

UPDATE users u
SET 
  hire_date = ae.hire_date,
  base_salary = CASE WHEN ae.base_salary > 0 THEN ae.base_salary ELSE u.base_salary END,
  employment_status = ae.employment_status,
  position = CASE WHEN ae.position IS NOT NULL THEN ae.position ELSE u.position END
FROM accounting_employees ae
WHERE u.name = ae.name
  AND u.employment_status IS NOT NULL;  -- Only update existing employees

-- Show results
SELECT 
  name, 
  email, 
  position, 
  base_salary, 
  hire_date, 
  employment_status 
FROM users 
WHERE employment_status IS NOT NULL 
ORDER BY name;


