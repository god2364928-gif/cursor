# Railway 배포 가이드

## 🚀 Railway 배포 단계별 가이드

### 1단계: Railway 계정 생성 및 로그인
1. [Railway.app](https://railway.app) 접속
2. "Start a New Project" 클릭
3. GitHub 계정으로 로그인 (권장)

---

### 2단계: PostgreSQL 데이터베이스 추가

1. Railway 대시보드에서 **"New"** 클릭
2. **"Database" → "PostgreSQL"** 선택
3. 데이터베이스가 생성되면 **"Variables"** 탭에서 연결 정보 확인:
   - `DATABASE_URL` (전체 연결 문자열)
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

---

### 3단계: 백엔드 서버 배포

#### 3-1. GitHub 저장소 연결
1. Railway 프로젝트에서 **"New" → "GitHub Repo"** 클릭
2. 저장소 선택 후 **"Deploy Now"** 클릭
3. **Root Directory**를 `/cursor/server`로 설정

#### 3-2. 환경 변수 설정
Railway 대시보드 > 백엔드 서비스 > **"Variables"** 탭에서 다음을 추가:

```env
# 데이터베이스 연결 (PostgreSQL 서비스에서 자동으로 연결됨)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# 또는 개별 설정
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}

# JWT 비밀키 (안전한 랜덤 문자열로 변경)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars

# 서버 설정
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-url.up.railway.app

# Freee API (있는 경우)
FREEE_CLIENT_ID=your_freee_client_id
FREEE_CLIENT_SECRET=your_freee_client_secret
FREEE_REDIRECT_URI=https://your-backend-url.up.railway.app/api/freee/callback

# Slack Webhook (있는 경우)
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Google API (있는 경우)
GOOGLE_API_KEY=your_google_api_key
```

#### 3-3. 빌드 설정 확인
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

---

### 4단계: 프론트엔드 배포

#### 4-1. GitHub 저장소 연결
1. Railway 프로젝트에서 **"New" → "GitHub Repo"** 클릭
2. 같은 저장소 선택
3. **Root Directory**를 `/cursor/client`로 설정

#### 4-2. 환경 변수 설정
```env
# 백엔드 API URL (백엔드 서비스의 Railway URL로 변경)
VITE_API_URL=https://your-backend-url.up.railway.app
```

#### 4-3. 빌드 설정
Railway는 자동으로 감지하지만, 확인:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npx serve -s dist -l $PORT`

#### 4-4. serve 패키지 추가
`cursor/client/package.json`에 `serve` 추가가 필요할 수 있습니다:
```json
"dependencies": {
  "serve": "^14.2.0"
}
```

---

### 5단계: 데이터베이스 초기화

#### 5-1. 스키마 생성
Railway PostgreSQL에 연결하여 스키마 실행:

**방법 1: Railway CLI 사용**
```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 프로젝트 연결
railway link

# PostgreSQL 서비스에 연결
railway connect postgres

# SQL 파일 실행
\i /path/to/cursor/server/database/schema.sql
```

**방법 2: 웹 인터페이스 사용**
1. Railway > PostgreSQL 서비스 > **"Data"** 탭
2. SQL 쿼리 창에 `cursor/server/database/schema.sql` 내용 복사
3. 실행

---

### 6단계: 도메인 설정

#### 6-1. Railway 도메인
- 각 서비스는 자동으로 `*.up.railway.app` 도메인 할당
- Settings > Networking에서 확인 가능

#### 6-2. 커스텀 도메인 (선택사항)
1. 서비스 선택 > **"Settings" → "Domains"**
2. **"Custom Domain"** 추가
3. DNS 설정에서 CNAME 레코드 추가

---

### 7단계: CORS 설정 업데이트

백엔드 환경 변수에서 `CORS_ORIGIN`을 프론트엔드 Railway URL로 업데이트:
```env
CORS_ORIGIN=https://your-frontend-name.up.railway.app
```

---

## 📊 배포 후 확인 사항

### ✅ 체크리스트
- [ ] 백엔드 서비스가 정상 실행 중
- [ ] 프론트엔드 서비스가 정상 실행 중
- [ ] PostgreSQL 연결 성공
- [ ] 프론트엔드에서 백엔드 API 호출 성공
- [ ] 로그인 기능 테스트
- [ ] 환경 변수 모두 설정 완료

### 🔍 로그 확인
Railway 대시보드 > 서비스 선택 > **"Deployments"** 탭에서:
- Build Logs: 빌드 과정 확인
- Deploy Logs: 실행 로그 확인

---

## 💰 비용 모니터링

Railway 대시보드 > **"Usage"** 탭에서 확인:
- 현재 사용량
- 예상 월 비용
- 리소스 사용 내역

**비용 절감 팁:**
- 개발 환경은 필요시에만 실행
- 로그 보존 기간 조정
- 불필요한 서비스 중지

---

## 🔧 트러블슈팅

### 문제: 백엔드가 시작되지 않음
**해결:**
1. Deployment Logs 확인
2. `package.json`의 `start` 스크립트 확인
3. 환경 변수가 모두 설정되었는지 확인

### 문제: 프론트엔드에서 API 호출 실패
**해결:**
1. `VITE_API_URL` 환경 변수 확인
2. 백엔드 `CORS_ORIGIN` 설정 확인
3. 백엔드 서비스가 실행 중인지 확인

### 문제: 데이터베이스 연결 실패
**해결:**
1. `DATABASE_URL` 환경 변수 확인
2. PostgreSQL 서비스가 실행 중인지 확인
3. 연결 문자열 형식 확인

---

## 📚 추가 리소스

- [Railway 공식 문서](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app/)

---

## 🔐 보안 체크리스트

- [ ] `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] 모든 비밀 정보가 Railway 환경 변수에만 저장됨
- [ ] JWT_SECRET이 강력한 랜덤 문자열로 설정됨
- [ ] 데이터베이스 정기 백업 설정
- [ ] CORS 설정이 올바른 도메인만 허용
- [ ] HTTPS가 자동으로 활성화되었는지 확인

