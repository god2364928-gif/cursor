-- 역량 평가 시험 답변 테이블
CREATE TABLE IF NOT EXISTS exam_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL, -- 13개 문항의 답변을 JSON 형태로 저장 { "1": "답변1", "2": "답변2", ... }
  is_submitted BOOLEAN DEFAULT FALSE, -- 제출 완료 여부
  submitted_at TIMESTAMP, -- 제출 완료 시각
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id) -- 1인 1회 제출만 가능
);

-- 업데이트 시각 자동 갱신을 위한 트리거
CREATE OR REPLACE FUNCTION update_exam_answers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exam_answers_updated_at_trigger
BEFORE UPDATE ON exam_answers
FOR EACH ROW
EXECUTE FUNCTION update_exam_answers_updated_at();

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_exam_answers_user_id ON exam_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_submitted ON exam_answers(is_submitted);
