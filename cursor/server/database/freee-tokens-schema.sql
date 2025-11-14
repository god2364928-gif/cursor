-- freee OAuth 토큰 저장 테이블
CREATE TABLE IF NOT EXISTS freee_tokens (
  id SERIAL PRIMARY KEY,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 하나의 토큰만 유지 (단일 freee 계정 연동)
-- 기존 데이터가 있으면 삭제하고 새로 삽입
TRUNCATE TABLE freee_tokens;

