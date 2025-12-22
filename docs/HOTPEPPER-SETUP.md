# 핫페퍼 구루메 API 설정 가이드

## 환경 변수 설정

### 1. 로컬 개발 환경

`cursor/server/.env` 파일에 다음 내용을 추가하세요:

```bash
# HotPepper Gourmet API
HOTPEPPER_API_KEY=ea23188c08fd9123
```

### 2. Railway 배포 환경

Railway 대시보드에서 환경 변수를 추가하세요:

1. Railway 대시보드 접속: https://railway.app
2. 프로젝트 선택
3. 서버 서비스 선택
4. "Variables" 탭 클릭
5. "New Variable" 버튼 클릭
6. 다음 내용 추가:
   - **Variable Name**: `HOTPEPPER_API_KEY`
   - **Value**: `ea23188c08fd9123`
7. "Add" 버튼 클릭
8. 자동으로 재배포됨

## 데이터베이스 마이그레이션

서버가 시작되면 자동으로 `hotpepper_restaurants` 테이블이 생성됩니다.

수동으로 마이그레이션하려면:

```bash
cd cursor/server
psql $DATABASE_URL < database/hotpepper-schema.sql
```

## 사용 방법

### 1. 웹 인터페이스 접속

로그인 후 좌측 메뉴에서 **"맛집 검색"** 클릭

### 2. 검색 방법

#### 지역으로 검색
- 지역 드롭다운에서 원하는 지역 선택 (예: 도쿄, 오사카)
- "검색 및 저장" 버튼 클릭

#### 키워드로 검색
- 키워드 입력 (예: 라멘, 스시, 이자카야)
- "검색 및 저장" 버튼 클릭

#### 복합 검색
- 지역 + 키워드 함께 사용 (예: 도쿄 + 라멘)

### 3. 결과 확인

- 검색 결과는 자동으로 데이터베이스에 저장됩니다
- 한 번에 최대 100개 맛집 정보 수집
- 중복된 가게는 자동으로 업데이트됨

### 4. 데이터 관리

- 저장된 맛집 목록에서 검색, 필터링 가능
- 불필요한 항목 개별/대량 삭제
- 외부 링크로 핫페퍼 상세 페이지 확인

## 수집 데이터 필드

| 한국어 | 일본어 | 필드명 |
|--------|--------|--------|
| 가게명 | 店名 | name |
| 전화번호 | 電話番号 | tel |
| 주소 | 住所 | address |
| 평균 예산 | 平均予算 | budget_average |
| 홍보 문구 | キャッチコピー | catch_phrase |
| 가게 URL | 店舗URL | shop_url |
| 검색 키워드 | 検索キーワード | search_keyword |
| 검색 지역 | 検索エリア | search_area |
| 수집 일시 | 収集日時 | collected_at |

## API 제한사항

- **일일 호출 제한**: 약 3,000~10,000건 (계정별 상이)
- **한 번에 수집 가능한 최대 개수**: 100개
- 제한 초과 시 HTTP 429 에러 발생
- 다음 날이 되면 제한 초기화

## 비용 모니터링

- **비용**: 무료 (Recruit Web Service)
- **사용량 확인**: https://webservice.recruit.co.jp/
- API 키로 로그인하여 대시보드에서 호출 횟수 확인 가능

## 주요 지역 코드

| 지역 (한국어) | 지역 (日本語) | 코드 |
|--------------|--------------|------|
| 도쿄 | 東京 | TOKYO (Z011) |
| 오사카 | 大阪 | OSAKA (Z014) |
| 교토 | 京都 | KYOTO (Z015) |
| 고베 | 神戸 | KOBE (Z016) |
| 나고야 | 名古屋 | NAGOYA (Z012) |
| 후쿠오카 | 福岡 | FUKUOKA (Z092) |
| 삿포로 | 札幌 | SAPPORO (Z001) |
| 센다이 | 仙台 | SENDAI (Z041) |
| 히로시마 | 広島 | HIROSHIMA (Z081) |
| 요코하마 | 横浜 | YOKOHAMA (Z021) |

## 문제 해결

### API 키 오류
```
Error: HOTPEPPER_API_KEY is not configured
```
→ 환경 변수가 설정되지 않음. 위 "환경 변수 설정" 참조

### 검색 결과 없음
- 키워드가 너무 구체적이거나 지역 범위가 좁을 수 있음
- 지역만으로 검색하거나 더 일반적인 키워드 사용

### 429 에러 (Too Many Requests)
- 일일 API 호출 제한 초과
- 다음 날까지 대기 필요

## 데이터베이스 직접 조회

```sql
-- 저장된 맛집 목록 확인
SELECT name, tel, address, budget_average 
FROM hotpepper_restaurants 
WHERE is_deleted = false
ORDER BY collected_at DESC
LIMIT 10;

-- 지역별 통계
SELECT search_area, COUNT(*) as count
FROM hotpepper_restaurants
WHERE is_deleted = false
GROUP BY search_area
ORDER BY count DESC;

-- 키워드별 통계
SELECT search_keyword, COUNT(*) as count
FROM hotpepper_restaurants
WHERE is_deleted = false
GROUP BY search_keyword
ORDER BY count DESC;
```

## 참고 링크

- HotPepper Gourmet API 공식 문서: http://webservice.recruit.co.jp/doc/hotpepper/reference.html
- Recruit Web Service: https://webservice.recruit.co.jp/






