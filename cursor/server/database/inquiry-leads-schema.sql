-- =============================
-- 문의 배정 시스템 스키마
-- 홈페이지 문의하기가 있는 가게 데이터를 담당자별로 배정하고 관리
-- =============================

-- Enable UUID extension (이미 있으면 무시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================
-- inquiry_leads 테이블 (문의 리드)
-- =============================
CREATE TABLE IF NOT EXISTS inquiry_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_name VARCHAR(255) NOT NULL,
  url TEXT,
  prefecture VARCHAR(50),
  region VARCHAR(100),
  genre VARCHAR(100),
  
  -- 담당자 배정
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP,
  
  -- 상태 관리
  -- PENDING: 미배정/대기중
  -- IN_PROGRESS: 진행중
  -- COMPLETED: 완료
  -- NO_SITE: 홈페이지 없음
  -- NO_FORM: 문의하기 없음
  -- ETC: 기타
  status VARCHAR(20) DEFAULT 'PENDING',
  
  -- 비고/메모
  memo TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- 성능 인덱스
-- =============================

-- 담당자별 조회
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_assignee ON inquiry_leads(assignee_id);

-- 상태별 조회
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_status ON inquiry_leads(status);

-- 지역별 조회
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_prefecture ON inquiry_leads(prefecture);

-- 배정일 기준 조회 (주간 할당량 계산용)
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_assigned_at ON inquiry_leads(assigned_at);

-- 미배정 데이터 빠른 조회
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_unassigned 
  ON inquiry_leads(id) 
  WHERE assignee_id IS NULL AND status = 'PENDING';

-- 복합 인덱스: 담당자 + 상태
CREATE INDEX IF NOT EXISTS idx_inquiry_leads_assignee_status 
  ON inquiry_leads(assignee_id, status);

-- =============================
-- 업데이트 트리거
-- =============================
CREATE OR REPLACE FUNCTION update_inquiry_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inquiry_leads_updated_at ON inquiry_leads;
CREATE TRIGGER trigger_inquiry_leads_updated_at
  BEFORE UPDATE ON inquiry_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiry_leads_updated_at();

