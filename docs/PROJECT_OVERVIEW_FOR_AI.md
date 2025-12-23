# 프로젝트 전체 구조 분석 가이드 (Gemini용)

## 📋 프로젝트 개요

**프로젝트명**: Hotseller CRM + Trendkit  
**목적**: 음식점 사업자를 위한 통합 영업·회계·마케팅 관리 시스템  
**주요 사용자**: 음식점 운영자, 영업팀, 회계 담당자

---

## 🏗️ 시스템 아키텍처

이 프로젝트는 **3개의 주요 파트**로 구성되어 있습니다:

### 1. **웹 클라이언트** (React + TypeScript)
- 위치: `/cursor/client/`
- 역할: 사용자가 보는 화면 (대시보드, 고객 관리, 영업 추적, 회계 등)
- 기술: React 18, TypeScript, Vite, TailwindCSS, Zustand (상태관리)

### 2. **백엔드 서버** (Node.js + Express)
- 위치: `/cursor/server/`
- 역할: 데이터 저장/조회, 외부 서비스 연동, 비즈니스 로직 처리
- 기술: Express, TypeScript, PostgreSQL
- 외부 연동: HotPepper API, Recruit API, Freee 회계, Slack 알림

### 3. **데이터 분석 도구** (Python)
- 위치: `/trendkit/`
- 역할: 구글 트렌드 + Google Ads 키워드 분석 자동화
- 기술: Python, pandas, matplotlib, Google Ads API, pytrends

---

## 📂 디렉토리 구조 상세

```
new/
├── cursor/                          # 메인 웹 애플리케이션
│   ├── client/                      # 프론트엔드 (React)
│   │   ├── src/
│   │   │   ├── pages/              # 15개 화면 페이지
│   │   │   ├── components/         # 재사용 UI 컴포넌트 14개
│   │   │   ├── store/              # 전역 상태 관리 (Zustand)
│   │   │   ├── types/              # TypeScript 타입 정의
│   │   │   └── lib/                # 유틸리티 함수
│   │   ├── package.json            # 의존성 관리
│   │   └── vite.config.ts          # 빌드 설정
│   │
│   └── server/                      # 백엔드 (Node.js)
│       ├── src/
│       │   ├── routes/             # 23개 API 엔드포인트
│       │   ├── services/           # 비즈니스 로직
│       │   ├── integrations/       # 외부 API 연동
│       │   ├── middleware/         # 인증/검증 미들웨어
│       │   └── utils/              # 헬퍼 함수
│       ├── database/               # DB 스키마 및 마이그레이션
│       └── package.json
│
├── trendkit/                        # Python 키워드 분석 도구
│   ├── __init__.py
│   ├── api.py                      # 메인 API 진입점
│   ├── pipeline.py                 # 데이터 파이프라인
│   ├── ads_client.py               # Google Ads 연동
│   ├── trends_client.py            # Google Trends 연동
│   ├── transforms.py               # 데이터 변환 로직
│   ├── viz.py                      # 차트 생성
│   └── report.py                   # HTML/PDF 보고서
│
├── scripts/                         # 데이터 마이그레이션/배포 스크립트
├── docs/                           # 프로젝트 문서
├── hotpepper/                      # HotPepper 음식점 마스터 데이터
├── data/                           # 분석 데이터 저장소
└── requirements.txt                # Python 의존성
```

---

## 🎯 핵심 기능 모듈

### A. 영업 관리
**관련 파일**:
- `client/src/pages/SalesTrackingPage.tsx` - 영업 기회 추적 화면
- `client/src/pages/CustomersPage.tsx` - 고객사 관리
- `client/src/pages/RetargetingPage.tsx` - 재영업 대상 관리
- `server/src/routes/salesTracking.ts` - 영업 데이터 API
- `server/src/routes/retargeting.ts` - 재영업 API
- `server/database/add-sales-tracking.sql` - 영업 추적 테이블

**주요 기능**:
- 영업 기회 등록 (신규/기존 고객)
- 상태 관리 (신규→진행중→계약/실패)
- 재영업 대상 자동 분류
- Slack 알림 연동

