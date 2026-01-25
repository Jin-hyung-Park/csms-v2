# CSMS ver2 (로컬 개발용)

`SYSTEM_SPECIFICATION.md` 기반으로 재구현하는 신규 편의점 관리 시스템입니다. 기존 시스템과 분리된 디렉토리와 패키지를 사용하므로 롤백이나 비교가 자유롭습니다.

## 디렉토리 구조

```
csms-v2/
├── client/   # React 18 + Tailwind + React Query + Zustand + PWA
├── server/   # Express.js + MongoDB + JWT + Rate Limit
└── README.md
```

## 사전 요구 사항

- Node.js 18 이상 (CRA 및 Tailwind 3.x 권장)
- MongoDB (로컬 혹은 Atlas)

## 환경 변수

1. `client/.env` (선택)
   ```
   REACT_APP_API_URL=http://localhost:5001
   ```
2. `server/env.example` 참고하여 `.env` 생성
   ```
   PORT=5001
   MONGODB_URI=mongodb://localhost:27017/csms_ver2
   JWT_SECRET=replace-me
   ```

## 실행 방법

```bash
# 루트에서
npm install
cd client && npm install
cd ../server && npm install

# 다시 csms-v2 루트로 돌아와서
npm run dev        # 프론트/백 동시 실행
npm run dev:client # 프론트만
npm run dev:server # 백엔드만
```

## 다음 단계

- `SYSTEM_SPECIFICATION.md`의 모델/비즈니스 로직을 기반으로 API와 UI를 확장합니다.
- Owner/Employee 별 라우팅과 인증 흐름을 React Router + JWT 기반으로 추가합니다.
- 테스트 및 배포 파이프라인을 추가하여 기존 시스템과 병행 운영합니다.

