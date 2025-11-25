-- Add payment_bank_info column to invoices table
-- This stores the bank/payment information selected by the user when creating an invoice

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS payment_bank_info TEXT;

-- Set default value for existing records (PayPay Bank)
UPDATE invoices 
SET payment_bank_info = 'PayPay銀行
ビジネス営業部支店（005）
普通　7136331
カブシキガイシャホットセラー'
WHERE payment_bank_info IS NULL;

