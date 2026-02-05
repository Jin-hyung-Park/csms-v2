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
| 근로자1 | `employee1@test.com` | `password123` |
| 근로자2 | `employee2@test.com` | `password123` |
| 승인 대기 | `pending@test.com` | `password123` |

### 신규 근로자 회원가입 흐름

1. **회원가입**: 역할 "근로자" 선택 후 **5자리 매장코드** 입력 (예: `PG001`, `SJ002`). 검증 버튼으로 매장 확인 가능.
2. **검증**: 입력한 매장코드가 등록된 매장인지 서버에서 검증 후, 해당 매장으로 초기 맵핑되어 **가입 요청** 상태로 저장됨.
3. **점주 승인**: 점주는 **직원 → 승인 대기** 필터에서 가입 요청 목록을 보고, 상세에서 시급·세금 유형·**근로 요일·근로 시간** 등을 확인/수정 후 **가입 승인** 버튼으로 승인.
4. 승인 전까지 근로자는 로그인 시 "가입 승인 대기 중" 배너가 표시됨.
5. **직원 정보 수정**: 점주는 직원 상세에서 기존 직원의 **근로 요일**(요일별 근무 가능 여부)·**근로 시간**(시작/종료 시간)을 수정할 수 있음.

## 📚 문서

- [현재 상태](./CURRENT_STATUS.md) - 프로젝트 진행 상황
- [브랜치 전략](./BRANCH_STRATEGY.md) - Git 브랜치 관리 방법
- [기여 가이드](./CONTRIBUTING.md) - 협업 가이드
- [로컬 테스트 가이드](./LOCAL_TEST_GUIDE.md) - 로컬 테스트 방법
- [Git 사용 가이드](./GIT_GUIDE.md) - Git 명령어 가이드
- [복지포인트 및 급여 엑셀](./docs/WELFARE_POINT_AND_EXCEL.md) - 복지포인트 산출 규칙, 급여 엑셀 포맷

## 🎯 다음 단계

- 알림 시스템 완성 (Notification 모델)

### 복지포인트 및 급여 엑셀 (구현 완료)

- **복지포인트**: 전주 실 근로시간 기반으로 차주에 지급. `복지포인트 = trunc(실 근로시간/4, 0) × 1,700원`. 점주/근로자 급여 메뉴에서 확인 가능. (`docs/WELFARE_POINT_AND_EXCEL.md` 참고)
- **급여 엑셀 다운로드**: 매장별·근로자별 급여내역. 컬럼: 이름, 주민번호, 입사일, 근로계약상 주단위 근로시간, 세금유형, 해당월 근무시간, 총급여, 실지급액, 4대보험료.

### 최저시급 및 4대 보험 (구현 완료)

- **최저시급**: 2026년 10,320원. 점주는 **점포별 적용 최저시급**을 점포 등록/수정 시 설정 가능. 해당 점포 소속 근로자 시급 기본값으로 사용.
- **4대 보험 대상**: 근로자 세금 유형에 **4대 보험 대상** 선택 시 국민연금(4.5%, 1,000원 절사)·건강보험(3.545%)·장기요양(건강보험료의 12.95%)·고용보험(0.9%)·소득세(1.53%)·지방소득세(소득세의 10%) 산정. 상세는 `docs/MINIMUM_WAGE_AND_4INSURANCE.md` 참고.
