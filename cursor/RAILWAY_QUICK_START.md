# 🚀 Railway 배포 빠른 시작 가이드

## 📌 준비물
- Railway 계정 (GitHub 계정으로 로그인 가능)
- Git 저장소 (GitHub)

---

## ⚡ 5단계로 배포하기

### 1️⃣ Railway 프로젝트 생성
```
1. https://railway.app 접속
2. "Start a New Project" 클릭
3. GitHub 로그인
```

### 2️⃣ PostgreSQL 추가
```
1. "New" → "Database" → "PostgreSQL" 선택
2. 자동으로 데이터베이스 생성됨
3. Variables 탭에서 DATABASE_URL 확인
```

### 3️⃣ 백엔드 배포
```
1. "New" → "GitHub Repo" 선택
2. 저장소 선택
3. Settings → "Root Directory" = cursor/server
4. Variables 탭에서 환경 변수 추가:
```

**필수 환경 변수:**
```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<32자 이상 랜덤 문자열>
NODE_ENV=production
PORT=3000
CORS_ORIGIN=<프론트엔드 URL>
```

**JWT_SECRET 생성 방법:**
터미널에서 실행:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4️⃣ 프론트엔드 배포
```
1. "New" → "GitHub Repo" (같은 저장소)
2. Settings → "Root Directory" = cursor/client
3. Variables 탭에서 환경 변수 추가:
```

**필수 환경 변수:**
```env
VITE_API_URL=<백엔드 Railway URL>
```

### 5️⃣ 데이터베이스 초기화
```
1. Railway CLI 설치:
   npm i -g @railway/cli

2. 로그인:
   railway login

3. 프로젝트 연결:
   railway link

4. PostgreSQL 연결:
   railway connect postgres

5. 스키마 실행:
   \i /path/to/cursor/server/database/schema.sql
```

---

## 🔗 URL 확인 및 연결

### 백엔드 URL 확인
```
Railway > 백엔드 서비스 > Settings > Networking
예: https://your-backend.up.railway.app
```

### 프론트엔드 URL 확인
```
Railway > 프론트엔드 서비스 > Settings > Networking
예: https://your-frontend.up.railway.app
```

### CORS 설정 업데이트
```
백엔드 서비스 > Variables > CORS_ORIGIN
값: https://your-frontend.up.railway.app
```

### 프론트엔드 API URL 업데이트
```
프론트엔드 서비스 > Variables > VITE_API_URL
값: https://your-backend.up.railway.app
```

---

## ✅ 배포 완료 체크리스트

- [ ] PostgreSQL 서비스 실행 중
- [ ] 백엔드 서비스 빌드 성공
- [ ] 프론트엔드 서비스 빌드 성공
- [ ] 백엔드 URL 확인 완료
- [ ] 프론트엔드 URL 확인 완료
- [ ] CORS_ORIGIN 설정 완료
- [ ] VITE_API_URL 설정 완료
- [ ] 데이터베이스 스키마 실행 완료
- [ ] 프론트엔드에서 로그인 테스트 성공

---

## 🔍 문제 해결

### 백엔드가 시작되지 않을 때
```
1. Deployments 탭에서 로그 확인
2. 환경 변수 모두 설정되었는지 확인
3. DATABASE_URL이 올바른지 확인
```

### 프론트엔드에서 API 호출 실패
```
1. VITE_API_URL이 올바른 백엔드 URL인지 확인
2. 백엔드 CORS_ORIGIN이 프론트엔드 URL인지 확인
3. 백엔드가 정상 실행 중인지 확인
```

### 데이터베이스 연결 실패
```
1. PostgreSQL 서비스가 실행 중인지 확인
2. DATABASE_URL 환경 변수 확인
3. 백엔드 로그에서 에러 메시지 확인
```

---

## 💰 비용 확인

```
Railway 대시보드 > Usage 탭
- 현재 사용량 확인
- 예상 월 비용 확인
```

**예상 비용:**
- Hobby Plan: $5/월
- 소규모 팀: $20-50/월

---

## 📚 다음 단계

1. **커스텀 도메인 연결** (선택사항)
   - Settings > Domains > Custom Domain

2. **환경 분리** (개발/운영)
   - 개발용 프로젝트 별도 생성 권장

3. **모니터링 설정**
   - Railway 대시보드에서 로그 확인
   - 알림 설정

4. **백업 설정**
   - PostgreSQL 정기 백업 설정

---

## 🆘 도움이 필요하신가요?

- [Railway 공식 문서](https://docs.railway.app/)
- [Railway Discord](https://discord.gg/railway)
- 상세 가이드: `RAILWAY_DEPLOYMENT_GUIDE.md` 참고

