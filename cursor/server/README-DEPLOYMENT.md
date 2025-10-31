# Railway 배포 가이드

## 현재 설정

### 빌드 과정
1. **Nixpacks**가 자동으로 `cursor/server` 디렉토리를 감지
2. `nixpacks.toml`에 따라 Node.js 18 설치
3. `npm ci` 실행 (package-lock.json 기반)
4. `npm run build` 실행 (TypeScript 컴파일)
5. `node dist/index.js`로 서버 시작

### 중요한 설정 파일

#### `cursor/server/nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ['nodejs-18_x']

[phases.build]
cmds = ['npm ci', 'npm run build']

[start]
cmd = 'node dist/index.js'
```

#### `cursor/server/package.json`
- `typescript`는 `dependencies`에 포함 (Railway production 빌드에서 필요)
- `start` 스크립트는 단순하게 `node dist/index.js`만 실행

#### `.gitignore`
```
dist/
!cursor/server/dist/
```
- 다른 `dist` 폴더는 무시하지만 `cursor/server/dist`만 Git에 포함

### TypeScript 컴파일
- 로컬에서 빌드한 `dist` 폴더를 Git에 커밋
- Railway는 이 파일을 사용하거나 필요시 재빌드

## 배포 워크플로우

### 로컬에서 변경사항 적용 시
```bash
cd cursor/server
npm run build  # TypeScript 컴파일
cd ../..
git add cursor/server/dist
git commit -m "Your message"
git push origin main
```

### Railway에서 자동 배포
1. GitHub에 푸시 → Railway가 자동 감지
2. `nixpacks.toml`에 따라 빌드 시작
3. `dist` 폴더가 이미 있으면 재빌드 생략 가능
4. `start` 명령으로 서버 시작

## 문제 해결

### "Cannot find module '/app/dist/index.js'"
- **원인**: `dist` 폴더가 Git에 없거나 빌드 실패
- **해결**: 로컬에서 빌드 후 커밋 또는 Railway Build Logs 확인

### "tsc: Permission denied"
- **원인**: `typescript`가 `devDependencies`에 있음
- **해결**: `typescript`를 `dependencies`로 이동 (완료됨)

### TypeScript 컴파일 에러
- **원인**: 타입 오류
- **해결**: 로컬에서 `npm run build` 실행하여 오류 확인 및 수정

### API 403/502 에러
- **원인**: 서버가 제대로 시작되지 않음
- **해결**: Railway Deploy Logs 확인, 서버가 정상 시작되는지 확인

## 베스트 프랙티스

1. **타입 체크 우선**: 변경사항마다 `npm run build`로 컴파일 확인
2. **dist 커밋**: 빌드 성공 시 `dist` 폴더 커밋
3. **증분 배포**: 작은 변경사항부터 테스트
4. **로그 확인**: Railway Build/Deploy/HTTP Logs 정기 확인

