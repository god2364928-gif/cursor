-- 월별 급여명세서 파일 관리 테이블 (DB 저장 방식)
CREATE TABLE IF NOT EXISTS monthly_payroll_files (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    month INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_data TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- 월별 여러 개의 급여명세서 파일을 허용 (UNIQUE 제약 없음)
);

CREATE INDEX IF NOT EXISTS idx_payroll_files_year_month ON monthly_payroll_files (fiscal_year, month);

COMMENT ON TABLE monthly_payroll_files IS '월별 급여명세서 파일 관리 (Base64 DB 저장)';
COMMENT ON COLUMN monthly_payroll_files.fiscal_year IS '회계연도';
COMMENT ON COLUMN monthly_payroll_files.month IS '월 (1-12)';
COMMENT ON COLUMN monthly_payroll_files.file_name IS '원본 파일명';
COMMENT ON COLUMN monthly_payroll_files.file_data IS 'Base64 인코딩된 파일 데이터';
COMMENT ON COLUMN monthly_payroll_files.file_size IS '파일 크기 (bytes)';
COMMENT ON COLUMN monthly_payroll_files.mime_type IS 'MIME 타입';
COMMENT ON COLUMN monthly_payroll_files.uploaded_by IS '업로드한 사용자 ID';
