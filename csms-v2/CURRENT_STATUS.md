# CSMS v2 프로젝트 현재 상태 (최신 정리)

> 최종 업데이트: 2026-02-04  
> 프로젝트: 편의점 근무 관리 시스템 v2 (CSMS v2)

---

## 📊 프로젝트 개요

**CSMS v2**는 편의점 프랜차이즈를 위한 종합 근무 관리 시스템의 재구현 버전입니다. 기존 시스템과 분리된 독립적인 디렉토리(`csms-v2/`)에서 개발 중입니다.

### 핵심 목표
- 📅 근무 일정 관리 및 승인 시스템 ✅
- 💰 자동 급여 계산 (시급, 주휴수당, 세금) ✅ **주휴수당 완료!**
- 📊 통계 및 리포트 기능 ✅
- 👥 역할 기반 권한 관리 (점주/직원) ✅

---

## ✅ 완료된 항목 (최신)

### 1. 인프라 및 기본 구조 ✅

- ✅ 모노레포 구조 (client/server 분리)
- ✅ 기술 스택 구성 완료
  - Frontend: React 19.2, Tailwind CSS, React Query, Zustand
  - Backend: Express 5.1, MongoDB, JWT 인증
- ✅ 보안 설정 (CORS, Helmet, Rate Limiting)
- ✅ 개발 환경 설정 (concurrently로 동시 실행)

### 2. 인증 시스템 ✅

- ✅ 회원가입/로그인 API
- ✅ **신규 근로자 회원가입**: 5자리 매장코드 입력·검증 → 해당 매장으로 초기 맵핑·가입 요청(pending)
- ✅ `GET /api/auth/validate-store-code?code=XXX` 매장코드 검증 API
- ✅ JWT 토큰 기반 인증
- ✅ 비밀번호 bcrypt 해싱
- ✅ 역할 기반 접근 제어 (점주/직원)
- ✅ 역할 기반 자동 리다이렉트

### 3. 데이터 모델 ✅

- ✅ User 모델 (점주/직원 구분, **approvalStatus**: pending/approved)
- ✅ Store 모델 (점포 정보, **storeCode**: 5자리 매장코드)
- ✅ WorkSchedule 모델 (근무일정, 승인 상태 관리)

### 4. 직원(Employee) 기능 ✅

#### 백엔드 API
- ✅ 대시보드 API (`GET /api/employee/dashboard`)
- ✅ 프로필 API (`GET /api/employee/profile`)
- ✅ 근무일정 조회 API (`GET /api/employee/work-schedule`)
- ✅ 급여 요약/상세 API (`GET /api/employee/salary/summary`, `GET /api/employee/salary/:year/:month`) — 점주 산정 급여 있으면 동일 노출
- ✅ **급여 확인/피드백 API** (`PUT /api/employee/salary/confirm/:year/:month`, `POST /api/employee/salary/feedback/:year/:month`)
- ✅ 알림 API (목록·읽음 처리)

#### 프론트엔드 페이지
- ✅ 로그인/회원가입 페이지
- ✅ 직원 대시보드 (`/employee/dashboard`)
- ✅ 근무일정 관리 (`/employee/schedule`)
- ✅ 급여 조회 (`/employee/salary`)
- ✅ 프로필 페이지 (`/employee/profile`)
- ✅ 알림 페이지 (`/employee/notifications`)
- ✅ EmployeeLayout (하단 네비게이션)

### 5. 점주(Owner) 기능 ✅ **최근 완료!**

#### 백엔드 API
- ✅ 점주 대시보드 API (`GET /api/owner/dashboard`)
- ✅ 근무일정 승인/거절 API
  - `GET /api/owner/schedules` - 목록 조회
  - `PUT /api/owner/schedules/:id/approve` - 승인
  - `PUT /api/owner/schedules/:id/reject` - 거절
- ✅ 직원 관리 API
  - `GET /api/owner/employees` - 직원 목록 (쿼리: storeId, **approvalStatus**)
  - `GET /api/owner/employees/:id` - 직원 상세
  - `PUT /api/owner/employees/:id` - 직원 정보 수정·**가입 승인** (approvalStatus, 시급, 세금 유형, **근로 요일·근로 시간(workSchedule)**, **입사일(hiredAt)·주민번호(ssn)**)
