-- Extend users table for employee management
ALTER TABLE users
ADD COLUMN IF NOT EXISTS department VARCHAR(50),              -- 부서 (경영지원팀, 마케팅부 등)
ADD COLUMN IF NOT EXISTS position VARCHAR(50),                -- 직급 (사원, 주임, 대리, 팀장, 대표)
ADD COLUMN IF NOT EXISTS employment_status VARCHAR(50),       -- 입사현황 (입사중, 입사전, 퇴사)
ADD COLUMN IF NOT EXISTS base_salary INTEGER,                 -- 기본급
ADD COLUMN IF NOT EXISTS contract_start_date DATE,            -- 계약 시작일
ADD COLUMN IF NOT EXISTS contract_end_date DATE,              -- 계약 종료일
ADD COLUMN IF NOT EXISTS mart_id VARCHAR(100),                -- 마트 아이디
ADD COLUMN IF NOT EXISTS transportation_route VARCHAR(255),   -- 교통비 경로
ADD COLUMN IF NOT EXISTS monthly_transportation_cost INTEGER, -- 월 교통비
ADD COLUMN IF NOT EXISTS transportation_start_date DATE,      -- 교통비 시작일
ADD COLUMN IF NOT EXISTS transportation_details TEXT;         -- 교통비 상세

-- User files table for employee documents
CREATE TABLE IF NOT EXISTS user_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(id) NOT NULL,
  
  file_category VARCHAR(100) NOT NULL,  -- 인사기록카드, 계약서, 이력서, 개인서류
  file_subcategory VARCHAR(100),        -- 급여명세서, 교통비영수증, 진단서 등
  year_month VARCHAR(7),                -- YYYY-MM (월별 문서인 경우)
  
  file_name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_data TEXT NOT NULL,              -- Base64 encoded
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position);
CREATE INDEX IF NOT EXISTS idx_users_employment_status ON users(employment_status);
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_category ON user_files(file_category);
CREATE INDEX IF NOT EXISTS idx_user_files_year_month ON user_files(year_month);

