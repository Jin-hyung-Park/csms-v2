# CSMS 기본 기능 점검 보고서

**점검일**: 2026-02-04

## 1. 프로젝트 구조 요약

### 1.1 메인 프로젝트 (운영 중인 구조)

| 구분 | 경로 | 기술 스택 |
|------|------|-----------|
| **백엔드** | `server/` | Node.js, Express, MongoDB(Mongoose), JWT |
| **프론트엔드** | `client/` | React 18, Redux Toolkit, Material-UI, Formik+Yup |
| **진입점** | `server/index.js` | 포트: `.env`의 PORT 또는 5001 |
| **실행** | `npm run dev` | 백엔드 + 프론트엔드 동시 실행 |

### 1.2 기타 디렉터리

- **csms-v2/**  
  - 별도 버전(Phase 문서, Tailwind, 서버 구조 상이).  
  - 루트 `npm test` 시 이 디렉터리의 테스트도 함께 실행됨.
- **aws-deploy/**  
  - AWS(EC2, S3, CloudFormation) 배포 스크립트 및 설정.
- **requirements.txt / app.py**  
  - Flask 등 Python 스택. 현재 메인 서비스는 Node/Express 기반.

### 1.3 주요 API 라우트 (메인 서버)

- `/api/health` — 헬스체크
- `/api/auth` — 회원가입, 로그인, `/me`
- `/api/store` — 점포 CRUD (점주)
- `/api/work-schedule` — 근무 일정
- `/api/employee`, `/api/owner` — 직원/점주 전용
- `/api/monthly-salary`, `/api/expense`, `/api/fixed-expense`, `/api/notifications`

---

## 2. 기본 기능 테스트 결과

### 2.1 서버 기동 및 헬스체크

| 항목 | 결과 | 비고 |
|------|------|------|
| 서버 기동 | ✅ 성공 | `npm run server` (포트 5001) |
| `GET /api/health` | ✅ 성공 | `{"status":"OK","timestamp":"..."}` |

### 2.2 인증 API

| 항목 | 결과 | 비고 |
|------|------|------|
| `POST /api/auth/login` (점주) | ✅ 성공 | owner@test.com / 123456 → JWT 발급 |
| `GET /api/auth/me` (JWT) | ✅ 성공 | 토큰으로 사용자 정보 조회 |
| `POST /api/auth/register` (점주) | ✅ 성공 | role=owner, storeId 없이 가입 가능 |
| `POST /api/auth/register` (직원) | ⚠️ 500 에러 | **직원/매니저는 storeId 필수**인데 미제공 시 Mongoose 검증 실패 → catch에서 500 반환 |

**권장 사항**: 직원/매니저 가입 시 `storeId` 누락이면 **400 + 메시지**(예: "직원은 소속 점포(storeId)가 필요합니다")로 응답하도록 라우트에서 검증 후 처리하면 좋음.

### 2.3 점포 API (점주 토큰)

| 항목 | 결과 | 비고 |
|------|------|------|
| `GET /api/store` | ✅ 성공 | 점포 목록 배열 정상 반환 |

---

## 3. 테스트 스크립트 (Jest) 실행 결과

- 루트에서 `npm test` 실행 시 **전체 프로젝트**(루트 + csms-v2)의 테스트가 실행됨.
- **메인 서버(`server/`)에는 Jest 테스트 파일이 없음.**  
  테스트는 **csms-v2** 쪽에만 존재.

### 3.1 서버 테스트만 실행 시 (`--testPathPattern=server`)

| 구분 | 결과 |
|------|------|
| 통과 | 4개 스위트 (health, taxCalculator, holidayPayCalculator, excelExporter) |
| 실패 | 6개 스위트 |

**실패 요약**

1. **monthlySalary.test.js**  
   - csms-v2 서버가 `MONGODB_URI`를 사용하는데, 루트에서 Jest 실행 시 해당 env가 없음.  
   - csms-v2 서버용 `.env` 또는 테스트용 `MONGODB_URI` 설정 필요.

2. **auth / workSchedule / owner 등**  
   - csms-v2 전용 앱/DB/시드와 연동되는 테스트.  
   - 루트 Jest 환경과 라우트·인증 구조가 달라 401, undefined 등 발생.

3. **OfflineBanner.test.jsx (클라이언트)**  
   - JSX 미지원으로 인해 루트 Jest에서 파싱 실패.  
   - React/JSX 변환 설정은 csms-v2 클라이언트 쪽에 맞춰져 있음.

정리하면, **메인 서비스(루트 server + client)의 동작은 API 기준으로 정상**이며, **Jest 실패는 주로 csms-v2 전용 테스트가 루트 환경에서 돌아가면서 생기는 설정/환경 이슈**입니다.

---

## 4. 종합 정리

### 4.1 이상 없음

- 백엔드 서버 기동 및 헬스체크
- 로그인 / `/api/auth/me` / 점주 회원가입
- 점포 목록 조회 (점주)
- MongoDB 연결 시 서버 정상 동작 (현재 DB 연결 설정 유지)

### 4.2 개선 권장

1. **직원 회원가입**  
   - `storeId` 없이 요청 시 500 대신 **400 + 명시적 메시지** 반환 (라우트 단 검증 추가).

2. **루트 Jest**  
   - 메인 `server/`에 API/통합 테스트 추가 시, `test_api_guide.md`의 엔드포인트 기준으로 검증 가능.  
   - csms-v2 테스트는 `cd csms-v2/server && npm test` 등으로 별도 실행하고, 필요 시 `MONGODB_URI` 등 env 설정.

3. **의존성**  
   - `npm install` 후 audit 경고 있음. 필요 시 `npm audit fix` 또는 선택적 업데이트 검토.

---

## 5. 로컬에서 빠르게 확인하는 방법

```bash
# 1. 서버만 실행
npm run server

# 2. 다른 터미널에서
curl http://localhost:5001/api/health
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"123456"}'
```

테스트 계정: **owner@test.com** / **123456**, **employee@test.com** / **123456** (문서 기준).