- ✅ **알림 API**
  - `POST /api/owner/notifications` - 근로자에게 알림 발송 (userId, title, message)
  - `GET /api/owner/notifications/sent` - 보낸 알림 목록 (읽음 여부 포함)
  - `GET /api/owner/notifications` - 점주가 받은 알림 (근로자 피드백 등)
- ✅ 점포 관리 API (점포 생성/수정 시 **매장코드 5자리** 선택 입력)
  - `GET /api/owner/stores` - 점포 목록
  - `POST /api/owner/stores` - 점포 생성
  - `PUT /api/owner/stores/:id` - 점포 수정
  - `DELETE /api/owner/stores/:id` - 점포 비활성화

#### 프론트엔드 페이지
- ✅ 점주 대시보드 (`/owner/dashboard`)
- ✅ 근무일정 승인 페이지 (`/owner/schedules`)
- ✅ 직원 관리 페이지 (`/owner/employees`) — 승인 상태 필터, **직원 상세·가입 승인** (`/owner/employees/:id`) — 시급·세금 유형·**근로 요일·근로 시간**·**입사일·주민번호** 수정 가능 (주민번호·입사일은 급여 엑셀 다운로드 시 참조)
- ✅ 점포 관리 페이지 (`/owner/stores`) — 점포 생성 시 매장코드(5자리) 입력
- ✅ **알림 페이지** (`/owner/notifications`) — 근로자에게 알림 발송, 보낸 알림 목록·읽음 여부 확인, 받은 알림(근로자 피드백 등)
- ✅ OwnerLayout (하단 네비게이션: 홈, 승인, 급여, 직원, **알림**, 점포)

### 6. 근무일정 관리 ✅

- ✅ 근무일정 CRUD API
- ✅ 승인/거절 프로세스
- ✅ 상태 관리 (pending/approved/rejected)
- ✅ 주차별 그룹화
- ✅ 월별 필터링

### 7. 테스트 및 검증 ✅

- ✅ 백엔드 API 테스트 (Jest)
  - 인증 테스트
  - 근무일정 테스트
  - 점주 기능 테스트 (14개 테스트 모두 통과)
- ✅ 테스트 데이터 시딩 스크립트
- ✅ 로컬 테스트 가이드

---

## ⚠️ 부분 완료된 항목

### 1. 급여 계산 로직 ✅ **완료**

**현재 상태:**
- ✅ 기본 급여 계산 (시급 × 근무시간)
- ✅ **주휴수당 자동 계산** (근로계약상 주 15시간 이상 & 소정근로일 개근 시 지급, 월 경계 주차 처리)
- ✅ MonthlySalary 모델 완성
- ✅ **세금 계산 (taxType별)** — `server/src/utils/taxCalculator.js`
  - **none / under-15-hours**: 세금 0
  - **business-income**: 사업자소득 3.3% (소득세 90% + 지방세 10%)
  - **labor-income**: 근로소득 **구간별 누진세율** (0% ~ 45%, 2024년 원천징수세율 근사, 공제대상가족 0명 기준)
  - **four-insurance**: 4대보험·소득세·지방세

**주휴수당 구현 파일:**
- `server/src/utils/holidayPayCalculator.js` - 주휴수당 계산 유틸리티
- `server/src/utils/dateHelpers.js` - 월별 주차 분류 함수
- `server/src/routes/monthlySalary.route.js` - 급여 산정 API
- `server/src/__tests__/holidayPayCalculator.test.js` - 테스트 (21개 통과)

**선택적 보강 (필수 아님):**
- [ ] 근로소득: 국세청 **간이세액표** 정확 반영 또는 공제대상가족 수 반영 → [docs/LABOR_INCOME_TAX.md](./docs/LABOR_INCOME_TAX.md) 참고

### 2. User 모델 확장 ✅ **완료!**

