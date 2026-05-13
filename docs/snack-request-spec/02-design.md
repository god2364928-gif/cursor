# 間食購入申請 — Phase 2: Design

> Phase 1 요구사항을 구현하기 위한 기술 설계
> 기존 ERP 패턴([cursor/server/src/routes/vacation.ts](../../cursor/server/src/routes/vacation.ts), [cursor/client/src/pages/Erp/](../../cursor/client/src/pages/Erp/), [cursor/server/src/services/vacationCron.ts](../../cursor/server/src/services/vacationCron.ts))을 그대로 따른다.

---

## 1. DB 스키마

### 마이그레이션 파일
- 위치: [cursor/server/migrations/add_snack_request.sql](../../cursor/server/migrations/add_snack_request.sql)
- 자동 적용: [cursor/server/src/migrations/autoMigrate.ts](../../cursor/server/src/migrations/autoMigrate.ts) 에 `autoMigrateSnackRequest()` 추가, [cursor/server/src/index.ts](../../cursor/server/src/index.ts) startup에서 호출

### 테이블

```sql
-- ============================================================
-- snack_fixed: 고정 구매 (매주 자동 신청 템플릿)
-- ============================================================
CREATE TABLE IF NOT EXISTS snack_fixed (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_url   TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  unit_price    INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  note          TEXT,
  start_date    DATE NOT NULL,         -- 그 주 월요일로 정규화 후 저장
  end_date      DATE NOT NULL,         -- 그 주 월요일로 정규화 후 저장
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_snack_fixed_user ON snack_fixed(user_id);
CREATE INDEX IF NOT EXISTS idx_snack_fixed_active ON snack_fixed(active) WHERE active;

-- ============================================================
-- snack_requests: 간식 신청
-- ============================================================
CREATE TABLE IF NOT EXISTS snack_requests (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_url   TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  unit_price    INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity      INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total         INTEGER GENERATED ALWAYS AS (unit_price * quantity) STORED,
  note          TEXT,
  week_start    DATE NOT NULL,         -- 신청이 속한 주의 월요일 (JST 기준)
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'ordered', 'cancelled')),
  ordered_at    TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  cancel_reason TEXT,
  fixed_id      INTEGER REFERENCES snack_fixed(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_snack_req_week ON snack_requests(week_start);
CREATE INDEX IF NOT EXISTS idx_snack_req_user ON snack_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_snack_req_status ON snack_requests(status);

-- 고정 구매 중복 방지 (같은 fixed가 같은 주에 두 번 안 들어감)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_snack_req_fixed_week
  ON snack_requests(fixed_id, week_start)
  WHERE fixed_id IS NOT NULL;
```

### 마이그레이션 멱등성
- `IF NOT EXISTS` 로 모든 객체 생성
- `autoMigrateSnackRequest()` 는 `information_schema.tables` 체크 후 없을 때만 SQL 실행

---

## 2. 백엔드 라이브러리

### [cursor/server/src/lib/snackWeek.ts](../../cursor/server/src/lib/snackWeek.ts) (신규)

JST 기반 주차 계산 유틸. 휴가 모듈의 `lib/vacation.ts` 와 같은 위치 패턴.

```typescript
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 임의 시각을 JST로 변환한 'YYYY-MM-DD' (그날의 날짜) */
export function jstDateString(d: Date = new Date()): string { ... }

/** 주어진 시각이 속한 "신청 대상 주"의 월요일 (YYYY-MM-DD)
 *  - 마감(금요일 24:00 JST) 전: 그 주 월요일
 *  - 마감 후: 다음 주 월요일
 */
export function calcWeekStart(now: Date = new Date()): string { ... }

/** 임의 날짜를 그 주의 월요일로 정규화 (snack_fixed start/end 저장용) */
export function normalizeToMonday(date: string | Date): string { ... }

/** 이번 주 마감까지 남은 일수 (D-2 표시용). 음수면 마감 후. */
export function daysUntilDeadline(now: Date = new Date()): number { ... }
```

