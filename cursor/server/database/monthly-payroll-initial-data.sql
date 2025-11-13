-- 2025년도 (2024년 10월 ~ 2025년 9월) 급여 초기 데이터

-- 5월 급여
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 5, '고은호', 400000, 0, 0, 0, 0, 0, 0),
(2025, 5, '中村さくら', 300000, 61282, 0, 400000, 0, 0, 461282),
(2025, 5, '山﨑水優', 330000, 0, 0, 325666, 0, 0, 325666),
(2025, 5, '安藤葵', 280000, 745, 150000, 0, 0, 0, 150745),
(2025, 5, '石井ひとみ', 250000, 0, 0, 29, 0, 10000, 10029),
(2025, 5, '山下南', 250000, 0, 0, 454, 0, 10000, 10454),
(2025, 5, '石黒杏奈', 300000, 0, 0, 0, 0, 10000, 10000)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 6월 급여
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 6, '고은호', 400000, 0, 0, 0, 0, 0, 0),
(2025, 6, '中村さくら', 300000, 57843, 0, 400000, 0, 0, 457843),
(2025, 6, '山﨑水優', 330000, 0, 0, 290090, 0, 0, 290090),
(2025, 6, '安藤葵', 280000, 2652, 0, 0, 0, 0, 2652),
(2025, 6, '石井ひとみ', 250000, 0, 0, 10500, 0, 0, 10500),
(2025, 6, '山下南', 250000, 0, 0, 15000, 0, 0, 15000),
(2025, 6, '石黒杏奈', 300000, 0, 0, 0, 0, 0, 0)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 7월 급여
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 7, '고은호', 400000, 0, 0, 0, 0, 0, 0),
(2025, 7, '中村さくら', 300000, 61638, 0, 400000, 0, 0, 461638),
(2025, 7, '山﨑水優', 330000, 0, 0, 249554, 0, 0, 249554),
(2025, 7, '安藤葵', 280000, 1966, 0, 0, 0, 0, 1966),
(2025, 7, '石井ひとみ', 280000, 0, 0, 10500, 0, 0, 10500),
(2025, 7, '山下南', 250000, 0, 0, 12455, 0, 0, 12455),
(2025, 7, '石黒杏奈', 300000, 0, 0, 0, 0, 0, 0)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 8월 급여 (여름휴가수당 - 기타로 이동)
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 8, '고은호', 400000, 0, 0, 0, 0, 0, 0),
(2025, 8, '中村さくら', 300000, 82304, 0, 400000, 0, 20000, 502304),
(2025, 8, '山﨑水優', 330000, 0, 0, 195904, 0, 20000, 215904),
(2025, 8, '安藤葵', 280000, 6054, 0, 0, 0, 20000, 26054),
(2025, 8, '石井ひとみ', 280000, 0, 0, 11980, 0, 20000, 31980),
(2025, 8, '山下南', 280000, 0, 0, 17455, 0, 20000, 37455),
(2025, 8, '石黒杏奈', 300000, 0, 0, 0, 0, 20000, 20000)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 9월 급여 (출장비를 business_trip으로 분리)
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 9, '고은호', 400000, 0, 0, 0, 130000, 0, 130000),
(2025, 9, '中村さくら', 300000, 56175, 0, 400000, 50000, 0, 506175),
(2025, 9, '山﨑水優', 330000, 0, 0, 214673, 50000, 0, 264673),
(2025, 9, '安藤葵', 280000, 23647, 0, 0, 50000, 0, 73647),
(2025, 9, '石井ひとみ', 280000, 0, 0, 288500, 50000, 0, 338500),
(2025, 9, '山下南', 280000, 0, 0, 12455, 35000, 0, 47455),
(2025, 9, '石黒杏奈', 300000, 0, 0, 0, 50000, 0, 50000)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 10월 급여 (石井ひとみ 퇴사로 제외)
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 10, '고은호', 400000, 0, 0, 0, 0, 0, 0),
(2025, 10, '中村さくら', 300000, 61538, 0, 400000, 0, 0, 461538),
(2025, 10, '山﨑水優', 330000, 0, 0, 199292, 0, 0, 199292),
(2025, 10, '安藤葵', 280000, 32902, 0, 0, 0, 0, 32902),
(2025, 10, '山下南', 280000, 0, 0, 7000, 0, 0, 7000),
(2025, 10, '石黒杏奈', 300000, 0, 0, 0, 0, 0, 0)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 11월 급여 (출장비를 business_trip으로 분리)
INSERT INTO monthly_payroll (fiscal_year, month, employee_name, base_salary, coconala, bonus, incentive, business_trip, other, total) VALUES
(2025, 11, '고은호', 0, 0, 0, 0, 50000, 0, 50000),
(2025, 11, '中村さくら', 0, 0, 0, 0, 0, 0, 0),
(2025, 11, '山﨑水優', 0, 0, 0, 0, 0, 0, 0),
(2025, 11, '安藤葵', 0, 0, 105164, 0, 0, 0, 105164),
(2025, 11, '山下南', 0, 0, 0, 0, 0, 0, 0),
(2025, 11, '石黒杏奈', 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (fiscal_year, month, employee_name) DO UPDATE SET
base_salary = EXCLUDED.base_salary, coconala = EXCLUDED.coconala, bonus = EXCLUDED.bonus,
incentive = EXCLUDED.incentive, business_trip = EXCLUDED.business_trip, other = EXCLUDED.other, total = EXCLUDED.total, updated_at = CURRENT_TIMESTAMP;

-- 히스토리 데이터
INSERT INTO monthly_payroll_history (fiscal_year, month, history_text) VALUES
(2025, 8, '명세 [夏休み手当] 표시'),
(2025, 9, '*대표출장비 하루1만엔  9/4-9/16
*직원출장비 하루숙박비1만엔 수당5000엔'),
(2025, 11, '*대표출장비 하루1만엔  11/1-11/5
*安藤葵씨 상여금 사용액 44,836엔')
ON CONFLICT (fiscal_year, month) DO UPDATE SET
history_text = EXCLUDED.history_text, updated_at = CURRENT_TIMESTAMP;
