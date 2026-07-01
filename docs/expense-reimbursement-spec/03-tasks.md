# 経費申請・精算 — Phase 3: Tasks

> Phase 2 설계를 구현 가능한 단위로 분해. 각 태스크는 독립 검증 가능, DoD 명시.
> Phase 4에서 Builder/Worker sub-agent가 태스크별 실행 (Evaluator 80점 기준).

---

## 의존성 그래프
```
T1 (DB migration) ──┬─→ T5 T6 T7 (routes)
T2 (lib: tax/date) ─┼─→ T4 T5 T6
T3 (freeeClient 확장)┴─→ T4 (freee service) ─→ T6
T9 (i18n) ─── 독립
T10 (api/types) ─── 계약만 있으면 → T11 T12 T13 T14
T15 (배선) ─── T5·T11 필요
T16 (검증) ─── 전부 후
```

## 실행 단계 (Phase 4)
| Stage | 병렬 태스크 |
|---|---|
| 4.1 Foundation | T1 (DB) + T2 (lib) + T3 (freeeClient) — 병렬 |
| 4.2 Backend | T4 (freee svc) → T5 + T6 + T7 + T8 — 병렬 |
| 4.3 Frontend prep | T9 (i18n) + T10 (api/types) — 병렬 |
| 4.4 Frontend UI | T11 + T12 + T13 + T14 — 병렬 (T10 후) |
| 4.5 Wiring | T15 (라우트·네비·index 배선) |
| 4.6 검증 | T16 (빌드 + 수동 E2E + 마이그레이션 확인) |

---

## T1. DB 마이그레이션 + autoMigrate
**파일:** `migrations/add_expense_reimbursement.sql`(신규) · `src/migrations/autoMigrate.ts`(수정) · `src/index.ts`(수정)

**작업:**
1. 6테이블 SQL (§Design 1) — **`expense_subscriptions`를 `expense_requests`보다 먼저 생성**(FK 순서). 인덱스·유니크·CHECK 포함
2. `autoMigrateExpenseReimbursement()` — 6개 테이블 존재 확인 후 없으면 실행
3. `index.ts` L48 import + `startServer()` L~282 호출 추가

**DoD:**
- [ ] 서버 재시작 시 6테이블 자동 생성, 두 번 실행해도 에러 없음(`IF NOT EXISTS`)
- [ ] `\d expense_requests`로 컬럼·인덱스·CHECK 확인
- [ ] `subscription_id` FK가 `expense_subscriptions` 참조 정상

---

## T2. 세무·날짜 라이브러리
**파일:** `src/lib/expenseTax.ts`(신규) · `src/lib/expenseDate.ts`(신규)

**작업:** `classifyMeal`, `isPublicTransportException`, `isSmallAmountSpecial`, `taxDisplayCategory` / `jstToday`, `jstBillingMonth`, `isBillingDayToday` (말일 보정)

**DoD:**
- [ ] 검증 케이스 통과: 40000/4=会議費, 44000/4=接待交際費, welfare=会議費; 電車 29999=특례O / 30000=X; used_at '2026-09-30'→`tax_10_e80`, '2026-10-01'→`tax_10_e50`, 8%→`tax_r8_*`
- [ ] `billing_day=31` & 2월 → 말일 실행 판정
- [ ] `tsc --noEmit` 통과

---

## T3. freeeClient 확장
**파일:** `src/integrations/freeeClient.ts`(수정) · `package.json`(수정: `heic-convert`)

**작업:** `getDefaultCompanyId`, `uploadReceiptToFileBox`(멀티파트, Content-Type 미지정), `getReceipt`, `getAccountItems`, `getCompanyTaxes`, `createExpenseDeal` — 기존 `ensureValidToken` 재사용

**DoD:**
- [ ] 6함수 export, 타입 명확, `tsc --noEmit` 통과
- [ ] `uploadReceiptToFileBox`가 FormData로 `POST /api/1/receipts` 구성(Authorization만, Content-Type 자동)
- [ ] `createExpenseDeal`가 `{ type:'expense', receipt_ids, details:[{account_item_id,tax_code,amount}] }` 페이로드 생성
- [ ] `heic-convert` 설치 (`npm i heic-convert` @ server)

---

## T4. freee 연동 서비스
**파일:** `src/services/expenseFreee.ts`(신규) — 의존 T2·T3

**작업:**
- `pushReceiptAndOcr(requestId, file)`: HEIC→JPEG 변환 → 업로드 → `freee_receipt_id` 저장, `ocr_status='pending'` → 폴링(5초×12회) → `receipt_metadatum`/`invoice_registration_number`로 prefill, `ocr_status='done'`; 타임아웃 `failed`
- `createDealForRequest(requestId)`: `expense_freee_map` 조회 → `account_item_id`, `taxDisplayCategory` → `getCompanyTaxes`에서 `available && display_category` 일치 `code` → `createExpenseDeal` → `freee_deal_id` 저장 (이미 있으면 skip=멱등)

