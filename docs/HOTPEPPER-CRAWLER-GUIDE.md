# HotPepper 크롤링 기능 사용 가이드

## 📋 개요

HotPepper API로 수집한 음식점 데이터에는 전화번호와 공식 홈페이지가 포함되지 않습니다.
이 기능은 Selenium을 사용하여 HotPepper 상세 페이지를 크롤링하고, 부족한 정보를 자동으로 수집합니다.

---

## 🎯 수집 정보

1. **전화번호** (`tel`)
   - HotPepper 페이지의 "電話番号を表示する" 버튼 클릭 후 수집
   
2. **공식 홈페이지** (`official_homepage`)
   - "お店のホームページ" 또는 "公式HP" 항목에서 추출
   - HotPepper 자체 URL은 제외

---

## 🚀 사용 방법

### 1. 프론트엔드에서 실행

#### 1단계: 맛집 검색 페이지 접속
- 사이드바에서 **"리쿠르트 검색"** 클릭

#### 2단계: 크롤링 버튼 확인
- 저장된 맛집 목록 상단에 노란색 안내 박스 표시
- **"{N}개 레스토랑의 전화번호가 없습니다"** 메시지 확인

#### 3단계: 크롤링 시작
- **"전화번호 수집 시작"** 버튼 클릭
- 확인 대화상자에서 **확인** 클릭

#### 4단계: 진행 상황 확인
- 크롤링이 백그라운드에서 실행됩니다
- 30초마다 자동으로 결과가 업데이트됩니다
- 진행률은 상단에 표시: **"📞 전화번호: N개 (N%)"**

---

### 2. 로컬에서 Python 스크립트 직접 실행 (개발용)

```bash
# 1. Python 가상환경 활성화 (선택사항)
cd /Users/go/Desktop/new
python3 -m venv venv
source venv/bin/activate

# 2. 의존성 설치
pip install -r requirements.txt

# 3. 환경 변수 설정
export DATABASE_URL="postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway"
export CRAWL_BATCH_SIZE=20  # 한 번에 처리할 개수 (기본값: 20)

# 4. 크롤링 실행
python3 scripts/hotpepper_crawler.py
```

---

## 📊 API 엔드포인트

### 1. 크롤링 시작
```http
POST /api/hotpepper/crawl-details
Authorization: Bearer {token}

Request Body:
{
  "batch_size": 20  // 선택사항, 기본값 20
}

Response:
{
  "success": true,
  "message": "크롤링이 시작되었습니다",
  "total": 100,
  "status": "running"
}
```

### 2. 진행 상황 조회
```http
GET /api/hotpepper/crawl-status
Authorization: Bearer {token}

Response:
{
  "total": 100,
  "with_tel": 65,
  "without_tel": 35,
  "with_homepage": 42,
  "completion_rate": 65
}
```

---

## ⚙️ 설정

### 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 문자열 | (필수) |
| `CRAWL_BATCH_SIZE` | 한 번에 처리할 레코드 수 | 20 |

### 크롤링 설정

**스크립트 내부 설정** (`scripts/hotpepper_crawler.py`):

```python
MIN_WAIT = 3  # 최소 대기 시간 (초)
MAX_WAIT = 6  # 최대 대기 시간 (초)
```

---

## 🔧 작동 원리

### 1. 데이터베이스 조회
```sql
SELECT id, name, shop_url
FROM hotpepper_restaurants
WHERE shop_url IS NOT NULL
  AND (tel IS NULL OR tel = '')
  AND is_deleted = false
LIMIT 20
```

### 2. 각 레스토랑에 대해:
1. **페이지 로딩**: `driver.get(shop_url)`
2. **전화번호 버튼 클릭**: XPath로 "電話番号を表示する" 찾기
3. **전화번호 추출**: 표시된 전화번호 텍스트 가져오기
4. **공식 홈페이지 추출**: "お店のホームページ" 항목의 링크 가져오기
5. **데이터베이스 업데이트**:
   ```sql
   UPDATE hotpepper_restaurants
   SET tel = $1, official_homepage = $2, updated_at = CURRENT_TIMESTAMP
   WHERE id = $3
   ```
6. **랜덤 대기**: `time.sleep(random.uniform(3, 6))`

---

## 🛡️ 에러 처리

### 자동 복구
- 개별 페이지 크롤링 실패 시 → "Error" 기록 후 다음 레스토랑으로 계속
- 전화번호 버튼이 없는 경우 → 건너뛰고 계속
- 공식 홈페이지가 없는 경우 → NULL로 저장하고 계속

### 로그 확인
```bash
# Railway 로그 확인
railway logs

# 또는 Railway 대시보드에서 View Logs
```

---

## ⚠️ 주의사항

### 1. Railway 메모리 제한
- Railway 무료 플랜: 512MB RAM
- Selenium + Chrome: 약 200-300MB 사용
- **한 번에 20개 이하**로 처리 권장

### 2. HotPepper 차단 방지
- 랜덤 대기 시간 (3-6초)
- User-Agent 설정
- 하루에 100-200개 정도만 크롤링 권장

### 3. 실행 시간
- **1개 레스토랑당 약 5-10초** 소요
- 20개 처리 시 약 **2-3분** 예상

---

## 📈 모니터링

### 프론트엔드에서 확인
- 상단에 **"📞 전화번호: N개 (N%)"** 표시
- 진행률이 100%가 되면 완료

### Railway 대시보드
1. **Deployments** 탭에서 배포 상태 확인
2. **View Logs**로 실시간 로그 확인
3. Python 스크립트 출력 메시지:
   ```
   🍜 HotPepper Restaurant Detail Crawler
   ✅ 데이터베이스 연결 성공
   📋 크롤링 대상: 20개 레스토랑
   
   [1/20] 정宗 赤羽店
     📞 전화번호: 03-3598-1234
     ✅ 공식 홈페이지: https://example.com
     💾 데이터베이스 업데이트 완료
   ...
   ```

---

## 🚨 문제 해결

### 문제: 크롤링이 시작되지 않음
**해결**:
1. Railway 로그 확인
2. Python 3 설치 확인: `python3 --version`
3. 의존성 설치 확인: `pip list | grep selenium`

### 문제: Chrome WebDriver 에러
**해결**:
```bash
pip install --upgrade selenium webdriver-manager
```

### 문제: 메모리 부족 (Railway)
**해결**:
- `CRAWL_BATCH_SIZE`를 10으로 줄이기
- 또는 Railway Pro 플랜 사용 (8GB RAM)

### 문제: 전화번호가 수집되지 않음
**원인**: HotPepper 페이지 구조 변경
**해결**:
1. `scripts/hotpepper_crawler.py` 파일 열기
2. XPath 선택자 업데이트:
   ```python
   tel_button_selectors = [
       "//새로운_선택자",  # 추가
       "//a[contains(text(), '電話番号を表示')]",
       ...
   ]
   ```

---

## 📊 결과 확인

### 프론트엔드 카드 UI
크롤링 성공 후 각 레스토랑 카드에 표시:

```
📞 03-3598-1234 (클릭하면 전화 걸기)
🌐 공식 홈페이지 (새 탭에서 열기)
🔗 핫페퍼에서 보기
```

### 데이터베이스 직접 확인
```sql
SELECT name, tel, official_homepage
FROM hotpepper_restaurants
WHERE tel IS NOT NULL
LIMIT 10;
```

---

## 🎉 완료!

크롤링 기능이 성공적으로 추가되었습니다.
이제 HotPepper API로 수집한 데이터에 전화번호와 공식 홈페이지가 자동으로 추가됩니다!






