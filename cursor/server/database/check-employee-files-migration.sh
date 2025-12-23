#!/bin/bash

# Check employee files migration status
# This script connects to the database and checks if employee_files table exists
# and how many records need to be migrated

echo "Checking employee files migration status..."

# Get database URL from environment or use default
if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL not set. Please set it first."
  echo "Example: export DATABASE_URL='postgresql://postgres:password@host:port/database'"
  exit 1
fi

# Check if employee_files table exists
echo ""
echo "1. Checking if employee_files table exists..."
psql "$DATABASE_URL" -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_files');"

# Count records in employee_files (if exists)
echo ""
echo "2. Counting records in employee_files table..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) as employee_files_count FROM employee_files;" 2>/dev/null || echo "employee_files table does not exist"

# Count records in user_files
echo ""
echo "3. Counting records in user_files table..."
psql "$DATABASE_URL" -c "SELECT COUNT(*) as user_files_count FROM user_files;" 2>/dev/null || echo "user_files table does not exist"

# Show sample of employee_files
echo ""
echo "4. Sample records from employee_files (if exists)..."
psql "$DATABASE_URL" -c "SELECT id, employee_id, file_category, file_name, created_at FROM employee_files LIMIT 5;" 2>/dev/null || echo "No data or table does not exist"

# Check employee to user mapping
echo ""
echo "5. Checking employee to user mapping..."
psql "$DATABASE_URL" -c "
  SELECT 
    e.id as employee_id, 
    e.name as employee_name,
    u.id as user_id,
    u.name as user_name,
    u.email as user_email
  FROM employees e
  LEFT JOIN users u ON u.name = e.name
  LIMIT 10;
" 2>/dev/null || echo "Cannot check mapping"

echo ""
echo "Done!"


