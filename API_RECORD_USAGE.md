# 녹취 파일 조회 API 사용법

## 개요

CPI 전체 녹취파일 목록을 조회하는 API입니다. 페이지네이션, 검색, 필터링, 정렬 기능을 제공합니다.

## 요청

### Request URL

```
GET http://52.192.162.161/api/record
```

### Request Method

`GET`

### Request Headers

| 헤더명          | 타입   | 필수 | 설명             | 예시                                             |
| --------------- | ------ | ---- | ---------------- | ------------------------------------------------ |
| `Authorization` | string | 필수 | Bearer JWT 토큰  | `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `Content-Type`  | string | 선택 | 요청 컨텐츠 타입 | `application/json`                               |

**JWT 토큰 (고정, 만료 없음)**:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8
```

### Request Parameters

모든 파라미터는 Query Parameter로 전달합니다.

| 파라미터명    | 타입      | 필수 | 기본값        | 설명                                                                                                                                                                                                                                                                                                                                                                               |
| ------------- | --------- | ---- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `row`         | integer   | 선택 | `10`          | 한 페이지에 보이는 row 수                                                                                                                                                                                                                                                                                                                                                          |
| `page`        | integer   | 선택 | `1`           | 요청할 페이지 번호                                                                                                                                                                                                                                                                                                                                                                 |
| `query`       | string    | 선택 | `null`        | 검색 키워드                                                                                                                                                                                                                                                                                                                                                                        |
| `query_type`  | integer   | 선택 | `0`           | 검색 타입<br>• `0`: 이름<br>• `1`: 업체명<br>• `2`: 휴대폰 번호                                                                                                                                                                                                                                                                                                                    |
| `call_type`   | integer[] | 선택 | `[]`          | 콜 분류 (복수 선택 가능)<br>• `0`: 첫콜 IN<br>• `1`: 첫콜 OUT<br>• `2`: 계약전<br>• `3`: 계약 후 관리<br>• `4`: 계약 후 연장<br>• `5`: 해지<br>• `6`: 계약전 IN<br>• `7`: 계약전 OUT<br>• `8`: 분류 없음                                                                                                                                                                           |
| `is_out`      | integer   | 선택 | `null`        | 발신/수신 구분<br>• `0`: 수신<br>• `1`: 발신                                                                                                                                                                                                                                                                                                                                       |
| `is_positive` | integer   | 선택 | `null`        | 긍정/부정<br>• `0`: 부정<br>• `1`: 긍정                                                                                                                                                                                                                                                                                                                                            |
| `is_contract` | integer   | 선택 | `null`        | 계약 여부<br>• `0`: 비계약<br>• `1`: 계약                                                                                                                                                                                                                                                                                                                                          |
| `start_date`  | string    | 선택 | `null`        | 시작 날짜 (형식: `yyyy-mm-dd`)                                                                                                                                                                                                                                                                                                                                                     |
| `end_date`    | string    | 선택 | `null`        | 종료 날짜 (형식: `yyyy-mm-dd`)                                                                                                                                                                                                                                                                                                                                                     |
| `min_time`    | string    | 선택 | `"00-00-00"`  | 통화시간 최소 시간 (형식: `HH-MM-SS`)                                                                                                                                                                                                                                                                                                                                              |
| `max_time`    | string    | 선택 | `"24-00-00"`  | 통화시간 최대 시간 (형식: `HH-MM-SS`)                                                                                                                                                                                                                                                                                                                                              |
| `sort`        | string    | 선택 | `"date-desc"` | 정렬 옵션<br>• `username-asc`: 이름 오름차순<br>• `username-desc`: 이름 내림차순<br>• `company-asc`: 회사 오름차순<br>• `company-desc`: 회사 내림차순<br>• `date-asc`: 날짜 오름차순<br>• `date-desc`: 날짜 내림차순<br>• `call-type-asc`: 콜 타입 오름차순<br>• `call-type-desc`: 콜 타입 내림차순<br>• `duration-asc`: 통화시간 오름차순<br>• `duration-desc`: 통화시간 내림차순 |

### Request Example

**기본 요청 (모든 파라미터 기본값)**

```
GET /api/record
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8
```

**페이지네이션 예시**

```
GET /api/record?row=20&page=2
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8
```

**검색 예시 (이름으로 검색)**

```
GET /api/record?query=이기룡&query_type=0
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8
```

**필터링 예시 (날짜 범위 + 계약 여부)**

```
GET /api/record?start_date=2020-11-01&end_date=2020-11-30&is_contract=1&sort=date-desc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8
```

**복합 필터 예시 (여러 call_type 선택)**

```
GET /api/record?call_type=0&call_type=1&is_out=1&is_positive=1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMCIsInVzZXJuYW1lIjoiXHVjNzc0XHVjOGZjXHVkNjA0IiwidXNlcl9wYXNzd29yZCI6IiQyYiQxMCQxMWduNjRxRGVZSGwyYks0U25Fb2tld2dnc0t5WXJ3bDRkT3Bac3RKMmRXNDdtUTUvUi8ydSIsInJvbGUiOiJBRE1JTiIsImFwcF91c2VyX2lkIjozNjksImV4cCI6MTc2ODQwNTgxOH0.cTNMLpenOeQls_33edHIDCXWuuJjMWywuph23nWYHF8
```

