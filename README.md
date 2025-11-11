# Trendkit

클라이언트 보고서용 구글 트렌드 & Google Ads 키워드 플래너 자동 생성 도구.

## 설치

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 환경 설정

1. `.env.example`를 복사해 `.env` 파일을 만듭니다.
2. `google-ads.yaml.example`을 복사해 `google-ads.yaml`을 만들고 필요한 값을 채웁니다.
3. `.env`에는 다음 값이 필요합니다.

```
GOOGLE_ADS_YAML=./google-ads.yaml
DEFAULT_GEO=JP
DEFAULT_LANG=ja
DEFAULT_TIMEFRAME=today 12-m
TZ=Asia/Tokyo
```

### Google Ads 자격 증명 발급

1. [Google Ads API Center](https://ads.google.com/aw/apicenter)에서 **개발자 토큰**을 생성합니다.
2. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth **클라이언트 ID**와 **클라이언트 비밀키**를 생성합니다. (애플리케이션 유형: 데스크톱 앱 권장)
3. OAuth 동의 화면을 승인한 뒤 `google-ads.yaml`의 값으로 클라이언트 ID/비밀키를 입력합니다.
4. `google-ads.yaml`에 기입한 자격으로 `google-ads` 라이브러리의 OAuth 플로우를 실행해 **리프레시 토큰**을 발급받아 입력합니다.
5. 관리자 계정에서 API 액세스가 허용되어 있는지 확인합니다. 테스트 모드 토큰의 경우 일부 통계가 비어 있을 수 있습니다.

## 사용법

키워드 하나마다 전체 보고서를 생성합니다.

```bash
python cli.py build "東京カフェ" --geo=JP --lang=ja --timeframe="today 12-m" --out=./reports/tokyo-cafe
```

출력에는 다음이 포함됩니다.

- `data/raw/` : 원본 구글 트렌드 & 키워드 플래너 CSV
- `data/processed/` : 월/요일 집계 결과 CSV
- `figures/` : 시각화 PNG
- 보고서 HTML & PDF

한국어 키워드 예시는 다음과 같습니다.

```bash
python cli.py build "서울 카페" --geo=KR --lang=ko --timeframe="today 12-m" --out=./reports/seoul-cafe
```

### 환경 점검

```bash
python cli.py validate
```

## 테스트

```bash
pytest
```

## 참고 사항

- Google Ads API 호출은 계정 설정 및 한도에 따라 과금될 수 있습니다.
- 테스트 모드 토큰 사용 시 검색량이 비어 있을 수 있으며, 보고서는 트렌드 데이터만으로도 생성됩니다.

## CRM 연동 가이드 (hotseller-crm)

키워드 분석 결과를 CRM `계정 최적화` 화면에 바로 보여주기 위해서는 아래 환경 값을 서버에 추가해야 합니다.

### 서버(.env) 필수 항목

- `TRENDKIT_PYTHON_BIN`: Trendkit 패키지를 실행할 파이썬 바이너리 (예: `/usr/bin/python3`)
- `TRENDKIT_TIMEOUT_MS`: 파이썬 요약 작업 타임아웃(선택, 기본 60000)
- `DEFAULT_GEO`, `DEFAULT_LANG`, `DEFAULT_TIMEFRAME`: 기본 지역/언어/기간 (예: `JP`, `ja`, `today 12-m`)
- `GOOGLE_ADS_YAML`: Trendkit에서 사용하는 Google Ads 설정 파일 경로
- `GOOGLE_PLACES_API_KEY`: Google Places 텍스트 검색에 사용할 API 키 (없으면 샘플 데이터 표시)

### API 사용 예시

```
POST /api/keyword-analysis
{
  "keyword": "渋谷 カフェ",
  "geo": "JP",
  "lang": "ja",
  "timeframe": "today 12-m"
}
```

응답에는 트렌드 타임라인, 월/요일 랭킹, 주간 피크, Google Ads 검색량 요약, Google Places 매장 요약이 포함되며 프런트에서는 자동으로 카드/그래프 형태로 시각화됩니다. CRM 화면에서 `캡처하기`를 누르면 인사이트 카드가 그대로 이미지로 복사됩니다.
