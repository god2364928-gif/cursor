# 間食購入申請 — Phase 3: Tasks

> Phase 2 설계를 구현 가능한 단위로 분해
> 각 태스크는 독립적 검증 가능, 완료 기준(DoD) 명시
> Phase 4 에서 Builder/Worker sub-agent 가 태스크별 실행

---

## 의존성 그래프

```
T1 (DB migration)
   └─→ T3, T4, T5 (routes)
T2 (snackWeek lib)
   ├─→ T3 (snack request route - week_start 계산용)
   └─→ T6 (cron service)
T7 (i18n) ─── 독립
T11 (snackApi) ─── API 계약만 있으면 가능
   └─→ T8, T9, T10 (페이지/모달)
T12 (라우트 + 메뉴) ─── T8 필요
T13 (E2E 테스트) ─── 모두 끝난 뒤
```

## 실행 단계 (Phase 4 에서 사용)

| Stage | 병렬 가능한 태스크 |
|---|---|
| 4.1 Foundation | T1 (DB) + T2 (lib) — 병렬 |
| 4.2 Backend | T3 + T4 + T5 + T6 — 병렬 |
| 4.3 Frontend prep | T7 (i18n) + T11 (snackApi) — 병렬 |
| 4.4 Frontend UI | T8 + T9 + T10 — 병렬 (T11 완료 후) |
| 4.5 Wiring | T12 (라우트/메뉴 등록) |
| 4.6 검증 | T13 (수동 E2E + 빌드 체크) |

---

## T1. DB 마이그레이션 + autoMigrate

**파일:**
- `cursor/server/migrations/add_snack_request.sql` (신규)
- `cursor/server/src/migrations/autoMigrate.ts` (수정 — `autoMigrateSnackRequest` 추가)
- `cursor/server/src/index.ts` (수정 — startup 에서 호출)

**작업:**
1. `add_snack_request.sql` 작성 (`snack_fixed`, `snack_requests` 테이블, 인덱스, 유니크 제약)
2. `autoMigrateSnackRequest()` 함수 추가
   - `information_schema.tables` 로 `snack_requests` 존재 확인 → 없으면 SQL 실행
   - `console.log('[SnackRequest] migration applied')`
3. `index.ts` startup 영역에 `await autoMigrateSnackRequest()` 호출 추가

**완료 기준:**
- [ ] 서버 재시작 시 자동으로 두 테이블 생성됨
- [ ] 두 번 실행해도 에러 없음 (`IF NOT EXISTS`)
- [ ] `psql -c "\d snack_requests"` 로 컬럼·인덱스 확인 가능

---

## T2. JST 주차 계산 라이브러리

**파일:** `cursor/server/src/lib/snackWeek.ts` (신규)

**구현 함수:**
```typescript
export function jstDateString(d?: Date): string
export function calcWeekStart(now?: Date): string  // 마감 전: 그 주 월요일, 마감 후: 다음 주 월요일
export function normalizeToMonday(date: string | Date): string
export function daysUntilDeadline(now?: Date): number  // 음수면 마감 후
export function deadlineISO(now?: Date): string  // 그 주 금요일 24:00 JST = ISO UTC
```

**완료 기준:**
- [ ] 모든 함수 export, 타입 명확
- [ ] 다음 케이스가 의도대로 동작 (수동 검증 또는 console.log):
  - 월요일 09:00 JST → `calcWeekStart` = 그 주 월요일
  - 금요일 23:59 JST → 그 주 월요일
  - 토요일 00:00 JST → 다음 주 월요일
  - 일요일 23:00 JST → 다음 주 월요일
- [ ] `normalizeToMonday('2026-05-22')` (금) → `'2026-05-18'` (월)

---

## T3. snack 신청 라우트 (CRUD + 조회)

**파일:** `cursor/server/src/routes/snackRequest.ts` (신규)

**구현 엔드포인트:**
- `GET /api/snack/this-week` — 이번 주 전사 신청 + 합계 + D-day + deadline ISO
- `GET /api/snack/my-history?month=YYYY-MM` — 내 이력 (월별)
- `GET /api/snack/stats` — 이번 달 내 누적 + 전사 누적 + 1인 평균 (활성 직원 수 = `users WHERE employment_status='active'` 등)
- `POST /api/snack/requests` — 신청 등록 (week_start = 서버에서 자동 계산)
- `DELETE /api/snack/requests/:id` — 본인+pending+마감 전 또는 admin

**공통:**
- `router.use(authMiddleware, requireAppAccess('erp'))`
- 응답: 기존 vacation 라우트 스타일 (raw row 또는 `{ message, data }`)
- JOIN: `users` 와 조인해서 `user_name`, `department` 같이 반환

**완료 기준:**
- [ ] 5개 엔드포인트 모두 200/4xx 정상 응답
- [ ] POST 후 `week_start` 가 JST 기준 정확
- [ ] 본인 외 신청을 일반 사용자가 DELETE 시 403
- [ ] 마감 후 본인 DELETE 시 403, admin은 200
- [ ] 빌드(`tsc --noEmit`) 통과