**완료된 필드:**
- ✅ `hourlyWage`: 시급 필드 (기본값 10320, 2026년 최저시급)
- ✅ `workSchedule`: 요일별 근무 시간 스케줄
- ✅ `taxType`: 세금 신고 유형 (none, under-15-hours, business-income, labor-income, **four-insurance** 4대 보험 대상)

### 3. 알림 시스템 ✅ **점주 발송·읽음 확인 완료 (2026-02)**

**현재 상태:**
- ✅ Notification 모델 (type: schedule_approved, schedule_rejected, salary_confirmed, **owner_message**, **employee_feedback** / **createdBy**)
- ✅ 근무일정 승인/거절 시 알림 생성
- ✅ 급여 확정 시 알림 생성
- ✅ **점주→근로자 알림 발송** (`POST /api/owner/notifications`) 및 **보낸 알림 목록·읽음 여부** (`GET /api/owner/notifications/sent`)
- ✅ 점주 **받은 알림** (`GET /api/owner/notifications`) — 근로자 피드백 등
- ✅ 근로자 알림 읽음 처리 (`PUT /api/employee/notifications/:id/read`) → 점주 화면에서 읽음 표시

**미구현:**
- [ ] 실시간 알림 (WebSocket 또는 Server-Sent Events)

---

## ❌ 미구현 항목

### 1. 급여 확정 프로세스 ✅ **완료 (2026-02)**

**3단계 프로세스:**
1. **산정**: 점주가 월별 급여 산정 (주휴수당·복지포인트 포함)
2. **근로자 확인**: 근로자가 급여 상세에서 「이상 없음 · 확인」 또는 「이상 시 피드백 보내기」 → `employeeConfirmed` / `employeeFeedbackMessage` 보관 (분쟁 방지)
3. **확정**: 점주는 **근로자 확인 완료** 후에만 「급여 확정」 버튼 활성화 → 최종 확정 후 수정 불가

**구현 완료:**
- ✅ MonthlySalary: employeeConfirmed, employeeConfirmedAt, employeeFeedbackMessage, employeeFeedbackAt
- ✅ `PUT /api/employee/salary/confirm/:year/:month` — 근로자 확인
- ✅ `POST /api/employee/salary/feedback/:year/:month` — 근로자 피드백
- ✅ `PUT /api/monthly-salary/:id/confirm` — 근로자 확인 시에만 확정 허용
- ✅ 근로자 급여 메뉴에 점주 산정 급여(주휴수당·복지포인트 등) 동일 노출

### 2. Excel 다운로드 기능 ✅ **완료! (2026-02-01)**

**구현 완료:**
- ✅ 점주: 월별 급여 목록 Excel (`GET /api/owner/export/payroll`)
- ✅ 점주: 월별 근무일정 Excel (`GET /api/owner/export/schedules`)
- ✅ 직원: 본인 급여 명세서 Excel (`GET /api/employee/export/payroll/:year/:month`)
- ✅ 점주/직원 급여·일정 페이지에 다운로드 버튼 연동

### 3. PWA 기능 강화 ✅ **완료! (2026-02-01)**

**구현 완료:**
- ✅ `manifest.json` CSMS용 수정 (이름, 테마색, 설명)
- ✅ Service Worker 오프라인 캐싱: NetworkFirst(페이지), CacheFirst(JS/CSS), StaleWhileRevalidate(이미지)
- ✅ 오프라인 폴백 페이지 (`/offline.html`) — 네트워크 실패 시 안내
- ✅ 앱 내 오프라인 배너 (`OfflineBanner`) — 오프라인 시 상단 안내

---

## 📈 전체 진행률

### 진행률: 약 85%

| 구분 | 항목 | 상태 | 진행률 |
|------|------|------|--------|
| **인프라** | 기본 구조 | ✅ 완료 | 100% |
| | 인증 시스템 | ✅ 완료 | 100% |
| | 데이터 모델 | ✅ 완료 | 100% |
| **직원 기능** | UI 구현 | ✅ 완료 | 100% |
| | API 구현 | ✅ 완료 | 100% |
| **점주 기능** | UI 구현 | ✅ 완료 | 100% |
| | API 구현 | ✅ 완료 | 100% |
| **급여 시스템** | 기본 계산 | ✅ 완료 | 100% |
| | 주휴수당 | ✅ **완료!** | 100% |
| | 세금 계산 | ✅ 완료 | 100% |
| | 확정 프로세스 | ✅ 완료 | 100% |
| **알림 시스템** | 구조 | ✅ 완료 | 100% |
| | 모델/로직 | ✅ **완료!** | 100% |
| **프론트엔드** | 점주 급여관리 UI | ✅ 완료 | 100% |

