# 프로젝트 구조

## 주요 디렉토리

### `/cursor` - CRM 웹 애플리케이션
- `/cursor/client` - React 프론트엔드 (Vite + TypeScript)
- `/cursor/server` - Express 백엔드 (TypeScript)
- Vercel (프론트엔드) + Railway (백엔드) 배포

### `/trendkit` - 키워드 분석 도구
- Google Trends + Google Ads API
- Python 기반 CLI 도구
- CRM 계정 최적화 페이지에서 사용

### 루트 파일들

#### 문서
- `README.md` - 프로젝트 전체 개요
- `PROJECT_STRUCTURE.md` - 프로젝트 구조 가이드
- `SLACK-SETUP-GUIDE.md` - 슬랙 알림 설정
- `TROUBLESHOOTING.md` - 배포 문제 해결

## 배포 환경

### 프론트엔드 (Vercel)
- 자동 배포: GitHub main 브랜치 푸시 시
- 환경: Node.js 18+
- 빌드: `npm run build` (Vite)

### 백엔드 (Railway)
- 자동 배포: GitHub main 브랜치 푸시 시
- 환경: Node.js 18+
- 빌드: `npm run build` (TypeScript)
- 데이터베이스: PostgreSQL (Railway 제공)

## 로컬 개발

### CRM 서버
```bash
cd cursor/server
npm install
npm run dev
```

### CRM 클라이언트
```bash
cd cursor/client
npm install
npm run dev
```

### Trendkit
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 빌드 결과물 (배포 시 자동 생성)

- `cursor/client/dist/` - 프론트엔드 빌드 (Vercel)
- `cursor/server/dist/` - 백엔드 빌드 (Railway)

> 빌드 폴더는 .gitignore에 포함되어 있으며 Git에 커밋되지 않습니다.

