# CSMS 버전2 구현 진행사항 중간 보고

> 작성일: 2025-11-17  
> 기준: `SYSTEM_SPECIFICATION.md` 기반 재구현 프로젝트  
> **최근 현행화 (2026-02-01)**: 아래 "📌 최근 현행화 사항" 참고.

---

## 📌 최근 현행화 사항 (2026-02)

- **점주 산정 급여를 근로자 급여 메뉴에 동일 노출**: 점주가 산정한 MonthlySalary가 있으면 해당 월의 급여 요약/상세에서 **기본급·주휴수당·복지포인트·실수령액**을 그대로 사용해 근로자 급여 메뉴에 동일하게 노출. `GET /api/employee/salary/summary`에서 WorkSchedule 기반 월과 MonthlySalary 기반 월을 합쳐 목록 구성. (`server/src/routes/employee.route.js`)
- **근로자 급여 확인·피드백 및 확정 조건**:
  - 근로자가 급여 상세에서 **「이상 없음 · 확인」** 클릭 시 `employeeConfirmed`/`employeeConfirmedAt` 저장 (분쟁 방지용). **「이상 시 피드백 보내기」**로 점주에게 피드백 전달 시 `employeeFeedbackMessage`/`employeeFeedbackAt` 저장 및 점주에게 알림(`employee_feedback`).
  - 점주는 **근로자 확인 완료** 후에만 **급여 확정** 버튼 활성화. `PUT /api/monthly-salary/:id/confirm`에서 `employeeConfirmed === true`일 때만 확정 허용.
  - API: `PUT /api/employee/salary/confirm/:year/:month`, `POST /api/employee/salary/feedback/:year/:month`. (`server/src/routes/employee.route.js`, `monthlySalary.route.js`, `client/src/pages/employee/SalaryDetail.jsx`, `owner/SalaryDetail.jsx`, `MonthlySalary.js` 피드백 필드)
- **점주→근로자 알림 발송 및 읽음 확인**: 점주가 **알림** 메뉴(`/owner/notifications`)에서 근로자 선택 후 제목·내용으로 알림 발송. **보낸 알림** 목록에서 각 알림의 **읽음/안 읽음** 표시. API: `POST /api/owner/notifications`, `GET /api/owner/notifications/sent`. 점주가 받은 알림(근로자 피드백 등)은 `GET /api/owner/notifications`로 조회. (`server/src/routes/owner.route.js`, `client/src/pages/owner/Notifications.jsx`, `OwnerLayout.jsx` 알림 탭, `Notification` 모델 `createdBy`·타입 `owner_message`/`employee_feedback`)
- **문서 현행화 (2026-02-04)**: `REMAINING_FEATURES.md` 완료 항목 반영·남은 기능만 정리. 세금 계산: **근로소득(labor-income) 구간별 누진세율** 이미 구현됨 (`taxCalculator.js`). 선택 보강은 간이세액표 정확 반영. `docs/LABOR_INCOME_TAX.md` 추가 (근로소득 세금 기능 설명). `CURRENT_STATUS.md` 세금·다음 우선순위 섹션 수정.

