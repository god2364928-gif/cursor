# Gmail 입금 알림 자동화 설정 가이드

## 개요

Gmail에서 5분마다 입금 알림 메일을 자동으로 체크하여 Slack으로 전송하는 기능입니다.

- **Gmail 계정**: cocomarke.official@gmail.com
- **체크 주기**: 5분마다
- **파싱 정보**: 입금자명, 금액
- **Slack 채널**: 별도 채널 (환경 변수 설정)

---

## 1️⃣ Slack 채널 생성 (1분)

### 1. Slack 워크스페이스에서 새 채널 생성

1. Slack 좌측 사이드바에서 **"채널"** 옆 **"+"** 클릭
2. **"채널 만들기"** 선택
3. 채널 이름 입력 (예: `입금알림`, `deposit-notifications`)
4. **"만들기"** 클릭

### 2. 기존 영수증 봇을 채널에 초대

1. 생성한 채널로 이동
2. 채널 상단의 **"멤버 추가"** 클릭
3. 기존 영수증 봇 검색 및 추가

### 3. 채널 ID 복사

1. 채널 이름 클릭 → **"채널 상세 정보"** 열기
2. 하단으로 스크롤하면 **"채널 ID"** 표시됨
3. 채널 ID 복사 (예: `C12345678ABC`)

---

## 2️⃣ Google Cloud Console 설정 (5분)

### 1. Google Cloud Console 접속

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. `cocomarke.official@gmail.com` 계정으로 로그인

### 2. 새 프로젝트 생성

1. 상단 프로젝트 드롭다운 클릭
2. **"새 프로젝트"** 클릭
3. 프로젝트 이름 입력: `Gmail Deposit Notifier`
4. **"만들기"** 클릭

### 3. Gmail API 활성화

1. 좌측 메뉴 → **"API 및 서비스"** → **"라이브러리"**
2. 검색창에 **"Gmail API"** 입력
3. **Gmail API** 선택
4. **"사용 설정"** 클릭

### 4. OAuth 2.0 인증 정보 생성

#### 4-1. OAuth 동의 화면 설정

1. 좌측 메뉴 → **"OAuth 동의 화면"**
2. **User Type**: **"외부"** 선택 → **"만들기"**
3. 앱 정보 입력:
   - **앱 이름**: Gmail Deposit Notifier
   - **사용자 지원 이메일**: cocomarke.official@gmail.com
   - **개발자 연락처 정보**: cocomarke.official@gmail.com
4. **"저장 후 계속"** 클릭
5. **범위 추가** 단계:
   - **"범위 추가 또는 삭제"** 클릭
   - `.../auth/gmail.readonly` 검색 및 선택
   - **"업데이트"** 클릭
6. **"저장 후 계속"** → **"저장 후 계속"**

#### 4-2. OAuth 클라이언트 ID 생성

1. 좌측 메뉴 → **"사용자 인증 정보"**
2. 상단 **"+ 사용자 인증 정보 만들기"** → **"OAuth 클라이언트 ID"**
3. 애플리케이션 유형: **"데스크톱 앱"**
4. 이름: `Gmail Desktop Client`
5. **"만들기"** 클릭
6. **"확인"** 클릭 (팝업 닫기)

### 5. 인증 정보 다운로드

1. 방금 생성한 **OAuth 클라이언트 ID** 찾기
2. 우측 **다운로드 아이콘** (⬇️) 클릭
3. JSON 파일 다운로드됨 → 파일명을 **`gmail-credentials.json`**으로 변경
4. 파일을 `/Users/go/Desktop/new/cursor/server/` 폴더에 저장

---

## 3️⃣ 최초 인증 (로컬 환경, 2분)

### 1. 인증 스크립트 생성

`/Users/go/Desktop/new/cursor/server/authenticate-gmail.js` 파일 생성:

```javascript
const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const CREDENTIALS_PATH = './gmail-credentials.json';
const TOKEN_PATH = './gmail-token.json';
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

async function authenticate() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔐 다음 URL을 브라우저에서 열어주세요:\n');
  console.log(authUrl);
  console.log('\n인증 후 받은 코드를 아래에 입력하세요:');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('인증 코드: ', async (code) => {
    rl.close();
    
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('\n✅ 인증 완료! token.json 파일이 생성되었습니다.');
    } catch (error) {
      console.error('❌ 인증 실패:', error.message);
    }
  });
}

authenticate();
```

