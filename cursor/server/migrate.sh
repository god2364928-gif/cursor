#!/bin/bash

echo "🚀 Railway 데이터베이스 마이그레이션 시작..."
echo ""
echo "Railway Connect 버튼을 클릭하여 DATABASE_URL을 복사해주세요."
echo "형식: postgresql://username:password@host:port/database"
echo ""
read -p "DATABASE_URL을 입력하세요: " DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL이 입력되지 않았습니다."
  exit 1
fi

echo ""
echo "📝 마이그레이션 실행 중..."
echo ""

psql "$DATABASE_URL" << 'EOF'
-- 카테고리 이름 변경
UPDATE accounting_transactions SET category = '셀마플' WHERE category = '셀마플 매출';
UPDATE accounting_transactions SET category = '코코마케' WHERE category = '코코마케 매출';

-- 결제수단 이름 변경
UPDATE accounting_transactions SET payment_method = '계좌이체' WHERE payment_method IN ('현금/은행', '현금', '은행');
UPDATE accounting_transactions SET payment_method = '페이팔' WHERE payment_method = 'Stripe';
UPDATE accounting_recurring_expenses SET payment_method = '계좌이체' WHERE payment_method IN ('현금/은행', '현금', '은행', '계좌');
UPDATE accounting_recurring_expenses SET payment_method = '페이팔' WHERE payment_method = 'Stripe';

-- 자동 매칭 규칙 테이블 생성
CREATE TABLE IF NOT EXISTS accounting_auto_match_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  assigned_user_id UUID REFERENCES auth_users(id),
  payment_method VARCHAR(50),
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(keyword)
);

CREATE INDEX IF NOT EXISTS idx_auto_match_rules_keyword ON accounting_auto_match_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_active ON accounting_auto_match_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_priority ON accounting_auto_match_rules(priority DESC);

INSERT INTO accounting_auto_match_rules (keyword, category, priority)
VALUES ('face', '운영비', 10), ('PayPay', '기타', 5), ('ペイペイ', '기타', 5)
ON CONFLICT (keyword) DO NOTHING;

-- 결과 확인
SELECT '거래내역 카테고리' as info, category, COUNT(*) as count FROM accounting_transactions GROUP BY category ORDER BY category;
SELECT '거래내역 결제수단' as info, payment_method, COUNT(*) as count FROM accounting_transactions GROUP BY payment_method ORDER BY payment_method;
SELECT '자동 매칭 규칙' as info, keyword, category, priority FROM accounting_auto_match_rules ORDER BY priority DESC;
SELECT '🎉 마이그레이션 완료!' as message;
EOF

echo ""
echo "✅ 마이그레이션이 완료되었습니다!"

