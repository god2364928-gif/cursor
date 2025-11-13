# Railway 배포 문제 - 최신 코드 미반영

## 🔴 문제 상황
- SQL 오류 수정 완료 (AND 중복 제거)
- 데이터베이스에서 직접 쿼리 실행 시 회신수 정상 반환: 1건, 1건, 3건
- 하지만 Railway API는 계속 0을 반환
- **Railway가 최신 코드를 배포하지 않고 있음**

## ✅ 수행한 조치
1. SQL 오류 수정 (commit: 129fe871)
2. nixpacks.toml에 캐시 무효화 추가 (commit: 69d4c9f9)
3. index.ts에 타임스탬프 추가 (commit: 7a255605)
4. 총 4번의 강제 재배포 시도

## 🎯 근본 원인
Railway의 빌드 캐시 또는 배포 트리거 설정 문제
- Railway가 GitHub push를 감지하지 못하거나
- 빌드 캐시를 무시하지 않거나
- Watch Paths 설정이 잘못되어 있을 가능성

## 💡 해결 방법

### 즉시 적용 가능한 방법:
Railway 대시보드에서 **수동 Redeploy** 실행

1. https://railway.app/project/28ebe688-21a7-4553-8a8f-7f4a6d9bb190/deployments 접속
2. 최신 배포 선택
3. 우측 상단 "..." 메뉴 클릭
4. **"Redeploy"** 클릭
5. 2-3분 기다린 후 테스트

### 장기적인 해결 방법:
1. Railway Project Settings → Service → Watch Paths 확인
   - `cursor/server/**` 가 포함되어 있는지 확인
2. Build Command 확인: `npm ci && npm run build`
3. 필요시 "Clear Build Cache" 옵션 활성화

## 📊 검증 완료된 SQL 쿼리
데이터베이스에서 직접 실행 시 정상 동작 확인:

```sql
SELECT 
  d.day AS date,
  COALESCE(SUM(a.reply_count),0) AS reply_count
FROM days d
LEFT JOIN agg a ON a.st_day = d.day
WHERE st.status LIKE '%返信%' AND st.status NOT LIKE '未返信%'
```

결과:
- 2025-11-13: reply_count = 1
- 2025-11-12: reply_count = 1  
- 2025-11-11: reply_count = 3

## 🔧 Git 커밋 이력
```
7a255605 [Deploy] Railway 강제 재배포 #4 - index.ts 타임스탬프
3a9e6820 [Deploy] Railway 강제 재배포 #3 - 타임스탬프 추가
69d4c9f9 [Deploy] Railway 완전 재빌드 강제 - 캐시 무효화
c29ec088 [Deploy] Railway 강제 재배포 트리거 - 회신수 SQL 수정 반영
129fe871 [Fix] 영업 통계 SQL 오류 수정 - AND 중복 제거
```

모든 코드 수정은 완료되었으나, Railway가 배포를 하지 않아 반영되지 않고 있습니다.

