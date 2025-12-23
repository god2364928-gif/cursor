# 🚀 Railway 배포 시작하기

## ✅ 준비 완료!

모든 배포 설정 파일이 준비되었고 GitHub에 푸시되었습니다!

---

## 📝 다음 단계 (5분 소요)

### 1️⃣ Railway 접속 및 로그인
```
1. 브라우저에서 https://railway.app 열기
2. "Start a New Project" 클릭
3. "Login with GitHub" 클릭하여 GitHub 계정으로 로그인
```

### 2️⃣ PostgreSQL 데이터베이스 추가
```
1. "New" 버튼 클릭
2. "Database" 선택
3. "Add PostgreSQL" 클릭
4. 자동으로 데이터베이스 생성됨 (약 30초 소요)
```

### 3️⃣ 백엔드 서버 배포
```
1. "New" 버튼 클릭
2. "GitHub Repo" 선택
3. 저장소 목록에서 "cursor" 저장소 선택
4. "Deploy Now" 클릭
```

**중요! Root Directory 설정:**
```
1. 배포된 서비스 클릭
2. "Settings" 탭 클릭
3. "Root Directory" 찾기
4. 값을 "cursor/server"로 입력
5. 자동으로 재배포됨
```

**환경 변수 설정:**
```
1. "Variables" 탭 클릭
2. "New Variable" 클릭하여 아래 변수들 추가:
```

**필수 환경 변수 (복사해서 사용):**
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
PORT=3000
```

**JWT_SECRET 생성:**
```
터미널에서 실행:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

나온 값을 복사하여 Railway에 추가:
JWT_SECRET=<복사한_값>
```

**CORS_ORIGIN (나중에 업데이트):**
```
CORS_ORIGIN=https://임시값.com
(프론트엔드 배포 후 실제 URL로 변경)
```

### 4️⃣ 프론트엔드 배포
```
1. "New" 버튼 클릭
2. "GitHub Repo" 선택
3. 같은 "cursor" 저장소 선택
4. "Deploy Now" 클릭
```

**Root Directory 설정:**
```
1. 배포된 서비스 클릭
2. "Settings" 탭 클릭
3. "Root Directory"를 "cursor/client"로 입력
4. 자동으로 재배포됨
```

**환경 변수 설정:**
```
1. "Variables" 탭 클릭
2. 백엔드 서비스의 URL 복사 필요:
   - 백엔드 서비스 > Settings > Networking
   - "Public Networking" 아래 URL 복사
   
3. 프론트엔드 서비스로 돌아와서:
   VITE_API_URL=<복사한_백엔드_URL>
```

### 5️⃣ CORS 설정 업데이트
```
1. 프론트엔드 URL 복사:
   - 프론트엔드 서비스 > Settings > Networking
   - URL 복사
   
2. 백엔드 서비스로 이동:
   - Variables 탭
   - CORS_ORIGIN 값을 프론트엔드 URL로 변경
   - 자동으로 재배포됨
```

### 6️⃣ 데이터베이스 초기화
```
터미널에서 실행:

# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 프로젝트 연결 (Railway 웹에서 프로젝트 선택)
railway link

# PostgreSQL 연결
railway connect postgres

# 연결되면 psql 프롬프트에서:
\i /Users/go/Desktop/new/cursor/server/database/schema.sql

# 추가 마이그레이션
\i /Users/go/Desktop/new/cursor/server/migrations/create_meeting_tables.sql
\i /Users/go/Desktop/new/cursor/server/migrations/upgrade_meeting_tables.sql

# 종료
\q
```

---

## ✅ 배포 완료 확인

### 1. 프론트엔드 접속
```
프론트엔드 URL (예: https://xxx.up.railway.app) 접속
→ 로그인 페이지가 표시되어야 함
```

### 2. 테스트 계정 생성
```
터미널에서:
cd /Users/go/Desktop/new/cursor/server
railway run node create-test-account.js
```

### 3. 로그인 테스트
```
생성된 계정으로 로그인
→ 대시보드가 정상 표시되어야 함
```

---

## 📊 URL 정보

배포 완료 후 아래 정보를 기록하세요:

```
프론트엔드 URL: _______________________
백엔드 URL: _______________________
PostgreSQL Host: _______________________
배포 날짜: _______________________
```

---

## 🔍 문제 해결

### 백엔드가 시작되지 않을 때
```
1. Railway > 백엔드 서비스 > Deployments 탭
2. 최신 배포 클릭 > "View Logs"
3. 에러 메시지 확인
4. 주로 환경 변수 누락이 원인
```

### 프론트엔드에서 API 호출 실패
```
1. VITE_API_URL이 올바른지 확인
2. 백엔드 CORS_ORIGIN이 프론트엔드 URL인지 확인
3. 백엔드가 정상 실행 중인지 확인
```

### 데이터베이스 연결 실패
```
1. PostgreSQL 서비스가 실행 중인지 확인
2. DATABASE_URL 환경 변수 확인
3. 백엔드 로그에서 연결 에러 확인
```

---

## 💰 비용 안내

### Railway 요금제
- **Trial**: $5 크레딧 제공 (첫 사용)
- **Hobby**: $5/월 (개발/테스트용)
- **Pro**: 사용량 기반 ($0.000231/GB-hour)

### 예상 비용
- 소규모 팀 (3명): 월 $20-50
- 24시간 운영 기준

### 비용 확인
```
Railway 대시보드 > Usage 탭
- 현재 사용량 실시간 확인
- 예상 월 비용 확인
```

---

## 📚 추가 문서

프로젝트 루트에 상세 가이드가 있습니다:

1. **RAILWAY_QUICK_START.md** - 빠른 시작 가이드
2. **RAILWAY_DEPLOYMENT_GUIDE.md** - 상세 배포 가이드
3. **DEPLOYMENT_CHECKLIST.md** - 배포 체크리스트

---

## 🆘 도움이 필요하신가요?

- Railway 공식 문서: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app/

---

## 🎉 배포 성공!

모든 단계를 완료하셨다면 축하합니다!
이제 팀원들과 함께 CRM 시스템을 사용하실 수 있습니다.

**다음 단계:**
1. 팀원 계정 생성
2. 초기 데이터 입력
3. 사용자 교육
4. 피드백 수집

**보안 체크:**
- [ ] JWT_SECRET이 안전한 랜덤 문자열인지 확인
- [ ] .env 파일이 Git에 커밋되지 않았는지 확인
- [ ] 데이터베이스 백업 계획 수립
- [ ] 정기적인 모니터링 설정

