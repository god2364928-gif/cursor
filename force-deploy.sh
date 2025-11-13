#!/bin/bash

# Railway 강제 재배포 스크립트
# 사용법: ./force-deploy.sh "재배포 사유"

set -e

REASON=${1:-"Manual redeploy"}
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "🚀 Railway 강제 재배포 시작..."
echo "사유: $REASON"
echo "시간: $TIMESTAMP"
echo ""

# 1. 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️  경고: 현재 브랜치가 main이 아닙니다 ($CURRENT_BRANCH)"
  read -p "계속하시겠습니까? (y/N): " confirm
  if [ "$confirm" != "y" ]; then
    echo "❌ 취소되었습니다"
    exit 1
  fi
fi

# 2. 변경사항 확인
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠️  경고: 커밋되지 않은 변경사항이 있습니다"
  git status --short
  read -p "계속하시겠습니까? (y/N): " confirm
  if [ "$confirm" != "y" ]; then
    echo "❌ 취소되었습니다"
    exit 1
  fi
fi

# 3. 원격 저장소 최신화
echo "📥 원격 저장소에서 최신 코드 가져오기..."
git fetch origin

# 4. 서버 코드에 타임스탬프 추가
echo "📝 서버 코드 업데이트..."
echo "// Deploy: $TIMESTAMP - $REASON" >> cursor/server/src/index.ts

# 5. 커밋
echo "💾 변경사항 커밋..."
git add cursor/server/src/index.ts
git commit -m "[Deploy] Railway 강제 재배포 - $REASON"

# 6. 푸시
echo "📤 GitHub에 푸시..."
git push origin main

echo ""
echo "✅ 푸시 완료!"
echo ""
echo "📊 다음 단계:"
echo "1. Railway 대시보드 확인: https://railway.app"
echo "2. 빌드 로그 모니터링 (약 3-5분 소요)"
echo "3. 배포 완료 후 검증:"
echo "   - Health Check: curl https://cursor-production-1d92.up.railway.app/api/health"
echo "   - 웹사이트 테스트: https://www.hotseller-crm.com"
echo ""
echo "🔍 배포 검증 스크립트 실행:"
echo "   ./verify-deployment.sh"
echo ""

