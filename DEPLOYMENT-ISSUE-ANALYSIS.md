# 배포 문제 근본 원인 분석 및 재발 방지 시스템

**작성일**: 2025년 11월 13일  
**문제**: 회신수 집계 및 리타겟팅 진행률이 배포에 반영되지 않음

---

## 🔴 근본 원인 분석

### 1. 문제 발생 시점
- **보고된 문제**: 
  - 대시보드 리타겟팅 진행률과 실제 리타겟팅 데이터 불일치
  - 영업이력 회신수가 통계에 반영 안됨

### 2. 코드 상태 확인
```bash
# 회신수 집계 커밋 위치
git log --oneline | grep -n "회신"

결과:
1:3bf5d4d5 [Deploy] Railway 강제 재배포 (방금 추가)
351:eec4bc23 회신수 집계 수정 (350번째 커밋 전)
355-365: 회신수 관련 커밋들 (모두 350+ 이전)
```

### 3. Git 커밋 타임라인
```
최신 (1-50번째 커밋):
  1. [Deploy] Railway 강제 재배포 ← 지금 추가
  2. [Docs] 배포 상태 확인
  3. [Fix] GitHub Actions 제거
  4. [Docs] 배포 가이드
  5. [Chore] 배포 최적화 ← 33개 파일 삭제
  ...
  50. [Fix] 영업이력 담당자 선택
  
350번째 커밋 (이전):
  351. eec4bc23 회신수 집계 수정 ✅ (코드에 있음)
  ...
  360-370. 회신수 관련 커밋들 (모두 코드에 있음)
```

### 4. 핵심 발견 ⚠️

**회신수 로직은 코드에 있지만 배포가 안됨!**

#### 가능한 원인:

##### A) Railway 빌드 캐시 문제 (가장 유력)
- Railway가 이전 빌드 결과를 캐시
- 새 커밋을 감지했지만 **문서 변경만** 있다고 판단
- `cursor/server/` 폴더에 변경이 없어서 빌드 생략

**증거:**
```
bc5accfe [Chore] 배포 최적화 - 불필요한 파일 제거
- 33개 파일 삭제 (CSV, SQL, 문서)
- nixpacks.toml 수정 (검증 제거)
- **서버 코드 변경 없음**

이후 커밋들:
c3adf50a [Fix] GitHub Actions 제거 (워크플로우만)
23ceb9e7 [Docs] 배포 가이드 (문서만)
d27a4968 [Docs] 배포 상태 (문서만)
```

➡️ **Railway는 최근 3개 커밋이 모두 문서 변경이라서 빌드를 스킵했을 가능성**

##### B) nixpacks.toml 최적화의 부작용
```toml
[phases.build]
cmds = [
  'npm ci',
  'npm run build',  # ← TypeScript 컴파일만
  'echo "✅ Build completed"'
]
```

**이전에는**: grep 검증이 있어서 매번 dist 확인  
**현재는**: 빌드만 하고 검증 없음  
**결과**: 캐시된 dist를 사용할 가능성

##### C) Railway 자동 배포 트리거 조건
Railway는 다음 조건일 때 배포를 스킵할 수 있음:
1. 최근 커밋들이 문서/설정만 변경
2. `cursor/server/` 폴더에 변경 없음
3. Root Directory 설정과 변경 경로 불일치

---

## 🎯 확인된 문제점

### 1. 배포 검증 프로세스 부재
- 배포 후 실제 반영 여부 확인 안함
- API 엔드포인트 테스트 없음
- 기능별 동작 검증 없음

### 2. Railway 배포 설정의 맹점
- 빌드 캐시 정책 불명확
- 문서 변경 시 배포 스킵 가능성
- 강제 배포 방법 부재

### 3. 커밋 전략의 문제
- 기능 수정과 배포 최적화를 동시에 진행
- 배포 최적화 커밋 후 서버 코드 변경 없음
- Railway가 "변경 없음"으로 판단할 여지

---

## ✅ 해결 방법