**테스트 케이스 (lib 단위테스트로 검증):**
- 월요일 09:00 JST → 그 주 월요일
- 금요일 23:59 JST → 그 주 월요일
- 금요일 24:00 JST = 토요일 00:00 → 다음 주 월요일
- 일요일 23:00 JST → 다음 주 월요일

---

## 3. API 설계

### 라우트 파일
[cursor/server/src/routes/snackRequest.ts](../../cursor/server/src/routes/snackRequest.ts) (신규)

```typescript
const router = Router()
router.use(authMiddleware, requireAppAccess('erp'))
```

### 엔드포인트

| Method | Path | 권한 | 설명 |
|---|---|---|---|
| GET | `/api/snack/this-week` | ERP | 이번 주 전사 신청 + 합계 + D-day |
| GET | `/api/snack/my-history?month=YYYY-MM` | ERP | 내 신청 이력 (월별) |
| GET | `/api/snack/stats` | ERP | 이번 달 내 누적 / 전사 누적 / 1인 평균 |
| POST | `/api/snack/requests` | ERP | 신청 등록 |
| DELETE | `/api/snack/requests/:id` | ERP | 신청 취소 (본인+pending+마감 전, 또는 admin) |
| GET | `/api/snack/fixed` | ERP | 전사 고정 구매 리스트 |
| POST | `/api/snack/fixed` | ERP | 고정 구매 등록 |
| PATCH | `/api/snack/fixed/:id` | ERP | 활성/비활성 토글, 본인 또는 admin |
| DELETE | `/api/snack/fixed/:id` | ERP | 고정 구매 삭제, 본인 또는 admin |
| POST | `/api/snack/admin/mark-ordered` | admin | 이번 주 pending → ordered 일괄 |
| POST | `/api/snack/admin/run-fixed-job` | admin | 고정 구매 cron 수동 실행 (디버그용) |

### 응답 스키마 (예시)

**GET /api/snack/this-week**
```json
{
  "week_start": "2026-05-18",
  "deadline": "2026-05-22T15:00:00.000Z",  // 금요일 24:00 JST = 15:00 UTC
  "days_until_deadline": 2,
  "total_amount": 289210,
  "total_count": 14,
  "items": [
    {
      "id": 123,
      "user_id": 5,
      "user_name": "표다솜",
      "department": "개발사업부",
      "product_url": "https://www.amazon.co.jp/...",
      "product_name": "비타500 제로, 100ml, 20개",
      "unit_price": 11300,
      "quantity": 1,
      "total": 11300,
      "note": null,
      "status": "pending",
      "fixed_id": null,
      "created_at": "2026-05-13T03:52:00.000Z"
    }
  ]
}
```

**POST /api/snack/requests** (request body)
```json
{
  "product_url": "https://www.amazon.co.jp/...",
  "product_name": "...",
  "unit_price": 1280,
  "quantity": 2,
  "note": "맛 다양하게"
}
```
- `week_start` 는 서버에서 `calcWeekStart(now)` 로 자동 계산
- `status` 는 항상 `pending` 으로 시작
- 응답: 생성된 row 전체

**POST /api/snack/admin/mark-ordered**
```json
// request: 빈 body 또는 { "week_start": "2026-05-18" } (생략 시 현재 주)
// response:
{ "ordered_count": 14, "ordered_at": "2026-05-19T...Z" }
```

### 권한 체크 패턴
```typescript
// 본인 또는 admin 만 수정/삭제 가능
if (row.user_id !== Number(req.user!.id) && req.user!.role !== 'admin') {
  return res.status(403).json({ message: 'Forbidden' })
}
```

### 라우트 등록
[cursor/server/src/index.ts](../../cursor/server/src/index.ts) 에:
```typescript
import snackRequestRoutes from './routes/snackRequest'
// ...
app.use('/api/snack', snackRequestRoutes)
```

---

## 4. Cron (고정 구매 자동 신청)

### 파일
[cursor/server/src/services/snackFixedCron.ts](../../cursor/server/src/services/snackFixedCron.ts) (신규)

