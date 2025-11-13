# 배포 가이드

## 프로젝트 구조

```
cursor/
├── client/          → Vercel (프론트엔드)
│   ├── src/
│   ├── package.json
│   └── vercel.json
└── server/          → Railway (백엔드)
    ├── src/
    ├── package.json
    └── nixpacks.toml
```

---

## Vercel 프론트엔드 배포

### 설정
- **Root Directory**: `cursor/client`
- **Framework**: Vite (자동 감지)
- **Build Command**: `npm ci && npm run build`
- **Output Directory**: `dist`
- **Production Branch**: `main`

### 자동 배포
`main` 브랜치에 푸시하면 자동으로 배포됩니다.

```bash
git add .
git commit -m "[Feature] 새 기능 추가"
git push origin main
```

### 주의사항
- ❌ 빈 커밋(`--allow-empty`)은 배포를 트리거하지 않습니다
- ✅ 실제 파일 변경이 있어야 배포됩니다
- Production Overrides와 Project Settings가 일치해야 합니다

---

## Railway 백엔드 배포

### 설정
- **Root Directory**: `cursor/server`
- **Build**: nixpacks.toml 기반
- **Start Command**: `node dist/index.js`

### 필수 환경 변수
```
DATABASE_URL         # PostgreSQL 연결 (Railway에서 자동 설정)
JWT_SECRET          # JWT 토큰 시크릿
CPI_API_BASE        # CPI API 엔드포인트
CPI_API_TOKEN       # CPI API 인증 토큰
NODE_ENV            # production
PORT                # Railway에서 자동 설정
```

### 자동 배포
`main` 브랜치에 푸시하면 자동으로 빌드 및 배포됩니다.

---

## 배포 전 체크리스트

### 1. 코드 변경
- [ ] 변경사항이 실제로 있는지 확인
- [ ] 빌드 에러가 없는지 로컬 테스트
- [ ] 환경 변수가 올바르게 설정되었는지 확인

### 2. Git 커밋
```bash
# 변경사항 확인
git status

# 커밋 (파일 변경 필요)
git add cursor/client/src/...
git commit -m "[Feature] 변경 내용"

# 푸시
git push origin main
```

### 3. 배포 확인
- **Vercel**: https://vercel.com/dashboard → Deployments
- **Railway**: https://railway.app/dashboard → Deployments
- 빌드 로그에서 에러 확인

---

## 문제 해결

### Vercel 배포가 안 될 때

1. **Production Overrides 확인** (가장 흔한 원인)
   - Settings → Build and Deployment
   - Production Overrides 섹션 확인
   - Override 토글을 OFF로 변경
   - Save 클릭

2. **Git 연결 확인**
   - Settings → Git
   - Connected 상태인지 확인
   - 필요시 Disconnect 후 재연결

3. **빈 커밋 확인**
   ```bash
   # 변경사항 확인
   git show HEAD --stat
   
   # 빈 커밋이면 실제 파일 수정 필요
   ```

### Railway 배포가 실패할 때

1. **빌드 로그 확인**
   - Railway Dashboard → Deployments → 최근 배포 클릭
   - Build Logs에서 에러 메시지 확인

2. **환경 변수 확인**
   - Variables 탭에서 필수 변수 설정 확인
   - DATABASE_URL, JWT_SECRET 등

3. **nixpacks.toml 확인**
   - 불필요한 검증 명령어 제거됨
   - 빌드가 단순화됨

---

## 자주하는 실수

### ❌ 하지 말 것
1. 빈 커밋으로 배포 트리거 시도
2. Production Overrides와 Project Settings 불일치
3. 환경 변수 누락
4. CSV/SQL 파일을 Git에 커밋 (이미 .gitignore에서 제외됨)

### ✅ 올바른 방법
1. 실제 파일 변경 후 커밋
2. Vercel/Railway 설정 일치 확인
3. 환경 변수 미리 설정
4. 로컬에서 먼저 테스트

---

## 환경 변수 관리

### Vercel
프론트엔드는 별도 환경 변수가 불필요합니다 (백엔드 API를 통해 데이터 접근).

### Railway
```bash
# Railway CLI로 환경 변수 설정
railway variables set JWT_SECRET=your_secret_here
railway variables set CPI_API_BASE=http://your-api-url
railway variables set CPI_API_TOKEN=your_token_here
```

또는 Railway Dashboard → Variables 탭에서 직접 설정

---

## 추가 정보

### 프론트엔드 URL
- Production: https://www.hotseller-crm.com

### 백엔드 URL
- Railway에서 자동 할당된 URL 사용
- 프론트엔드에서 환경에 따라 자동 연결

### 데이터베이스
- Railway PostgreSQL (자동 연결)
- DATABASE_URL은 Railway에서 자동 설정

---

## 긴급 수동 배포

### Vercel
1. Vercel Dashboard → Deployments
2. 최근 성공한 배포 선택
3. "Redeploy" 버튼 클릭

### Railway
1. Railway Dashboard → Deployments
2. "Deploy" 버튼 클릭
3. 또는 GitHub에서 강제 재배포

---

## 문의사항
배포 중 문제가 발생하면:
1. 먼저 이 가이드의 "문제 해결" 섹션 확인
2. Vercel/Railway 대시보드의 로그 확인
3. Git 커밋 히스토리 확인 (`git log --oneline -5`)

