# 배포 자동화 가이드

## 🎯 목표
TypeScript 빌드를 자동화하여 수동 빌드를 잊어버리는 문제를 방지합니다.

## ✅ 설정 완료된 자동화

### 1. Git Pre-Push Hook
**위치**: `.git/hooks/pre-push`

**동작**:
- `git push` 전에 자동으로 실행
- 서버 TypeScript를 자동 빌드
- 빌드 실패 시 push 차단
- 빌드된 `dist/` 폴더를 자동으로 스테이징

**사용법**:
```bash
# 평소처럼 commit & push
git add .
git commit -m "feat: 새 기능"
git push origin main

# ↑ push 전에 자동으로 빌드됨!
```

### 2. GitHub Actions (자동 CI/CD)
**위치**: `.github/workflows/build-deploy.yml`

**동작**:
- PR 또는 main 브랜치 push 시 자동 실행
- 서버와 클라이언트 빌드 검증
- 빌드 실패 시 PR 머지 차단
- 빌드 성공 시 자동으로 커밋 및 푸시

**GitHub에서 확인**:
https://github.com/god2364928-gif/cursor/actions

## 🚀 Railway 자동 배포

Railway는 GitHub과 자동 연동되어 있습니다:

1. **main 브랜치에 push**
2. **Railway가 자동 감지**
3. **자동으로 빌드 및 배포**

**배포 확인**:
- https://railway.app/project/28ebe688-21a7-4553-8a8f-7f4a6d9bb190/deployments
- 로그에서 빌드 및 배포 상태 확인

## 🌐 Vercel 자동 배포

Vercel도 GitHub과 자동 연동되어 있습니다:

1. **main 브랜치에 push**
2. **Vercel이 자동 감지**
3. **자동으로 빌드 및 배포**

**배포 확인**:
- https://vercel.com/dashboard
- 프로젝트에서 최신 배포 상태 확인

## 📝 개발 워크플로우

### 일반적인 개발
```bash
# 1. 코드 수정
vi cursor/server/src/routes/salesTracking.ts

# 2. 커밋
git add .
git commit -m "fix: 회신수 계산 로직 수정"

# 3. Push (자동으로 빌드됨)
git push origin main
# ↑ pre-push hook이 자동으로 빌드 실행
# ↑ Railway와 Vercel이 자동으로 배포
```

### 수동 빌드가 필요한 경우
```bash
# 서버 빌드
cd cursor/server
npm run build

# 클라이언트 빌드
cd cursor/client
npm run build
```

### 빌드 확인
```bash
# 서버 빌드 파일 확인
ls -la cursor/server/dist/

# 특정 파일의 빌드 내용 확인
cat cursor/server/dist/routes/salesTracking.js | grep "reply_count"
```

## 🔍 트러블슈팅

### Pre-push hook이 실행되지 않는 경우
```bash
# hook 파일 권한 확인
ls -la .git/hooks/pre-push

# 실행 권한 추가
chmod +x .git/hooks/pre-push
```

### GitHub Actions가 실행되지 않는 경우
1. GitHub 저장소의 Actions 탭 확인
2. workflow 파일 경로 확인: `.github/workflows/build-deploy.yml`
3. workflow 파일 문법 오류 확인

### Railway 배포가 트리거되지 않는 경우
1. Railway 대시보드에서 GitHub 연동 확인
2. Watch Paths 설정 확인 (Settings → Service)
3. 최근 커밋이 `cursor/server/` 디렉토리를 변경했는지 확인

### Vercel 배포가 트리거되지 않는 경우
1. Vercel 대시보드에서 GitHub 연동 확인
2. Root Directory 설정 확인 (`cursor/client`)
3. 최근 커밋이 `cursor/client/` 디렉토리를 변경했는지 확인

## ⚠️ 주의사항

### dist 폴더 커밋
- dist 폴더는 **반드시 Git에 커밋**되어야 합니다
- .gitignore에서 dist 폴더가 무시되지 않도록 확인
- 현재 설정: dist 폴더는 추적됨

### 빌드 실패 시
- Pre-push hook이 빌드 실패를 감지하면 push가 차단됩니다
- TypeScript 에러를 수정한 후 다시 시도하세요

### [skip ci] 태그
- 커밋 메시지에 `[skip ci]`를 추가하면 GitHub Actions를 건너뜁니다
- 예: `git commit -m "docs: update README [skip ci]"`

## 📊 배포 체크리스트

### 배포 전
- [ ] TypeScript 에러 없음
- [ ] 로컬에서 빌드 성공
- [ ] dist 폴더 생성 확인

### 배포 후
- [ ] Railway 배포 성공 확인
- [ ] Vercel 배포 성공 확인
- [ ] Health check API 응답 확인
- [ ] 실제 기능 테스트

## 🔗 유용한 링크

- **GitHub Repository**: https://github.com/god2364928-gif/cursor
- **GitHub Actions**: https://github.com/god2364928-gif/cursor/actions
- **Railway Dashboard**: https://railway.app/project/28ebe688-21a7-4553-8a8f-7f4a6d9bb190
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Production URL**: https://www.hotseller-crm.com
- **API Health Check**: https://cursor-production-1d92.up.railway.app/api/health

## 💡 베스트 프랙티스

1. **작은 단위로 자주 커밋**
   - 큰 변경사항을 한 번에 배포하지 말 것
   
2. **의미있는 커밋 메시지**
   - `fix:`, `feat:`, `chore:` 등의 prefix 사용
   
3. **배포 후 즉시 확인**
   - Health check API 확인
   - 변경된 기능 직접 테스트
   
4. **문제 발생 시 신속한 롤백**
   - GitHub에서 이전 커밋으로 revert
   - Railway/Vercel에서 이전 배포로 롤백
