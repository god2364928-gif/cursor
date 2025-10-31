# CRM 시스템 설치 및 실행 가이드

## 사전 요구사항

- Node.js 18 이상
- PostgreSQL 14 이상
- npm 또는 yarn

## 1. 데이터베이스 설정

### PostgreSQL 설치 및 데이터베이스 생성

```bash
# PostgreSQL에 접속
psql -U postgres

# 데이터베이스 생성
CREATE DATABASE crm_db;

# 사용자 생성 (선택사항)
CREATE USER crm_user WITH PASSWORD 'crm_password';
GRANT ALL PRIVILEGES ON DATABASE crm_db TO crm_user;
```

### 스키마 생성

```bash
cd server/database
psql -U postgres -d crm_db -f schema.sql
psql -U postgres -d crm_db -f seed.sql
```

## 2. 서버 설정

```bash
cd server
npm install

# .env 파일 수정
# DATABASE_URL에 실제 PostgreSQL 정보 입력

# 개발 모드 실행
npm run dev
```

서버는 `http://localhost:5000`에서 실행됩니다.

## 3. 클라이언트 설정

```bash
cd client
npm install

# 개발 모드 실행
npm run dev
```

클라이언트는 `http://localhost:3000`에서 실행됩니다.

## 4. 전체 시스템 실행

루트 디렉토리에서:

```bash
npm install
npm run dev
```

이 명령어는 클라이언트와 서버를 동시에 실행합니다.

## 5. 로그인

기본 계정:
- Email: hong@example.com
- Password: password123

## 문제 해결

### 데이터베이스 연결 오류
- `.env` 파일의 `DATABASE_URL` 확인
- PostgreSQL 서비스 실행 확인
- 데이터베이스 및 사용자 권한 확인

### 포트 충돌
- 클라이언트: `client/vite.config.ts`에서 포트 변경
- 서버: `server/.env`에서 PORT 변경

## 프로덕션 빌드

```bash
# 클라이언트 빌드
cd client
npm run build

# 서버 빌드
cd server
npm run build
npm start
```

## 데이터베이스 마이그레이션

추후 스키마 변경이 필요할 경우:

```bash
cd server
npm run migrate up
```