---

## 🎯 선택적 보강 (필수 아님)

### 1. 근로소득 — 간이세액표 정확 반영 (선택)
- **현재**: 근로소득은 이미 **구간별 누진세율**로 계산됨 (`taxCalculator.js` → `calculateLaborIncomeTax`)
- **선택**: 국세청 간이세액표·공제대상가족 수 등 정확 반영 → [docs/LABOR_INCOME_TAX.md](./docs/LABOR_INCOME_TAX.md) 참고

### 2. 실시간 알림 (선택)
- WebSocket 또는 SSE로 새 알림 즉시 푸시

### 3. ~~Excel 내보내기~~ ✅ 완료
- 급여 명세서/목록/근무일정 Excel 다운로드 완료

---

## 🚀 실행 방법

### 빠른 시작

```bash
# 1. 프로젝트 디렉토리로 이동
cd csms-v2

# 2. 테스트 데이터 생성
cd server
npm run seed:clear

# 3. 개발 서버 실행 (프론트/백 동시)
cd ..
npm run dev
```

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 점주 | `owner@test.com` | `password123` |
| 근로자1 | `employee1@test.com` | `password123` |
| 근로자2 | `employee2@test.com` | `password123` |

### 접속 URL

- 프론트엔드: `http://localhost:3000`
- 백엔드 API: `http://localhost:5001`

---

## 📝 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### 직원 API
- `GET /api/employee/dashboard` - 대시보드
- `GET /api/employee/profile` - 프로필
- `GET /api/employee/work-schedule` - 근무일정 조회
- `GET /api/employee/salary/summary` - 급여 요약
- `GET /api/employee/salary/:year/:month` - 월별 급여 상세

### 점주 API
- `GET /api/owner/dashboard` - 점주 대시보드
- `GET /api/owner/schedules` - 근무일정 승인 대기 목록
- `PUT /api/owner/schedules/:id/approve` - 근무일정 승인
- `PUT /api/owner/schedules/:id/reject` - 근무일정 거절
- `GET /api/owner/employees` - 직원 목록
- `GET /api/owner/stores` - 점포 목록
- `POST /api/owner/stores` - 점포 생성
- `PUT /api/owner/stores/:id` - 점포 수정
- `DELETE /api/owner/stores/:id` - 점포 비활성화

### 근무일정 API
- `GET /api/work-schedule` - 목록 조회
- `POST /api/work-schedule` - 신규 등록
- `PUT /api/work-schedule/:id` - 수정
- `DELETE /api/work-schedule/:id` - 삭제

---

## 🧪 테스트 상태

### 백엔드 테스트
- ✅ 인증 테스트 통과
- ✅ 근무일정 테스트 통과
- ✅ 점주 기능 테스트 통과 (14개 테스트 모두 통과)

### 프론트엔드
- ✅ 빌드 성공
- ✅ 린터 오류 없음

---

## 📚 참고 문서

### 프로젝트 문서
- `README.md` - 프로젝트 개요
- `REMAINING_FEATURES.md` - 남은/선택 기능 정리 (현행화됨)
- `docs/LABOR_INCOME_TAX.md` - 근로소득 세금 계산 기능 설명
- `PROJECT_WRAP_UP.md` - 이전 정리 문서
- `OWNER_FEATURE_TEST_RESULTS.md` - 점주 기능 테스트 결과
- `LOCAL_TEST_GUIDE.md` - 로컬 테스트 가이드
- `LOCAL_DEVELOPMENT_GUIDE.md` - 로컬 개발 가이드

### Phase 문서
- `PHASE3_COMPLETE.md` - Phase 3 완료 보고
- `DEVELOPMENT_STRATEGY.md` - 개발 전략

