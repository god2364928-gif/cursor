# Railway 프로덕션 데이터베이스 CSV 데이터 임포트 가이드

## 문제
테이블은 생성되었지만 데이터가 없습니다. CSV 데이터를 Railway 프로덕션 데이터베이스에 임포트해야 합니다.

## 해결 방법

### 방법 1: Railway CLI 사용 (권장)

1. Railway CLI가 설치되어 있는지 확인:
```bash
which railway
```

2. Railway에 로그인 (브라우저 인증 필요):
```bash
railway login
```

3. 프로젝트 연결:
```bash
cd cursor/server
railway link
```

4. CSV 데이터 임포트 실행:
```bash
railway run npm run import:railway
```

### 방법 2: 환경 변수 설정 후 로컬에서 실행

1. Railway 대시보드에서 DATABASE_URL 복사:
   - Railway 프로젝트 → Postgres 서비스 → Variables 탭
   - `DATABASE_URL` 값 복사

2. 로컬에서 환경 변수 설정 후 실행:
```bash
cd cursor/server
export DATABASE_URL="postgresql://..."  # Railway에서 복사한 URL
npm run import:railway
```

또는 `.env` 파일에 추가:
```bash
DATABASE_URL=postgresql://...  # Railway에서 복사한 URL
npm run import:railway
```

### 방법 3: Railway 웹 대시보드에서 직접 실행

Railway CLI가 작동하지 않는 경우, Railway의 서비스에서 직접 스크립트를 실행할 수 있습니다:

1. Railway 대시보드 → cursor 서비스 → Settings 탭
2. "Deploy Command" 또는 "Build Command" 확인
3. 또는 "Shell" 기능을 사용하여 직접 실행

## 확인

임포트 후 Railway 로그에서 다음 메시지를 확인할 수 있습니다:
```
=== Import Summary ===
Total records in CSV: 21212
Successfully inserted: 21194
Skipped: 18
Errors: 0

✅ Total records in sales_tracking table: 21194
```

## 주의사항

- 이 스크립트는 기존 데이터가 있으면 스킵합니다 (중복 방지)
- 프로덕션 데이터베이스에 직접 작업하므로 주의하세요
- CSV 파일 경로가 올바른지 확인하세요
