-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50) NOT NULL,  -- 경영지원팀, 마케팅부 등
  position VARCHAR(50) NOT NULL,    -- 사원, 주임, 대리, 팀장, 대표
  employment_status VARCHAR(50) NOT NULL,  -- 입사중, 입사전, 퇴사
  base_salary INTEGER,  -- 기본급
  
  -- 계약 정보
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- 마트 아이디
  mart_id VARCHAR(100),
  
  -- 교통비 정보
  transportation_route VARCHAR(255),  -- 예: 西川口~浜松町
  monthly_transportation_cost INTEGER,  -- 예: 12,290
  transportation_start_date DATE,  -- 2025년3月から
  transportation_details TEXT,  -- 西川口~新橋 定期代: 9,620円 ...
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee files table
CREATE TABLE IF NOT EXISTS employee_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id) NOT NULL,
  
  file_category VARCHAR(100) NOT NULL,  -- 인사기록카드, 계약서, 이력서, 개인서류
  file_subcategory VARCHAR(100),  -- 개인서류인 경우: 급여명세서, 교통비영수증, 진단서 등
  year_month VARCHAR(7),  -- YYYY-MM (급여명세서 등 월별 문서인 경우)
  
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_data TEXT NOT NULL,  -- Base64 인코딩
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employee_files_employee_id ON employee_files(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_files_category ON employee_files(file_category);
CREATE INDEX IF NOT EXISTS idx_employee_files_year_month ON employee_files(year_month);