---

## T4. snack 고정 구매 라우트

**파일:** T3와 동일 파일 `routes/snackRequest.ts` 에 추가

**엔드포인트:**
- `GET /api/snack/fixed` — 전사 고정 구매 리스트 (활성 우선 정렬)
- `POST /api/snack/fixed` — 등록 (start_date/end_date 자동 월요일 정규화)
- `PATCH /api/snack/fixed/:id` — `{ active: boolean }` 토글, 본인 또는 admin
- `DELETE /api/snack/fixed/:id` — 본인 또는 admin

**완료 기준:**
- [ ] 등록 시 `start_date`, `end_date` 가 월요일로 저장됨
- [ ] `end_date < start_date` 면 400
- [ ] 타인이 PATCH/DELETE 시 403

---

## T5. admin 액션 라우트

**파일:** `routes/snackRequest.ts` 에 추가

**엔드포인트:**
- `POST /api/snack/admin/mark-ordered` — body 생략 시 현재 주, `{ week_start }` 지정 가능
- `POST /api/snack/admin/run-fixed-job` — cron 수동 트리거 (디버그)

**미들웨어:** 라우트 내부에서 `req.user.role === 'admin'` 체크, 아니면 403

**완료 기준:**
- [ ] non-admin 호출 시 403
- [ ] mark-ordered 응답: `{ ordered_count, ordered_at }`
- [ ] 이미 ordered 인 항목은 건너뜀 (count 에 안 포함)

---

## T6. node-cron 서비스

**파일:**
- `cursor/server/package.json` (수정 — `node-cron` + `@types/node-cron` 추가)
- `cursor/server/src/services/snackFixedCron.ts` (신규)
- `cursor/server/src/index.ts` (수정 — `startSnackFixedCron()` 호출)

**구현:**
1. `npm install node-cron @types/node-cron --workspace=cursor/server`
2. `startSnackFixedCron()` — `cron.schedule('5 0 * * 1', ..., { timezone: 'Asia/Tokyo' })` + startup 30초 후 1회
3. `runSnackFixedJob()` — `INSERT ... SELECT ... ON CONFLICT (fixed_id, week_start) DO NOTHING`
4. `index.ts` 의 `startVacationCron()` 옆에 `startSnackFixedCron()` 추가

**완료 기준:**
- [ ] `npm run build` 통과
- [ ] 서버 시작 시 `[SnackFixed] cron scheduled` 로그
- [ ] T5의 수동 트리거 엔드포인트 호출 시 활성 고정구매가 이번 주 신청에 추가됨
- [ ] 두 번 호출해도 중복 안 들어감

---

## T7. i18n 키 추가

**파일:** `cursor/client/src/i18n/index.ts` (수정)

**작업:**
- `ja` 와 `ko` 섹션에 Phase 2 §6 의 ~30개 키 동시 추가
- 위치: 기존 ERP 관련 키들과 같은 그룹 (`erp_my_page` 근처)

**완료 기준:**
- [ ] 모든 키가 ja/ko 양쪽에 존재 (누락 시 빌드 에러 안 나도록 같은 셋 유지)
- [ ] `t('erp_snack_request')` 가 `'間食購入申請'` 반환 (ja 모드)

---

## T8. SnackRequestPage (메인 페이지)

**파일:** `cursor/client/src/pages/Erp/SnackRequestPage.tsx` (신규)

**구현 영역:**
- Header (제목 + 주차 + 마감/주문 사이클 안내)
- StatsCards (내 누적 / 전사 누적·평균)
- FixedSection (활성 N건 + 토글/삭제 + "+ 固定購入登録")
- ActionBar ([今週全社申請][私の履歴] + 마감 D-day + "+ 間食購入申請" + admin 전용 "今週分を一括発注完了に")
- RequestList (테이블 + 합계 + 본인 행에 취소 버튼)
- 모달 토글 state
- `useEffect` 로 마운트 시 this-week / stats / fixed 병렬 fetch

**완료 기준:**
- [ ] 페이지 진입 시 4개 영역 모두 렌더링
- [ ] admin 만 "一括発注完了" 버튼 노출
- [ ] view 토글 시 리스트 데이터 교체
- [ ] 마감 D-day 가 정확히 표시 (D-2 / D-1 / 当日 / 次週分)

---

## T9. SnackRequestModal (신청 모달)

**파일:** `cursor/client/src/pages/Erp/SnackRequestModal.tsx` (신규)

**구현:**
- 좌측 안내 박스 (마감/주문/Amazon 안내) + 반려 대상 박스 (분홍색)
- 우측 폼:
  - Amazon 바로가기 버튼 (`https://www.amazon.co.jp/`)
  - 商品リンク (input)
  - 商品名 (input)
  - 単価 / 数量 / 合計 (3-col, 합계는 read-only)
  - 備考 (textarea)
- 마감 후일 때 노란 배너 (`snack_late_warning`)
- 버튼: [キャンセル] [申請して続ける] [間食購入申請]
- "申請して続ける": 폼만 리셋, 모달 유지
- 검증: 필수 필드, unit_price ≥ 0, quantity ≥ 1

