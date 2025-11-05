# Railway 프로덕션 데이터베이스 마이그레이션 가이드

## 문제
`sales_tracking` 테이블이 Railway 프로덕션 데이터베이스에 존재하지 않아 500 에러가 발생합니다.

## 해결 방법

### 방법 1: Railway CLI 사용 (권장)

1. Railway CLI 설치 (아직 설치하지 않은 경우):
```bash
npm install -g @railway/cli
```

2. Railway에 로그인:
```bash
railway login
```

3. 프로젝트 연결:
```bash
cd cursor/server
railway link
```

4. 마이그레이션 실행:
```bash
railway run npm run migrate:railway
```

### 방법 2: 환경 변수 설정 후 로컬에서 실행

1. Railway 대시보드에서 DATABASE_URL 복사:
   - Railway 프로젝트 → Postgres 서비스 → Variables 탭
   - `DATABASE_URL` 값 복사

2. 로컬에서 환경 변수 설정 후 실행:
```bash
cd cursor/server
export DATABASE_URL="postgresql://..."  # Railway에서 복사한 URL
npm run migrate:railway
```

또는 `.env` 파일에 추가:
```bash
DATABASE_URL=postgresql://...  # Railway에서 복사한 URL
```

### 방법 3: Railway 웹 대시보드에서 직접 SQL 실행

1. Railway 대시보드 → Postgres 서비스 → Data 탭
2. Query Editor 열기
3. `cursor/server/database/add-sales-tracking.sql` 파일의 내용을 복사하여 실행

## 마이그레이션 확인

마이그레이션 후 다음 쿼리로 확인:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'sales_tracking'
);
```

`true`가 반환되면 성공입니다.

## 주의사항

- 프로덕션 데이터베이스에 직접 작업하므로 주의하세요.
- 마이그레이션은 한 번만 실행하면 됩니다 (테이블이 이미 존재하면 에러가 발생하지만 무시해도 됩니다).