- **복지포인트 산출**: 전주 실 근로시간 기반 차주 복지포인트. `복지포인트 = trunc(실 근로시간/4, 0) × 1,700원`. MonthlySalary에 `totalWelfarePoints` 저장, 점주/근로자 급여 메뉴에서 표시. (`server/src/models/MonthlySalary.js`, `server/src/routes/monthlySalary.route.js`, 급여 UI)
- **급여 엑셀 포맷 개선**: 매장별·근로자별 급여내역. 컬럼: 매장(점포명), 이름, 주민번호, 입사일, 근로계약상 주단위 근로시간, 세금유형, 해당월 근무시간, 총급여, 실지급액, 4대보험료. User에 `ssn`, `hiredAt` 선택 필드 추가. (`server/src/utils/excelExporter.js`, `server/src/routes/owner.route.js`, `server/src/models/User.js`, `docs/WELFARE_POINT_AND_EXCEL.md`)
- **최저시급 설정**: 2026년 최저시급 10,320원 반영. Store 모델에 `minimumWage`(기본 10,320) 추가. 점주는 점포 등록/수정 시 **적용 최저시급** 설정 가능. 해당 점포 소속 근로자 시급 기본값으로 사용. (`server/src/models/Store.js`, `client/src/pages/owner/Stores.jsx`, `client/src/pages/owner/EmployeeDetail.jsx`)
- **4대 보험 대상**: 근로자 세금 유형에 **four-insurance** 추가. 국민연금(4.5%, 1,000원 절사)·건강보험(3.545%)·장기요양(건강보험료 12.95%)·고용보험(0.9%)·소득세(1.53%)·지방소득세(소득세 10%) 산정. `taxCalculator.js`에 `calculateFourInsurance` 추가, MonthlySalary `taxInfo`에 4대보험 항목 저장. 점주 급여 상세에서 4대보험·세금 상세 표시. (`server/src/utils/taxCalculator.js`, `client/src/pages/owner/EmployeeDetail.jsx`, `client/src/pages/owner/SalaryDetail.jsx`)
- **급여 메뉴 오류 수정**: 직원 급여 페이지(`/employee/salary`)에서 API 실패 시 `data` 비구조화 순서 버그 수정. (`client/src/pages/employee/Salary.jsx`)
- **점주 직원 정보 수정 - 근로 요일·근로 시간**: 점주가 직원 상세에서 근로 요일·근로 시간 수정 가능. (`client/src/pages/owner/EmployeeDetail.jsx`)
- **직원 정보 수정 - 입사일·주민번호**: 점주가 직원 상세에서 **입사일**(hiredAt)·**주민번호**(ssn) 입력/수정 가능. 해당 값은 급여 엑셀 다운로드 시 참조됨. (`server/src/routes/owner.route.js` PUT `/api/owner/employees/:id`, `client/src/pages/owner/EmployeeDetail.jsx`, `server/src/utils/excelExporter.js`는 기존에 userId.populate로 ssn/hiredAt 사용)
- **근무일정 등록 UI 문구 정리**: 근로자 근무일정 등록 메뉴에서 "계약 정보를 기반으로 스마트 초기값이 자동으로 채워집니다." 문구 삭제, 로딩 문구 "로딩 중..."으로 통일. (`client/src/pages/employee/Schedule.jsx`)

---

## 📊 전체 진행률

**예상 진행률: 약 40%** (Phase 1 기준)

### 우선순위별 진행 상태

| 구분 | 항목 | 상태 | 진행률 |
|------|------|------|--------|
| **Phase 1 (필수)** | 기본 인프라 | ✅ 완료 | 100% |
| | 근로자 UI | ✅ 완료 | 90% |
| | 근무일정 API | ⚠️ 부분완료 | 60% |
| | 인증 시스템 | ❌ 미구현 | 0% |
| | 점주 UI | ❌ 미구현 | 0% |
| **Phase 2 (중요)** | 급여 계산 | ❌ 미구현 | 0% |
| | 세금 계산 | ❌ 미구현 | 0% |
| | 실시간 데이터 | ❌ 미구현 | 0% |

---

## ✅ 완료된 항목

### 1. 프로젝트 구조 및 기본 설정

- ✅ **모노레포 구조** 설정 완료 (`csms-v2/`)
  - `client/`: React 18 + Tailwind CSS + React Query + Zustand
  - `server/`: Express.js + MongoDB + JWT 준비
  - 독립적인 패키지 관리로 기존 시스템과 분리

- ✅ **기술 스택 구성** 완료
  - 프론트엔드: React 19.2, Tailwind CSS 3.4, React Query 5.9, Zustand 5.0
  - 백엔드: Express 5.1, Mongoose 8.19, JWT (설치만 완료)
  - 개발 환경: concurrently로 프론트/백 동시 실행

### 2. 클라이언트 구현 (근로자 측)

#### 2.1 페이지 구현 상태

| 페이지 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| 대시보드 | `/employee/dashboard` | ✅ 완료 | Mock 데이터 연동 |
| 근무일정 | `/employee/schedule` | ✅ 완료 | 등록/조회/수정/삭제 UI |
| 급여 목록 | `/employee/salary` | ✅ 완료 | 목업 데이터 표시 |
| 급여 상세 | `/employee/salary/:year/:month` | ✅ 완료 | 주차별 상세 정보 |
| 프로필 | `/employee/profile` | ✅ 완료 | 계약 정보 표시 |
| 알림 | `/employee/notifications` | ✅ 완료 | 알림 목록 UI |

#### 2.2 레이아웃 및 네비게이션

- ✅ **EmployeeLayout** 구현 완료
  - 상단 헤더 (사용자 정보, 알림 배지)
  - 하단 네비게이션 바 (모바일 최적화)
  - 그라데이션 배경 및 Glass morphism 효과

- ✅ **하단 네비게이션** 구현 완료
  - 홈, 근무표, 급여, 내정보 메뉴
  - 활성 상태 표시 (아이콘 + 하단 바)

#### 2.3 상태 관리

- ✅ **Zustand** 기반 인증 스토어 설정
  - 기본 사용자 정보 관리
  - 역할(role) 관리 준비

