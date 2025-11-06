# Vercel 자동 배포 가이드

## 문제 원인

Vercel이 GitHub 푸시를 감지했지만 자동 배포를 트리거하지 않았던 이유:

### 1. **빈 커밋(Empty Commit) 문제**
- `git commit --allow-empty`로 생성한 빈 커밋을 푸시했을 때 Vercel이 배포를 트리거하지 않음
- Vercel은 **실제 파일 변경이 있는 커밋**만 배포 트리거로 인식함
- 빈 커밋 10번 이상 푸시 → 모두 무시됨

### 2. **Root Directory 설정**
- Vercel 대시보드에서 Root Directory가 `cursor/client`로 설정됨
- `vercel.json` 파일도 Root Directory 기준으로 위치해야 함
- 최종 위치: `cursor/client/vercel.json`

### 3. **빌드 명령어**
- Root Directory가 `cursor/client`이므로 빌드 명령어는 해당 디렉토리 기준
- `buildCommand`: `npm ci && npm run build` (cd 명령 불필요)
- `outputDirectory`: `dist` (Root Directory 기준 상대 경로)

## 해결 방법

### ✅ 성공한 방법
```bash
# 실제 파일 변경 (예: package.json 버전 업데이트)
# cursor/client/package.json의 version을 0.0.0 → 0.0.1로 변경

git add cursor/client/package.json
git commit -m "[Fix] 버전 업데이트: Vercel 배포 트리거"
git push origin main
```

### ❌ 실패한 방법
```bash
# 빈 커밋 (Vercel이 무시함)
git commit --allow-empty -m "[Trigger] Vercel 배포 트리거"
git push origin main
```

## Vercel 자동 배포 설정

### 1. Vercel 대시보드 설정
- **Settings → Build and Deployment**
  - Root Directory: `cursor/client`
  - Framework: Vite (자동 감지됨)
  - Production Branch: `main`

- **Settings → Git**
  - GitHub 저장소 연결 확인: `god2364928-gif/cursor`
  - Production Branch: `main`

### 2. 프로젝트 구조
```
/Users/go/Desktop/new/
├── cursor/
│   ├── client/                    ← Vercel Root Directory
│   │   ├── package.json
│   │   ├── vercel.json           ← Vercel 설정 파일
│   │   ├── vite.config.ts
│   │   └── src/
│   └── server/                    ← Railway Root Directory
│       ├── package.json
│       ├── nixpacks.toml         ← Railway 설정 파일
│       └── src/
└── README.md
```

### 3. vercel.json 설정
**위치**: `cursor/client/vercel.json`

```json
{
  "buildCommand": "npm ci && npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## 배포 프로세스

### 자동 배포 트리거
1. **실제 파일을 수정** (코드, 패키지, 설정 등)
2. Git에 커밋
3. `main` 브랜치에 푸시
4. Vercel이 자동으로 배포 시작

### 수동 배포 (긴급)
1. Vercel 대시보드 → Deployments
2. "Redeploy" 버튼 클릭
3. 또는 최신 배포를 선택하고 "Redeploy" 클릭

## 주의 사항

### ⚠️ 절대 하지 말 것
1. **빈 커밋으로 배포 트리거 시도하지 말 것**
   - Vercel이 빈 커밋을 무시함
   - 실제 파일 변경이 필요함

2. **vercel.json 위치 주의**
   - Root Directory가 `cursor/client`이므로
   - `vercel.json`은 `cursor/client/vercel.json`에 위치해야 함
   - 프로젝트 루트에 두지 말 것

3. **빌드 명령어에 `cd` 사용하지 말 것**
   - Root Directory가 이미 `cursor/client`로 설정됨
   - 빌드 명령어는 해당 디렉토리 기준으로 실행됨

### ✅ 배포가 필요할 때
1. **코드 변경 후 배포**
   - 정상적으로 파일 수정 후 커밋/푸시
   - Vercel이 자동으로 배포

2. **긴급 배포**
   - Vercel 대시보드에서 "Redeploy" 클릭
   - 또는 작은 변경(주석, 공백 등)을 추가하고 커밋

## 배포 확인

### 1. GitHub
```bash
git log --oneline -1
git push origin main
```

### 2. Vercel 대시보드
- Deployments 탭에서 최신 커밋 확인
- 빌드 로그에서 성공 여부 확인
- Production 환경에 배포됨

### 3. 배포 완료 확인
- 웹사이트 접속: https://www.hotseller-crm.com
- 변경사항 확인 (예: 추가 버튼 색상이 초록색)

## 트러블슈팅

### 배포가 안 될 때
1. **실제 파일 변경 확인**
   - 빈 커밋이 아닌지 확인
   - `git show HEAD --stat`으로 변경된 파일 확인

2. **Vercel 대시보드 확인**
   - Settings → Git: GitHub 연결 상태
   - Settings → Build and Deployment: Root Directory 확인
   - Deployments: 최신 커밋이 있는지 확인

3. **수동 배포**
   - Vercel 대시보드 → Deployments → "Redeploy"

4. **GitHub Webhook 확인**
   - GitHub 저장소 → Settings → Webhooks
   - Vercel webhook이 활성화되어 있는지 확인

## 정리

**성공 요인:**
1. Root Directory가 `cursor/client`로 설정됨
2. `vercel.json`이 `cursor/client/vercel.json`에 위치
3. **실제 파일 변경** (package.json 버전 업데이트)이 포함된 커밋 푸시
4. Vercel이 파일 변경을 감지하고 자동 배포 트리거

**핵심 교훈:**
> **Vercel은 빈 커밋을 배포 트리거로 인식하지 않습니다.**
> **배포가 필요하면 실제 파일을 변경하거나 Vercel 대시보드에서 수동 배포하세요.**

