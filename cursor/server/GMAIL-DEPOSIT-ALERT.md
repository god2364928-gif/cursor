# Gmail 입금 알림 자동화

## 📝 개요

Gmail에서 5분마다 입금 알림 메일을 자동으로 체크하여 Slack으로 전송합니다.

## ✅ 구현 완료 사항

### 1. Gmail API 서비스
- **파일**: `cursor/server/src/services/gmailService.ts`
- Gmail API로 메일 검색
- 미읽은 메일 중 "振込入金" 키워드 포함 메일만 가져오기
- 메일 읽음 처리

### 2. 입금 메일 파싱
- **파일**: `cursor/server/src/utils/depositParser.ts`
- 입금자명 추출
- 금액 추출 (¥5,000 형식)

### 3. Slack 알림
- **파일**: `cursor/server/src/utils/slackClient.ts`
- 별도 채널로 알림 전송 (`DEPOSIT_SLACK_CHANNEL_ID`)
- Block Kit 포맷 사용

### 4. 자동 스케줄러
- **파일**: `cursor/server/src/index.ts`
- 5분마다 자동 실행
- 서버 시작 시 즉시 1회 실행
- 환경 변수로 on/off 제어 가능

## 🚀 다음 단계

**자세한 설정 방법은 아래 문서를 참고하세요:**

📖 **[Gmail API 설정 가이드](./docs/GMAIL-DEPOSIT-SETUP.md)**

설정 단계 요약:
1. Slack 채널 생성 (1분)
2. Google Cloud Console 설정 (5분)
3. 최초 인증 (2분)
4. 환경 변수 설정
5. 로컬 테스트
6. Railway 배포

## 🔧 환경 변수

`.env` 파일에 추가:

```bash
# Gmail 입금 알림 체크 활성화
ENABLE_GMAIL_DEPOSIT_CHECK=1

# Gmail API 인증 파일 경로
GMAIL_CREDENTIALS_PATH=./gmail-credentials.json
GMAIL_TOKEN_PATH=./gmail-token.json

# Slack 입금 알림 전용 채널
DEPOSIT_SLACK_CHANNEL_ID=C12345678ABC
```

## 📦 설치된 패키지

- `googleapis@^128.0.0` - Gmail API 클라이언트

## 🔒 보안

- 인증 파일은 `.gitignore`에 추가됨
- Gmail 읽기 전용 권한만 사용
- 민감 정보는 환경 변수로 관리

## 📊 작동 방식

```
[Gmail] → (5분마다) → [메일 파싱] → [Slack 전송] → [읽음 처리]
```

1. Gmail에서 미읽은 입금 메일 검색
2. 입금자명 + 금액 추출
3. Slack 입금 채널로 알림
4. 메일을 읽음으로 표시 (중복 방지)

## ❓ 문제 해결

문제가 발생하면 [Gmail API 설정 가이드](./docs/GMAIL-DEPOSIT-SETUP.md)의 "문제 해결" 섹션을 참고하세요.
