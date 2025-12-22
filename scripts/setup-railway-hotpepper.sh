#!/bin/bash

# Railway HotPepper 환경 변수 설정 스크립트

echo "🚀 Railway HotPepper 환경 변수 설정 시작..."
echo ""

# Railway 로그인 확인
if ! railway whoami &> /dev/null; then
  echo "⚠️  Railway 로그인이 필요합니다."
  echo ""
  echo "다음 명령어를 실행하여 로그인하세요:"
  echo "  railway login"
  echo ""
  echo "로그인 후 이 스크립트를 다시 실행하세요."
  exit 1
fi

echo "✅ Railway 로그인 확인됨"
echo ""

# 프로젝트 연결 확인
cd "$(dirname "$0")/cursor/server" || exit 1

if [ ! -f "railway.json" ]; then
  echo "❌ railway.json 파일을 찾을 수 없습니다."
  exit 1
fi

echo "📝 환경 변수 추가 중..."

# HOTPEPPER_API_KEY 설정
railway variables --set HOTPEPPER_API_KEY=ea23188c08fd9123

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ HOTPEPPER_API_KEY 환경 변수가 추가되었습니다!"
  echo ""
  echo "🔄 Railway가 자동으로 재배포를 시작합니다 (약 2-3분 소요)"
  echo ""
  echo "배포 상태 확인:"
  echo "  https://railway.app"
  echo ""
else
  echo ""
  echo "❌ 환경 변수 추가에 실패했습니다."
  echo ""
  echo "수동으로 추가하세요:"
  echo "1. https://railway.app 접속"
  echo "2. 프로젝트 선택"
  echo "3. 서버 서비스 클릭"
  echo "4. Variables 탭 클릭"
  echo "5. New Variable 클릭"
  echo "6. Name: HOTPEPPER_API_KEY"
  echo "7. Value: ea23188c08fd9123"
  echo "8. Add 버튼 클릭"
  echo ""
  exit 1
fi