### 2. 인증 실행

터미널에서 실행:

```bash
cd /Users/go/Desktop/new/cursor/server
node authenticate-gmail.js
```

### 3. 브라우저에서 인증

1. 터미널에 출력된 **URL**을 복사
2. 브라우저에서 URL 열기
3. `cocomarke.official@gmail.com` 계정으로 로그인
4. 권한 허용 클릭
5. **인증 코드** 복사
6. 터미널에 인증 코드 붙여넣기 → Enter

### 4. 인증 완료 확인

- `gmail-token.json` 파일이 생성되었는지 확인
- 서버 폴더에 두 파일이 있어야 함:
  - `gmail-credentials.json`
  - `gmail-token.json`

---

## 4️⃣ 환경 변수 설정

### 로컬 환경 (.env)

`/Users/go/Desktop/new/cursor/server/.env` 파일에 추가:

```bash
# Gmail 입금 알림 체크 활성화
ENABLE_GMAIL_DEPOSIT_CHECK=1

# Gmail API 인증 파일 경로
GMAIL_CREDENTIALS_PATH=./gmail-credentials.json
GMAIL_TOKEN_PATH=./gmail-token.json

# Slack 설정 (기존)
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C07UHNBPVUK

# Slack 입금 알림 전용 채널 (1단계에서 생성한 채널 ID)
DEPOSIT_SLACK_CHANNEL_ID=C12345678ABC
```

---

## 5️⃣ 로컬 테스트

### 1. 서버 재시작

```bash
cd /Users/go/Desktop/new/cursor/server
npm run dev
```

### 2. 로그 확인

서버 시작 시 다음 메시지가 출력되어야 함:

```
✅ Slack client initialized
Gmail deposit check scheduler enabled (every 5 min)
📧 Checking deposit emails...
```

### 3. 테스트 메일 확인

- Gmail에 입금 알림 메일이 미읽음 상태로 있는지 확인
- 5분 이내에 Slack 입금 채널로 알림이 오는지 확인

---

## 6️⃣ Railway 배포

### 1. Railway 환경 변수 설정

Railway 대시보드에서 `crm-server` 서비스의 **Variables** 탭:

#### 방법 A: 파일 내용을 환경 변수로 (권장)

```bash
ENABLE_GMAIL_DEPOSIT_CHECK=1

# gmail-credentials.json 파일 내용을 통째로 복사-붙여넣기
GMAIL_CREDENTIALS_JSON={"installed":{"client_id":"...","client_secret":"...","redirect_uris":["..."]}}

# gmail-token.json 파일 내용을 통째로 복사-붙여넣기
GMAIL_TOKEN_JSON={"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","expiry_date":1234567890}

# Slack 입금 채널 ID
DEPOSIT_SLACK_CHANNEL_ID=C12345678ABC
```

#### 방법 B: Railway 파일 업로드

1. Railway CLI 설치: `npm install -g @railway/cli`
2. 로그인: `railway login`
3. 프로젝트 연결: `railway link`
4. 파일 업로드:
   ```bash
   railway run --service crm-server echo "$(cat gmail-credentials.json)" > /app/gmail-credentials.json
   railway run --service crm-server echo "$(cat gmail-token.json)" > /app/gmail-token.json
   ```

### 2. 서버 코드 수정 (환경 변수로 파일 생성)

`cursor/server/src/services/gmailService.ts` 파일 상단에 추가:

```typescript
// Railway 환경 변수에서 인증 파일 생성
if (process.env.GMAIL_CREDENTIALS_JSON && !fs.existsSync(CREDENTIALS_PATH)) {
  fs.writeFileSync(CREDENTIALS_PATH, process.env.GMAIL_CREDENTIALS_JSON);
}
if (process.env.GMAIL_TOKEN_JSON && !fs.existsSync(TOKEN_PATH)) {
  fs.writeFileSync(TOKEN_PATH, process.env.GMAIL_TOKEN_JSON);
}
```

