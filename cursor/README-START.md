# CRM 개발 서버 실행 가이드

## 빠른 시작 방법

### 방법 1: 배치 파일 사용 (가장 간단)

**Windows 탐색기에서:**
1. `cursor` 폴더로 이동
2. `start-dev-simple.bat` 파일을 더블클릭

또는 명령 프롬프트에서:
```cmd
cd C:\Users\고은호\Desktop\new\cursor
start-dev-simple.bat
```

### 방법 2: npm 명령어 사용

**명령 프롬프트 또는 PowerShell에서:**
```cmd
cd C:\Users\고은호\Desktop\new\cursor
npm run dev
```

### 방법 3: 개별 실행 (새 창에서 각각 실행)

**서버용 터미널 1:**
```cmd
cd C:\Users\고은호\Desktop\new\cursor\server
npm run dev
```

**클라이언트용 터미널 2:**
```cmd
cd C:\Users\고은호\Desktop\new\cursor\client
npm run dev
```

## 접속 정보

- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5000
- **API 헬스체크**: http://localhost:5000/api/health

## 로그인 정보

- **Email**: hong@example.com
- **Password**: password123

## 문제 해결

### 서버가 시작되지 않는 경우:
1. PostgreSQL이 실행 중인지 확인
2. `cursor/server`와 `cursor/client` 폴더에서 `node_modules`가 설치되어 있는지 확인
3. 터미널 에러 메시지를 확인하세요

### 포트가 이미 사용 중인 경우:
- 3000 또는 5000 포트를 사용하는 다른 프로그램이 있는지 확인
- 다른 포트를 사용하려면:
  - 서버: `cursor/server/.env` 파일에서 `PORT` 값 변경
  - 클라이언트: `cursor/client/vite.config.ts` 파일에서 포트 변경