### 라이브러리
**`node-cron`** 사용 (사용자 결정). `package.json` 에 추가:
```json
"node-cron": "^3.0.3",
"@types/node-cron": "^3.0.11"
```

> 참고: 기존 코드는 `setInterval` 방식이지만, "매주 월요일 00:05 JST" 표현은 cron 표현식이 훨씬 명확하므로 신규 의존성 1개를 추가한다.

### 구현
```typescript
import cron from 'node-cron'
import { pool } from '../db'

/** 매주 월요일 00:05 JST */
export function startSnackFixedCron(): void {
  cron.schedule('5 0 * * 1', () => {
    runSnackFixedJob().catch((e) =>
      console.error('[SnackFixed] cron error:', e)
    )
  }, { timezone: 'Asia/Tokyo' })

  console.log('[SnackFixed] cron scheduled (every Mon 00:05 JST)')

  // startup 시 1회 실행 — 서버 재시작 후 누락 보충 (멱등하므로 안전)
  setTimeout(() => {
    runSnackFixedJob().catch((e) =>
      console.error('[SnackFixed] startup run error:', e)
    )
  }, 30 * 1000)
}

/** 활성 고정 구매를 이번 주 신청에 추가 (멱등) */
export async function runSnackFixedJob(): Promise<{ inserted: number }> {
  const weekStart = calcWeekStart(new Date())  // JST 기준 이번 주 월요일

  const result = await pool.query(`
    INSERT INTO snack_requests
      (user_id, product_url, product_name, unit_price, quantity, note, week_start, fixed_id)
    SELECT
      f.user_id, f.product_url, f.product_name, f.unit_price, f.quantity, f.note,
      $1::date, f.id
    FROM snack_fixed f
    WHERE f.active = TRUE
      AND f.start_date <= $1::date
      AND f.end_date >= $1::date
    ON CONFLICT (fixed_id, week_start) DO NOTHING
  `, [weekStart])

  console.log(`[SnackFixed] inserted ${result.rowCount} requests for week ${weekStart}`)
  return { inserted: result.rowCount ?? 0 }
}
```

### 멱등성
- `ON CONFLICT (fixed_id, week_start) DO NOTHING` 로 중복 방지
- startup 1회 + 매주 월요일 00:05 = 안전하게 중첩 실행 가능

### 등록
[cursor/server/src/index.ts](../../cursor/server/src/index.ts) startup 부분에:
```typescript
import { startSnackFixedCron } from './services/snackFixedCron'
// ... 기존 startVacationCron() 옆에:
startSnackFixedCron()
```

---

## 5. 프론트엔드 설계

### 파일 구조
```
cursor/client/src/pages/Erp/
├── SnackRequestPage.tsx      (신규) — 메인 페이지
├── SnackRequestModal.tsx     (신규) — 신청 모달
├── SnackFixedModal.tsx       (신규) — 고정 구매 등록 모달
└── snackApi.ts               (신규) — API 호출 헬퍼
```

### 라우트 등록
[cursor/client/src/App.tsx](../../cursor/client/src/App.tsx) ERP 영역에:
```tsx
<Route path="snack-request" element={<SnackRequestPage />} />
```

### 메뉴 등록
[cursor/client/src/components/ErpLayout.tsx](../../cursor/client/src/components/ErpLayout.tsx) `navigation` 배열에 추가:
```tsx
{ labelKey: 'erp_snack_request', href: '/erp/snack-request', icon: Cookie },
```
(아이콘은 `lucide-react` 의 `Cookie` 또는 `ShoppingBag`)

### SnackRequestPage 컴포넌트 구조

