-- ===========================================
-- Notion 휴가 데이터 이전 (1회성)
-- 멱등성: application 레벨에서 'Notion移行' notes 존재 시 skip
-- 半休은 모두 오후반차(half_pm)로 등록 (사용자 지시)
-- ===========================================

DO $$
DECLARE uid INT;
BEGIN

  -- ============== 山﨑水優 (入社 2024-04-03) ==============
  SELECT id INTO uid FROM users WHERE email = 'm5ymsk@hotseller.co.kr';
  IF uid IS NOT NULL THEN
    -- 입사일 보정 (어드민 데이터가 노션과 다름)
    UPDATE users SET hire_date = '2024-04-03' WHERE id = uid AND hire_date IS DISTINCT FROM DATE '2024-04-03';

    INSERT INTO vacation_grants (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes) VALUES
      (uid, '2024-10-03', '2026-10-03', 10, 'annual', 0.5, 'Notion移行'),
      (uid, '2025-10-03', '2027-10-03', 11, 'annual', 1.5, 'Notion移行');

    INSERT INTO vacation_requests (user_id, start_date, end_date, leave_type, consumed_days, status, reason, approved_at) VALUES
      (uid, '2024-11-21', '2024-11-21', 'health_check', 0, 'approved', 'Notion移行 (健診)', '2024-11-21 18:00:00+09'),
      (uid, '2025-01-27', '2025-01-27', 'full',         1,   'approved', 'Notion移行',         '2025-01-27 18:00:00+09'),
      (uid, '2025-01-28', '2025-01-28', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2025-01-28 18:00:00+09'),
      (uid, '2025-03-24', '2025-03-24', 'full',         1,   'approved', 'Notion移行',         '2025-03-24 18:00:00+09'),
      (uid, '2025-04-28', '2025-04-28', 'full',         1,   'approved', 'Notion移行',         '2025-04-28 18:00:00+09'),
      (uid, '2025-06-02', '2025-06-02', 'full',         1,   'approved', 'Notion移行',         '2025-06-02 18:00:00+09'),
      (uid, '2025-09-24', '2025-09-24', 'full',         1,   'approved', 'Notion移行',         '2025-09-24 18:00:00+09'),
      (uid, '2025-12-09', '2025-12-09', 'health_check', 0,   'approved', 'Notion移行 (健診)',  '2025-12-09 18:00:00+09'),
      (uid, '2026-03-02', '2026-03-02', 'full',         1,   'approved', 'Notion移行',         '2026-03-02 18:00:00+09'),
      (uid, '2026-04-24', '2026-04-24', 'full',         1,   'approved', 'Notion移行',         '2026-04-24 18:00:00+09'),
      (uid, '2026-05-11', '2026-05-11', 'full',         1,   'approved', 'Notion移行 (推定)',  '2026-05-11 18:00:00+09');
    -- 合計: 부여 21, 사용 8.5 (全休 8 + 半休 0.5) → 잔여 12.5 ✓
  END IF;

  -- ============== 安藤葵 (入社 2024-09-02) ==============
  SELECT id INTO uid FROM users WHERE email = 'amao0423@hotseller.co.kr';
  IF uid IS NOT NULL THEN
    INSERT INTO vacation_grants (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes) VALUES
      (uid, '2025-03-02', '2027-03-02', 10, 'annual', 0.5, 'Notion移行'),
      (uid, '2026-03-02', '2028-03-02', 11, 'annual', 1.5, 'Notion移行');

    INSERT INTO vacation_requests (user_id, start_date, end_date, leave_type, consumed_days, status, reason, approved_at) VALUES
      (uid, '2025-03-07', '2025-03-07', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2025-03-07 18:00:00+09'),
      (uid, '2025-05-16', '2025-05-16', 'full',         1,   'approved', 'Notion移行',         '2025-05-16 18:00:00+09'),
      (uid, '2025-07-04', '2025-07-04', 'health_check', 0,   'approved', 'Notion移行 (健診)',  '2025-07-04 18:00:00+09'),
      (uid, '2025-07-07', '2025-07-07', 'full',         1,   'approved', 'Notion移行',         '2025-07-07 18:00:00+09'),
      (uid, '2025-07-17', '2025-07-17', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2025-07-17 18:00:00+09'),
      (uid, '2025-09-02', '2025-09-02', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2025-09-02 18:00:00+09'),
      (uid, '2025-09-03', '2025-09-03', 'full',         1,   'approved', 'Notion移行',         '2025-09-03 18:00:00+09'),
      (uid, '2026-02-24', '2026-02-24', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2026-02-24 18:00:00+09'),
      (uid, '2026-03-26', '2026-03-27', 'full',         2,   'approved', 'Notion移行 (連休)',  '2026-03-26 18:00:00+09'),
      (uid, '2026-05-01', '2026-05-01', 'full',         1,   'approved', 'Notion移行',         '2026-05-01 18:00:00+09');
    -- 合計: 부여 21, 사용 8 (全休 6 + 半休 4×0.5=2) → 잔여 13 ✓
  END IF;

  -- ============== 金帝利 (入社 2025-09-01, 사용자 지시) ==============
  -- 입사 8개월 → 첫 부여 2026-03-01 (10일 발생)
  SELECT id INTO uid FROM users WHERE email = 'j0705@hotseller.co.kr';
  IF uid IS NOT NULL THEN
    -- 입사일 보정 (어드민에 2026-03-01로 잘못 입력되어 있음)
    UPDATE users SET hire_date = '2025-09-01' WHERE id = uid AND hire_date IS DISTINCT FROM DATE '2025-09-01';

    INSERT INTO vacation_grants (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes) VALUES
      (uid, '2026-03-01', '2028-03-01', 10, 'annual', 0.5, 'Notion移行');

    INSERT INTO vacation_requests (user_id, start_date, end_date, leave_type, consumed_days, status, reason, approved_at) VALUES
      (uid, '2026-04-23', '2026-04-23', 'half_pm', 0.5, 'approved', 'Notion移行 (半休)', '2026-04-23 18:00:00+09'),
      (uid, '2026-05-01', '2026-05-01', 'full',    1,   'approved', 'Notion移行',        '2026-05-01 18:00:00+09');
    -- 合計: 부여 10, 사용 1.5 → 잔여 8.5
  END IF;

  -- ============== 中村さくら (入社 2023-06-23) ==============
  SELECT id INTO uid FROM users WHERE email = 'umm240227@hotseller.co.kr';
  IF uid IS NOT NULL THEN
    INSERT INTO vacation_grants (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes) VALUES
      (uid, '2023-12-23', '2025-12-23', 10, 'annual', 0.5, 'Notion移行 (期限切れ)'),
      (uid, '2024-12-23', '2026-12-23', 11, 'annual', 1.5, 'Notion移行'),
      (uid, '2025-12-23', '2027-12-23', 12, 'annual', 2.5, 'Notion移行');

    -- 全 20件 (사용자 노션 전체 확인 후 정확 분리)
    INSERT INTO vacation_requests (user_id, start_date, end_date, leave_type, consumed_days, status, reason, approved_at) VALUES
      (uid, '2024-07-01', '2024-07-02', 'full',         2,   'approved', 'Notion移行 (連休)',  '2024-07-01 18:00:00+09'),
      (uid, '2024-11-25', '2024-11-26', 'full',         2,   'approved', 'Notion移行 (連休)',  '2024-11-25 18:00:00+09'),
      (uid, '2024-12-03', '2024-12-03', 'full',         1,   'approved', 'Notion移行',         '2024-12-03 18:00:00+09'),
      (uid, '2024-12-16', '2024-12-16', 'full',         1,   'approved', 'Notion移行',         '2024-12-16 18:00:00+09'),
      (uid, '2025-02-07', '2025-02-07', 'full',         1,   'approved', 'Notion移行',         '2025-02-07 18:00:00+09'),
      (uid, '2025-04-04', '2025-04-04', 'full',         1,   'approved', 'Notion移行',         '2025-04-04 18:00:00+09'),
      (uid, '2025-05-07', '2025-05-07', 'full',         1,   'approved', 'Notion移行',         '2025-05-07 18:00:00+09'),
      (uid, '2025-05-30', '2025-05-30', 'health_check', 0,   'approved', 'Notion移行 (健診)',  '2025-05-30 18:00:00+09'),
      (uid, '2025-06-23', '2025-06-23', 'full',         1,   'approved', 'Notion移行',         '2025-06-23 18:00:00+09'),
      (uid, '2025-08-08', '2025-08-08', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2025-08-08 18:00:00+09'),
      (uid, '2025-09-10', '2025-09-12', 'full',         3,   'approved', 'Notion移行 (連休)',  '2025-09-10 18:00:00+09'),
      (uid, '2025-09-16', '2025-09-16', 'full',         1,   'approved', 'Notion移行',         '2025-09-16 18:00:00+09'),
      (uid, '2025-10-06', '2025-10-06', 'full',         1,   'approved', 'Notion移行',         '2025-10-06 18:00:00+09'),
      (uid, '2025-11-04', '2025-11-04', 'full',         1,   'approved', 'Notion移行',         '2025-11-04 18:00:00+09'),
      (uid, '2025-12-24', '2025-12-26', 'full',         3,   'approved', 'Notion移行 (連休)',  '2025-12-24 18:00:00+09'),
      (uid, '2026-02-16', '2026-02-16', 'full',         1,   'approved', 'Notion移行',         '2026-02-16 18:00:00+09'),
      (uid, '2026-02-24', '2026-02-24', 'full',         1,   'approved', 'Notion移行',         '2026-02-24 18:00:00+09'),
      (uid, '2026-02-25', '2026-02-25', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2026-02-25 18:00:00+09'),
      (uid, '2026-04-21', '2026-04-21', 'half_pm',      0.5, 'approved', 'Notion移行 (半休)',  '2026-04-21 18:00:00+09'),
      (uid, '2026-04-23', '2026-04-23', 'full',         1,   'approved', 'Notion移行',         '2026-04-23 18:00:00+09');
    -- 合計: 全休 22 + 半休 1.5 = 23.5; 부여 33 → 잔여 9.5 ✓ (노션 半休使用数 3, 消化日数 22 일치)
  END IF;

  -- ============== 고은호 (入社 2020-01-01) ==============
  SELECT id INTO uid FROM users WHERE email = 'god2364928@hotseller.co.kr';
  IF uid IS NOT NULL THEN
    INSERT INTO vacation_grants (user_id, grant_date, expires_at, days, grant_type, service_years_at_grant, notes) VALUES
      (uid, '2020-07-01', '2022-07-01', 10, 'annual', 0.5, 'Notion移行 (期限切れ)'),
      (uid, '2021-07-01', '2023-07-01', 11, 'annual', 1.5, 'Notion移行 (期限切れ)'),
      (uid, '2022-07-01', '2024-07-01', 12, 'annual', 2.5, 'Notion移行 (期限切れ)'),
      (uid, '2023-07-01', '2025-07-01', 14, 'annual', 3.5, 'Notion移行 (期限切れ)'),
      (uid, '2024-07-01', '2026-07-01', 16, 'annual', 4.5, 'Notion移行'),
      (uid, '2025-07-01', '2027-07-01', 18, 'annual', 5.5, 'Notion移行');
    -- 사용 기록 없음 → 활성 잔여 34일 (16+18)
  END IF;

END $$;
