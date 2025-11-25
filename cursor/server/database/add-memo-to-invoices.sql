-- invoices 테이블에 memo(비고) 컬럼 추가

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS memo TEXT;

COMMENT ON COLUMN invoices.memo IS '청구서 비고 (備考)';