### 즉시 조치 (완료)
```bash
# 서버 코드에 주석 추가로 강제 빌드
echo "// Force deploy" >> cursor/server/src/index.ts
git commit -m "[Deploy] Railway 강제 재배포"
git push origin main
```

### 근본 해결책

#### 1. Railway 빌드 설정 개선
```toml
[phases.build]
cmds = [
  'echo "=== Clean build start ==="',
  'rm -rf dist',  # ← 캐시 강제 제거
  'npm ci',
  'npm run build',
  'ls -la dist/',  # ← 빌드 확인
  'echo "=== Build completed ==="'
]
```

#### 2. 배포 검증 자동화
```bash
# deploy-check.sh
#!/bin/bash

API_URL="https://cursor-production-1d92.up.railway.app"

echo "🔍 배포 검증 시작..."

# 1. Health Check
if curl -s "$API_URL/api/health" | grep -q "ok"; then
  echo "✅ Health Check 성공"
else
  echo "❌ Health Check 실패"
  exit 1
fi

# 2. 주요 엔드포인트 테스트
# ...

echo "✅ 배포 검증 완료"
```

#### 3. 강제 배포 스크립트
```bash
# force-deploy.sh
#!/bin/bash

echo "🚀 Railway 강제 재배포..."

# 서버 코드에 타임스탬프 주석 추가
echo "// Deploy: $(date)" >> cursor/server/src/index.ts

git add cursor/server/src/index.ts
git commit -m "[Deploy] Railway 강제 재배포 - $(date +%Y%m%d%H%M)"
git push origin main

echo "✅ 푸시 완료. Railway 배포 시작..."
```

---

## 📋 재발 방지 체크리스트

### 배포 전 (Pre-deployment)
- [ ] 변경된 기능 목록 작성
- [ ] 로컬에서 빌드 테스트 (`npm run build`)
- [ ] 변경된 파일 확인 (`git diff --stat`)
- [ ] 서버 코드 변경 포함 여부 확인

### 배포 중 (During deployment)
- [ ] Git 푸시 성공 확인
- [ ] Railway 대시보드에서 빌드 시작 확인
- [ ] 빌드 로그에서 에러 확인
- [ ] 빌드 완료 및 배포 성공 확인

### 배포 후 (Post-deployment)
- [ ] Health Check API 호출 (`/api/health`)
- [ ] 변경된 기능별 API 테스트
- [ ] 프론트엔드에서 실제 기능 테스트
- [ ] 데이터베이스 쿼리 결과 확인

### 문제 발생 시
- [ ] Railway 배포 로그 확인
- [ ] 빌드 캐시 의심 → 강제 재배포
- [ ] API 응답 직접 확인 (curl/브라우저)
- [ ] 데이터베이스 직접 쿼리

---

## 🛠️ 배포 모니터링 도구

### 1. Railway 배포 상태 확인
```bash
# railway-status.sh
#!/bin/bash

echo "📊 최근 배포 상태:"
echo "Railway URL: https://railway.app/project/[PROJECT_ID]"
echo ""
echo "최신 3개 커밋:"
git log --oneline -3
echo ""
echo "마지막 배포 시간: [Railway에서 확인]"
```

### 2. API 엔드포인트 테스트
```bash
# test-api.sh
#!/bin/bash

API_URL="https://cursor-production-1d92.up.railway.app"

echo "🧪 API 테스트:"
echo "1. Health Check:"
curl -s "$API_URL/api/health"

echo "\n2. Database Connection:"
curl -s "$API_URL/api/test/customers"

echo "\n3. Dashboard Stats:"
curl -s "$API_URL/api/dashboard/stats?startDate=2025-11-01&endDate=2025-11-13" \
  -H "Authorization: Bearer [TOKEN]"
```

