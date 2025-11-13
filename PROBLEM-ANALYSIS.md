# 문제 분석 및 해결 - 회신수 표시 오류

## 🔴 문제의 근본 원인

### TypeScript 빌드 누락
- **문제**: TypeScript 소스 파일(`.ts`)만 수정하고 빌드를 하지 않음
- **영향**: Railway는 `dist/` 폴더의 JavaScript 파일을 실행하는데, 오래된 빌드 파일이 계속 사용됨
- **결과**: 소스 코드는 수정되었지만, 실제 실행되는 코드는 변경되지 않음

### 잘못된 진단
- Railway 배포 문제로 오인
- 6번의 불필요한 재배포 시도
- dist 폴더가 Git에서 추적되지 않음 (또는 빌드되지 않음)

## ✅ 올바른 해결 방법

1. **로컬에서 빌드 실행**
   ```bash
   cd cursor/server
   npm run build
   ```

2. **빌드된 파일 커밋**
   ```bash
   git add dist/
   git commit -m "Build: compiled TypeScript to JavaScript"
   git push origin main
   ```

3. **Railway 자동 배포**
   - Railway가 변경사항 감지
   - 자동으로 재배포

## 🛠️ 재발 방지 대책

### 1. Git Pre-Push Hook (자동 빌드)
푸시 전에 자동으로 빌드하여 항상 최신 빌드가 커밋되도록 함

### 2. GitHub Actions (자동 빌드 및 배포)
- PR/Push 시 자동으로 빌드
- 빌드 실패 시 배포 차단
- Railway/Vercel 자동 배포

### 3. 빌드 검증
- 배포 전 dist 폴더 내용 확인
- TypeScript 컴파일 에러 체크

## 📊 수정된 SQL 코드

### 월별/일별 통계 - reply_count
```sql
COUNT(*) FILTER (
  WHERE st.status LIKE '%返信%'
    AND st.status NOT LIKE '未返信%'
) as reply_count
```

이 쿼리는 다음을 집계합니다:
- ✅ 返信済み (회신 완료)
- ✅ 返信あり (회신 있음)
- ❌ 未返信 (미회신) - 제외

## 🎯 검증 완료

### 데이터베이스 직접 확인
```sql
SELECT date, COUNT(*) FROM sales_tracking 
WHERE status LIKE '%返信%' AND status NOT LIKE '未返信%'
GROUP BY date;
```

결과:
- 2025-11-13: 1건
- 2025-11-12: 1건
- 2025-11-11: 3건

### 화면 확인
- 일별 통계에서 정상 표시
- 회신율도 정확하게 계산됨

## 📝 교훈

1. **항상 TypeScript를 빌드해야 함**
   - `.ts` 파일 수정 후 반드시 `npm run build`
   
2. **빌드 파일 확인**
   - `dist/` 폴더의 `.js` 파일이 실제 실행 코드
   
3. **문제 진단 순서**
   - ① 로컬 빌드 확인
   - ② dist 폴더 내용 확인
   - ③ 배포된 코드 확인
   - ④ Railway/Vercel 문제 확인

## 🚀 다음 단계

1. Git hooks 설정으로 자동 빌드
2. GitHub Actions로 CI/CD 파이프라인 구축
3. 배포 프로세스 완전 자동화

