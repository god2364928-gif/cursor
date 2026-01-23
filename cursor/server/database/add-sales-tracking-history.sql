-- Sales tracking history table (영업 이력 히스토리)
-- 각 영업 레코드의 차수별 연락 기록을 저장

CREATE TABLE IF NOT EXISTS sales_tracking_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sales_tracking_id UUID NOT NULL REFERENCES sales_tracking(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,  -- 차수 (1, 2, 3...)
  contact_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 연락 날짜 (작성 시점)
  content TEXT,  -- 보낸 내용
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(100) NOT NULL,  -- 작성자 이름
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_sales_tracking_history_sales_tracking_id 
  ON sales_tracking_history(sales_tracking_id);

CREATE INDEX IF NOT EXISTS idx_sales_tracking_history_round 
  ON sales_tracking_history(round);

CREATE INDEX IF NOT EXISTS idx_sales_tracking_history_contact_date 
  ON sales_tracking_history(contact_date DESC);

-- 코멘트 추가
COMMENT ON TABLE sales_tracking_history IS '영업 이력의 차수별 연락 기록';
COMMENT ON COLUMN sales_tracking_history.round IS '연락 차수 (1차, 2차, 3차...)';
COMMENT ON COLUMN sales_tracking_history.contact_date IS '연락 시점 (기록 작성 시 자동 저장)';
COMMENT ON COLUMN sales_tracking_history.content IS '보낸 메시지 내용';
