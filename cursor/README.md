# 마케팅 CRM 시스템

마케팅 회사를 위한 현대적인 웹 기반 고객 관리 시스템 (CRM)

## 주요 기능

- 📊 직관적인 대시보드
- 👥 고객 정보 관리
- 🔄 리타겟팅 고객 관리 (1차/2차/3차 연락 추적)
- 📈 실적 및 통계 분석
- 💰 매출 관리 및 추적
- 📱 모바일 반응형 디자인

## 기술 스택

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- Zustand

### Backend
- Node.js
- Express
- TypeScript
- PostgreSQL

## 프로젝트 구조

```
crm/
├── client/          # React 프론트엔드
├── server/          # Node.js 백엔드
└── README.md
```

## 시작하기

### 사전 요구사항
- Node.js 18+
- PostgreSQL 14+

### 설치 및 실행

```bash
# 클라이언트 설치 및 실행
cd client
npm install
npm run dev

# 서버 설치 및 실행
cd server
npm install
npm run dev
```

## 환경 변수

### 서버 (.env)
```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/crm_db
JWT_SECRET=your_jwt_secret_key
```

### 클라이언트 (.env)
```
VITE_API_URL=http://localhost:5000/api
```

## 라이선스

MIT