- ✅ **React Query** 통합
  - 서버 상태 관리 자동화
  - 캐싱 및 자동 리프레시

### 3. 백엔드 구현

#### 3.1 API 라우트 구조

| 라우트 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| 헬스체크 | `/api/health` | ✅ 완료 | 서버 상태 확인 |
| 근로자 API | `/api/employee/*` | ⚠️ Mock 완료 | 실제 DB 연동 대기 |
| 근무일정 API | `/api/work-schedule` | ✅ 부분완료 | CRUD 구현, DB 미연동 |

#### 3.2 모델 구현

- ✅ **WorkSchedule 모델** 기본 구조 완료
  ```javascript
  - userId, storeId (ObjectId 참조)
  - workDate (Date)
  - startTime, endTime (String: HH:MM)
  - totalHours (자동 계산)
  - status (pending/approved/rejected)
  - notes
  ```
  - 자동 시간 계산 로직 (pre-save hook)
  - 야간 근무 처리 (24시간 초과 시)

#### 3.3 보안 설정

- ✅ **기본 보안 미들웨어** 적용
  - CORS 설정
  - Helmet (보안 헤더)
  - Rate Limiting (100 req/min)
  - Morgan (로깅)

---

## ⚠️ 부분 완료된 항목

### 1. 근무일정 API

**구현된 기능:**
- ✅ GET `/api/work-schedule` - 목록 조회 (월별 필터링)
- ✅ POST `/api/work-schedule` - 신규 등록
- ✅ PUT `/api/work-schedule/:id` - 수정 (승인 전만)
- ✅ DELETE `/api/work-schedule/:id` - 삭제 (승인 전만)

**미완료 사항:**
- ❌ 실제 MongoDB 연동 (현재 WorkSchedule 모델만 정의)
- ❌ 인증 미들웨어 (JWT 토큰 검증 없음)
- ❌ 승인/거절 API 엔드포인트 없음

### 2. 클라이언트 API 연동

**구현된 기능:**
- ✅ Axios 클라이언트 설정
- ✅ React Query 통합
- ✅ 근무일정 등록/수정/삭제 UI 연동

**미완료 사항:**
- ❌ JWT 토큰 관리 (인터셉터 없음)
- ❌ 에러 처리 미흡 (401/403 처리 없음)

---

## ❌ 미구현 항목

### 1. 인증 시스템 (Priority: HIGH)

**필요한 작업:**
- ❌ JWT 인증 미들웨어
- ❌ 로그인/회원가입 API (`/api/auth/login`, `/api/auth/register`)
- ❌ 로그인/회원가입 페이지
- ❌ 비밀번호 해싱 (bcryptjs 설치만 완료)
- ❌ 토큰 리프레시 로직

**영향:**
- 모든 API가 인증 없이 동작 가능한 상태
- 보안 취약점 존재

### 2. 점주(Owner) 기능 (Priority: HIGH)

**필요한 작업:**
- ❌ OwnerLayout 컴포넌트
- ❌ 점주 대시보드 페이지 (`/owner/dashboard`)
- ❌ 근무일정 승인/거절 페이지 (`/owner/schedules`)
- ❌ 직원 관리 페이지 (`/owner/employees`)
- ❌ 점포 관리 페이지 (`/owner/stores`)
- ❌ 급여 확정 페이지 (`/owner/salary`)
- ❌ 점주 라우트 (`/api/owner/*`)

**참고:**
- `OwnerDashboardCard` 컴포넌트는 존재하나 실제 사용되지 않음
- 점주 관련 Mock 데이터만 준비됨

### 3. 데이터 모델 (Priority: HIGH)

**필요한 모델:**
- ❌ User 모델 (점주/근로자 구분)
- ❌ Store 모델 (점포 정보)
- ❌ MonthlySalary 모델 (월별 급여)
- ❌ Notification 모델 (알림)

**현재 상태:**
- WorkSchedule 모델만 정의됨
- 참조 관계만 설정 (실제 스키마 없음)

### 4. 급여 계산 로직 (Priority: MEDIUM)

**필요한 기능:**
- ❌ 주휴수당 자동 계산
  - 주 15시간 이상 근무 시
  - 월 경계 주차 처리
- ❌ 세금 계산
  - 소득세, 지방소득세
  - 사업자소득 vs 근로소득
- ❌ 3단계 프로세스 (산정/수정/확정)
  - 산정: 자동 계산
  - 수정: 점주 수정 가능
  - 확정: 최종 확정 후 수정 불가

**참고:**
- `SYSTEM_SPECIFICATION.md`에 상세 로직 명시됨
- 현재 Mock 데이터로만 표시

