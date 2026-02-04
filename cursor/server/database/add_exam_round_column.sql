-- 역량 평가 시험에 회차(round) 컬럼 추가
-- 1차 시험과 2차 시험을 구분하기 위함

-- 1. 기존 UNIQUE 제약 조건 삭제
ALTER TABLE exam_answers DROP CONSTRAINT IF EXISTS exam_answers_user_id_key;

-- 2. exam_round 컬럼 추가 (1차, 2차 등)
ALTER TABLE exam_answers ADD COLUMN IF NOT EXISTS exam_round INTEGER NOT NULL DEFAULT 1;

-- 3. 기존 데이터는 모두 1차 시험으로 설정
UPDATE exam_answers SET exam_round = 1 WHERE exam_round IS NULL;

-- 4. 새로운 UNIQUE 제약 조건 추가 (user_id + exam_round 조합이 유니크)
ALTER TABLE exam_answers ADD CONSTRAINT exam_answers_user_round_unique UNIQUE(user_id, exam_round);

-- 5. 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_exam_answers_user_round ON exam_answers(user_id, exam_round);

-- 6. 주석 추가
COMMENT ON COLUMN exam_answers.exam_round IS '시험 회차 (1: 1차, 2: 2차, ...)';
