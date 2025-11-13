# 배포 문제 트러블슈팅 가이드

## 🚨 문제 상황별 해결 방법

### 1. GitHub Actions가 실패할 때

#### 증상
- GitHub에서 빌드 실패 아이콘(❌) 표시
- Actions 탭에서 "build-server" 또는 "build-client" 실패

#### 원인
- TypeScript 컴파일 에러
- 의존성 문제
- 빌드 설정 오류

#### 해결 방법
```bash
# 1. 로컬에서 빌드 재현
cd cursor/server  # 또는 cursor/client
npm ci
npm run build

# 2. 에러 확인 및 수정
# 3. 다시 커밋 및 푸시
git add .
git commit -m "Fix: 빌드 에러 수정"
git push origin main
```

---

### 2. Railway 배포가 변경사항을 반영하지 않을 때

#### 증상
- 코드를 푸시했는데 Railway에 반영되지 않음
- 이전 버전이 계속 실행됨

#### 원인
- Railway 빌드 캐시
- Watch Paths가 변경사항을 감지하지 못함
- 빌드 스킵

#### 해결 방법

**방법 1: Railway 대시보드에서 수동 재배포**
1. Railway 대시보드 접속
2. 프로젝트 선택
3. "Deployments" 탭
4. 최신 배포에서 "⋯" 클릭
5. "Redeploy" 선택

**방법 2: 강제 재빌드**
```bash
# 환경 변수 추가 (Railway 대시보드)
FORCE_REBUILD=true

# 또는 코드에 의미없는 변경 추가
cd cursor/server/src
echo "// Force rebuild $(date)" >> index.ts
git add index.ts
git commit -m "Force Railway rebuild"
git push origin main
```

---

### 3. Vercel 배포가 실패할 때

#### 증상
- Vercel에서 빌드 실패
- 프론트엔드 접속 불가

#### 원인
- 프론트엔드 빌드 에러
- 환경 변수 누락
- 의존성 문제

#### 해결 방법
```bash
# 1. 로컬에서 빌드 테스트
cd cursor/client
npm ci
npm run build

# 2. Vercel 환경 변수 확인
# Vercel 대시보드 > Settings > Environment Variables
# 필요한 변수가 모두 설정되어 있는지 확인

# 3. 에러 수정 후 재배포
git add .
git commit -m "Fix: Vercel 빌드 에러 수정"
git push origin main
```

---

### 4. Pre-push 훅이 작동하지 않을 때

#### 증상
- `git push` 시 빌드가 실행되지 않음
- 빌드되지 않은 코드가 푸시됨

#### 원인
- 훅 파일 권한 문제
- 훅 파일이 삭제되었거나 손상됨

#### 해결 방법
```bash
# 1. 훅 파일 존재 확인
ls -la .git/hooks/pre-push

# 2. 권한 설정
chmod +x .git/hooks/pre-push

# 3. 훅 파일 내용 확인
cat .git/hooks/pre-push

# 4. 필요시 훅 파일 재생성
# (DEPLOYMENT-WORKFLOW.md 참고)
```

---

### 5. TypeScript 빌드 에러

#### 증상
- `npm run build` 실행 시 에러
- "Cannot find module" 또는 "Type error" 메시지

#### 원인
- TypeScript 타입 오류
- 의존성 누락
- tsconfig.json 설정 오류

#### 해결 방법
```bash
# 1. 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 2. TypeScript 캐시 삭제
rm -rf dist

# 3. 빌드 재시도
npm run build

# 4. 에러 메시지 확인 및 수정
# 타입 에러는 보통 에러 메시지에 파일 위치와 라인 번호가 표시됨
```

---

### 6. 배포 후 기능이 작동하지 않을 때

#### 증상
- 배포는 성공했지만 특정 기능이 작동하지 않음
- API 호출 실패

#### 원인
- 환경 변수 미설정
- 데이터베이스 마이그레이션 누락
- API 엔드포인트 변경

#### 해결 방법
```bash
# 1. Railway 로그 확인
# Railway 대시보드 > Deployments > View Logs

# 2. 환경 변수 확인
# Railway 대시보드 > Variables
# 필요한 변수: DATABASE_URL, CPI_API_TOKEN, CPI_API_BASE 등

# 3. 데이터베이스 마이그레이션 실행
# Railway CLI 또는 대시보드에서 실행

# 4. 브라우저 콘솔 확인
# F12 > Console 탭에서 에러 확인
```

---

### 7. dist/ 폴더 충돌

#### 증상
- Git 푸시 시 충돌 발생
- "merge conflict in dist/" 메시지

#### 원인
- 여러 브랜치에서 동시에 빌드
- dist/ 폴더가 .gitignore에 있지 않음

#### 해결 방법
```bash
# 1. 원격 변경사항 가져오기
git fetch origin main

# 2. 로컬 dist/ 삭제
rm -rf cursor/server/dist

# 3. 다시 빌드
cd cursor/server
npm run build

# 4. 충돌 해결 후 푸시
git add .
git commit -m "Fix: dist/ 충돌 해결"
git push origin main
```

---

## 📞 긴급 상황 대응

### 프로덕션이 다운되었을 때

1. **즉시 이전 버전으로 롤백**
   - Railway: Deployments > 이전 성공한 배포 > "Rollback to this deployment"
   - Vercel: Deployments > 이전 성공한 배포 > "Promote to Production"

2. **문제 확인**
   - 로그 확인
   - 에러 메시지 분석

3. **수정 및 재배포**
   - 문제 수정
   - 테스트
   - 다시 배포

---

## 🔍 디버깅 체크리스트

배포 문제 발생 시 다음을 순서대로 확인:

- [ ] GitHub Actions 상태 (빌드 통과?)
- [ ] Railway 배포 로그 (에러 메시지?)
- [ ] Vercel 배포 로그 (빌드 성공?)
- [ ] 환경 변수 설정 (모두 있음?)
- [ ] 데이터베이스 연결 (정상?)
- [ ] 브라우저 콘솔 (에러?)
- [ ] 네트워크 탭 (API 호출 성공?)

---

## 📚 참고 문서

- [DEPLOYMENT-WORKFLOW.md](./DEPLOYMENT-WORKFLOW.md) - 전체 배포 프로세스
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Vercel/Railway 설정
- [PROBLEM-ANALYSIS.md](./PROBLEM-ANALYSIS.md) - 과거 문제 분석

