# Railway 환경 변수 설정 가이드

## 인스타그램 계정 최적화 API 설정

### 필수 환경 변수

Railway 대시보드 > 백엔드 서비스 > **Variables** 탭에서 다음 환경 변수를 추가해야 합니다:

#### 1. GrowthCore API 설정

```env
# API 키 (둘 중 하나 사용)
ACCOUNT_OPTIMIZATION_API_KEY=your_growthcore_api_key
# 또는
INSTAGRAM_ANALYTICS_API_KEY=your_growthcore_api_key

# API 엔드포인트 (선택사항, 기본값이 있음)
ACCOUNT_OPTIMIZATION_API_URL=https://api.growthcore.co.kr/api/thirdparty/id-analytics
# 또는
INSTAGRAM_ANALYTICS_API_URL=https://api.growthcore.co.kr/api/thirdparty/id-analytics
```

### Railway에서 환경 변수 추가하는 방법

1. [Railway Dashboard](https://railway.app) 접속
2. 프로젝트 선택
3. **Backend 서비스** 클릭
4. 상단 탭에서 **"Variables"** 선택
5. **"New Variable"** 버튼 클릭
6. 변수 이름과 값 입력:
   - `Variable Name`: `ACCOUNT_OPTIMIZATION_API_KEY`
   - `Value`: `실제_API_키_값`
7. **"Add"** 버튼 클릭
8. 서비스가 자동으로 재시작됩니다

### 환경 변수 우선순위

코드는 다음 순서로 환경 변수를 찾습니다:

1. `ACCOUNT_OPTIMIZATION_API_KEY` (최우선)
2. `INSTAGRAM_ANALYTICS_API_KEY` (대체)

둘 중 하나만 설정하면 됩니다.

### 확인 방법

1. Railway > Backend 서비스 > **"Deployments"** 탭
2. 최신 배포 클릭 > **"View Logs"**
3. 로그에서 다음 메시지 확인:
   ```
   [AccountOptimization] Using endpoint: https://api.growthcore.co.kr/...
   ```
4. 에러가 없으면 정상 설정입니다

### 트러블슈팅

#### 문제: "외部連携キーが設定されていません" 에러
**원인**: API 키 환경 변수가 설정되지 않음  
**해결**: Railway Variables에 `ACCOUNT_OPTIMIZATION_API_KEY` 추가

#### 문제: 500 Internal Server Error
**원인**: 
- API 키가 잘못되었거나
- GrowthCore API가 응답하지 않음

**해결**:
1. Railway Logs 확인:
   ```
   [AccountOptimization] Request failed: ...
   ```
2. API 키가 올바른지 확인
3. GrowthCore API 상태 확인

#### 문제: 로그에 아무것도 보이지 않음
**원인**: 코드가 배포되지 않았거나 서비스가 재시작되지 않음

**해결**:
1. GitHub에 코드가 푸시되었는지 확인
2. Railway에서 자동 배포가 진행 중인지 확인
3. 수동으로 재배포: Railway > Service > **"Deploy"** > **"Redeploy"**

### 보안 주의사항

⚠️ **절대로 API 키를 코드에 하드코딩하지 마세요!**

- ✅ Railway Variables에만 저장
- ✅ `.env` 파일은 `.gitignore`에 포함
- ❌ GitHub에 API 키 커밋 금지
- ❌ 클라이언트 코드에 API 키 노출 금지

### 현재 설정된 환경 변수 목록

전체 환경 변수 목록을 확인하려면:

Railway > Backend 서비스 > **"Variables"** 탭

최소한 다음이 설정되어 있어야 합니다:
- `DATABASE_URL` (PostgreSQL 연결)
- `JWT_SECRET` (인증)
- `CORS_ORIGIN` (CORS 설정)
- `PORT` (포트 번호, 선택사항)
- `NODE_ENV=production`
- **`ACCOUNT_OPTIMIZATION_API_KEY`** (인스타그램 분석용)

---

## 배포 후 테스트

### 1. Health Check
```bash
curl https://cursor-production-1d92.up.railway.app/api/health
```

### 2. 계정 최적화 API 테스트
웹사이트에서:
1. 로그인
2. 설정(톱니바퀴) > **계정 최적화 조회** 클릭
3. 인스타그램 ID 입력 (예: `gono_92`)
4. **분석하기** 버튼 클릭
5. 결과 확인

정상 작동하면 프로필 정보와 분석 결과가 표시됩니다.

### 3. 로그 모니터링
Railway > Backend 서비스 > **"Deployments"** > 최신 배포 > **"View Logs"**

정상 로그 예시:
```
[AccountOptimization] Request received: { id: 'gono_92' }
[AccountOptimization] Using endpoint: https://api.growthcore.co.kr/...
[AccountOptimization] Calling GrowthCore API: ...
[AccountOptimization] GrowthCore response status: 200
[AccountOptimization] Parsed response: { status: 'success', hasResult: true }
[AccountOptimization] Returning successful response
```

에러 로그 예시:
```
[AccountOptimization] Request failed: Error: ...
[AccountOptimization] Error details: { name: '...', message: '...' }
```

---

## 문의

문제가 계속되면:
1. Railway 로그 전체 복사
2. 에러 메시지 캡처
3. 개발팀에 전달

