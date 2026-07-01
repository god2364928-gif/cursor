# 経費申請・精算 — Phase 2: Design

> Phase 1 요구사항 구현을 위한 기술 설계
> 기존 패턴 준수: [educationRequest.ts](../../cursor/server/src/routes/educationRequest.ts) · [EducationApprovalsPage.tsx](../../cursor/client/src/pages/Erp/admin/EducationApprovalsPage.tsx) · [freeeClient.ts](../../cursor/server/src/integrations/freeeClient.ts) · [snackFixedCron.ts](../../cursor/server/src/services/snackFixedCron.ts)
> **FK 타입 확정: `users.id` = UUID** (education/health 마이그레이션 기준)

---

## 1. DB 스키마

### 파일
- 신규: `cursor/server/migrations/add_expense_reimbursement.sql`
- 수정: `cursor/server/src/migrations/autoMigrate.ts` (`autoMigrateExpenseReimbursement` 추가)
- 수정: `cursor/server/src/index.ts` (startup 호출)

### 테이블

```sql
-- ============================================================
-- expense_requests: 경비 신청 (메인)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_requests (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category          TEXT NOT NULL CHECK (category IN ('transport','meal','reimburse','corp_card')),
  settlement_type   TEXT NOT NULL CHECK (settlement_type IN ('reimburse_required','already_paid')),
  used_at           DATE NOT NULL,                       -- ★電帳法 검색키
  amount_incl_tax   INTEGER NOT NULL CHECK (amount_incl_tax >= 0),  -- ★검색키 (税込, ¥)
  tax_rate          INTEGER NOT NULL DEFAULT 10 CHECK (tax_rate IN (0,8,10)),
  amount_tax        INTEGER NOT NULL DEFAULT 0,
  reduced_tax       BOOLEAN NOT NULL DEFAULT FALSE,      -- 8%軽減 여부 (tax_r8 판정용)
  vendor_name       TEXT,                                -- ★検索키 (取引先/점포명)
  invoice_number    TEXT,                                -- "T..." (freee OCR prefill)
  account_item_id   INTEGER,                             -- freee 勘定科目 (매핑/수정값)
  tax_code          INTEGER,                             -- freee 税区分 코드 (deal 생성 시 확정)
  purpose           TEXT,
  memo              TEXT,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN (
                      'draft','awaiting_receipt','pending','approved',
                      'payment_pending','paid','completed','recorded',
                      'rejected','cancelled')),
  meta              JSONB NOT NULL DEFAULT '{}',         -- 카테고리별 확장필드 (아래 §1.1)
  freee_receipt_id  BIGINT,                              -- 파일박스 receipt id
  freee_deal_id     BIGINT,                              -- 生成された 取引 id
  ocr_status        TEXT NOT NULL DEFAULT 'none'
                    CHECK (ocr_status IN ('none','pending','done','failed')),
  subscription_id   INTEGER REFERENCES expense_subscriptions(id) ON DELETE SET NULL,
  billing_month     TEXT,                                -- 정기결제 초안 멱등키 (YYYY-MM)
  approver_id       UUID REFERENCES users(id),
  approved_at       TIMESTAMPTZ,
  reject_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ                           -- ★真実性 (소프트삭제)
);
CREATE INDEX IF NOT EXISTS idx_expense_req_user   ON expense_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_req_status ON expense_requests(status);
CREATE INDEX IF NOT EXISTS idx_expense_req_used   ON expense_requests(used_at);       -- 검색요건
CREATE INDEX IF NOT EXISTS idx_expense_req_vendor ON expense_requests(vendor_name);   -- 검색요건
CREATE INDEX IF NOT EXISTS idx_expense_req_amount ON expense_requests(amount_incl_tax);
-- 정기결제 초안 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS uniq_expense_subscription_month
  ON expense_requests(subscription_id, billing_month)
  WHERE subscription_id IS NOT NULL;

-- ============================================================
-- expense_attachments: 영수증 첨부 (Base64 사본 + 電帳法 메타)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_attachments (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  file_size     INTEGER NOT NULL,
  file_data     TEXT NOT NULL,          -- Base64 (education_files 패턴)
  file_hash     TEXT NOT NULL,          -- SHA-256 (電帳法 真実性)
  uploaded_by   UUID REFERENCES users(id),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_att_req ON expense_attachments(request_id);

-- ============================================================
-- expense_payments: 精算あり 지급 (立替 이체 관리)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_payments (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  payee_account TEXT,                    -- 지급 계좌 (매번 입력, meta 백업)
  paid_amount   INTEGER NOT NULL CHECK (paid_amount >= 0),
  paid_at       TIMESTAMPTZ,
  paid_by       UUID REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_pay_req ON expense_payments(request_id);

-- ============================================================
-- expense_subscriptions: 정기결제 마스터 (AIツール 등)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_subscriptions (
  id            SERIAL PRIMARY KEY,
  owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- 영수증 첨부 책임자
  service_name  TEXT NOT NULL,
  card_label    TEXT,                    -- 결제 카드
  category      TEXT NOT NULL DEFAULT 'corp_card',
  cycle         TEXT NOT NULL DEFAULT 'month' CHECK (cycle IN ('month','year')),
  billing_day   INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  amount        INTEGER,                 -- 예상 금액 (税込)
  tax_rate      INTEGER NOT NULL DEFAULT 10,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  start_date    DATE,
  end_date      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_sub_active ON expense_subscriptions(active) WHERE active;

-- ============================================================
-- expense_status_history: 상태 변경 이력 (★電帳法 真実性)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_status_history (
  id            SERIAL PRIMARY KEY,
  request_id    INTEGER NOT NULL REFERENCES expense_requests(id) ON DELETE CASCADE,
  from_status   TEXT,
  to_status     TEXT NOT NULL,
  actor_id      UUID REFERENCES users(id),
  reason        TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expense_hist_req ON expense_status_history(request_id);

-- ============================================================
-- expense_freee_map: 카테고리·세율 → freee 계정과목 매핑 (담당자 편집)
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_freee_map (
  id               SERIAL PRIMARY KEY,
  category         TEXT NOT NULL,
  subtype          TEXT,                 -- meal: 'meeting'/'entertainment', transport: 'taxi' 등
  account_item_id  INTEGER NOT NULL,     -- freee 勘定科目 id
  account_item_name TEXT,
  updated_by       UUID REFERENCES users(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (category, subtype)
);
```

