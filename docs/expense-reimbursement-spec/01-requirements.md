# 経費申請・精算 (Expense Reimbursement) — Phase 1: Requirements

> 일본 사무실 직원용 경비 신청·정산 시스템 (CRM ERP 내장)
> 설계 축 2개: **① 精算あり/なし 분기** · **② 일본 세무 대응(인보이스 T번호 + 電子帳簿保存法)**
> 기존 `educationRequest`(신청→승인→지급→완료) + `healthCheckup`(사후보고) 패턴 재활용, freee 会計 API 연동

---

## 0. 사전 확정 사항 (사용자 결정 반영)

| # | 결정 | 내용 |
|---|---|---|
| Q1 | **4카테고리 전부 1차** | 交通費·食事·立替経費·法人カード/AIツール 모두 1차 구현 |
| Q2 | **자체 OCR 미구현** | 영수증은 사진 업로드 중심. OCR은 **freee 파일박스 API**에 위임(자체 gpt-vision 없음) |
| Q3 | **freee 취引 자동생성** | 실현가능성 확인 완료(✅). 승인 시 freee `deals` 자동생성 (사람 1-click confirm 경유) |
| Q4 | **정기결제 = ERP in-app 알림** | Slack 미사용. 담당자가 ERP 접속 시 "처리할 것 있음" 팝업/뱃지로 표시 |

### freee 실현가능성 확정 (스파이크 결과)
- 현재 OAuth 스코프 `read write` 로 **receipts / deals / account_items / taxes 전부 접근 가능 — 추가 스코프 불필요**
- `POST /api/1/receipts`(파일박스 업로드) → freee OCR → `GET /api/1/receipts/{id}.receipt_metadatum`(금액·발행일·거래처 + `invoice_registration_number` T번호) 회수
- `POST /api/1/deals`(`type=expense`, `receipt_ids[]`, `details[account_item_id, tax_code, amount]`) 로 영수증 첨부 경비전표 생성
- OCR은 **비동기** → 업로드 후 `GET /receipts/{id}` 폴링 필요
- **HEIC → JPEG 서버변환 필수**(freee OCR 포맷: JPEG/PNG/GIF/PDF)
- 税区分 経過措置/軽減은 `GET /api/1/taxes/companies/{id}.display_category`(`tax_*_e80`/`tax_*_e50`/`tax_r8`)로 조회 — 사용일 기준 e80/e50 스위칭
- 経費申請(expense_applications) 워크플로우 API는 **Professional+ 플랜 게이트 → 미사용**. 승인 워크플로우는 CRM이 소유

---

## 1. 배경 / 목표

- 직원이 **개인 돈으로 먼저 낸 경비(立替)** 또는 **회사카드 결제(SaaS·AIツール)** 를 폰으로 사진 찍어 직접 신청
- 담당자(경리)가 승인 → 정산あり건은 이체 후 지급완료, 정산なし건은 회계 반영만
- 승인건은 **freee에 영수증+전표 자동 반영**, 세무 검색요건(電帳法)은 구조화 데이터로 자동 충족
- **정기결제(AIツール 월구독)** 는 매월 자동으로 경비 초안 생성 + 담당자에게 영수증 첨부 리마인드

## 2. 사용자 / 역할

| 역할 | 권한 |
|---|---|
| 일반 직원 | 경비 신청 등록·임시저장·본인 수정/취소(승인 전), **본인 것만 조회** |
| 담당자 (`role='admin'` 또는 `'office_assistant'`) | 위 권한 + 승인/반려, 정산 지급 처리, freee 반영, 정기결제 마스터 관리, **전체 조회**·CSV export |

> **접근제어 원칙 (★확정)**: **ERP(직원) 화면 = 본인이 작성한 건만** 노출. **admin(담당자) 화면 = 전체.**
> - 직원용 `GET /requests`·`/requests/:id`·`/pending-summary`·`/subscriptions` → `WHERE user_id = 본인`(구독은 `owner_user_id = 본인`)
> - 담당자용 `GET /admin/*` → 전체. 상세/다운로드/액션은 reviewer 통과
> - 타인 리소스 직접 접근 시 403 (educationRequest 권한 패턴)