**DoD:**
- [ ] HEIC 파일 → JPEG 변환 후 업로드 경로 동작(단위 확인)
- [ ] OCR 폴링이 done/failed로 종료, 실패해도 예외 전파 안 함(신청 진행 가능)
- [ ] `createDealForRequest` 재호출 시 `freee_deal_id` 있으면 재생성 안 함
- [ ] `tsc --noEmit` 통과

---

## T5. 신청자 라우트 (CRUD + 첨부 + OCR)
**파일:** `src/routes/expense.ts`(신규) — 의존 T1·T2·T4

**엔드포인트:** `GET/POST/PATCH/DELETE /requests[/:id]`, `POST /requests/:id/attachments`(→ `pushReceiptAndOcr` 트리거), `GET /requests/:id/ocr`, `GET /attachments/:id/download`, `GET /pending-summary`
- `router.use(authMiddleware, requireAppAccess('erp'))`, multer memoryStorage 20MB
- 첨부 시 `file_hash`(SHA-256) 계산·저장, `expense_status_history` 기록
- 카테고리별 `meta` 앱검증(§Design 1.1)

**DoD:**
- [ ] 신청 생성(draft/제출), 본인만 수정/삭제(타인 403), awaiting_receipt→pending 제출 동작
- [ ] 첨부 업로드 시 freee push+OCR 트리거, `/ocr` 폴링으로 prefill 값 반환
- [ ] `pending-summary`가 역할별 카운트 반환
- [ ] `tsc --noEmit` 통과

---

## T6. 담당자 라우트 (승인·정산·export)
**파일:** `src/routes/expense.ts`(추가) — 의존 T1·T4

**엔드포인트:** `GET /admin/list`(상태·기간·거래처·금액 필터), `PATCH /admin/:id`(action=approve/reject/mark_paid/reopen), `GET /admin/export.csv`
- `approve` → `approved` + **`createDealForRequest` 즉시 호출**; `already_paid`면 `recorded`; deal 실패해도 approved 유지 + 에러 반환
- `mark_paid` → `expense_payments` paid + `paid`/`completed`
- 모든 전이 `expense_status_history` INSERT (트랜잭션), reviewer 아니면 403

**DoD:**
- [ ] non-reviewer 403
- [ ] approve 시 freee deal 자동생성(성공 시 `freee_deal_id` 세팅), 실패 시 approved 유지·에러 표면화
- [ ] mark_paid 흐름(payment_pending→paid→completed) 동작
- [ ] CSV export가 사용일·금액·거래처 포함(電帳法 검색요건)
- [ ] status_history 모든 전이 기록

---

## T7. 정기결제 (마스터 + Cron)
**파일:** `src/routes/expense.ts`(subscriptions CRUD 추가) · `src/services/expenseSubscriptionCron.ts`(신규) · `src/index.ts`(수정) — 의존 T1

**작업:** `GET/POST/PATCH/DELETE /subscriptions[/:id]` (본인 또는 reviewer), `startExpenseSubscriptionCron()`(매일 09:00 JST + startup 1회), `runExpenseSubscriptionJob()`(멱등 `ON CONFLICT (subscription_id, billing_month)`), `POST /admin/run-subscription-job`

**DoD:**
- [ ] 구독 등록 후 결제일에 owner 명의 `awaiting_receipt` draft 자동생성
- [ ] 두 번 실행해도 같은 달 중복 생성 안 됨
- [ ] 말일 보정(31일 지정 → 짧은 달 말일 실행)
- [ ] index.ts에 cron 등록, 서버 시작 로그 확인

---

## T8. freee 매핑 마스터 라우트
**파일:** `src/routes/expense.ts`(추가) — 의존 T3

**엔드포인트:** `GET /freee/account-items`(freee 계정과목), `GET /freee/map`·`PUT /freee/map`(카테고리·subtype → account_item_id 저장)

**DoD:**
- [ ] reviewer가 freee 계정과목 목록 조회
- [ ] 매핑 저장·조회, `createDealForRequest`가 이 매핑 사용

---

## T9. i18n
**파일:** `client/src/i18n/index.ts`(수정)

**작업:** `erp_expense*`, `expense_category_*`, `expense_settlement_*`, `expense_status_*`, `expense_field_*`, `expense_meal_tag_*`, `expense_msg_*` — ja/ko 동시 등록

**DoD:**
- [ ] 모든 UI 문구 키화, ja 기본 + ko 완비, 누락 키 없음

---

## T10. 프론트 API·타입
**파일:** `client/src/pages/Erp/expenseApi.ts`(신규) · `expenseTypes.ts`(신규)

