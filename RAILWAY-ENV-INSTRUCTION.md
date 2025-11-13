# Railway 환경 변수 추가 - 서비스 강제 재시작

Railway 대시보드에서 다음 환경 변수를 추가해주세요:

## 1. Railway 프로젝트 접속
https://railway.app/project/28ebe688-21a7-4553-8a8f-7f4a6d9bb190

## 2. 서비스 선택
- cursor-server (또는 backend) 서비스 클릭

## 3. Variables 탭 이동
- 좌측 메뉴에서 "Variables" 클릭

## 4. 환경 변수 추가
새로운 환경 변수를 추가합니다:

```
Key: FORCE_REBUILD
Value: 1731476400
```

또는

```
Key: REBUILD_TIMESTAMP  
Value: 2025-11-13-14-54
```

## 5. Deploy 버튼 클릭
- 환경 변수를 추가하면 자동으로 "Deploy" 버튼이 활성화됩니다
- **반드시 Deploy 버튼을 클릭**하여 재배포를 시작합니다

## 6. 대기 (2-3분)
- Deployment 탭에서 진행 상황 확인
- "Success" 상태가 될 때까지 대기

## 7. 테스트
- 브라우저에서 Cmd+Shift+R (강제 새로고침)
- 영업이력 → 일별 통계 확인

---

**중요**: 환경 변수 추가는 단순히 빌드를 트리거하는 것이 아니라, 
**서비스 전체를 재시작**하므로 캐시 문제를 완전히 우회할 수 있습니다.

