# 🚀 DB 마이그레이션 가이드

## 📌 개요
회계 시스템 업데이트를 위한 데이터베이스 마이그레이션이 필요합니다.
**한 번만 실행**하면 됩니다.

---

## 🔧 방법 1: Railway 대시보드 (추천 ✅)

### 1단계: Railway 대시보드 접속
1. https://railway.app 로그인
2. 프로젝트 선택 (hotseller-crm)
3. **PostgreSQL** 서비스 클릭
4. **Query** 탭 클릭

### 2단계: SQL 스크립트 실행
아래 전체 스크립트를 복사하여 Query 창에 붙여넣고 **Execute** 버튼 클릭:

```sql
-- =============================
-- 전체 마이그레이션 스크립트
-- =============================

-- 1. 카테고리 이름 변경
UPDATE accounting_transactions
SET category = '셀마플'
WHERE category = '셀마플 매출';

UPDATE accounting_transactions
SET category = '코코마케'
WHERE category = '코코마케 매출';

-- 2. 결제수단 이름 변경
UPDATE accounting_transactions
SET payment_method = '계좌이체'
WHERE payment_method IN ('현금/은행', '현금', '은행');

UPDATE accounting_transactions
SET payment_method = '페이팔'
WHERE payment_method = 'Stripe';

-- 3. 정기지출 테이블도 업데이트
UPDATE accounting_recurring_expenses
SET payment_method = '계좌이체'
WHERE payment_method IN ('현금/은행', '현금', '은행', '계좌');

UPDATE accounting_recurring_expenses
SET payment_method = '페이팔'
WHERE payment_method = 'Stripe';

-- 4. 자동 매칭 규칙 테이블 생성
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

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_keyword ON accounting_auto_match_rules(keyword);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_active ON accounting_auto_match_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_auto_match_rules_priority ON accounting_auto_match_rules(priority DESC);

-- 6. 예시 데이터 추가
INSERT INTO accounting_auto_match_rules (keyword, category, assigned_user_id, priority)
VALUES 
  ('face', '운영비', NULL, 10),
  ('PayPay', '기타', NULL, 5),
  ('ペイペイ', '기타', NULL, 5)
ON CONFLICT (keyword) DO NOTHING;

-- 7. 테이블 설명 추가
COMMENT ON TABLE accounting_auto_match_rules IS 'CSV 업로드 시 항목명 키워드 기반 자동 카테고리/담당자 매칭 규칙';
COMMENT ON COLUMN accounting_auto_match_rules.keyword IS '항목명에서 찾을 키워드 (대소문자 구분 없음, 부분 일치)';
COMMENT ON COLUMN accounting_auto_match_rules.priority IS '우선순위. 숫자가 클수록 먼저 매칭';

-- 8. 결과 확인
SELECT 
  '✅ 거래내역 카테고리' as info,
  category,
  COUNT(*) as count
FROM accounting_transactions
GROUP BY category
ORDER BY category;

SELECT 
  '✅ 거래내역 결제수단' as info,
  payment_method,
  COUNT(*) as count
FROM accounting_transactions
GROUP BY payment_method
ORDER BY payment_method;

SELECT 
  '✅ 자동 매칭 규칙' as info,
  keyword,
  category,
  priority
FROM accounting_auto_match_rules
ORDER BY priority DESC;

SELECT '🎉 마이그레이션 완료!' as message;
```

### 3단계: 결과 확인
- "마이그레이션 완료!" 메시지가 표시되면 성공
- 카테고리와 결제수단 분포를 확인

---

## 🔧 방법 2: Railway CLI (개발자용)

```bash
# Railway 프로젝트 디렉토리에서
cd /Users/go/Desktop/new/cursor/server

# Railway CLI로 실행
railway run psql -f database/full-migration.sql
```

---

## 🔧 방법 3: psql 직접 실행

```bash
# DATABASE_URL 환경 변수 설정 후
psql $DATABASE_URL -f cursor/server/database/full-migration.sql
```

---

## ✅ 마이그레이션 후 확인사항

1. **회계 소프트웨어 > 거래내역**에서:
   - 카테고리가 "셀마플", "코코마케"로 표시되는지 확인
   - 결제수단이 "계좌이체", "페이팔"로 표시되는지 확인

2. **자동 매칭 설정 버튼** 클릭:
   - "face", "PayPay", "ペイペイ" 규칙이 등록되어 있는지 확인

3. **CSV 업로드 테스트**:
   - 항목명에 "face"가 포함된 CSV 업로드
   - 자동으로 "운영비" 카테고리가 설정되는지 확인

---

## 🆘 문제 발생 시

### 오류: "relation accounting_auto_match_rules already exists"
→ 이미 마이그레이션이 완료되었습니다. 무시하고 계속 진행하세요.

### 오류: "UPDATE 0"
→ 해당 데이터가 없습니다. 정상입니다.

### 기타 오류
→ 스크린샷과 함께 문의 부탁드립니다.

---

## 📝 참고: 변경된 내용

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| 카테고리 | 셀마플 매출 | 셀마플 |
| 카테고리 | 코코마케 매출 | 코코마케 |
| 결제수단 | 현금/은행 | 계좌이체 |
| 결제수단 | Stripe | 페이팔 |

**+ 자동 매칭 시스템 추가**: CSV 업로드 시 키워드 기반 자동 카테고리/담당자 지정