### B. 회계 관리
**관련 파일**:
- `client/src/pages/AccountingPage.tsx` - 회계 메인 화면 (6079줄)
- `client/src/pages/InvoicePage.tsx` - 청구서 관리
- `server/src/routes/accounting.ts` - 회계 API (1730줄)
- `server/src/routes/invoices.ts` - 청구서 API
- `server/database/accounting-schema.sql` - 회계 테이블
- `server/database/freee-invoices-schema.sql` - Freee 연동

**주요 기능**:
- 수입/지출 기록 및 분류
- 자동 매칭 규칙 (은행 거래 자동 분류)
- 청구서 생성 및 PDF 다운로드
- Freee 회계 시스템 연동
- 월별 급여 관리
- 자본금 입출금 추적

### C. 마케팅 분석
**관련 파일**:
- `client/src/pages/AccountOptimizationPage.tsx` - 계정 최적화 (키워드 분석)
- `client/src/pages/KeywordAnalysisPage.tsx` - 키워드 상세 분석
- `server/src/routes/keywordAnalysis.ts` - 키워드 분석 API
- `trendkit/api.py` - Python 분석 엔진 진입점
- `trendkit/pipeline.py` - 데이터 수집 파이프라인

**주요 기능**:
- Google Trends 트렌드 분석
- Google Ads 검색량 조회
- Google Places 매장 정보 수집
- 월별/요일별 트렌드 시각화
- HTML/PDF 보고서 자동 생성

### D. 외부 플랫폼 연동
**관련 파일**:
- `client/src/pages/HotpepperPage.tsx` - 핫페퍼 매장 관리
- `server/src/routes/hotpepper.ts` - HotPepper API
- `server/src/routes/recruit.ts` - Recruit Places API
- `server/src/integrations/` - 외부 서비스 클라이언트

**연동 서비스**:
1. **HotPepper** (일본 음식점 예약 플랫폼)
   - 매장 정보 크롤링
   - 폼 제출 정보 수집
   - 홈페이지 유무 체크

2. **Recruit Places** (리쿠르트 매장 정보)
   - 매장 검색 및 상세 정보
   - 실시간 데이터 동기화

3. **Freee** (일본 회계 소프트웨어)
   - OAuth 인증
   - 청구서 자동 발행
   - 거래 내역 동기화

4. **Slack** (팀 협업 도구)
   - 영업 기회 알림
   - 청구서 발행 알림
   - 에러 로그 전송

### E. 대시보드 & 분석
**관련 파일**:
- `client/src/pages/DashboardPage.tsx` - 메인 대시보드
- `client/src/pages/PerformancePage.tsx` - 성과 분석
- `server/src/routes/dashboard.ts` - 대시보드 데이터
- `server/src/routes/totalSales.ts` - 전체 매출 통계

**주요 기능**:
- 월별 매출 현황
- 영업 성과 지표 (전환율, 계약 건수)
- 미수금 및 예정 수입
- 고객사 증가 추이

---

## 🗄️ 데이터베이스 구조

**사용 DB**: PostgreSQL

### 주요 테이블

| 테이블명 | 역할 | 스키마 파일 |
|---------|------|------------|
| `users` | 사용자 계정 (직원/관리자) | `schema.sql` |
| `employees` | 직원 상세 정보 | `employees-schema.sql` |
| `restaurants` | 고객사 (음식점) 정보 | `restaurants-schema.sql` |
| `sales_tracking` | 영업 기회 추적 | `add-sales-tracking.sql` |
| `retargeting` | 재영업 대상 관리 | 관련 마이그레이션 다수 |
| `accounting_entries` | 회계 거래 기록 | `accounting-schema.sql` |
| `invoices` | 청구서 | `schema.sql` |
| `freee_invoices` | Freee 청구서 동기화 | `freee-invoices-schema.sql` |
| `monthly_payroll` | 급여 대장 | `monthly-payroll-schema.sql` |
| `total_sales` | 월별 전체 매출 | `total-sales-schema.sql` |
| `hotpepper_places` | HotPepper 매장 정보 | `hotpepper-schema.sql` |
| `inquiry_leads` | 문의 리드 | `inquiry-leads-schema.sql` |
| `auto_matching_rules` | 회계 자동 매칭 규칙 | `auto-matching-rules-schema.sql` |
| `capital_deposits` | 자본금 내역 | `capital-deposits-schema.sql` |

