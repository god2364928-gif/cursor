-- 2026년 하계휴가(夏季休暇) 등록
--
-- 기간: 2026-08-08(土) ~ 2026-08-16(日)
--   8/8(土)・8/9(日)    所定休日                       → 주말이므로 등록 대상 아님
--   8/10(月)            夏季特別休暇(有給・会社付与)   → 전사 회사휴일. jp_holidays 등록, 연차 차감 없음
--   8/11(火)            山の日 (祝日)                  → 이미 jp_holidays 에 존재 (seed-jp-holidays.sql)
--   8/12(水)~8/14(金)   年次有給休暇の計画的付与 3日   → 대상자별 승인완료 신청 등록, 연차 3일 차감
--   8/15(土)・8/16(日)  所定休日                       → 주말이므로 등록 대상 아님
--
-- 차감 대상: 재직 중이며 연차 부여 이력이 있는 4명
--   고은호 / 中村さくら / 山﨑水優 / 安藤葵
--   ※ 신입 今井舞桜(2026-05-12 입사)・中村あかね(2026-07-01 입사)는 연차 미부여 → 제외.
--     8/10 회사휴일은 jp_holidays 로 등록하므로 이 2명 달력에도 정상 표시된다.
--
-- 멱등: 여러 번 실행해도 중복 등록되지 않는다.
--
-- 실행:
--   psql "$DATABASE_URL" -f cursor/server/database/seed-2026-summer-vacation.sql

BEGIN;

-- 1) 8/10(月) 夏季特別休暇 — 전사 회사휴일 (연차 차감 없음)
--    seed-jp-holidays.sql 은 ON CONFLICT DO NOTHING 이므로 재시드해도 이 행은 유지된다.
INSERT INTO jp_holidays (date, name)
VALUES (DATE '2026-08-10', '夏季特別休暇')
ON CONFLICT (date) DO NOTHING;

-- 2) 8/12(水)~8/14(金) 年次有給休暇の計画的付与 (3일) — 승인완료 상태로 등록
--    재직 판정은 src/lib/employment.ts 표준을 따른다 (퇴사·입사전 제외, NULL/공백은 재직).
INSERT INTO vacation_requests
  (user_id, start_date, end_date, leave_type, consumed_days, reason,
   status, approver_id, approved_at)
SELECT u.id,
       DATE '2026-08-12',
       DATE '2026-08-14',
       'full',
       3.0,
       '夏季休暇（年次有給休暇の計画的付与）',
       'approved',
       a.id,
       NOW()
FROM users u
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE email = 'god2364928@hotseller.co.kr' LIMIT 1
) a
WHERE u.email IN (
        'god2364928@hotseller.co.kr',  -- 고은호
        's-nakamura@hotseller.jp',     -- 中村さくら
        'm-yamasaki@hotseller.jp',     -- 山﨑水優
        'a-ando@hotseller.jp'          -- 安藤葵
      )
  AND COALESCE(NULLIF(TRIM(u.employment_status), ''), '입사중')
      NOT IN ('퇴사', '퇴직', '退社', '退職', '입사전', '入社前')
  -- 연차 부여 이력이 없는 직원(신입)에게는 계획적 부여를 걸지 않는다
  AND EXISTS (SELECT 1 FROM vacation_grants g WHERE g.user_id = u.id)
  -- 멱등성: 동일 기간의 유효한 신청이 이미 있으면 건너뛴다
  AND NOT EXISTS (
        SELECT 1 FROM vacation_requests r
        WHERE r.user_id = u.id
          AND r.start_date = DATE '2026-08-12'
          AND r.end_date = DATE '2026-08-14'
          AND r.status IN ('pending', 'approved')
      );

COMMIT;
