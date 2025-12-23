# 🚀 Railway 배포 체크리스트

## 📋 배포 전 준비

### 1. 코드 준비
- [ ] 모든 변경사항 커밋 완료
- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는지 확인
- [ ] `package.json`의 `scripts`가 올바른지 확인
  - [ ] 백엔드: `"start": "node dist/index.js"`
  - [ ] 백엔드: `"build": "tsc"`
  - [ ] 프론트엔드: `"build": "tsc && vite build"`
- [ ] GitHub에 푸시 완료

### 2. Railway 계정
- [ ] Railway 계정 생성 (https://railway.app)
- [ ] GitHub 계정 연결
- [ ] 결제 정보 등록 (Trial Credit 사용 가능)

---

## 🗄️ 데이터베이스 설정

### PostgreSQL 서비스
- [ ] Railway에서 PostgreSQL 추가
- [ ] `DATABASE_URL` 환경 변수 자동 생성 확인
- [ ] 연결 정보 확인:
  - [ ] PGHOST
  - [ ] PGPORT
  - [ ] PGUSER
  - [ ] PGPASSWORD
  - [ ] PGDATABASE

---

## 🔧 백엔드 배포

### GitHub 연결
- [ ] Railway에서 "New" → "GitHub Repo" 선택
- [ ] 저장소 선택
- [ ] Root Directory 설정: `cursor/server`

### 환경 변수 설정
- [ ] `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- [ ] `JWT_SECRET=<32자 이상 랜덤 문자열>`
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `CORS_ORIGIN=<프론트엔드 URL>` (나중에 업데이트)

### 선택적 환경 변수
- [ ] `FREEE_CLIENT_ID` (Freee API 사용 시)
- [ ] `FREEE_CLIENT_SECRET` (Freee API 사용 시)
- [ ] `FREEE_REDIRECT_URI` (Freee API 사용 시)
- [ ] `SLACK_WEBHOOK_URL` (Slack 알림 사용 시)
- [ ] `GOOGLE_API_KEY` (Google API 사용 시)

### 빌드 확인
- [ ] 빌드 로그에서 에러 없는지 확인
- [ ] 배포 완료 확인
- [ ] 백엔드 URL 복사 (예: `https://xxx.up.railway.app`)

---

## 🎨 프론트엔드 배포

### GitHub 연결
- [ ] Railway에서 "New" → "GitHub Repo" 선택
- [ ] 같은 저장소 선택
- [ ] Root Directory 설정: `cursor/client`

### 환경 변수 설정
- [ ] `VITE_API_URL=<백엔드 Railway URL>`

### 빌드 확인
- [ ] 빌드 로그에서 에러 없는지 확인
- [ ] 배포 완료 확인
- [ ] 프론트엔드 URL 복사 (예: `https://yyy.up.railway.app`)

---

## 🔗 URL 연결 및 CORS 설정

### CORS 업데이트
- [ ] 백엔드 서비스 > Variables
- [ ] `CORS_ORIGIN` 값을 프론트엔드 URL로 변경
- [ ] 재배포 확인

### API URL 확인
- [ ] 프론트엔드 서비스 > Variables
- [ ] `VITE_API_URL`이 백엔드 URL인지 확인
- [ ] 재배포 확인

---

## 💾 데이터베이스 초기화

### Railway CLI 설치
```bash
npm i -g @railway/cli
```

### 데이터베이스 스키마 적용
```bash
# 로그인
railway login

# 프로젝트 연결
railway link

# PostgreSQL 연결
railway connect postgres

# 스키마 실행
\i /path/to/cursor/server/database/schema.sql

# 추가 마이그레이션 (필요시)
\i /path/to/cursor/server/migrations/create_meeting_tables.sql
\i /path/to/cursor/server/migrations/upgrade_meeting_tables.sql
```

- [ ] 스키마 실행 완료
- [ ] 테이블 생성 확인
- [ ] 초기 데이터 입력 (필요시)

---

## ✅ 배포 후 테스트

### 기본 기능 테스트
- [ ] 프론트엔드 URL 접속 확인
- [ ] 로그인 페이지 표시 확인
- [ ] 로그인 기능 테스트
  - 테스트 계정 생성 필요 시:
  ```bash
  railway run node create-test-account.js
  ```
- [ ] 대시보드 로딩 확인
- [ ] API 호출 정상 작동 확인

### 주요 기능 테스트
- [ ] 고객 관리 페이지 접속
- [ ] 리타겟팅 페이지 접속
- [ ] 실적 관리 페이지 접속
- [ ] 영업 이력 페이지 접속
- [ ] 회의 모드 팝업 테스트
- [ ] 데이터 조회 기능 테스트
- [ ] 데이터 생성/수정 기능 테스트

### 성능 확인
- [ ] 페이지 로딩 속도 확인
- [ ] API 응답 시간 확인
- [ ] 이미지/파일 업로드 테스트 (해당 시)

---

## 🔐 보안 체크

### 환경 변수 보안
- [ ] `.env` 파일이 Git에 커밋되지 않았는지 확인
- [ ] 모든 비밀 정보가 Railway 환경 변수에만 저장됨
- [ ] `JWT_SECRET`이 강력한 랜덤 문자열인지 확인
- [ ] 프로덕션 환경에서 기본 비밀번호 사용 안 함

### 네트워크 보안
- [ ] HTTPS 자동 적용 확인
- [ ] CORS 설정이 올바른 도메인만 허용하는지 확인
- [ ] API 엔드포인트가 인증을 요구하는지 확인

### 데이터베이스 보안
- [ ] 데이터베이스 비밀번호 강도 확인
- [ ] 데이터베이스 접근이 Railway 내부로 제한되는지 확인

---

## 📊 모니터링 설정

### Railway 대시보드
- [ ] Deployments 탭에서 배포 상태 확인
- [ ] Metrics 탭에서 리소스 사용량 확인
- [ ] Usage 탭에서 비용 확인

### 로그 확인
- [ ] 백엔드 로그에서 에러 없는지 확인
- [ ] 프론트엔드 빌드 로그 확인
- [ ] 데이터베이스 연결 로그 확인

---

## 💰 비용 관리

### 사용량 모니터링
- [ ] Railway > Usage 탭에서 현재 사용량 확인
- [ ] 예상 월 비용 확인
- [ ] 알림 설정 (예산 초과 시)

### 비용 최적화
- [ ] 개발 환경은 필요 시에만 실행
- [ ] 로그 보존 기간 조정
- [ ] 불필요한 서비스 중지

---

## 🔄 지속적 배포 (CI/CD)

### 자동 배포 설정
- [ ] GitHub 푸시 시 자동 배포 활성화 확인
- [ ] 배포 브랜치 설정 (main/master)
- [ ] 배포 알림 설정 (선택사항)

---

## 📚 문서화

### 팀 공유
- [ ] Railway 프로젝트 URL 공유
- [ ] 프론트엔드 URL 공유
- [ ] 백엔드 API URL 공유
- [ ] 환경 변수 목록 문서화 (비밀 정보 제외)
- [ ] 배포 프로세스 문서화

### 백업 계획
- [ ] 데이터베이스 백업 전략 수립
- [ ] 정기 백업 스케줄 설정
- [ ] 백업 복구 테스트

---

## 🎉 배포 완료!

모든 체크리스트 항목이 완료되면 배포가 성공적으로 완료된 것입니다!

### 다음 단계
1. 팀원들에게 URL 공유
2. 사용자 계정 생성
3. 초기 데이터 입력
4. 모니터링 및 피드백 수집

### 문제 발생 시
- `RAILWAY_DEPLOYMENT_GUIDE.md` 참고
- Railway Discord 커뮤니티 문의
- 로그 확인 및 디버깅

---

**배포 날짜:** _______________
**배포자:** _______________
**프론트엔드 URL:** _______________
**백엔드 URL:** _______________

