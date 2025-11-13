# 배포 워크플로우 가이드

## 🔄 자동화된 빌드 및 배포 프로세스

### 1. 로컬 개발 시 (Pre-push Hook)

**위치**: `.git/hooks/pre-push`

**역할**:
- `git push` 실행 전에 자동으로 서버 빌드 (`npm run build`)
- 빌드된 `dist/` 폴더를 자동으로 Git에 스테이징
- 빌드 실패 시 푸시 중단

**장점**:
- 빌드되지 않은 코드가 원격 저장소에 푸시되는 것을 방지
- Railway 배포 시 이미 빌드된 파일 사용 가능

### 2. GitHub Actions (CI/CD)

**위치**: `.github/workflows/build-deploy.yml`

**역할**:
- PR 및 push 시 자동으로 빌드 검증
- 서버와 클라이언트가 정상적으로 빌드되는지 확인
- **주의**: 자동 커밋/푸시는 하지 않음 (로컬 pre-push 훅이 담당)

**워크플로우**:
```yaml
build-server:
  - Node.js 18 설정
  - npm ci (의존성 설치)
  - npm run build (빌드)
  - dist/ 폴더 존재 확인

build-client:
  - Node.js 18 설정
  - npm ci (의존성 설치)
  - npm run build (빌드)
  - dist/ 폴더 존재 확인
```

### 3. Railway 배포

**자동 배포 트리거**:
- `main` 브랜치에 푸시될 때마다 자동 배포
- Watch Paths: `cursor/server/**` (서버 코드 변경 시에만)

**배포 프로세스** (`nixpacks.toml`):
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.build]
cmds = [
  'rm -rf node_modules dist',
  'npm ci',
  'npm run build',
  'echo "✅ Build completed - Force rebuild $(date)"'
]

[start]
cmd = 'node dist/index.js'
```

### 4. Vercel 배포

**자동 배포 트리거**:
- `main` 브랜치에 푸시될 때마다 자동 배포
- Watch Paths: `cursor/client/**` (클라이언트 코드 변경 시에만)

**배포 설정** (`vercel.json`):
```json
{
  "buildCommand": "npm ci && npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite"
}
```

## 🚨 과거 발생했던 문제와 해결

### 문제 1: TypeScript 소스는 수정되었으나 빌드되지 않음
**원인**: `npm run build`를 실행하지 않고 Git 커밋/푸시
**해결**: Pre-push 훅으로 자동 빌드 강제화

### 문제 2: GitHub Actions가 자동 커밋 후 푸시 실패
**원인**: 
- GitHub Actions가 빌드 후 자동으로 커밋하려고 시도
- 로컬에서 이미 빌드되어 커밋된 상태라 충돌 발생
- `ad-m/github-push-action` 권한 문제

**해결**: 
- GitHub Actions는 빌드 검증만 수행
- 자동 커밋/푸시 단계 제거
- Pre-push 훅이 이미 빌드를 처리하므로 중복 불필요

### 문제 3: Railway 배포 시 변경사항 반영 안됨
**원인**: Railway 캐시 또는 빌드 스킵
**해결**: 
- `nixpacks.toml`에 `rm -rf node_modules dist` 추가하여 클린 빌드 강제화
- `FORCE_REBUILD` 환경 변수로 강제 재빌드 가능

## 📋 배포 체크리스트

### 코드 변경 후 배포 전:
- [ ] 로컬에서 `npm run build` 실행 확인 (pre-push 훅이 자동 실행)
- [ ] TypeScript 컴파일 에러 없음 확인
- [ ] `dist/` 폴더가 생성되었는지 확인

### Git 푸시 시:
- [ ] Pre-push 훅이 자동으로 빌드 수행
- [ ] 빌드 성공 메시지 확인: "✅ 서버 빌드 성공"
- [ ] GitHub에 푸시 완료

### 배포 확인:
- [ ] GitHub Actions 워크플로우 통과 확인 (빌드 검증)
- [ ] Railway 대시보드에서 배포 상태 확인 (1-2분)
- [ ] Vercel 대시보드에서 배포 상태 확인 (1-2분)
- [ ] 프로덕션 사이트에서 변경사항 확인

## 🛠️ 문제 발생 시 해결 방법

### Railway 배포가 변경사항을 반영하지 않을 때:
1. Railway 대시보드에서 수동 "Redeploy" 클릭
2. 또는 환경 변수 `FORCE_REBUILD=true` 추가 후 제거

### GitHub Actions 실패 시:
1. Actions 탭에서 실패한 워크플로우 로그 확인
2. 로컬에서 `npm ci && npm run build` 실행하여 빌드 재현
3. 에러 수정 후 다시 푸시

### Pre-push 훅이 작동하지 않을 때:
1. 훅 파일 권한 확인: `chmod +x .git/hooks/pre-push`
2. 훅 파일 내용 확인: `cat .git/hooks/pre-push`
3. 필요시 재생성

## 📝 주요 명령어

```bash
# 로컬 빌드
cd cursor/server && npm run build
cd cursor/client && npm run build

# Pre-push 훅 권한 설정
chmod +x .git/hooks/pre-push

# 강제 배포 (Railway)
# 1. Railway 대시보드에서 Redeploy
# 2. 또는 코드 변경 후 푸시

# Git 커밋 및 푸시 (pre-push 훅 자동 실행)
git add .
git commit -m "message"
git push origin main
```

## 🎯 베스트 프랙티스

1. **항상 TypeScript 파일만 수정** - JavaScript `dist/` 파일은 자동 생성
2. **Pre-push 훅을 신뢰** - 수동 빌드 불필요
3. **GitHub Actions 로그 확인** - 빌드 검증 통과 여부 확인
4. **배포 후 확인** - Railway/Vercel 대시보드와 프로덕션 사이트 확인
5. **문제 발생 시 즉시 롤백** - `git revert` 또는 Railway/Vercel 대시보드에서 이전 배포로 복원