### 5. 실제 데이터베이스 연동 (Priority: HIGH)

**필요한 작업:**
- ⚠️ MongoDB 연결은 준비됨 (`lib/mongo.js`)
- ❌ 실제 데이터 CRUD 연동
  - 현재 모든 API가 Mock 데이터 반환
  - WorkSchedule API는 정의만 되어 있음
- ❌ 초기 데이터 시딩 스크립트

### 6. 알림 시스템 (Priority: LOW)

**필요한 기능:**
- ❌ 실시간 알림 (WebSocket 또는 Server-Sent Events)
- ❌ 알림 생성 로직
  - 근무일정 승인/거절 시
  - 급여 확정 시
- ❌ 알림 읽음 처리 DB 연동

**현재 상태:**
- 알림 목록 UI만 존재 (Mock 데이터)

### 7. PWA 기능 강화 (Priority: LOW)

**현재 상태:**
- ✅ `manifest.json` 존재
- ✅ Service Worker 파일 존재

**미완료:**
- ❌ 오프라인 캐싱 전략
- ❌ 오프라인 폴백 페이지

---

## 📋 다음 단계 우선순위

### Phase 1 완료를 위한 필수 작업

#### 1. 인증 시스템 구현 (1주 예상)
- [ ] User 모델 생성
- [ ] JWT 인증 미들웨어
- [ ] 로그인/회원가입 API
- [ ] 로그인/회원가입 페이지
- [ ] API 클라이언트에 토큰 인터셉터 추가

#### 2. 실제 데이터베이스 연동 (3일 예상)
- [ ] Store 모델 생성
- [ ] WorkSchedule API 실제 DB 연동
- [ ] 초기 데이터 시딩 (테스트 스토어, 사용자)
- [ ] 근로자 대시보드 API 실제 데이터 연동

#### 3. 점주 기능 구현 (1.5주 예상)
- [ ] OwnerLayout 생성
- [ ] 점주 대시보드 페이지
- [ ] 근무일정 승인/거절 페이지 및 API
- [ ] 점주 라우트 추가

### Phase 2를 위한 준비 작업

#### 4. 급여 계산 로직 (1주 예상)
- [ ] MonthlySalary 모델 생성
- [ ] 주휴수당 계산 함수
- [ ] 세금 계산 함수
- [ ] 급여 산정 API

#### 5. 데이터 검증 및 에러 처리 (3일 예상)
- [ ] 입력 데이터 검증 (express-validator)
- [ ] 에러 핸들링 미들웨어 개선
- [ ] 클라이언트 에러 처리 강화

---

## 🔍 기술적 이슈 및 제약사항

### 현재 이슈

1. **인증 없이 모든 API 접근 가능**
   - 보안 취약점
   - 우선 해결 필요

2. **Mock 데이터 의존**
   - 실제 사용자 데이터 없음
   - 테스트 불가능

3. **점주 기능 완전 부재**
   - 시스템의 핵심 기능인 승인 프로세스 미작동
   - 3단계 프로세스 구현 불가

### 아키텍처 고려사항

- ✅ **모노레포 구조**: 프론트/백 분리 유지, 향후 독립 배포 가능
- ✅ **PWA 준비**: 모바일 앱처럼 설치 가능한 구조 준비됨
- ✅ **상태 관리**: React Query + Zustand 조합으로 서버/클라이언트 상태 분리 잘 됨

---

## 📈 진행 예상 일정

### Phase 1 완료 (현재 → 3주 후)
- Week 1: 인증 시스템 + 실제 DB 연동
- Week 2: 점주 기능 구현
- Week 3: 통합 테스트 및 버그 수정

### Phase 2 (3주 후 → 6주 후)
- 급여 계산 로직 구현
- 세금 계산 및 확정 프로세스
- Excel 다운로드 기능

---

## 📝 참고 파일

- **시스템 명세서**: `SYSTEM_SPECIFICATION.md`
- **README**: `csms-v2/README.md`
- **환경 설정**: `server/env.example`

---

## 결론

현재 버전2는 **UI 프레임워크와 기본 구조는 완성**되었으나, **핵심 비즈니스 로직과 데이터 연동은 대부분 미구현** 상태입니다. 특히 **인증 시스템과 점주 기능**이 없어 실제 사용은 불가능한 상태입니다.

**다음 우선순위:**
1. 인증 시스템 (보안)
2. 실제 DB 연동 (데이터 영속성)
3. 점주 기능 (핵심 프로세스)

위 3가지만 완료하면 최소한의 MVP로 동작할 수 있을 것으로 예상됩니다.