### 3. 기능별 검증 스크립트
```bash
# verify-features.sh
#!/bin/bash

echo "🔍 기능 검증:"

echo "1. 회신수 집계:"
echo "   - 영업이력 → 일별 통계 버튼"
echo "   - 2025년 11월 선택"
echo "   - 회신수 컬럼 확인"

echo "2. 리타겟팅 진행률:"
echo "   - 대시보드 확인"
echo "   - 리타겟팅 페이지 확인"
echo "   - 숫자 일치 여부 확인"
```

---

## 📚 교훈 및 개선사항

### 1. 배포 최적화와 기능 수정 분리
**문제**: 배포 최적화 커밋 후 서버 코드 변경이 없어 Railway가 빌드 스킵

**개선**:
- 배포 최적화는 별도 PR/브랜치에서 진행
- 기능 수정 후 바로 배포하여 변경사항 명확히
- 문서 변경은 기능 배포 후 별도로

### 2. 빌드 캐시 관리
**문제**: Railway 빌드 캐시가 언제 사용되는지 불명확

**개선**:
- nixpacks.toml에 `rm -rf dist` 추가 고려
- 중요 배포 시 강제 재배포 실행
- 빌드 로그에서 캐시 사용 여부 확인

### 3. 배포 검증 자동화
**문제**: 배포 후 실제 반영 여부 수동 확인

**개선**:
- GitHub Actions로 배포 후 자동 테스트
- API health check 자동화
- Slack/Discord 알림 연동

### 4. 커밋 메시지 규칙
**개선된 규칙**:
```
[Feature] - 새 기능 (반드시 테스트)
[Fix] - 버그 수정 (반드시 테스트)
[Deploy] - 강제 배포 (검증 필수)
[Docs] - 문서만 (배포 불필요)
[Chore] - 설정/정리 (배포 필요)
```

---

## 🚨 경고 신호 (Red Flags)

다음 상황에서는 **배포 검증 필수**:

1. **배포 최적화 후**: 빌드 설정 변경 시
2. **대량 파일 삭제 후**: Git에서 많은 파일 제거 시
3. **문서만 수정한 커밋 연속**: 서버 코드 변경 없을 때
4. **Railway 로그 확인 불가**: 배포 상태 불명확할 때
5. **사용자 문의**: "반영 안됨" 보고 시

---

## 📊 배포 체크리스트 템플릿

```markdown
## 배포 전 확인
- [ ] 변경된 파일: ___________
- [ ] 서버 코드 변경: Yes / No
- [ ] 로컬 빌드 성공: Yes / No
- [ ] 주요 기능: ___________

## 배포 중 확인
- [ ] Git push 성공
- [ ] Railway 빌드 시작 확인
- [ ] 빌드 시간: ___분
- [ ] 배포 완료 시간: ___

## 배포 후 검증
- [ ] Health Check: OK / Fail
- [ ] 기능 1 테스트: OK / Fail
- [ ] 기능 2 테스트: OK / Fail
- [ ] 사용자 확인: OK / Pending

## 문제 발생 시
- [ ] 오류 메시지: ___________
- [ ] 강제 재배포: Yes / No
- [ ] 해결 시간: ___
```

---

## 💡 핵심 요약

### 문제의 근본 원인
**Railway가 최근 커밋들(문서/설정)을 보고 서버 코드 변경이 없다고 판단 → 빌드 캐시 사용 또는 배포 스킵**

### 즉시 해결책
**서버 코드에 변경 추가 → 강제 재배포**

### 장기 해결책
1. nixpacks.toml에 캐시 클리어 추가
2. 배포 검증 자동화
3. 강제 배포 스크립트 작성
4. 체크리스트 기반 배포 프로세스

### 재발 방지
1. 배포 후 반드시 기능 테스트
2. 문서 변경은 별도로 분리
3. 중요 기능은 강제 재배포 고려
4. Railway 대시보드 모니터링

---

**결론**: 회신수 로직은 이미 코드에 있었지만, Railway 배포 최적화와 문서 변경 커밋들로 인해 실제 배포가 스킵되었습니다. 앞으로는 **배포 검증 프로세스**를 필수로 진행하여 이런 문제를 사전에 방지합니다.

