# CSMS v2 - 편의점 근무 관리 시스템

> Convenience Store Management System v2

`SYSTEM_SPECIFICATION.md` 기반으로 재구현하는 신규 편의점 관리 시스템입니다. 기존 시스템과 분리된 디렉토리와 패키지를 사용하므로 롤백이나 비교가 자유롭습니다.

## 🌿 브랜치 전략

이 프로젝트는 **Git Flow** 기반의 브랜치 전략을 사용합니다.

- **master**: 프로덕션 준비 코드
- **develop**: 개발 통합 브랜치
- **feature/***: 새 기능 개발
- **fix/***: 버그 수정

자세한 내용은 [BRANCH_STRATEGY.md](./BRANCH_STRATEGY.md)를 참고하세요.

## 🤝 기여하기

프로젝트에 기여하고 싶으시다면 [CONTRIBUTING.md](./CONTRIBUTING.md)를 확인해주세요.

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

## 🚀 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/Jin-hyung-Park/csms-v2.git
cd csms-v2
```

### 2. develop 브랜치로 전환

```bash
git checkout develop
```

### 3. 의존성 설치

```bash
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

### 4. 환경 변수 설정

`server/.env` 파일 생성:
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/csms_ver2
JWT_SECRET=your-secret-key
```

### 5. 테스트 데이터 생성

```bash
cd server
npm run seed:clear
```

### 6. 개발 서버 실행

```bash
# 루트 디렉토리에서
npm run dev
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5001

## 📋 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 점주 | `owner@test.com` | `password123` |
| 근로자 | `employee1@test.com` | `password123` |

## 📚 문서

- [현재 상태](./CURRENT_STATUS.md) - 프로젝트 진행 상황
- [브랜치 전략](./BRANCH_STRATEGY.md) - Git 브랜치 관리 방법
- [기여 가이드](./CONTRIBUTING.md) - 협업 가이드
- [로컬 테스트 가이드](./LOCAL_TEST_GUIDE.md) - 로컬 테스트 방법
- [Git 사용 가이드](./GIT_GUIDE.md) - Git 명령어 가이드

## 🎯 다음 단계

- 급여 계산 로직 완성 (주휴수당, 세금)
- 급여 확정 프로세스 구현
- User 모델 확장
- 알림 시스템 완성