> 승인자 판정은 기존 `requireAppAccess('erp')` + `role IN ('admin','office_assistant')` 재사용 ([educationRequest.ts](../../cursor/server/src/routes/educationRequest.ts) 패턴).
> 고액 건 2차 승인(CEO)은 1차 범위 외 — 필요 시 `high_amount_flag` 임계값 토글로 후속 추가.

---

## 3. 설계 축 ① — 精算あり / 精算なし

신청 첫 단계에서 정산 유형을 고르면 이후 필드와 승인 후 처리가 자동 분기된다.

| | **精算あり** (정산 필요) | **精算なし** (정산 불요) |
|---|---|---|
| 상황 | 직원이 개인 돈으로 먼저 냄 | 회사가 이미 결제함 |
| 예시 | 立替経費, 개인카드 교통비/식대 | 회사카드 결제(AIツール, SaaS) |
| 처리 | 승인 → 지급대기 → 이체 → 지급완료 | 승인 → 회계 반영만 |
| 필수 추가 | 입금 계좌 | 결제 카드 |

---

## 4. 설계 축 ② — 카테고리 (4종 + 공통)

### 4.0 공통 필드 (모든 카테고리)
- 신청자 / 신청일 (자동)
- **사용일(使用日)** ★電帳法 검색키
- **금액(税込)** / 세율(10% / 8%軽減) / 소비세액 ★電帳法 검색키
- **거래처·점포명(取引先)** ★電帳法 검색키
- **인보이스 번호(T+13자리)** — freee OCR 자동추출값 prefill
- **영수증 파일**(이미지/PDF) — freee 파일박스 push 대상
- 계정과목(freee `account_item` 매핑, 카테고리별 기본값 자동세팅)
- 정산 유형 / 비고

### 4.1 交通費 (transport)
- 이동수단: 電車·バス / タクシー / 신칸센 / 기타
  - **電車·バス & 税込 3만엔 미만** → 公共交通機関特例: 영수증·T번호 불필요 → **T번호·영수증 필드 숨김**
  - **タクシー** → 인보이스 필수 → T번호 필드 표시
- 출발지 → 도착지, 왕복/편도, 목적(방문처)
- **기간(시작일~종료일)**: 定期券·복수건 일괄 신청용

### 4.2 食事 (meal — 会議費 / 接待交際費)
- 목적: 사내회의 / 접대 / 복리후생
- **참석 인원수** ★핵심
- 참석자(사내/사외 이름)
- → **1인당 금액 자동계산 + 会議費/接待交際費 자동 태깅**
  - 사외 포함 & 1인당 **1만엔 이하 = 会議費**(令和6年度改正, 5천→1만엔 상향 반영)
  - 초과 or 접대성 = **接待交際費**

### 4.3 立替経費 (reimburse — 별도 입금 필요건)
- **지급 계좌**(신청 시마다 입력 — 계좌 마스터 미저장. `meta`에 보관)
- 품목 / 사용 목적

### 4.4 法人カード·AIツール (corp_card)
- 결제 카드(어느 카드), 서비스명
- **정기결제 여부**(월/년 구독) → §8 정기결제 마스터 연동
- 정산 불요 → 계좌 필드 없음

> 카테고리별 확장 필드는 `meta JSONB` 단일 컬럼으로 저장 (테이블 미증가).

---

## 5. 상태 워크플로우

### 5.1 精算あり (reimburse_required)
```
draft → pending → approved → payment_pending → paid → completed
                     ↘ rejected      (반려)
        (본인 취소: draft 삭제 / pending·approved → cancelled)
```
- `approved` 시 freee 취引 자동생성(사람 confirm) — §7
- `payment_pending`: 승인됐고 이체 대기 (담당자 이체 실행 전)
- `paid`: 담당자 이체 완료 마킹 (은행 API 없음, 수동 마킹 — educationRequest `mark_paid` 패턴)
- `completed`: 정산·회계 반영 모두 끝