> **주의**: `expense_requests.subscription_id`가 `expense_subscriptions`를 FK 참조하므로 마이그레이션 SQL은 **`expense_subscriptions`를 먼저 생성**하도록 순서 배치.

### 1.1 `meta` JSONB 카테고리별 스키마 (앱 레벨 검증)
```jsonc
// transport
{ "method": "train|bus|taxi|shinkansen|other", "from": "…", "to": "…",
  "round_trip": true, "visit_target": "…", "period_start": "2026-07-01", "period_end": "2026-07-31" }
// meal
{ "meal_purpose": "meeting|entertainment|welfare", "attendee_count": 4,
  "attendees_internal": ["…"], "attendees_external": ["…"], "per_person": 2825, "tag": "会議費|接待交際費" }
// reimburse
{ "payee_account": "○○銀行 …", "items": "…" }
// corp_card
{ "card_label": "…", "service_name": "…", "recurring": true }
```

### 1.2 autoMigrate 함수 ([autoMigrate.ts](../../cursor/server/src/migrations/autoMigrate.ts) 추가)
```typescript
export async function autoMigrateExpenseReimbursement(): Promise<void> {
  try {
    const check = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public'
        AND table_name IN ('expense_requests','expense_attachments','expense_payments',
                           'expense_subscriptions','expense_status_history','expense_freee_map')`)
    if (check.rows.length === 6) { console.log('[Expense] tables exist, skip'); return }
    const sql = fs.readFileSync(path.join(__dirname, '../../migrations/add_expense_reimbursement.sql'), 'utf-8')
    await pool.query(sql)
    console.log('✅ [Expense] migration applied')
  } catch (e: any) { console.error('[Expense] migration failed:', e.message) }
}
```
- `index.ts` line 48 import에 추가, `startServer()` line ~282에 `await autoMigrateExpenseReimbursement()` 추가

---

## 2. 백엔드 라이브러리

### 2.1 `cursor/server/src/lib/expenseTax.ts` (신규)
순수 함수 — 세무 자동판정.

```typescript
/** 会議費 vs 接待交際費 (令和6年度改正: 1인당 1만엔 기준) */
export function classifyMeal(amountInclTax: number, attendeeCount: number, purpose: string):
  { tag: '会議費' | '接待交際費'; perPerson: number } {
  const perPerson = attendeeCount > 0 ? Math.floor(amountInclTax / attendeeCount) : amountInclTax
  if (purpose === 'welfare') return { tag: '会議費', perPerson }        // 복리후생성은 회의비 처리
  const tag = perPerson <= 10000 ? '会議費' : '接待交際費'
  return { tag, perPerson }
}