### 3. 재배포

```bash
git add .
git commit -m "feat: Gmail 입금 알림 자동화 추가"
git push
```

Railway가 자동으로 재배포를 시작합니다.

### 4. Railway 로그 확인

Railway 대시보드 → **Deployments** → 최신 배포 → **View Logs**

다음 메시지 확인:

```
✅ Slack client initialized
Gmail deposit check scheduler enabled (every 5 min)
```

---

## 7️⃣ 작동 방식

### 자동 실행

- 서버 시작 시 즉시 1회 실행
- 이후 5분마다 자동 실행
- 에러 발생 시에도 계속 실행 (중단되지 않음)

### 처리 흐름

1. Gmail에서 미읽은 메일 중 "振込入金" 키워드 포함 메일 검색
2. 메일 본문에서 **입금자명**과 **금액** 추출
3. Slack 입금 채널로 알림 전송
4. 메일을 읽음으로 표시 (중복 알림 방지)

---

## 8️⃣ 문제 해결

### Q1: "Gmail credentials file not found"

**원인**: `gmail-credentials.json` 파일이 없음

**해결**:
1. Google Cloud Console에서 인증 정보 다시 다운로드
2. 파일명을 `gmail-credentials.json`으로 변경
3. 서버 폴더에 저장

### Q2: "Gmail token file not found"

**원인**: 최초 인증을 하지 않았음

**해결**:
1. 3단계 "최초 인증" 다시 실행
2. `authenticate-gmail.js` 스크립트 실행
3. 브라우저에서 인증 완료

### Q3: "Could not find amount in email"

**원인**: 메일 형식이 예상과 다름

**해결**:
1. 실제 메일 본문을 확인
2. `cursor/server/src/utils/depositParser.ts` 파일의 정규표현식 수정
3. 필요 시 문의

### Q4: Slack에 알림이 안 옴

**원인**: Slack 채널 ID가 잘못됨 또는 봇이 채널에 없음

**해결**:
1. Slack 채널 ID 다시 확인
2. 채널에 봇이 초대되어 있는지 확인
3. `DEPOSIT_SLACK_CHANNEL_ID` 환경 변수 확인

### Q5: "401 Unauthorized" 에러

**원인**: Gmail 토큰이 만료됨

**해결**:
1. `gmail-token.json` 파일 삭제
2. 3단계 "최초 인증" 다시 실행
3. 새 토큰 생성

---

## 9️⃣ 개발 모드에서 비활성화

로컬 개발 시 Gmail 체크를 끄고 싶다면:

```bash
# .env 파일
ENABLE_GMAIL_DEPOSIT_CHECK=0
```

---

## 🔒 보안 주의사항

1. **인증 파일을 Git에 절대 커밋하지 마세요**
   - `.gitignore`에 이미 추가되어 있음
   - `gmail-credentials.json`, `gmail-token.json`

2. **읽기 전용 권한만 사용**
   - OAuth 범위: `gmail.readonly`
   - 메일 읽기만 가능, 삭제/수정 불가

3. **Slack 채널 권한 관리**
   - 입금 정보는 민감 데이터
   - 채널을 비공개로 설정
   - 필요한 사람만 초대

---

## 📊 모니터링

### Railway 로그 확인

```bash
railway logs --service crm-server
```

### 주요 로그 메시지

- `📧 Found N unread deposit notification email(s)` - 새 메일 발견
- `✅ Parsed deposit: [입금자명] - [금액]` - 파싱 성공
- `✅ Slack deposit notification sent` - Slack 전송 성공
- `✅ Marked message as read` - 메일 읽음 처리 완료
- `[Gmail] Deposit check error` - 에러 발생

---

## 💰 비용

- **Gmail API**: 완전 무료 (일일 할당량: 10억 요청)
- **Slack API**: 무료 (기존 봇 재사용)
- **서버 리소스**: 5분마다 1회 실행 (부하 미미)

---

## 📞 문의

설정 중 문제가 발생하면 로그와 함께 문의해주세요!