### 5.2 精算なし (already_paid)
```
draft → pending → approved → recorded
                     ↘ rejected
```
- `recorded`: freee 반영 완료(회계 기록만, 지급 단계 없음)

### 5.3 정기결제 자동생성 초안
```
awaiting_receipt → (영수증 첨부) → pending → … (5.2 흐름)
```
- `awaiting_receipt`: 크론이 매월 생성한 초안, 영수증 미첨부 상태 → **ERP in-app 알림 대상**

> 모든 상태 전이는 `status_history`에 기록 (電帳法 真実性 요건).

---

## 6. 세무 대응 요구사항 (Functional)

### 6.1 인보이스 T번호 + 少額特例
- T번호 필드는 freee OCR `invoice_registration_number` 로 prefill
- **少額特例**(基準期間 課税売上高 1억엔 이하 → 税込 1만엔 미만은 T번호 없어도 仕入税額控除, ~2029.9): 소액건은 T번호 없어도 경고만, 차단하지 않음
- 고액건(1만엔 이상)에서 T번호 없으면 **경고 뱃지** 표시

### 6.2 電子帳簿保存法
- **검색요건**: 사용일·금액·거래처를 구조화 컬럼으로 저장 → 리스트 검색·필터·CSV export로 자동 충족
- **真実性**: `status_history` 상태변경 이력 + 소프트삭제(`deleted_at`)
- **원본 보존**: 영수증 원본은 **freee 파일박스**(電帳法 대응 스토리지)에 보관, CRM은 참조용 사본(Base64) + `file_hash` + `uploaded_at` 메타데이터
- 電子取引(PDF SaaS 영수증)·スキャナ保存(종이 사진) 모두 업로드→freee push로 대응

### 6.3 会議費 / 接待交際費 자동판정
- §4.2 인원수 입력 → 1인당 금액 계산 → 계정과목 자동 태깅 (담당자 수정 가능)

### 6.4 経過措置 税区分 (freee 연동)
- freee `taxes/companies/{id}.display_category` 에서 사용일 기준 코드 선택:
  - **사용일 ≤ 2026-09-30** → `tax_*_e80` (80% 控除)
  - **사용일 ≥ 2026-10-01** → `tax_*_e50` (50% 控除)
  - 軽減8% → `tax_r8`(+`_e80`/`_e50`)
- 税込 vs 8%軽減 구분은 신청 폼 세율 선택값 기준

---

## 7. freee 연동 요구사항

### 7.1 업로드 시 (신청 제출)
1. 영수증 파일 수신 → **HEIC면 JPEG 변환**
2. `POST /api/1/receipts` (파일박스 업로드) → `receipt_id` 저장
3. `GET /api/1/receipts/{id}` **폴링**(비동기 OCR 완료까지, 타임아웃·재시도) → `receipt_metadatum{amount, issue_date, partner_name}` + `invoice_registration_number` 로 폼 **prefill**
4. 직원/담당자가 OCR값 확인·수정

### 7.2 승인 시 (담당자 confirm)
1. 계정과목·税区分 매핑값 확정 (기본값 자동, 수정 가능)
2. `POST /api/1/deals` — `type=expense`, `receipt_ids:[receipt_id]`, `details[{account_item_id, tax_code(e80/e50 by 사용일), amount}]`
3. 생성된 `deal_id` 저장, 상태 `recorded`/`completed` 진행

### 7.3 매핑 마스터 (관리 화면)
- `GET /api/1/account_items` / `taxes/companies/{id}` / `partners` 조회 → **카테고리·세율 → account_item_id·tax_code 매핑 테이블** (담당자 편집)
- 未매핑 시 승인 단계에서 담당자가 수동 선택

### 7.4 토큰 안정성
- 기존 `freee_tokens` 단일토큰 + refresh(6h TTL, refresh 90d rotating) 재사용
- refresh 실패 시 재인증 안내 (기존 Admin freee 재인증 UI)