---

## ✅ 최근 완료 사항

### 최저시급 설정 및 4대 보험 대상 (2026-02) 🆕
- **최저시급**: 2026년 10,030원 → 10,320원 반영. **Store** 모델에 `minimumWage`(기본 10,320) 추가. 점주는 점포 등록/수정 시 **적용 최저시급** 설정 가능. 해당 점포 소속 근로자 시급 기본값으로 사용.
- **4대 보험 대상**: 근로자 세금 유형에 **four-insurance** 추가. 산정식: 국민연금 4.5%(1,000원 절사), 건강보험 3.545%(10원 절사), 장기요양 건강보험료의 12.95%(10원 절사), 고용보험 0.9%(10원 절사), 소득세 1.53%(10원 절사), 지방소득세 소득세의 10%(10원 절사). `taxCalculator.js`에 `calculateFourInsurance` 추가, MonthlySalary `taxInfo`에 4대보험 항목 저장. 점주 급여 상세에서 4대보험·세금 상세 표시.
- 문서: `docs/MINIMUM_WAGE_AND_4INSURANCE.md` 참고.

### 점주 직원 정보 수정 - 근로 요일·근로 시간 (2026-02-01) 🆕
- 점주가 **직원 상세** 페이지에서 근로자의 **근로 요일**·**근로 시간**을 수정할 수 있음
- **근로 요일**: 월~일 요일별 "근무일" 체크박스 (해당 요일 근무 가능 여부)
- **근로 시간**: 요일별 시작 시간·종료 시간 (`type="time"` 입력, User 모델 `workSchedule` 필드)
- 저장 시 `PUT /api/owner/employees/:id`에 `workSchedule` 포함 전송 (백엔드 기존 지원)
- 파일: `client/src/pages/owner/EmployeeDetail.jsx`

### 직원 정보 수정 - 입사일·주민번호 / 근무일정 등록 문구 정리 (2026-02-04) 🆕
- **입사일·주민번호**: 점주 직원 상세에서 **입사일**(hiredAt)·**주민번호**(ssn) 입력/수정 가능. User 모델에 이미 필드 존재, `PUT /api/owner/employees/:id`에서 수신·저장. 급여 엑셀 다운로드 시 해당 값 참조 (기존 excelExporter 연동).
- **근무일정 등록 UI**: 근로자 근무일정 등록 메뉴에서 "계약 정보를 기반으로 스마트 초기값이 자동으로 채워집니다." 문구 삭제, 로딩 시 "로딩 중..." 표시.
- 파일: `server/src/routes/owner.route.js`, `client/src/pages/owner/EmployeeDetail.jsx`, `client/src/pages/employee/Schedule.jsx`

### 급여 메뉴 오류 수정 (2026-02-01)
- 직원 **급여** 메뉴 클릭 시 API 실패하면 화면 크래시 발생하던 버그 수정
- 원인: `data` 비구조화를 `error` 검사보다 먼저 수행하여, 실패 시 `data`가 `undefined`일 때 예외 발생
- 수정: `error || !data` 먼저 검사 후 에러 UI 반환, 그 다음에만 `data` 사용
- 파일: `client/src/pages/employee/Salary.jsx`

### 신규 근로자 회원가입 프로세스 (2026-02-03) 🆕
- **가입**: 근로자 회원가입 시 5자리 매장코드 입력·검증 (`GET /api/auth/validate-store-code`)
- **맵핑**: 유효한 매장코드일 경우 해당 매장(storeId)으로 초기 맵핑, **approvalStatus: pending**으로 가입 요청
- **점주 승인**: 직원 목록에서 "승인 대기" 필터 → 직원 상세에서 시급·세금 유형 확인/수정 후 **가입 승인**
- **모델**: Store에 `storeCode`(5자리, unique sparse), User에 `approvalStatus`(pending/approved)
- **UI**: 회원가입 폼 매장코드 필드·검증 버튼, 직원 관리 승인 상태 필터·직원 상세·승인 버튼, 직원 레이아웃 "승인 대기" 배너
- **문서**: README, LOCAL_TEST_GUIDE, CURRENT_STATUS에 시나리오 및 테스트 계정(매장코드, pending@test.com) 반영

