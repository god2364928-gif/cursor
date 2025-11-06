# Vercel 배포 문제 해결 가이드

## 🔴 가장 흔한 문제: Production Overrides 설정 충돌

### 증상
- GitHub에 푸시했는데 Vercel Deployments에 나타나지 않음
- 설정이 맞는 것 같은데 배포가 안 됨

### 원인
**Production Overrides**와 **Project Settings**가 다를 때 배포가 트리거되지 않음

### 해결 방법 (우선순위 순서)

#### 1️⃣ Build and Deployment 설정 확인 (가장 먼저!)
```
Vercel 대시보드 → Settings → Build and Deployment
```

**확인 항목:**
- ⚠️ 경고: "Configuration Settings in the current Production deployment differ from your current Project Settings"
- **Production Overrides** 섹션 확인
- Build Command, Output Directory, Install Command 확인

#### 2️⃣ Production Overrides 문제 해결
```
두 가지 방법:

A) Override 토글 끄기 (권장)
   - Build Command의 "Override" 토글을 OFF (회색)
   - 다른 설정도 동일하게 처리
   - "Save" 클릭

B) Git 다시 연결
   - Settings → Git → "Disconnect"
   - "Connect" 다시 연결 (전체 설정 리셋)
```

#### 3️⃣ 실제 설정 값 확인
```
Project Settings (현재 설정)
- Build Command: npm ci && npx vite build ✅
- Output Directory: dist ✅
- Install Command: npm install (또는 npm ci) ✅

Production Overrides (이전 배포)
- Build Command: npm ci && npm run build (다를 수 있음) ❌
- Output Directory: dist ✅
- Install Command: npm ci ✅
```

---

## 문제 해결 체크리스트

배포가 안 될 때 **이 순서대로** 확인하세요:

### Phase 1: Vercel 설정 (가장 먼저)
- [ ] Settings > Build and Deployment에서 Production Overrides 확인
- [ ] Build Command 일치 여부 확인
- [ ] Output Directory: `dist` 확인
- [ ] Root Directory: `cursor/client` 확인 (모노레포의 경우)
- [ ] Production Branch: `main` 확인

### Phase 2: GitHub 연결
- [ ] Settings > Git에서 "Connected" 상태 확인
- [ ] GitHub 저장소가 정확히 연결되어 있는지 확인
- [ ] Git 연결 끊어서 다시 연결 시도

### Phase 3: 파일 구조
- [ ] `vercel.json` 위치 확인 (Root Directory 내)
- [ ] `.vercelignore` 파일 제거
- [ ] `package.json` scripts 확인

### Phase 4: 커밋 및 푸시
- [ ] 실제 파일 변경이 포함된 커밋 (빈 커밋 아님)
- [ ] GitHub에 정상 푸시됨 (`git push` 성공)
- [ ] Deployments에 새 커밋이 나타나는지 확인

### Phase 5: 최후의 수단
- [ ] Vercel CLI: `vercel --prod` (수동 배포)
- [ ] Vercel 프로젝트 재생성

---

## 배포 전 확인 사항

매번 배포 전에 이것을 확인하세요:

```bash
# 1. 최신 커밋 확인
git log --oneline -1

# 2. 파일 변경 확인 (빈 커밋 아닌지)
git show HEAD --stat

# 3. 푸시 상태 확인
git status
git log -1 --format="%H %s" origin/main

# 4. vercel.json 확인
cat cursor/client/vercel.json
```

---

## Vercel 자동 배포가 작동하려면

✅ **필수 조건:**
1. Production Overrides와 Project Settings가 동일
2. vercel.json이 Root Directory 내에 있음
3. Root Directory 설정이 정확함
4. GitHub 연결이 활성화됨
5. 실제 파일 변경이 포함된 커밋

---

## 배포 문제 원인 우선순위

1. 🔴 **Production Overrides 충돌** (80%)
2. 🟠 **.vercelignore 파일** (10%)
3. 🟠 **Git 연결 끊김** (5%)
4. 🟡 **vercel.json 파일 위치 오류** (3%)
5. 🟡 **빈 커밋** (2%)

대부분의 배포 문제는 **Production Overrides 설정 충돌**입니다!

---

## 앞으로 배포 실패 시

1. **먼저 Vercel Settings > Build and Deployment 확인**
2. **Production Overrides 있는지 확인**
3. **Override 토글 끄고 Save**
4. **새 커밋 푸시**

이 순서를 따르면 대부분의 배포 문제가 해결됩니다.

