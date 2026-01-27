#!/bin/bash

echo "📂 기존 파일을 '기타' 카테고리로 이동..."
echo ""
echo "새로운 카테고리에 해당하지 않는 기존 파일들을 '기타'로 이동합니다."
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

psql "$DATABASE_URL" -f migrations/migrate_uncategorized_files_to_etc.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 파일 카테고리 마이그레이션이 성공적으로 완료되었습니다!"
  echo ""
  echo "변경된 내용:"
  echo "  - 기존 카테고리가 아닌 파일들이 '기타'로 이동되었습니다"
  echo "  - 이제 직원 상세 페이지에서 카테고리별로 파일을 확인할 수 있습니다"
  echo ""
else
  echo ""
  echo "❌ 마이그레이션 실행 중 오류가 발생했습니다."
  exit 1
fi