---

## 8. 정기결제 (定期決済) 요구사항

### 8.1 구독 마스터 (`expense_subscriptions`)
- 서비스명, 결제 카드, 카테고리(기본 corp_card), 월/년 주기, **결제일(billing_day)**, 예상 금액, 세율, active 토글, 기간(시작~종료)
- **`owner_user_id`** — 서비스 소유 직원 (영수증 첨부 책임자)

### 8.2 매월 자동 초안 생성 (cron)
- **node-cron, 매일 JST 09:00** 체크 → 그날이 결제일인 활성 구독 → 소유 직원 명의로 `expense_requests` 초안(`status='awaiting_receipt'`) 생성 (멱등: `(subscription_id, billing_month)` 유니크)
- 기존 [snackFixedCron](../../cursor/server/src/services/snackFixedCron.ts) 패턴 재사용

### 8.3 ERP in-app 알림 (Slack 미사용)
- `GET /api/expense/pending-summary` → 역할별 카운트
- **서비스 소유 직원**: ERP 접속 시 팝업/뱃지 "정기결제 영수증 미첨부 N건" → 본인 초안 리스트로 이동 → 영수증 첨부 → pending 진입
- **담당자**: "승인대기 M건" 뱃지 → 승인 리스트로 이동
- 영수증 첨부 책임 = **서비스 소유 직원**(담당자 아님), 담당자는 전체 미첨부 현황만 조회

---

## 9. 화면 / 라우트

### 신청자 (모바일 우선)
| ID | 화면 | 경로 |
|---|---|---|
| S-1 | 경비 신청 메인 (내 이력 + 상태탭 + 신규버튼) | `/erp/expense` |
| S-2 | 신청 모달 (카테고리 카드 → 정산유형 → 사진 업로드 → OCR prefill → 필드 확인) | S-1 내 |

### 담당자 (기존 신청처리 UI 재활용)
| ID | 화면 | 경로 |
|---|---|---|
| A-1 | 경비 승인·정산 관리 (상태탭·아코디언·상태별 액션) | `/erp/admin/expense` |
| A-2 | 정기결제 마스터 관리 | A-1 내 탭 or `/erp/admin/expense/subscriptions` |
| A-3 | freee 매핑 마스터 (계정과목·税区分) | A-1 내 설정 |

- 상태탭: 승인대기 / 승인됨 / 지급대기 / 지급완료 / 반려 / 영수증대기 / 전체
- 리스트: 신청자·카테고리·금액·사용일·거래처 + T번호 유무 뱃지 + freee 반영 뱃지
- 상세: 영수증 미리보기 + 계정과목·税区分 편집 + 승인/반려/지급/freee반영
- 검색·필터(날짜·금액·거래처) = 電帳法 검색요건 겸용, **CSV export**

> UI 템플릿: 신청자 = [EducationPage.tsx](../../cursor/client/src/pages/Erp/EducationPage.tsx), 담당자 = [EducationApprovalsPage.tsx](../../cursor/client/src/pages/Erp/admin/EducationApprovalsPage.tsx). ERP 메뉴 = [ErpLayout.tsx](../../cursor/client/src/components/ErpLayout.tsx) "복리후생" 그룹 옆 신설.

---

## 10. 비기능 요구사항 (Non-Functional)

| 항목 | 요구사항 |
|---|---|
| 언어 | 日本語 UI 기본 + ko 동시등록 (기존 `useI18nStore` ja/ko) |
| 인증/권한 | `authMiddleware` + `requireAppAccess('erp')`, 담당자 = `admin`/`office_assistant` |
| 시간대 | **Asia/Tokyo (JST)** — 사용일·결제일·크론 모두 JST |
| DB | 기존 PostgreSQL + `autoMigrate` 멱등 패턴 |
| 파일 | 업로드 memoryStorage → CRM은 Base64 사본, 원본은 freee 파일박스. **HEIC→JPEG 변환**. 20MB 제한 |
| Cron | `node-cron` 정기결제 초안생성 (매일 09:00 JST) + startup 1회 |
| freee | OCR **비동기 폴링**, 토큰 refresh, 未매핑 fallback |
| 모바일 | Tailwind 반응형, 파일 input(카메라/앨범), 모달 `max-h-[90vh] overflow-y-auto` |

