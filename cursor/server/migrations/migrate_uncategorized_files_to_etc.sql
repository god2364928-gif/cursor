-- 기존 파일 중 새로운 카테고리에 해당하지 않는 파일들을 "기타"로 이동
-- 2026-01-27

-- 새로운 카테고리 목록:
-- 필수 서류: 이력서, 계약서, 인사기록카드, 비밀유지계약서, 녹취파일
-- 일반 서류: 교통비, 진단서, 기타

UPDATE user_files
SET file_category = '기타'
WHERE file_category NOT IN (
  '이력서',
  '계약서', 
  '인사기록카드',
  '비밀유지계약서',
  '녹취파일',
  '교통비',
  '진단서',
  '기타'
);

-- 확인: 변경된 레코드 수 조회
SELECT 
  COUNT(*) as migrated_count,
  '기타로 이동 완료' as status
FROM user_files
WHERE file_category = '기타';

-- 현재 파일 카테고리 분포 확인
SELECT 
  file_category,
  COUNT(*) as file_count
FROM user_files
GROUP BY file_category
ORDER BY file_count DESC;
