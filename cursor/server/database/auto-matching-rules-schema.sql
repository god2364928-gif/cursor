-- =============================
-- CSV 업로드 자동 매칭 규칙 테이블
-- =============================

-- 자동 매칭 규칙 테이블
CREATE TABLE IF NOT EXISTS accounting_auto_match_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(255) NOT NULL, -- 항목명에서 찾을 키워드 (예: "face", "PayPay" 등)
  category VARCHAR(50), -- 자동 지정할 카테고리 (예: "운영비")
  assigned_user_id UUID REFERENCES auth_users(id), -- 자동 지정할 담당자
  payment_method VARCHAR(50), -- 자동 지정할 결제수단 (선택사항)
  priority INTEGER NOT NULL DEFAULT 0, -- 우선순위 (숫자 클수록 우선, 중복 시 사용)
  is_active BOOLEAN NOT NULL DEFAULT true, -- 활성화 여부
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(keyword) -- 키워드는 중복 불가
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_keyword ON accounting_auto_match_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_active ON accounting_auto_match_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_priority ON accounting_auto_match_rules(priority DESC);

-- 예시 데이터
INSERT INTO accounting_auto_match_rules (keyword, category, assigned_user_id, priority)
VALUES 
  ('face', '운영비', NULL, 10),
  ('PayPay', '기타', NULL, 5),
  ('ペイペイ', '기타', NULL, 5)
ON CONFLICT (keyword) DO NOTHING;

COMMENT ON TABLE accounting_auto_match_rules IS 'CSV 업로드 시 항목명 키워드 기반 자동 카테고리/담당자 매칭 규칙';
COMMENT ON COLUMN accounting_auto_match_rules.keyword IS '항목명에서 찾을 키워드 (대소문자 구분 없음, 부분 일치)';
COMMENT ON COLUMN accounting_auto_match_rules.priority IS '우선순위. 숫자가 클수록 먼저 매칭';

