#!/bin/bash

# Railway 배포 검증 스크립트

echo "🔍 Railway 배포 검증 시작..."
echo ""

# Health Check
echo "1️⃣ Health Check 테스트..."
HEALTH_RESPONSE=$(curl -s https://cursor-production-1d92.up.railway.app/api/health)
echo "응답: $HEALTH_RESPONSE"
echo ""

# Account Optimization API 테스트 (인증 없이는 401 에러가 정상)
echo "2️⃣ Account Optimization API 엔드포인트 테스트..."
API_RESPONSE=$(curl -s -w "\nHTTP Status: %{http_code}" https://cursor-production-1d92.up.railway.app/api/account-optimization?id=test 2>&1 | head -5)
echo "응답: $API_RESPONSE"
echo ""

echo "3️⃣ Railway 로그 확인 방법:"
echo "   - Railway Dashboard > Backend Service > Deployments"
echo "   - 최신 배포 클릭 > 'View Logs'"
echo "   - 다음 로그를 찾으세요:"
echo "     [AccountOptimization] Request received: ..."
echo "     [AccountOptimization] Using endpoint: ..."
echo ""

echo "4️⃣ 웹사이트 테스트:"
echo "   - https://www.hotseller-crm.com 접속"
echo "   - 로그인 > 설정 > 계정 최적화 조회"
echo "   - 인스타그램 ID: gono_92"
echo "   - 분석하기 버튼 클릭"
echo ""

echo "✅ 검증 완료!"
echo ""
echo "📋 다음 단계:"
echo "   1. Railway에서 환경 변수 ACCOUNT_OPTIMIZATION_API_KEY 추가"
echo "   2. 배포 완료 대기 (2-3분)"
echo "   3. 웹사이트에서 테스트"
echo ""