/** 交通: 公共交通機関特例 (電車·バス & 税込 3만엔 미만 → 인보이스/영수증 불요) */
export function isPublicTransportException(method: string, amountInclTax: number): boolean {
  return (method === 'train' || method === 'bus') && amountInclTax < 30000
}

/** 少額特例: 税込 1만엔 미만 → T번호 없어도 경고만 (차단 X) */
export function isSmallAmountSpecial(amountInclTax: number): boolean {
  return amountInclTax < 10000
}

/** freee display_category 패밀리 결정 (経過措置 e80/e50 by 사용일) */
export function taxDisplayCategory(usedAt: string, taxRate: number, reduced: boolean): string {
  const beforeOct2026 = usedAt <= '2026-09-30'
  const suffix = beforeOct2026 ? 'e80' : 'e50'
  if (reduced || taxRate === 8) return `tax_r8_${suffix}`   // 8%軽減
  return `tax_10_${suffix}`                                 // 10%
}
```
- **검증 케이스**: 40000/4명 접대 → 10000/인 = 会議費; 44000/4명 → 11000 = 接待交際費; 電車 29999 → 특례 O, 30000 → X; used_at '2026-09-30' → e80, '2026-10-01' → e50

### 2.2 `cursor/server/src/lib/expenseDate.ts` (신규)
```typescript
export function jstToday(): string                    // 'YYYY-MM-DD' (JST)
export function jstBillingMonth(d?: Date): string      // 'YYYY-MM' (정기결제 멱등키)
export function isBillingDayToday(billingDay: number): boolean  // JST 오늘이 결제일인가 (말일 보정)
```
- `billing_day > 그 달 말일`이면 말일로 보정 (예: 31일 지정, 2월 → 28/29일 실행)

---

## 3. freeeClient 확장 ([freeeClient.ts](../../cursor/server/src/integrations/freeeClient.ts) 함수 추가)

> 기존 내부 `ensureValidToken()` 재사용. 멀티파트 업로드는 `Content-Type` 미지정(브라우저/undici가 boundary 설정).

```typescript
/** 기본 사업소 id — 캐시. companies[0] 또는 env FREEE_COMPANY_ID */
export async function getDefaultCompanyId(): Promise<number>

/** 파일박스 영수증 업로드 → { id, status } */
export async function uploadReceiptToFileBox(companyId: number, file:
  { buffer: Buffer; filename: string; mimeType: string },
  opts?: { description?: string }): Promise<{ id: number; status: string }>
// POST /api/1/receipts  (multipart: company_id, receipt=file, description?)

/** 영수증 단건 조회 (OCR 결과 폴링용) */
export async function getReceipt(companyId: number, receiptId: number): Promise<{
  id: number; status: string; mime_type: string;
  receipt_metadatum?: { partner_name?: string; issue_date?: string; amount?: number };
  invoice_registration_number?: string; qualified_invoice?: string }>
// GET /api/1/receipts/{id}?company_id=

/** 勘定科目 목록 (매핑 마스터용) */
export async function getAccountItems(companyId: number): Promise<Array<{ id:number; name:string }>>
// GET /api/1/account_items?company_id=

/** 会社別 税区分 목록 (経過措置/軽減 display_category 포함) */
export async function getCompanyTaxes(companyId: number): Promise<Array<{
  code: number; name: string; display_category: string; available: boolean }>>
// GET /api/1/taxes/companies/{companyId}

/** 経費 取引 생성 (영수증 첨부) → { id } */
export async function createExpenseDeal(params: {
  companyId: number; issueDate: string; partnerId?: number;
  details: Array<{ accountItemId: number; taxCode: number; amount: number; description?: string }>;
  receiptIds: number[] }): Promise<{ id: number }>
// POST /api/1/deals  { company_id, issue_date, type:'expense', details:[...], receipt_ids:[...] }
```

### 3.1 멀티파트 업로드 구현 노트
```typescript
const token = await ensureValidToken()
const fd = new FormData()  // undici global (Node18+)
fd.append('company_id', String(companyId))
fd.append('receipt', new Blob([file.buffer], { type: file.mimeType }), file.filename)
if (opts?.description) fd.append('description', opts.description)
const res = await fetch(`${FREEE_API_BASE}/receipts`, {
  method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })  // Content-Type 미지정