---

## 11. 데이터 모델 스케치

```
expense_requests
  id, user_id
  category            -- transport / meal / reimburse / corp_card
  settlement_type     -- reimburse_required / already_paid
  used_at (date)      ★검색키
  amount_incl_tax, tax_rate, amount_tax
  vendor_name         ★검색키
  invoice_number      -- "T..." (freee OCR prefill)
  account_item_id, tax_code   -- freee 매핑
  purpose, memo
  status              -- §5 상태값
  meta (jsonb)        -- 카테고리별 확장필드(교통 구간/기간, 식사 인원/참석자 등)
  freee_receipt_id, freee_deal_id
  subscription_id     -- 정기결제 초안이면 FK
  created_at, updated_at, deleted_at   ★真実性

expense_attachments
  id, request_id, file_name, mime_type, file_data(base64), file_hash, uploaded_at

expense_payments    -- 精算あり건만
  id, request_id, payee_account, paid_amount, paid_at, status

expense_subscriptions   -- 정기결제 마스터
  id, service_name, card, category, cycle(month/year), billing_day,
  amount, tax_rate, active, start_date, end_date

status_history
  id, request_id, from_status, to_status, actor_id, reason, created_at
```

---

## 12. 범위 외 (Out of Scope, 1차)

- 은행 이체 API 연동 (지급은 수동 이체 + 마킹)
- freee 経費申請(expense_applications) 워크플로우 (플랜 게이트)
- 자체 OCR 엔진 (freee OCR 사용)
- 고액 2차 승인(CEO) — 후속 토글
- 예산·한도 관리, 회계 리포트/차트
- 다국어 3개국 이상

---

## 13. 완료 기준 (Acceptance Criteria)

- [ ] 직원이 `/erp/expense`에서 사진 업로드 → freee OCR로 금액·사용일·거래처·T번호 prefill → 4카테고리별 필드 입력 → 제출
- [ ] 精算あり: 승인 → 지급대기 → 지급완료(마킹) → completed 흐름 동작
- [ ] 精算なし: 승인 → recorded (freee 취引 자동생성 confirm) 동작
- [ ] 交通(電車·バス 3만엔 미만)은 T번호·영수증 필드 숨김, タクシー는 표시
- [ ] 食事 인원수 입력 → 1인당 금액·会議費/接待交際費 자동 태깅
- [ ] 승인 시 freee `deals` 자동생성, `receipt_ids` 첨부, 사용일 기준 e80/e50 税区分 적용
- [ ] 정기결제 마스터 등록 → 결제일에 초안 자동생성 → ERP in-app 팝업으로 담당자에 미첨부 알림
- [ ] 날짜·금액·거래처 검색/필터 + CSV export (電帳法 검색요건)
- [ ] status_history 상태이력 기록, 소프트삭제 동작
- [ ] 日本語 UI 전체 번역, ko 토글 동작
- [ ] `tsc --noEmit` 통과, 서버 재시작 시 마이그레이션 자동 적용(멱등)

---

## 14. 열린 확인 항목 (Phase 2 진입 전)

1. **freee 회사(사업소) 확정** — 다중 사업소면 `company_id` 선택 UI 필요? (현재 단일 가정) → Design에서 `invoices.ts`의 company_id 사용 방식 확인
2. ~~정기결제 초안 담당 주체~~ → **확정: 서비스 소유 직원**(`owner_user_id`)
3. ~~직원 계좌 마스터~~ → **확정: 매번 신청 시 입력**(계좌 마스터 미저장, `meta` 보관)
4. **고액 임계값·2차 승인** 필요 여부 (기본: 단일 승인) — 후속 토글로 남김
```
