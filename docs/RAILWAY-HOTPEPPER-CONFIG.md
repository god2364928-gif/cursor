# Railway 환경 변수 설정 (핫페퍼 API)

## ⚠️ 필수 작업: Railway 대시보드에서 환경 변수 추가

Railway 서버가 핫페퍼 API를 사용하려면 환경 변수를 추가해야 합니다.

### 설정 방법 (5분 소요)

#### 1단계: Railway 대시보드 접속
- 웹브라우저에서 https://railway.app 접속
- 로그인

#### 2단계: 프로젝트 선택
- 대시보드에서 현재 프로젝트 클릭
- "cursor-production-1d92" 또는 유사한 이름의 프로젝트

#### 3단계: 서버 서비스 선택
- 프로젝트 안에서 **서버(server)** 서비스 클릭
- (클라이언트가 아니라 서버임에 주의)

#### 4단계: Variables 탭 이동
- 상단 탭 중 **"Variables"** 클릭

#### 5단계: 새 환경 변수 추가
- **"New Variable"** 버튼 클릭
- 다음 정보 입력:
  ```
  Variable Name: HOTPEPPER_API_KEY
  Value: ea23188c08fd9123
  ```
- **"Add"** 버튼 클릭

#### 6단계: 자동 재배포 대기
- 환경 변수 추가 시 자동으로 재배포 시작
- 약 2-3분 소요
- "Deployed" 상태가 되면 완료

---

## ✅ 완료 확인

### 방법 1: Railway 로그 확인
1. Railway 대시보드에서 서버 서비스 선택
2. "Deployments" 탭 클릭
3. 최신 배포 클릭
4. 로그에서 다음 메시지 확인:
   ```
   ✅ hotpepper_restaurants table created successfully
   ```
   또는
   ```
   ✓ hotpepper_restaurants table already exists
   ```

### 방법 2: 웹 인터페이스 확인
1. CRM 웹사이트 접속 (https://your-vercel-url.vercel.app)
2. 로그인
3. 좌측 메뉴에 **"맛집 검색"** 항목이 표시되는지 확인
4. 클릭하여 페이지가 정상적으로 열리는지 확인

---

## 🧪 테스트 방법

환경 변수 설정 후:

1. **첫 번째 검색**
   - 지역: "도쿄" 선택
   - "검색 및 저장" 버튼 클릭
   - 결과가 하단 테이블에 표시되는지 확인

2. **키워드 검색**
   - 키워드: "ラーメン" 입력
   - "검색 및 저장" 버튼 클릭

---

## 현재 상태

✅ **로컬 환경**
- .env 파일 생성 완료
- API 키 설정 완료
- 데이터베이스 테이블 생성 완료

⏳ **Railway 배포 환경**
- 데이터베이스 테이블 생성 완료
- ⚠️ **환경 변수 추가 필요** (위 단계 수행)

---

## 문제 발생 시

### "HOTPEPPER_API_KEY is not configured" 오류
→ Railway 환경 변수가 아직 추가되지 않음. 위 단계 다시 확인

### API 응답 없음
→ Railway 재배포 완료되었는지 확인

### 기타 문제
→ Railway 로그 확인 (Deployments → 최신 배포 → View logs)