---

## 🔄 데이터 흐름

### 1. 영업 프로세스
```
신규 리드 발굴
  ↓
[SalesTrackingPage] 영업 기회 등록
  ↓
[POST /api/sales-tracking] 서버에 저장
  ↓
[Slack 알림] 팀에 통보
  ↓
상태 업데이트 (진행중 → 계약/실패)
  ↓
계약 시 → [CustomersPage] 고객사로 전환
실패 시 → [RetargetingPage] 재영업 대상으로 이동
```

### 2. 회계 프로세스
```
거래 발생 (수입/지출)
  ↓
[AccountingPage] 수동 입력 또는 Freee 동기화
  ↓
[자동 매칭 규칙] 카테고리 자동 분류
  ↓
[월별 집계] 손익계산서 생성
  ↓
[청구서 발행] PDF 생성 → Freee 전송 → Slack 알림
```

### 3. 키워드 분석 프로세스
```
[AccountOptimizationPage] 키워드 입력
  ↓
[POST /api/keyword-analysis] Node.js 서버
  ↓
[Python Trendkit] subprocess 호출
  ↓
병렬 데이터 수집:
  - Google Trends (pytrends)
  - Google Ads (검색량)
  - Google Places (매장 정보)
  ↓
[데이터 변환] 월별/요일별 집계
  ↓
[시각화] 차트 생성
  ↓
[응답] JSON으로 프론트에 반환
  ↓
[화면 표시] 인터랙티브 차트 + 캡처 기능
```

---

## 🔐 인증 & 보안

**인증 방식**: JWT (JSON Web Token)

**관련 파일**:
- `server/src/routes/auth.ts` - 로그인/회원가입 API
- `server/src/middleware/` - JWT 검증 미들웨어
- `client/src/pages/LoginPage.tsx` - 로그인 화면

**보안 특징**:
- 비밀번호 bcrypt 해싱
- 토큰 기반 세션 관리
- 역할 기반 접근 제어 (관리자/일반 직원)
- API 키는 환경변수로 관리 (.env)

---

## 🛠️ 기술 스택 요약

### 프론트엔드
- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 빌드 도구
- **TailwindCSS** - 스타일링
- **Zustand** - 상태 관리
- **Recharts** - 차트 시각화
- **React Router** - 페이지 라우팅
- **Axios** - HTTP 클라이언트

### 백엔드
- **Node.js 20+** - 런타임
- **Express** - 웹 프레임워크
- **TypeScript** - 타입 안전성
- **PostgreSQL** - 데이터베이스
- **JWT** - 인증
- **Multer** - 파일 업로드
- **Puppeteer** - 웹 스크래핑
- **PDFKit** - PDF 생성

### 데이터 분석
- **Python 3.10+** - 런타임
- **pandas** - 데이터 처리
- **matplotlib/plotly** - 차트
- **Google Ads API** - 검색량 조회
- **pytrends** - Google Trends
- **Jinja2** - HTML 템플릿
- **WeasyPrint** - PDF 변환

### 외부 서비스
- **HotPepper API** - 음식점 데이터
- **Recruit Places API** - 매장 검색
- **Freee API** - 회계 연동
- **Slack API** - 알림
- **Google Places API** - 지도 정보

---

## 📦 배포 환경

**프론트엔드**: Vercel (자동 배포)
- 파일: `client/vercel.json`
- API 프록시 설정 포함

**백엔드**: Railway (PostgreSQL 포함)
- 파일: `railway.json`, `RAILWAY-DB-INFO.md`
- 환경변수로 DB 연결

**Python**: 서버 내장 (subprocess)
- Node.js에서 직접 호출
- 환경변수: `TRENDKIT_PYTHON_BIN`

---

## 🧪 테스트 & 개발

### 로컬 실행 방법

**프론트엔드**:
```bash
cd cursor/client
npm install
npm run dev
# → http://localhost:5173
```

**백엔드**:
```bash
cd cursor/server
npm install
npm run dev
# → http://localhost:3001
```