**작업:** educationApi 패턴 복제, `uploadAttachment(FormData)`, `pollOcr`, admin 함수, subscriptions/map 함수 + 타입 정의

**DoD:**
- [ ] 전 엔드포인트 대응 함수, 타입 export, `tsc --noEmit` 통과

---

## T11. 신청자 페이지
**파일:** `client/src/pages/Erp/ExpensePage.tsx`(신규) — 의존 T10·T9

**작업:** 상태탭 + 아코디언 이력 + 통계카드 + **정기결제 미첨부 배너**(T14 연동) + 신규버튼→모달

**DoD:**
- [ ] 상태탭 필터 동작, 내 이력 표시, awaiting_receipt 배너 노출
- [ ] 모바일 반응형(2→1컬럼)

---

## T12. 신청 모달
**파일:** `client/src/pages/Erp/ExpenseRequestModal.tsx`(신규) — 의존 T10

**작업:** 스텝(카테고리→정산유형→업로드→OCR prefill→필드확인), 카테고리별 조건부 필드(교통 method/기간/3만엔 룰, 식사 인원수→会議費/接待 실시간, 입체 계좌, 카드 서비스), FileUploadButton

**DoD:**
- [ ] 電車·バス 3만 미만 시 T번호·영수증 필드 숨김, タクシー 표시
- [ ] 식사 인원수 입력 시 会議費/接待交際費 실시간 태깅
- [ ] 업로드 후 OCR prefill(금액·사용일·거래처·T번호) 반영, 수정 가능
- [ ] 임시저장/제출, 모바일 `max-h-[90vh]`

---

## T13. 담당자 승인 페이지
**파일:** `client/src/pages/Erp/admin/ExpenseApprovalsPage.tsx`(신규) — 의존 T10·T9

**작업:** EducationApprovalsPage 복제 → 상태탭(승인대기/승인됨/지급대기/지급완료/반려/영수증대기/전체), 아코디언 상세(영수증 미리보기·계정과목·税区分 편집), 액션(승인/반려/지급/재오픈), 상단 검색+CSV export, 하위탭(정기결제 마스터·freee 매핑)

**DoD:**
- [ ] 상태탭·검색·CSV export 동작
- [ ] 승인 시 freee 반영 결과(deal id/에러) 표시
- [ ] 정기결제 마스터·매핑 관리 UI 동작

---

## T14. In-app 알림 훅
**파일:** `client/src/pages/Erp/useExpensePendingSummary.ts`(신규) — 의존 T10

**작업:** ERP 진입 시 `/pending-summary` fetch + 5분 폴링(erpCache), 직원 배너/네비 뱃지 카운트 제공, dismiss(localStorage)

**DoD:**
- [ ] 미첨부/승인대기 카운트 정확, 0이면 미표시, dismiss 후 세션 내 숨김

---

## T15. 배선 (라우트·네비·index)
**파일:** `client/src/App.tsx` · `client/src/components/ErpLayout.tsx` · `server/src/index.ts`

**작업:** `/erp/expense`·`/erp/admin/expense`(ReviewerGuard) 라우트, ErpLayout 복리후생 그룹 2항목, `app.use('/api/expense', expenseRoutes)`, cron 등록

**DoD:**
- [ ] 네비에서 진입, reviewer 전용 항목 권한 동작, API 연결 확인

---

## T16. 검증 (E2E + 빌드)
**작업:** server/client `tsc --noEmit` + `npm run build`, 마이그레이션 재실행 멱등 확인, 수동 E2E

**DoD (Acceptance §Requirements 13 매핑):**
- [ ] 사진 업로드→freee OCR prefill→4카테고리 제출
- [ ] 精算あり 승인→지급대기→지급완료, 精算なし 승인→recorded(deal 자동생성)
- [ ] 交通 3만엔 룰·식사 태깅 동작
- [ ] 승인 시 freee deal 생성 + receipt_ids 첨부 + e80/e50 적용
- [ ] 정기결제 초안 자동생성 + in-app 팝업
- [ ] 검색·필터·CSV export(電帳法)
- [ ] status_history·소프트삭제
- [ ] 日本語/한국어 토글
- [ ] 서버·클라 빌드 통과

---

## 신규 의존성
- server: `heic-convert` (HEIC→JPEG). `node-cron`은 기존.
- client: 없음 (기존 axios/fetch·tailwind·lucide 재사용)

## 예상 규모
- 신규 파일 ~13 (server 6, client 6, migration 1) · 수정 파일 ~5 (index.ts, autoMigrate.ts, freeeClient.ts, App.tsx, ErpLayout.tsx, i18n)
- Stage 4.1~4.6 순차, 각 Stage 내 병렬
