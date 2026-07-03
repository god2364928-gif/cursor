# 청구서(請求書) 기능 하드닝 스펙

작성일: 2026-07-03 / 브랜치: feat/expense-reimbursement (또는 신규 브랜치)
배경: "청구서 발행 시 오류가 계속 난다" 신고 → 프론트/서버라우트/freee연동/PDF+DB 4영역 정밀 검토. 아래는 확정된 원인과 수정 스펙.

## 1. Requirements (무엇을 만족해야 하나)
- R1. 운영 DB에 invoice 관련 컬럼(memo, payment_bank_info, is_cancelled 계열, line_items)이 자동 보장되어 목록/생성/PDF/취소가 500 나지 않는다.
- R2. freee 회사/청구서 ID를 안전히 저장한다(32-bit 오버플로 없음).
- R3. 같은 사용자가 실수로 여러 번 눌러도 중복 청구서가 생기지 않는다. freee 생성 후 DB 저장이 실패해도 고아(orphan)가 추적 가능하고, 사용자는 재시도로 중복 발행하지 않도록 안내받는다.
- R4. freee 토큰이 회전/만료되어도 자동 복구되거나, 재인증이 필요하다는 명확한 신호를 준다. 동시 요청이 서로의 토큰을 무효화하지 않는다.
- R5. PDF는 특수문자·누락 필드·freee 응답 흔들림에도 깨지거나 NaN을 내지 않는다. freee 상세조회 실패 시 DB에 저장된 품목으로 폴백한다.
- R6. 발행 실패/에러가 사용자 눈에 보이고, freee 인증 실패로 앱 세션이 잘못 로그아웃되지 않는다.
- R7. 앱 표시금액·PDF·freee 기록의 세금 반올림 방식이 일치한다.

## 2. Design (핵심 결정)
- D1. 마이그레이션: 기존 프로젝트 패턴(`server/src/migrations/autoMigrate*.ts`, 부팅 시 실행)을 따라 `autoMigrateInvoices.ts` 신설 → `index.ts startServer()`에 연결. 모두 `ADD COLUMN IF NOT EXISTS` / `ALTER ... TYPE BIGINT`(확장이라 무손실) 멱등.
- D2. 오버플로: `invoices.freee_invoice_id`, `company_id`, `partner_id`를 BIGINT로.
- D3. 중복 방지: `invoices.freee_invoice_id`에 부분 UNIQUE 인덱스 + 프론트 더블클릭 가드 + 청구서번호를 초 단위(YYYYMMDDHHMMSS)로.
- D4. 정합성: freee 생성 성공 후 DB INSERT 실패 시 → 트랜잭션/try-catch로 잡아 orphan freee_invoice_id를 에러 로그에 남기고, 사용자에게 "발행은 되었으나 기록 실패, 재시도 금지, 관리자 문의" 취지의 구체 에러 반환.
- D5. 폴백 저장: 생성 시 `line_items`(JSONB)를 DB에 저장. `downloadInvoicePdf`는 freee 상세조회 성공 시 그 값, 실패 시 DB `line_items`로 PDF 생성.
- D6. 토큰: `refreshAccessToken` 실패 시 응답 본문 파싱 + 죽은 토큰 캐시/DB 클리어 + 구분되는 재인증 필요 신호. 모듈 레벨 single-flight 프라미스로 동시 갱신 직렬화. `saveTokenToDB`는 트랜잭션. `getValidFreeeToken()`를 export 하여 receipts.ts도 경유.
- D7. fetch 타임아웃: 모든 freee fetch에 `AbortSignal.timeout(15000)`.
- D8. 반올림: freee `tax_fraction`을 `'round'`→`'floor'`로 바꿔 앱/PDF(현행 floor)와 통일. `tax_rate || 10` → `tax_rate ?? 10`(0% 보존). PDF는 `Number(line.tax_rate)`로 강제 변환.
- D9. PDF 안전: 모든 사용자 문자열에 HTML escape 적용. `invoice.lines ?? []`, 숫자필드 `Number(x) || 0`.
- D10. 프론트: 401 인터셉터가 freee 데이터 엔드포인트(/invoices/*)의 401엔 로그아웃하지 않도록 스코프 축소. 모달 내부에 에러 표시. dbId 없으면 다운로드 스킵+안내.

## 3. 이번 스코프에서 제외/보류 (사용자 확인 필요)
- X1. **취소 시 freee 쪽 청구서도 void 할지** — 현재는 CRM DB만 소프트 취소. 회계 실물 청구서를 무르는 건 위험 → 명시 승인 전까지 현행 유지(코드에 TODO).
- X2. **하드코딩된 FREEE_CLIENT_SECRET**(freeeClient.ts:8) — 이미 git 이력에 노출. 제거하면 env 미설정 운영이 깨질 수 있어 코드 변경 대신 **freee 콘솔에서 시크릿 로테이션 + 환경변수 설정** 권장(운영 조치).
- X3. `withholding_tax_entry_method` 매핑 정확성 — freee 문서 재확인 필요(별도).

## 4. Tasks (파일 단위, 충돌 방지 순서)
- T1 (DB): `autoMigrateInvoices.ts` 신설 + `index.ts` 연결. [R1,R2,D1,D2,D5 컬럼]
- T2 (pdfGenerator.ts): HTML escape + 방어적 숫자/세율 변환. [R5,D9,D8-PDF]
- T3 (frontend): 더블클릭 가드, 모달 내 에러표시, 401 스코프, dbId 가드. [R3,R6,D3-front,D10]
- T4 (freeeClient.ts): 토큰 single-flight/clear/tx/export, 청구서번호 초단위, fetch 타임아웃, tax_fraction floor, tax_rate ??, downloadInvoicePdf에 fallbackLines 파라미터. [R2,R4,R5,R7,D3,D6,D7,D8]
- T5 (invoices.ts): line_items 저장, 입력검증, DB실패 보상 에러, PDF라우트 fallbackLines 전달 + 에러 상태 매핑. [R3,R5,D4,D5]
- T6 (receipts.ts): `getValidFreeeToken` 경유. [R4]
- T7 (검증): server+client 빌드, 로컬 PDF 테스트, diff 리뷰.

## 5. 인터페이스 계약 (에이전트 간 정합)
- freeeClient exports: `export async function getValidFreeeToken(): Promise<string>` (유효 토큰 반환, 없거나 재인증 필요 시 `Error('FREEE_REAUTH_REQUIRED')` throw).
- `downloadInvoicePdf(companyId, invoiceId, dueDate?, memo?, paymentBankInfo?, taxEntryMethod?, fallbackLines?)` — 마지막 인자 `fallbackLines?: Array<{description,quantity,unit_price,tax_rate}>`.
- invoices.ts PDF 라우트: invoices 행에서 `line_items` SELECT 후 `downloadInvoicePdf(..., line_items)`로 전달.
- 신규 컬럼명: `line_items JSONB`, `memo TEXT`, `payment_bank_info TEXT`, `is_cancelled BOOLEAN DEFAULT FALSE`, `cancelled_at TIMESTAMP`, `cancelled_by_user_id UUID`.