**Python 도구**:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python cli.py validate
```

### 테스트 파일
- `tests/test_transforms.py` - Python 데이터 변환 테스트
- 서버는 수동 테스트 위주 (E2E 테스트 없음)

---

## 📝 주요 문서

| 파일명 | 내용 |
|-------|------|
| `README.md` | Trendkit 사용법 |
| `docs/PROJECT_STRUCTURE.md` | 프로젝트 구조 상세 |
| `docs/HOTPEPPER-SETUP.md` | HotPepper 크롤러 설정 |
| `docs/SLACK-SETUP-GUIDE.md` | Slack 연동 가이드 |
| `docs/TROUBLESHOOTING.md` | 문제 해결 |
| `cursor/server/DEPLOY.md` | 배포 가이드 |
| `RAILWAY-DB-INFO.md` | Railway DB 설정 |

---

## 🎓 코드 컨벤션

### 파일 명명
- **페이지**: `XxxPage.tsx` (예: `DashboardPage.tsx`)
- **컴포넌트**: `PascalCase.tsx` (예: `SalesCard.tsx`)
- **라우트**: `camelCase.ts` (예: `salesTracking.ts`)
- **스키마**: `kebab-case.sql` (예: `add-sales-tracking.sql`)

### API 엔드포인트 패턴
- `GET /api/{resource}` - 목록 조회
- `GET /api/{resource}/:id` - 단건 조회
- `POST /api/{resource}` - 생성
- `PUT /api/{resource}/:id` - 수정
- `DELETE /api/{resource}/:id` - 삭제

### 폴더 구조 원칙
- **client**: UI 관련만 (상태, 라우팅, 스타일)
- **server**: 비즈니스 로직, DB, 외부 API
- **trendkit**: 순수 Python 패키지 (Node 의존성 없음)

---

## ❓ Gemini가 분석할 만한 주요 질문들

### 아키텍처
1. 이 시스템의 전체 데이터 흐름은 어떻게 되나요?
2. Node.js와 Python이 어떻게 연동되나요?
3. 프론트엔드-백엔드 간 통신 방식은?
4. 데이터베이스 스키마의 관계는?

### 기능
5. 영업 추적은 어떻게 작동하나요?
6. 회계 자동 매칭 규칙은 어떻게 구현되었나요?
7. 키워드 분석 결과는 어떻게 시각화되나요?
8. Freee 연동은 어떤 데이터를 주고받나요?

### 코드 품질
9. 가장 복잡한 파일은 무엇이고 리팩토링이 필요한가요?
10. 에러 핸들링은 충분한가요?
11. 보안 취약점은 없나요?
12. 성능 최적화가 필요한 부분은?

### 확장성
13. 새 기능을 추가하려면 어디를 수정해야 하나요?
14. 다른 외부 서비스를 연동하려면?
15. 멀티테넌트(여러 회사 지원)로 확장하려면?
16. 모바일 앱을 추가하려면 어떻게 해야 하나요?

---

## 💡 개선 제안 포인트

### 우선순위 높음
- **테스트 커버리지**: 프론트/백엔드 모두 단위 테스트 부족
- **에러 로깅**: 중앙화된 에러 추적 시스템 없음 (Sentry 등)
- **API 문서**: Swagger/OpenAPI 문서 없음
- **타입 일관성**: 프론트-백엔드 간 타입 공유 안 됨

### 우선순위 중간
- **코드 중복**: 일부 API 라우트에서 비슷한 로직 반복
- **성능**: 회계 페이지(6079줄)와 API(1730줄)가 너무 큼 → 분할 필요
- **캐싱**: 반복 조회 데이터에 Redis 캐싱 없음
- **국제화**: 현재 일본어/한국어 하드코딩 → i18n 체계화

### 우선순위 낮음
- **모니터링**: 서버 상태 모니터링 대시보드 없음
- **백업**: 자동 DB 백업 스크립트 없음
- **CI/CD**: 자동화된 테스트 파이프라인 없음

---

## 📞 연락 & 지원

프로젝트 관련 질문이나 Gemini가 추가로 분석해야 할 부분이 있다면:
- 특정 파일의 상세 분석 요청
- 특정 기능의 흐름도 생성
- 리팩토링 제안
- 보안 감사

위 내용을 기반으로 질문해주세요!

---

**작성일**: 2025-12-22  
**버전**: 1.0  
**대상 독자**: AI 분석 도구 (Gemini, Claude 등)


