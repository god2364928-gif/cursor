-- 청구서 취소 기능을 위한 컬럼 추가
-- 2025-11-27: 청구서 취소 상태 추적

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cancelled_by_user_id UUID REFERENCES users(id);

-- 취소된 청구서 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_invoices_is_cancelled ON invoices(is_cancelled);
CREATE INDEX IF NOT EXISTS idx_invoices_cancelled_by_user_id ON invoices(cancelled_by_user_id);

-- 기존 레코드의 is_cancelled는 기본값 FALSE로 설정됨
COMMENT ON COLUMN invoices.is_cancelled IS '청구서 취소 여부';
COMMENT ON COLUMN invoices.cancelled_at IS '청구서 취소 일시';
COMMENT ON COLUMN invoices.cancelled_by_user_id IS '청구서를 취소한 사용자 ID';