```

---

## 4. freee 연동 서비스 `cursor/server/src/services/expenseFreee.ts` (신규)

```typescript
/** 업로드 시: 파일박스 push + OCR 폴링 (비동기) */
export async function pushReceiptAndOcr(requestId: number, file: {...}): Promise<void>
//  1) HEIC면 JPEG 변환 (sharp 또는 heic-convert)
//  2) uploadReceiptToFileBox → freee_receipt_id 저장, ocr_status='pending'
//  3) 백그라운드 폴링: getReceipt 최대 N회(예: 5초 간격 12회) → receipt_metadatum 채워지면
//     amount/issue_date/vendor/invoice_number 로 expense_requests prefill, ocr_status='done'
//  4) 타임아웃 시 ocr_status='failed' (수동 입력으로 진행 가능)

/** 승인 시: 계정과목·税区분 확정 → 取引 생성 */
export async function createDealForRequest(requestId: number): Promise<number> // freee_deal_id
//  1) expense_freee_map 에서 category/subtype → account_item_id (없으면 요청의 account_item_id)
//  2) taxDisplayCategory(used_at, tax_rate, reduced) → getCompanyTaxes 에서 available && display_category 일치 code
//  3) createExpenseDeal({ details:[{accountItemId, taxCode, amount:amount_incl_tax}], receiptIds:[freee_receipt_id] })
//  4) freee_deal_id 저장
```

- **HEIC 변환**: `heic-convert`(순수 JS, 네이티브 의존 없음) 권장 → `package.json` 추가
- **폴링 실패 허용**: OCR 실패해도 신청은 진행 (수동 입력). freee 영수증은 이미 업로드됨.

---

## 5. API 설계

### 라우트 파일: `cursor/server/src/routes/expense.ts` (신규)
```typescript
const router = Router()
router.use(authMiddleware, requireAppAccess('erp'))
const isReviewer = (req) => ['admin','office_assistant'].includes(req.user!.role)
// multer memoryStorage, 20MB, PDF/이미지/HEIC 허용 (educationRequest 패턴)
```

> **접근제어 (★확정): ERP=본인 것만, admin=전체.**
> - 직원용 조회는 항상 `WHERE user_id = req.user.id` (구독은 `owner_user_id`) 로 스코프
> - `GET /requests/:id`·`/attachments/:id/download`: `row.user_id === req.user.id || isReviewer(req)` 아니면 403
> - `/admin/*` 는 `isReviewer` 아니면 403, 필터 없이 전체
> - `pending-summary`: 직원=본인 `my_awaiting_receipt`만, reviewer=전사 카운트 추가

### 엔드포인트
| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/expense/requests` | 본인 | 내 신청 이력 (상태 필터) |
| GET | `/api/expense/requests/:id` | 본인/reviewer | 상세 + 첨부 + 이력 |
| POST | `/api/expense/requests` | 본인 | 신청 생성 (draft/제출), settlement_type·category·meta |
| PATCH | `/api/expense/requests/:id` | 본인 | 수정 (draft/pending, awaiting_receipt→pending 제출) |
| DELETE | `/api/expense/requests/:id` | 본인 | draft 삭제 / pending·approved → cancelled |
| POST | `/api/expense/requests/:id/attachments` | 본인 | 영수증 업로드 → freee push+OCR 트리거 |
| GET | `/api/expense/requests/:id/ocr` | 본인 | OCR 상태·prefill 값 폴링 |
| GET | `/api/expense/attachments/:id/download` | 본인/reviewer | 첨부 다운로드 |
| GET | `/api/expense/pending-summary` | 본인/reviewer | in-app 알림 카운트 (§7) |
| GET | `/api/expense/admin/list` | reviewer | 전체 목록 (상태·기간·거래처·금액 필터) |
| PATCH | `/api/expense/admin/:id` | reviewer | 상태 전이 (아래) |
| GET | `/api/expense/admin/export.csv` | reviewer | 電帳法 CSV export |
| GET | `/api/expense/subscriptions` | 본인=owner 것만 / reviewer=전체 | 정기결제 목록 |
| POST/PATCH/DELETE | `/api/expense/subscriptions[/:id]` | owner 또는 reviewer | 마스터 CRUD (타인 것 403) |
| GET | `/api/expense/freee/account-items` | reviewer | freee 계정과목 (매핑 UI) |
| GET | `/api/expense/freee/map` · PUT `/map` | reviewer | 매핑 조회·저장 |
| POST | `/api/expense/admin/run-subscription-job` | reviewer | 정기결제 크론 수동실행 (디버그) |

### 상태 전이 `PATCH /api/expense/admin/:id` (educationRequest `action` 패턴)
```
action=approve   → approved   (+ createDealForRequest, settlement_type=already_paid면 recorded)
action=reject    → rejected   (+ reject_reason)
action=mark_paid → paid       (精算あり: expense_payments.paid + payment_pending→paid→completed)
action=reopen    → 직전 상태 복귀
```
- 모든 전이는 `expense_status_history` INSERT (트랜잭션)
- freee 반영 실패 시 상태는 approved 유지 + 에러 반환(담당자 재시도) — 원자성 보장

---

## 6. Cron — 정기결제 초안 생성

### 파일: `cursor/server/src/services/expenseSubscriptionCron.ts` (신규)
```typescript
export function startExpenseSubscriptionCron(): void {
  cron.schedule('0 9 * * *', () => { runExpenseSubscriptionJob().catch(...) },
    { timezone: 'Asia/Tokyo' })                       // 매일 09:00 JST
  setTimeout(() => runExpenseSubscriptionJob().catch(...), 30_000)  // startup 1회
}

export async function runExpenseSubscriptionJob(): Promise<{ inserted: number }> {
  const month = jstBillingMonth()                     // 'YYYY-MM'
  // active 구독 중 오늘이 billing_day (말일 보정) 인 것 → owner 명의 draft 생성
  //   status='awaiting_receipt', subscription_id, billing_month=month
  //   ON CONFLICT (subscription_id, billing_month) DO NOTHING  (멱등)
}
```
- 등록: `index.ts` startup에 `startExpenseSubscriptionCron()` (snackFixedCron 옆)
- `package.json`엔 이미 `node-cron` 존재 → 신규 의존성 없음

---

## 7. In-app 알림 (Slack 미사용)

### API: `GET /api/expense/pending-summary`
```json
{
  "my_awaiting_receipt": 2,        // 내가 owner인 정기결제 미첨부 (직원용 팝업)
  "admin_pending_approval": 5,     // reviewer면 전사 승인대기
  "admin_awaiting_receipt": 3      // reviewer면 전사 미첨부 현황(조회용)
}
```

### 프론트
- `cursor/client/src/pages/Erp/useExpensePendingSummary.ts` (신규 훅) — ERP 진입 시 1회 fetch + 5분 폴링, `erpCache` 활용
- **직원**: `my_awaiting_receipt > 0` → 경비 페이지 상단 배너/모달 "정기결제 영수증 미첨부 N건 — 지금 첨부하기" → `awaiting_receipt` 필터로 이동
- **reviewer**: 네비 뱃지 + 승인 페이지 진입 시 "승인대기 M건"
- 팝업은 dismiss 가능(localStorage 세션 단위), 카운트 0이면 미표시

---

## 8. 프론트엔드

### 8.1 API 클라이언트: `cursor/client/src/pages/Erp/expenseApi.ts` (신규)
[educationApi.ts](../../cursor/client/src/pages/Erp/educationApi.ts) 패턴 복제 — `apiFetch<T>('/expense'…)`, `getAuthHeader()`, `uploadAttachment(FormData)`.

### 8.2 타입: `cursor/client/src/pages/Erp/expenseTypes.ts`
`ExpenseCategory`, `SettlementType`, `ExpenseStatus`, `ExpenseRequest`, `ExpenseAttachment`, `ExpenseSubscription`, `PendingSummary`.

### 8.3 신청자 페이지: `cursor/client/src/pages/Erp/ExpensePage.tsx`
- 템플릿 = [EducationPage.tsx](../../cursor/client/src/pages/Erp/EducationPage.tsx) (상태탭 + 아코디언 + 통계카드)
- 상태탭: 전체 / draft / awaiting_receipt / pending / approved / paid·completed / rejected
- 정기결제 미첨부 배너(§7)
- 신규 버튼 → `ExpenseRequestModal`

### 8.4 신청 모달: `cursor/client/src/pages/Erp/ExpenseRequestModal.tsx`
- 스텝: ① 카테고리 카드(4) → ② 정산유형(あり/なし) → ③ 사진 업로드 → **OCR 폴링 prefill** → ④ 공통+카테고리 필드 확인 → 제출/임시저장
- 카테고리별 조건부 필드:
  - transport: method 선택 → `train/bus`면 금액<3만 시 T번호·영수증 필드 숨김; `taxi`면 표시. 기간(period_start/end) 입력
  - meal: attendee_count → `classifyMeal` 결과(会議費/接待) 실시간 표시
  - reimburse: 지급계좌 입력(매번), 품목
  - corp_card: 카드·서비스명, 정기결제 등록 링크
- `FileUploadButton`(education 패턴) + `input accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp"`
- 모바일: `max-h-[90vh] overflow-y-auto`, 2컬럼→1컬럼

### 8.5 담당자 페이지: `cursor/client/src/pages/Erp/admin/ExpenseApprovalsPage.tsx`
- 템플릿 = [EducationApprovalsPage.tsx](../../cursor/client/src/pages/Erp/admin/EducationApprovalsPage.tsx)
- 상태탭: 승인대기 / 승인됨 / 지급대기 / 지급완료 / 반려 / 영수증대기 / 전체
- 리스트(아코디언): 신청자·카테고리·금액·사용일·거래처 + T번호 뱃지 + freee반영 뱃지
- 상세: 영수증 미리보기/다운로드 + 계정과목·税区分 편집 + 액션(승인/반려/지급/재오픈)
- 상단: 기간·금액·거래처 검색 + **CSV export** 버튼
- 하위 탭/설정: 정기결제 마스터 관리, freee 매핑 마스터

### 8.6 라우트/네비
- [App.tsx](../../cursor/client/src/App.tsx): `/erp/expense` → ExpensePage, `/erp/admin/expense` → ExpenseApprovalsPage (`ErpReviewerGuard`)
- [ErpLayout.tsx](../../cursor/client/src/components/ErpLayout.tsx) "복리후생" 그룹에 추가:
  ```typescript
  { labelKey:'erp_expense', href:'/erp/expense', icon: Receipt, nested:true },
  { labelKey:'erp_expense_admin', href:'/erp/admin/expense', icon: CheckCircle2, nested:true, reviewerOnly:true },
  ```

### 8.7 i18n ([i18n/index.ts](../../cursor/client/src/i18n/index.ts))
`erp_expense*`, `expense_category_*`(transport/meal/reimburse/corp_card), `expense_settlement_*`, `expense_status_*`, `expense_field_*`, `expense_meal_tag_*`, `expense_msg_*` — ja/ko 동시.

---

## 9. 배선 요약 (수정 파일)

| 파일 | 변경 |
|---|---|
| `migrations/add_expense_reimbursement.sql` | 신규 (6 테이블) |
| `src/migrations/autoMigrate.ts` | `autoMigrateExpenseReimbursement` 추가 |
| `src/index.ts` | import(L48) + `autoMigrate…()`(L~282) + `app.use('/api/expense', expenseRoutes)`(L~172) + `startExpenseSubscriptionCron()`(L~305) |
| `src/lib/expenseTax.ts`, `expenseDate.ts` | 신규 |
| `src/integrations/freeeClient.ts` | 5 함수 추가 |
| `src/services/expenseFreee.ts`, `expenseSubscriptionCron.ts` | 신규 |
| `src/routes/expense.ts` | 신규 |
| `package.json` (server) | `heic-convert` 추가 (node-cron은 기존) |
| client: `ExpensePage`, `ExpenseRequestModal`, `admin/ExpenseApprovalsPage`, `expenseApi.ts`, `expenseTypes.ts`, `useExpensePendingSummary.ts` | 신규 |
| client: `App.tsx`, `ErpLayout.tsx`, `i18n/index.ts` | 수정 |

---

## 10. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| freee OCR 비동기·불확실 | 폴링 타임아웃 후 수동입력 허용, 영수증은 이미 업로드됨 |
| HEIC 업로드 | 서버 `heic-convert`로 JPEG 변환 후 freee push |
| freee 토큰 단일·rotating | 기존 refresh 로직 재사용, 실패 시 Admin 재인증 안내 |
| 税区分 e80→e50 경계(2026.10) | `taxDisplayCategory(used_at,…)` 사용일 기준 분기 + `available` 필터 |
| deal 생성 실패 | approved 상태 유지 + 담당자 재시도(멱등: freee_deal_id 없을 때만) |
| 다중 사업소 | `getDefaultCompanyId()` 단일 가정, 필요 시 회사선택 후속 |
| Base64 DB 용량 | 7명·저볼륨 OK, 원본은 freee 보관 |
```
