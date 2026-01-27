-- Add payment_bank_info column to invoices table
-- This stores the bank/payment information selected by the user when creating an invoice

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_bank_info TEXT;

-- Set default value for existing records (Sumitomo Mitsui Bank)
UPDATE invoices 
SET payment_bank_info = '三井住友銀行
トランクＮＯＲＴＨ支店（403）
普通　0122078
(株) ホットセラー'
WHERE payment_bank_info IS NULL;