**완료 기준:**
- [ ] 필수 필드 누락 시 제출 버튼 비활성 또는 에러 표시
- [ ] 합계가 단가·수량 변경 시 즉시 갱신
- [ ] "申請して続ける" 후 폼 초기화 + 모달 유지
- [ ] 정상 신청 후 부모(`SnackRequestPage`) 의 리스트 자동 갱신

---

## T10. SnackFixedModal (고정 구매 모달)

**파일:** `cursor/client/src/pages/Erp/SnackFixedModal.tsx` (신규)

**구현:**
- 상단 안내: "毎週自動で申請箱に追加されます"
- 폼:
  - 期間 (시작일 / 종료일 date input, 자동 월요일 정규화 안내)
  - 그 외는 신청 모달과 동일 (URL/제품명/단가/수량/비고)
- 자동 안내문: `{N}週間 毎週自動申請 · 開始/終了は自動で月曜に整列`
- 버튼: [キャンセル] [申請して続ける] [固定購入登録]

**완료 기준:**
- [ ] 기간 입력 시 N주 자동 계산 표시
- [ ] end_date < start_date 시 제출 비활성
- [ ] 등록 후 부모 fixed 리스트 갱신

---

## T11. snackApi 클라이언트

**파일:** `cursor/client/src/pages/Erp/snackApi.ts` (신규)

**구현:**
- 11개 API 호출 헬퍼 함수
- 기존 패턴(`useAuthStore`에서 토큰 읽어 Authorization 헤더 추가) 따름
- 응답 타입 정의 (`ThisWeekData`, `StatsData`, `FixedItem`, `RequestItem` 등)

**완료 기준:**
- [ ] 11개 함수 모두 export
- [ ] 타입 안전 (`tsc --noEmit` 통과)

---

## T12. 라우트 + 메뉴 등록

**파일:**
- `cursor/client/src/App.tsx` (수정)
- `cursor/client/src/components/ErpLayout.tsx` (수정)

**작업:**
1. `App.tsx`: `<Route path="snack-request" element={<SnackRequestPage />} />` 를 `/erp` 라우트 그룹에 추가
2. `ErpLayout.tsx`:
   - `import SnackRequestPage` 는 `App.tsx` 가 담당
   - `import { Cookie }` from `lucide-react`
   - `navigation` 배열에 `{ labelKey: 'erp_snack_request', href: '/erp/snack-request', icon: Cookie }` 추가 (휴가 메뉴 다음)

**완료 기준:**
- [ ] `/erp/snack-request` 접근 시 SnackRequestPage 렌더링
- [ ] 사이드바에 "間食購入申請" 메뉴 노출 (선택 시 active 표시)
- [ ] ja/ko 토글 시 메뉴명 정상 변경

---

## T13. 검증 (수동 E2E + 빌드)

**작업:**
1. 서버 빌드: `cd cursor/server && npm run build` → 에러 없음
2. 클라이언트 빌드: `cd cursor/client && npm run build` → 에러 없음
3. 로컬 실행 후 시나리오 (Phase 2 §7) 수동 확인:
   - A. 일반 신청 → 리스트 즉시 반영
   - B. (시간 조작 어려우면) `lib/snackWeek.ts` 내부에 임시 `__forceNow` 변수 두고 토요일 시뮬 → 다음 주로 분류 확인
   - C. 고정 구매 등록 → admin/run-fixed-job 호출 → 신청 추가 → 한 번 더 호출 → 중복 없음
   - D. admin 일괄 발주완료
4. ja/ko 토글 시 모든 라벨 정상

**완료 기준:**
- [ ] 두 빌드 모두 성공
- [ ] 4개 시나리오 모두 의도대로 동작
- [ ] 콘솔 에러/워닝 없음

---

## 산출물 요약

### 신규 파일 (12개)
```
cursor/server/migrations/add_snack_request.sql
cursor/server/src/lib/snackWeek.ts
cursor/server/src/routes/snackRequest.ts
cursor/server/src/services/snackFixedCron.ts
cursor/client/src/pages/Erp/SnackRequestPage.tsx
cursor/client/src/pages/Erp/SnackRequestModal.tsx
cursor/client/src/pages/Erp/SnackFixedModal.tsx
cursor/client/src/pages/Erp/snackApi.ts
docs/snack-request-spec/01-requirements.md  (이미 작성)
docs/snack-request-spec/02-design.md         (이미 작성)
docs/snack-request-spec/03-tasks.md          (이 문서)
```

### 수정 파일 (5개)
```
cursor/server/package.json                   (node-cron 추가)
cursor/server/src/migrations/autoMigrate.ts  (autoMigrateSnackRequest)
cursor/server/src/index.ts                   (라우트 등록 + cron 시작 + autoMigrate 호출)
cursor/client/src/App.tsx                    (라우트 추가)
cursor/client/src/components/ErpLayout.tsx   (메뉴 추가)
cursor/client/src/i18n/index.ts              (i18n 키)
```