### PWA 강화 구현 (2026-02-01) 🆕
- ✅ manifest.json CSMS 브랜딩, theme/background 색상
- ✅ public/offline.html 오프라인 전용 페이지
- ✅ Service Worker: NetworkFirst(페이지), setCatchHandler(offline.html), JS/CSS/이미지 런타임 캐시
- ✅ OfflineBanner 컴포넌트로 오프라인 시 상단 배너 표시

### Excel 내보내기 기능 구현 (2026-02-01) 🆕
- ✅ `server/src/utils/excelExporter.js` — 급여 목록/명세서/근무일정 Excel 생성
- ✅ 점주: `GET /api/owner/export/payroll`, `GET /api/owner/export/schedules`
- ✅ 직원: `GET /api/employee/export/payroll/:year/:month`
- ✅ 점주 급여·근무일정 페이지, 직원 급여·상세 페이지에 다운로드 버튼 연동
- ✅ excelExporter 유닛 테스트 6개 통과

### 주휴수당 자동 계산 기능 구현 (2026-02-01) 🆕
- ✅ 주휴수당 계산 유틸리티 함수 작성 (`holidayPayCalculator.js`)
- ✅ 월별 주차 분류 함수 추가 (`getMonthlyWeeksForHolidayPay`)
- ✅ 급여 산정 API에 주휴수당 자동 계산 적용
- ✅ 월 경계 주차 처리 (익월에 산정)
- ✅ 테스트 21개 모두 통과

**주휴수당 산정 규칙:**
1. 한 주는 월요일 ~ 일요일 (고정)
2. 근로계약상 주 15시간 이상 & 소정근로일 개근 시 지급
3. 공식: `(주간 근로계약 시간 / 40) × 8 × 시급`
4. 월 경계 주차(일요일이 다음 달)는 익월에 산정

### 점주 기능 구현 완료 (2025-01-27)
- ✅ 점주 API 라우트 전체 구현
- ✅ 점주 프론트엔드 페이지 전체 구현
- ✅ 근무일정 승인/거절 기능
- ✅ 직원 관리 기능
- ✅ 점포 관리 기능
- ✅ 테스트 완료 (14개 테스트 모두 통과)

### 알림 시스템 구현 (2026-02-01) 🆕
- ✅ Notification 모델 생성
- ✅ 근무일정 승인/거절 시 직원에게 알림 생성
- ✅ 급여 확정 시 직원에게 알림 생성
- ✅ 직원 알림 목록/읽음 처리 API 연동
- ✅ 대시보드 미읽음 알림 수 연동
- ✅ 시드 스크립트에 알림 샘플 추가

### 로그인 문제 해결 (2025-12-25)
- ✅ 시딩 스크립트 수정 (insertMany → create)
- ✅ 비밀번호 해싱 정상 작동 확인
- ✅ 로그인 기능 정상 작동 확인

---

## 🎉 결론

**현재 상태:**
- ✅ **인증 시스템 완료** - JWT 기반 인증 및 권한 관리
- ✅ **직원 기능 완료** - UI 및 API 실제 DB 연동 완료
- ✅ **점주 기능 완료** - 핵심 기능인 승인 프로세스 구현 완료
- ✅ **근무일정 관리 완료** - CRUD 및 승인 프로세스 완료
- ✅ **주휴수당 자동 계산 완료** - 월 경계 처리 포함
- ✅ **급여 확정 프로세스 완료** - 산정/수정/확정 API 구현
- ✅ **점주용 급여 관리 UI 완료** - 산정/상세/수정/확정 화면
- ✅ **알림 시스템 완료** - Notification 모델, 승인/거절/급여확정 시 알림 생성

**다음 단계:**
1. 근로소득 세금 계산 (소득세 간이세액표) — 유틸 완료, API 연동 완료
2. ~~Excel 내보내기~~ ✅ 완료

**MVP 완성까지 약 1주 예상**

---

**프로젝트 상태: 개발 중 (Phase 5 - 급여 시스템 거의 완료)**  
**최종 업데이트: 2026-02-01**