## 응답

### Success Response (200 OK)

```json
{
  "message": "Success",
  "results": {
    "total_count": 156376,
    "data": [
      {
        "record_id": 96,
        "username": "이기룡",
        "company": "투썸스파",
        "file_length": 19900,
        "file_name": "통화 녹음 01049552300_201103_132636.m4a",
        "is_contract": 0,
        "is_out": 1,
        "is_positive": 0,
        "phone_number": "01049552300",
        "type": null,
        "created_at": "2020-11-03T13:27:15.804",
        "is_bookmarked_personal_id": null,
        "is_bookmarked_global_id": null
      }
    ]
  }
}
```

### 결과가 없을 경우

```json
{
  "message": "Success",
  "results": {
    "total_count": 0,
    "data": []
  }
}
```

### Error Response

#### 401 Unauthorized - 인증 실패

토큰이 유효하지 않거나 만료된 경우 반환됩니다.

**Response Body**:

```json
{
  "code": "204",
  "message": "LOGIN_INVALID_TOKEN"
}
```

#### 500 Internal Server Error - 서버 에러

**Response Body**:

```json
{
  "code": "099",
  "message": "SERVER_ERROR"
}
```

## 응답 필드 설명

### Response Body

| 필드명                | 타입    | 설명                            |
| --------------------- | ------- | ------------------------------- |
| `message`             | string  | 응답 메시지 (성공 시 "Success") |
| `results`             | object  | 조회 결과 객체                  |
| `results.total_count` | integer | 전체 레코드 수                  |
| `results.data`        | array   | 녹취 파일 목록 배열             |

### Data Array Item

| 필드명                      | 타입            | 설명                              |
| --------------------------- | --------------- | --------------------------------- |
| `record_id`                 | integer         | 녹취 파일 고유 ID                 |
| `username`                  | string          | 사용자 이름                       |
| `company`                   | string          | 업체명                            |
| `file_length`               | integer         | 파일 크기 (바이트)                |
| `file_name`                 | string          | 파일명                            |
| `is_contract`               | integer         | 계약 여부 (0: 비계약, 1: 계약)    |
| `is_out`                    | integer         | 발신/수신 구분 (0: 수신, 1: 발신) |
| `is_positive`               | integer         | 긍정/부정 (0: 부정, 1: 긍정)      |
| `phone_number`              | string          | 전화번호                          |
| `type`                      | integer \| null | 콜 타입                           |
| `created_at`                | string          | 생성일시 (ISO 8601 형식)          |
| `is_bookmarked_personal_id` | integer \| null | 개인 북마크 ID (없으면 null)      |
| `is_bookmarked_global_id`   | integer \| null | 공개 북마크 ID (없으면 null)      |

## 주의사항

1. **인증**: 모든 요청에 `Authorization` 헤더에 Bearer 토큰을 포함해야 합니다.
2. **call_type 파라미터**: 여러 값을 선택할 경우 Query Parameter에 동일한 파라미터명을 여러 번 추가해야 합니다.
   - 예: `?call_type=0&call_type=1&call_type=2`
3. **날짜 형식**: `start_date`와 `end_date`는 반드시 `yyyy-mm-dd` 형식을 사용해야 합니다.
4. **시간 형식**: `min_time`과 `max_time`은 `HH-MM-SS` 형식을 사용합니다.
5. **정렬 옵션**: `sort` 파라미터는 `{필드명}-{asc|desc}` 형식을 정확히 따라야 합니다.
6. **결과 없음**: 검색 결과가 없어도 HTTP 200 상태 코드를 반환하며, `data`는 빈 배열입니다.
7. **페이지네이션**: `page`는 1부터 시작합니다.

## 참고

- API 서버 기본 포트: `30000` (환경에 따라 변경 가능)
- 모든 날짜/시간은 서버의 타임존(KST, UTC+9) 기준입니다.
- `record_id`는 각 녹취 파일의 고유 식별자입니다.
- **녹취 파일 접근**: S3에 저장된 녹취 파일(m4a 등)은 다음 URL 형식으로 접근할 수 있습니다.
  ```
  https://hotseller-cpi-jp.s3.ap-northeast-1.amazonaws.com/static/{file_name}
  ```
  `{file_name}`은 응답의 `file_name` 필드 값을 사용합니다.
- **전사 스크립트(TXT) 접근**: S3에 저장된 전사 파일은 다음 URL 형식으로 접근할 수 있습니다.
  ```
  https://hotseller-cpi-jp.s3.ap-northeast-1.amazonaws.com/transcript/{transcript_name}
  ```
  `{transcript_name}` 위치에 전사 파일명을 입력하면 txt 파일을 확인할 수 있습니다.
