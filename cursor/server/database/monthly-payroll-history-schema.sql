-- 월별 급여 히스토리 테이블
CREATE TABLE IF NOT EXISTS monthly_payroll_history (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    month INT NOT NULL,
    history_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fiscal_year, month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payroll_history_year_month ON monthly_payroll_history (fiscal_year, month);

