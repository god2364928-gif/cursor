-- 월별 급여 테이블에 집세(rent) 컬럼 추가
ALTER TABLE monthly_payroll ADD COLUMN IF NOT EXISTS rent DECIMAL(12, 2) DEFAULT 0;

-- 기존 total 계산 업데이트 (rent 포함)
UPDATE monthly_payroll 
SET total = COALESCE(base_salary, 0) + COALESCE(coconala, 0) + COALESCE(bonus, 0) + 
            COALESCE(incentive, 0) + COALESCE(business_trip, 0) + COALESCE(rent, 0) + COALESCE(other, 0);

