# 날짜/시간 처리 통합 가이드

## 개요

모든 날짜/시간 처리는 **`server/src/utils/dateHelper.ts`** 파일의 함수를 사용합니다.

한국(KST)과 일본(JST)은 동일한 **UTC+9** 타임존을 사용하므로, 하나의 통합 모듈로 관리됩니다.

---

## 사용 가능한 함수

### 1. 날짜 변환

```typescript
import { toKSTDateString, toKSTTimestampString, toKSTTimeString } from '../utils/dateHelper'

const date = new Date()

// YYYY-MM-DD 형식
const dateStr = toKSTDateString(date)
// 예: "2025-12-22"

// YYYY-MM-DD HH:mm:ss 형식
const timestampStr = toKSTTimestampString(date)
// 예: "2025-12-22 15:30:45"

// HH:mm:ss 형식
const timeStr = toKSTTimeString(date)
// 예: "15:30:45"
```

### 2. 현재 시간 가져오기

```typescript
import { getKSTNow, getKSTTodayString, getKSTNowString } from '../utils/dateHelper'

// 현재 UTC+9 시간의 Date 객체
const now = getKSTNow()

// 오늘 날짜 문자열 (YYYY-MM-DD)
const today = getKSTTodayString()

// 현재 타임스탬프 문자열 (YYYY-MM-DD HH:mm:ss)
const nowStr = getKSTNowString()
```

### 3. 날짜 파싱

```typescript
import { parseKSTDateString, isoToKSTDateString } from '../utils/dateHelper'

// KST/JST 날짜 문자열을 Date 객체로 변환
const date = parseKSTDateString('2025-12-22 15:30:00')

// ISO 문자열을 KST 날짜로 변환
const dateStr = isoToKSTDateString('2025-12-22T06:30:00.000Z')
// 예: "2025-12-22"
```

---

## 하위 호환성

기존 코드와의 호환성을 위해 JST 별칭도 제공됩니다:

```typescript
// 모두 동일한 함수를 가리킵니다 (UTC+9)
import { 
  toJSTDateString,        // = toKSTDateString
  toJSTTimestampString,   // = toKSTTimestampString
  toSeoulTimestampString, // = toKSTTimestampString
} from '../utils/dateHelper'
```

---

## 마이그레이션 체크리스트

기존 코드를 업데이트할 때:

- [ ] `toSeoulTimestampString` → `dateHelper.ts`에서 import
- [ ] `toKSTDateString` (로컬 정의) → `dateHelper.ts`에서 import
- [ ] `toJSTDateString` → `dateHelper.ts`에서 import
- [ ] `toJSTTimestampString` → `dateHelper.ts`에서 import

---

## 주의사항

### ❌ 하지 말 것

```typescript
// 각 파일에서 개별 날짜 변환 함수 정의 금지
const toKSTDateString = (date: Date) => { ... }  // ❌

// 직접 타임존 계산 금지
const kstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000)  // ❌
```

### ✅ 해야 할 것

```typescript
// 항상 통합 헬퍼 사용
import { toKSTDateString } from '../utils/dateHelper'  // ✅

const dateStr = toKSTDateString(new Date())
```

---

## 적용된 파일 목록

다음 파일들이 통합 `dateHelper.ts`를 사용하도록 업데이트되었습니다:

- `server/src/routes/salesTracking.ts`
- `server/src/routes/retargeting.ts`
- `server/src/routes/restaurants.ts`
- `server/src/routes/accounting/stats.ts`
- `server/src/routes/accounting/capital.ts`
- `server/src/routes/accounting/transactions.ts`

---

## 테스트

날짜 변환이 올바르게 작동하는지 확인:

```typescript
import { toKSTDateString, getKSTTodayString } from '../utils/dateHelper'

console.log('현재 KST 날짜:', getKSTTodayString())
console.log('UTC 기준 변환:', toKSTDateString(new Date()))
```

예상 출력: 서울/도쿄 현지 시간과 일치해야 합니다.




