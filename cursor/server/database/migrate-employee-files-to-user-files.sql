-- Migrate employee_files to user_files
-- This script migrates files from the old employee_files table to the new user_files table
-- It maps employees to users based on email address

-- Step 1: Check if employee_files table exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_files') THEN
    RAISE NOTICE 'employee_files table found. Starting migration...';
    
    -- Step 2: Insert data from employee_files to user_files
    -- We need to map employee_id to user_id
    INSERT INTO user_files (
      id,
      user_id,
      uploaded_by_user_id,
      file_category,
      file_subcategory,
      year_month,
      file_name,
      original_name,
      file_type,
      file_size,
      file_data,
      created_at
    )
    SELECT 
      ef.id,
      u.id as user_id,  -- Map employee to user
      ef.uploaded_by_user_id,
      ef.file_category,
      ef.file_subcategory,
      ef.year_month,
      ef.file_name,
      ef.original_name,
      ef.file_type,
      ef.file_size,
      ef.file_data,
      ef.created_at
    FROM employee_files ef
    INNER JOIN employees e ON ef.employee_id = e.id
    INNER JOIN users u ON u.email = e.name || '@hotseller.co.kr'  -- Adjust this mapping as needed
    WHERE NOT EXISTS (
      -- Avoid duplicates
      SELECT 1 FROM user_files uf WHERE uf.id = ef.id
    );
    
    RAISE NOTICE 'Migration completed successfully.';
  ELSE
    RAISE NOTICE 'employee_files table does not exist. No migration needed.';
  END IF;
END $$;

-- Alternative mapping if the above doesn't work
-- This tries to match by name directly
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employee_files') THEN
    -- Try alternative mapping by name
    INSERT INTO user_files (
      id,
      user_id,
      uploaded_by_user_id,
      file_category,
      file_subcategory,
      year_month,
      file_name,
      original_name,
      file_type,
      file_size,
      file_data,
      created_at
    )
    SELECT 
      ef.id,
      u.id as user_id,
      ef.uploaded_by_user_id,
      ef.file_category,
      ef.file_subcategory,
      ef.year_month,
      ef.file_name,
      ef.original_name,
      ef.file_type,
      ef.file_size,
      ef.file_data,
      ef.created_at
    FROM employee_files ef
    INNER JOIN employees e ON ef.employee_id = e.id
    INNER JOIN users u ON u.name = e.name
    WHERE NOT EXISTS (
      SELECT 1 FROM user_files uf WHERE uf.id = ef.id
    )
    ON CONFLICT (id) DO NOTHING;
    
  END IF;
END $$;