```tsx
function SnackRequestPage() {
  const [thisWeek, setThisWeek] = useState<ThisWeekData | null>(null)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [fixedList, setFixedList] = useState<FixedItem[]>([])
  const [view, setView] = useState<'thisWeek' | 'myHistory'>('thisWeek')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showFixedModal, setShowFixedModal] = useState(false)

  // 로드: this-week, stats, fixed 병렬 fetch

  return (
    <div>
      <Header />                          {/* 제목 + 주차 + 마감/주문 사이클 */}
      <StatsCards stats={stats} />        {/* 카드 2개 */}
      <FixedSection
        items={fixedList}
        onAdd={() => setShowFixedModal(true)}
        onToggle={...} onDelete={...}
      />
      <ActionBar
        view={view} onViewChange={setView}
        deadlineDays={thisWeek?.days_until_deadline}
        onNewRequest={() => setShowRequestModal(true)}
        isAdmin={user.role === 'admin'}
        onMarkOrdered={...}               {/* admin 전용 */}
      />
      <RequestList
        items={view === 'thisWeek' ? thisWeek?.items : myHistoryItems}
        totalAmount={...} totalCount={...}
        onCancel={(id) => ...}
      />
      {showRequestModal && <SnackRequestModal onClose={...} onSubmit={...} />}
      {showFixedModal && <SnackFixedModal onClose={...} onSubmit={...} />}
    </div>
  )
}
```

### SnackRequestModal 폼 검증
- `product_url`: 필수, `https://www.amazon.co.jp/` 또는 `https://amzn.asia/` 시작 권장 (warning 만 표시, block 안 함)
- `product_name`: 필수, 1자 이상
- `unit_price`: 필수, 0 이상의 정수
- `quantity`: 필수, 1 이상의 정수
- `note`: 선택
- 합계는 onChange 로 자동 계산 표시
- "申請して続ける" 클릭 시 폼 리셋 후 모달 유지, "間食購入申請" 클릭 시 신청 후 모달 닫힘

### 마감 후 안내
- 모달 상단에 `daysUntilDeadline < 0` 일 때 노란 배너:
  > 締切を過ぎているため、次週(YYYY-MM-DD)分として申請されます

### 상태 뱃지
| status | 표시 (JA) | 색상 |
|---|---|---|
| pending | 待機中 | yellow |
| ordered | 発注済 | green |
| cancelled | キャンセル | gray |

---

## 6. i18n 키 추가

[cursor/client/src/i18n/index.ts](../../cursor/client/src/i18n/index.ts) `ja` / `ko` 섹션에 동시 등록:

```typescript
// Snack Request
erp_snack_request: '間食購入申請' / '간식 구매 신청',
snack_subtitle: '毎週金曜締切 / 毎週月曜まとめ発注',
snack_my_monthly_total: '今月の私の累計',
snack_company_monthly_total: '今月の全社累計',
snack_per_person_avg: '一人あたり平均',
snack_fixed_section: '固定購入',
snack_fixed_register: '固定購入登録',
snack_new_request: '間食購入申請',
snack_continue: '申請して続ける',
snack_this_week_view: '今週の全社申請',
snack_my_history_view: '私の履歴',
snack_deadline_d_minus: '締切 D-{{n}}',
snack_deadline_today: '締切 当日',
snack_deadline_passed: '次週分',
snack_status_pending: '待機中',
snack_status_ordered: '発注済',
snack_status_cancelled: 'キャンセル',
snack_amazon_link: 'Amazon ↗',
snack_form_url: '商品リンク',
snack_form_name: '商品名',
snack_form_unit_price: '単価 (¥)',
snack_form_quantity: '数量',
snack_form_total: '合計',
snack_form_note: '備考 (任意)',
snack_guide_title: 'ご案内',
snack_guide_deadline: '締切: 毎週金曜 / 発注: 毎週月曜',
snack_guide_amazon: 'Amazon通常配送 (常温保管商品のみ)',
snack_reject_title: '対象外',
snack_reject_1: '冷凍·生鮮食品',
snack_reject_2: '賞味期限の短い大量食品',
snack_reject_3: 'スナック·飲料以外 (健康食品·おもちゃ等)',
snack_reject_4: '高級嗜好品 (高級チョコ·ジャーキー等)',
snack_admin_mark_ordered: '今週分を一括発注完了に',
snack_late_warning: '締切を過ぎているため、次週({{date}})分として申請されます',
```

