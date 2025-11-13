-- 월별 급여 관리 테이블
CREATE TABLE IF NOT EXISTS monthly_payroll (
    id SERIAL PRIMARY KEY,
    fiscal_year INT NOT NULL,
    month INT NOT NULL,
    employee_name VARCHAR(100) NOT NULL,
    base_salary DECIMAL(12, 2) DEFAULT 0,
    coconala DECIMAL(12, 2) DEFAULT 0,
    bonus DECIMAL(12, 2) DEFAULT 0,
    incentive DECIMAL(12, 2) DEFAULT 0,
    other DECIMAL(12, 2) DEFAULT 0,
    total DECIMAL(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (fiscal_year, month, employee_name)
);

CREATE INDEX IF NOT EXISTS idx_monthly_payroll_year_month ON monthly_payroll (fiscal_year, month);
CREATE INDEX IF NOT EXISTS idx_monthly_payroll_employee ON monthly_payroll (employee_name);

