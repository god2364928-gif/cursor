#!/bin/bash

# 배포 검증 스크립트
# Railway 배포 후 주요 기능이 제대로 작동하는지 확인

set -e

API_URL="https://cursor-production-1d92.up.railway.app"
FRONTEND_URL="https://www.hotseller-crm.com"

echo "🔍 배포 검증 시작..."
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# 색상 코드
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Health Check
echo "1️⃣ Health Check 테스트..."
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "ok"; then
  echo -e "${GREEN}✅ Health Check 성공${NC}"
else
  echo -e "${RED}❌ Health Check 실패 (HTTP $HTTP_CODE)${NC}"
  echo "응답: $BODY"
  exit 1
fi

# 2. Database Connection Test
echo ""
echo "2️⃣ 데이터베이스 연결 테스트..."
DB_RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/api/test/customers")
HTTP_CODE=$(echo "$DB_RESPONSE" | tail -n1)
BODY=$(echo "$DB_RESPONSE" | head -n1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q "count"; then
  CUSTOMER_COUNT=$(echo "$BODY" | grep -oP '"count":\s*"\K\d+')
  echo -e "${GREEN}✅ 데이터베이스 연결 성공 (고객 수: $CUSTOMER_COUNT)${NC}"
else
  echo -e "${RED}❌ 데이터베이스 연결 실패 (HTTP $HTTP_CODE)${NC}"
  echo "응답: $BODY"
  exit 1
fi

# 3. Frontend Accessibility
echo ""
echo "3️⃣ 프론트엔드 접근성 테스트..."
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL")
HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ 프론트엔드 접근 가능${NC}"
else
  echo -e "${RED}❌ 프론트엔드 접근 실패 (HTTP $HTTP_CODE)${NC}"
  exit 1
fi

# 4. Git 최신 커밋 확인
echo ""
echo "4️⃣ 최신 배포 정보..."
echo "로컬 최신 커밋:"
git log --oneline -1

echo ""
echo "GitHub 원격 최신 커밋:"
git log --oneline origin/main -1

# 5. 최종 요약
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 모든 자동 검증 통과${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 수동 검증 체크리스트:"
echo ""
echo "[ ] 1. 회신수 집계"
echo "    → 영업이력 페이지 → 일별 통계 버튼"
echo "    → 2025년 11월 선택"
echo "    → 회신수/회신률 표시 확인"
echo ""
echo "[ ] 2. 리타겟팅 진행률"
echo "    → 대시보드 '나의 목표' 진행률"
echo "    → 리타겟팅 페이지 총 건수"
echo "    → 두 숫자가 일치하는지 확인"
echo ""
echo "[ ] 3. 기타 변경된 기능"
echo "    → (변경사항에 따라 추가)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}⚠️  수동 검증을 완료한 후 배포를 최종 확인하세요${NC}"
echo ""