---

## 7. 데이터 흐름 시나리오

### 시나리오 A: 일반 신청
1. 직원이 `+ 間食購入申請` 클릭 → `SnackRequestModal` 오픈
2. Amazon 링크·제품명·단가·수량 입력 → `間食購入申請` 클릭
3. `POST /api/snack/requests` → 서버에서 `week_start = calcWeekStart(now)` 자동
4. 응답 받으면 `this-week` 재조회 → 리스트 갱신, 모달 닫힘

### 시나리오 B: 마감 후 신청
1. 토요일에 직원이 신청 → 모달에 노란 배너 (다음 주 분 안내)
2. 서버에서 `week_start = 다음 주 월요일`
3. `this-week` 응답에는 안 보임 (다음 주가 됐을 때 보임)
4. 내 이력에는 즉시 보임 (월별 그룹)

### 시나리오 C: 고정 구매 자동
1. 직원이 `2026-05-18 ~ 2026-06-08` 정수기 물 등록 → `start_date = 2026-05-18` (월요일 정규화)
2. 매주 월요일 00:05 JST에 `runSnackFixedJob()` 실행
3. `2026-05-18`, `2026-05-25`, `2026-06-01`, `2026-06-08` 4번 자동 신청 추가
4. 4주 후 자동 종료

### 시나리오 D: 발주 담당자 일괄 처리
1. 월요일 오전, admin 이 페이지 진입 → `今週分を一括発注完了に` 버튼 노출
2. 클릭 → `POST /api/snack/admin/mark-ordered`
3. 이번 주 `pending` → `ordered`, `ordered_at = now()`
4. 리스트 새로고침, 상태가 `발주済` 로 변경

---

## 8. 에러 / 엣지 케이스

| 케이스 | 처리 |
|---|---|
| 같은 사용자가 같은 상품 중복 신청 | 허용 (다른 사이즈/맛 가능성) |
| `unit_price = 0` 또는 음수 | 400 응답 |
| `quantity = 0` 또는 음수 | 400 응답 |
| 마감 후 본인 신청 취소 시도 | 403 (마감 후엔 admin만 가능) |
| 고정 구매 등록 시 `end_date < start_date` | DB CHECK 에서 차단, 400 응답 |
| 고정 구매를 신청 cron 직전에 비활성화 | cron이 `active = TRUE` 만 보므로 안전 |
| 서버 재시작으로 월요일 00:05 cron 누락 | startup 후 30초 후 1회 실행 (멱등) |
| 두 인스턴스가 동시에 cron 실행 | `ON CONFLICT DO NOTHING` 으로 안전 |

---

## 9. 테스트 전략

### 단위 테스트
- `lib/snackWeek.ts` — JST 주차 계산, 마감 판정 (시간대 경계 케이스 위주)

### 수동 테스트 (E2E)
1. 신청 → 리스트 반영
2. 마감 전후 신청 → `week_start` 분기 확인
3. 본인 취소 / admin 취소 / 마감 후 본인 취소 거부
4. 고정 구매 등록 → `POST /api/snack/admin/run-fixed-job` 으로 즉시 실행 → 신청에 반영 확인
5. 같은 fixed로 두 번 실행 → 중복 안 들어감
6. admin 일괄 발주완료
7. ja/ko 토글 시 모든 라벨 번역

---

## 10. 결정/구현 정리표

| 항목 | 결정 |
|---|---|
| DB | snack_fixed (템플릿) + snack_requests (신청) 2테이블 |
| 마이그레이션 | autoMigrateSnackRequest() 멱등 적용 |
| Cron 라이브러리 | node-cron 신규 설치 |
| 주차 계산 | lib/snackWeek.ts (JST 전용) |
| 권한 | authMiddleware + requireAppAccess('erp'), admin 액션은 추가 role 체크 |
| 프론트 라우트 | /erp/snack-request |
| 메뉴 위치 | ErpLayout 사이드바 (휴가 아래) |
| i18n | ja/ko 동시, 기본 ja |
