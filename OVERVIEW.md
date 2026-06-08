# CSMS v2 프로젝트 개요

> 편의점 프랜차이즈 종합 근무 관리 시스템 (Convenience Store Management System v2)  
> 최종 업데이트: 2026-06-01 (2)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React 19.2, Tailwind CSS, React Query, Zustand, PWA |
| Backend | Express 5.1, MongoDB, JWT 인증 |
| 인프라 | AWS EC2 (백엔드), AWS S3 (프론트엔드 정적 호스팅) |
| 구조 | 모노레포 (`client/` + `server/`) |

---

## AWS 배포 현황

| 구분 | 정보 |
|------|------|
| EC2 인스턴스 | `csms-server` · IP `3.34.96.132` · Node.js 18 · PM2 |
| EC2 경로 | `/var/www/convenience-store/` |
| S3 버킷 | `convenience-store-frontend-1770215884` |
| 백엔드 포트 | 5000 (production) / 5001 (local) |
| 프론트 로컬 | http://localhost:3000 |

---

## 구현 완료 기능

### 인증
- JWT 기반 로그인 / 회원가입
- 역할 기반 접근 제어 (점주 / 직원)
- 비밀번호 찾기 / 재설정 (이메일)

### 직원 (Employee)
- 대시보드
- 근무일정 등록 · 조회
- 급여 조회 (월별 상세 포함)
- 프로필 관리
- 알림

### 점주 (Owner)
- 대시보드
- 근무일정 승인 / 거절 (목록 + 월간 달력)
- 직원 관리 (목록 + 상세)
- 점포 관리
- 급여 관리 (산정 · 수정 · 확정 3단계)
- 알림

### 급여 시스템
- User 모델 확장 (`hourlyWage`, `workSchedule`, `taxType`, `position`)
- MonthlySalary 모델 (status: draft → calculated → adjusted → confirmed)
- 주휴수당 자동 계산 (`holidayPayCalculator.js`)
- 세금 계산 (`taxCalculator.js`, 소득세 1.68% 기준)
- 급여 확인 완료 취소 기능

### 기타
- PWA (오프라인 배너, Service Worker, offline.html)
- Excel 다운로드 (`excelExporter.js`)
- 알림 시스템 (`Notification` 모델, `notificationHelper.js`)

---

## 프론트엔드 라우트 구조

```
/login                              로그인
/register                           회원가입
/forgot-password                    비밀번호 찾기
/reset-password                     비밀번호 재설정

/employee/dashboard                 직원 대시보드
/employee/schedule                  근무일정
/employee/salary                    급여 목록
/employee/salary/:year/:month       월별 급여 상세
/employee/profile                   프로필
/employee/notifications             알림

/owner/dashboard                    점주 대시보드
/owner/schedules                    근무일정 승인 (목록 + 월간 달력)
/owner/employees                    직원 목록
/owner/employees/:id                직원 상세
/owner/stores                       점포 관리
/owner/salary                       급여 관리
/owner/salary/:userId/:year/:month  직원 급여 상세
/owner/notifications                알림
```

---

## 주요 API 엔드포인트

### 인증
| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/auth/login` | 로그인 |
| POST | `/api/auth/register` | 회원가입 |
| GET | `/api/auth/me` | 내 정보 |
| POST | `/api/auth/forgot-password` | 비밀번호 찾기 |
| POST | `/api/auth/reset-password` | 비밀번호 재설정 |

### 점주
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/owner/dashboard` | 대시보드 |
| GET | `/api/owner/schedules` | 근무일정 목록 (`status`, `storeId`, `month` 필터) |
| PUT | `/api/owner/schedules/:id/approve` | 승인 |
| PUT | `/api/owner/schedules/:id/reject` | 거절 |
| GET | `/api/owner/employees` | 직원 목록 |
| GET | `/api/owner/employees/:id` | 직원 상세 |
| PUT | `/api/owner/employees/:id` | 직원 정보 수정 |
| GET | `/api/owner/stores` | 점포 목록 |
| POST | `/api/owner/stores` | 점포 생성 |
| PUT | `/api/owner/stores/:id` | 점포 수정 |

### 급여
| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/monthly-salary` | 급여 목록 (`year`, `month`, `storeId` 필터) |
| POST | `/api/monthly-salary/calculate` | 급여 산정 |
| PUT | `/api/monthly-salary/:id` | 급여 수정 |
| PUT | `/api/monthly-salary/:id/confirm` | 급여 확정 |
| PUT | `/api/monthly-salary/:id/unconfirm-employee` | 직원 확인 취소 |
| GET | `/api/owner/salary-preview` | 급여산정 전 복지포인트 미리보기 (`year`, `month`, `storeId` 필터) |

---

## 변경 이력

### 2026-06-08 — 직원 급여 요약 월 선택 범위 확장 및 페이지 이동 제거

**배경:** 직원 급여 메뉴에서 월 선택 시 당월·전월 2개만 제공되었고, 다른 월 선택 시 요약 페이지가 아닌 상세 페이지로 이동하는 문제가 있었음.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `server/src/routes/employee.route.js` | `/salary/summary` 월 목록 생성 범위를 2개 → 3개로 확장 (당월 + 2개월 전까지). |
| `client/src/pages/employee/Salary.jsx` | 드롭다운 `onChange` 시 `navigate()` 제거 → `selectedMonthId` 상태 업데이트로 대체. 선택 월을 쿼리 파라미터로 API 재호출하여 동일 페이지에서 데이터 갱신. |

---

### 2026-06-07 — 점주 승인된 근무일정 시간·메모 수정 기능 추가

**배경:** 점주가 승인한 근무일정의 시간이나 메모를 수정해야 하는 경우, 화면에 수정 버튼이 없어 변경이 불가능한 문제.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `server/src/routes/workSchedule.route.js` | `PUT /:id` 승인된 근무 차단 로직에 역할 분기 추가. 직원은 기존대로 차단, 점주(`owner`)는 `approved` 상태 근무도 수정 가능. |
| `client/src/pages/owner/Schedules.jsx` | `approved` 상태 카드에 파란색 수정 버튼 추가. 클릭 시 카드 하단에 시작/종료 시간 및 메모 수정 패널 인라인 표시. 저장 성공 시 목록 자동 갱신. `isLoading` → `isPending` 수정 (TanStack Query v5 대응). |

---

### 2026-06-05 — 점주 직원 상세 페이지 소속 점포 변경 기능 추가

**배경:** 직원이 가입 시 점포 코드를 잘못 입력하여 잘못된 점포에 배정된 경우, 점주가 직접 소속 점포를 수정할 수 없는 문제.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `client/src/pages/owner/EmployeeDetail.jsx` | 근로 정보 폼 최상단에 "소속 점포" 드롭다운 추가. `/api/owner/stores`에서 점주 소유 점포 목록을 조회하여 선택지로 표시. 직원 데이터 로드 시 현재 배정 점포를 기본값으로 설정. 저장 시 `storeId` 포함. 점포 미선택 시 저장 차단. |

**참고:** 서버의 `PUT /api/owner/employees/:id` API는 이미 `storeId` 변경 및 점주 소유 점포 권한 검증을 지원하고 있어 서버 변경 없이 프론트엔드 수정만으로 구현.

---

### 2026-06-01 (2) — 점주 승인 메뉴 점포-직원 필터 연동

**배경:** 점주가 근무일정 승인 메뉴에서 점포 필터를 선택해도 인원 드롭다운에 전체 직원이 노출되어 불편함 발생.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `client/src/pages/owner/Schedules.jsx` | 직원 목록 쿼리 키에 `storeFilter` 추가. 점포 필터 선택 시 `?storeId=` 파라미터를 포함해 `/owner/employees` 요청 → 해당 점포 소속 직원만 반환. 점포 변경 시 직원 필터 자동 초기화(기존 동작 유지) |
| `scripts/deploy.sh` | 빌드 명령어에 `DISABLE_ESLINT_PLUGIN=true` 추가 (ESLint 플러그인 충돌로 인한 빌드 실패 재발 방지) |

**참고:** 서버의 `GET /api/owner/employees` API는 이미 `storeId` 쿼리 파라미터를 지원하고 있어 서버 변경 없이 프론트엔드 수정만으로 구현.

---

### 2026-06-01 — 근무 일정 중복 등록 방지

**배경:** 근로자가 동일 날짜에 시간이 겹치는 근무 일정을 중복으로 등록할 수 있는 문제 발견. 서버·DB·클라이언트 3계층 모두 검증 로직 부재 상태였음.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `server/src/routes/workSchedule.route.js` | `POST /api/work-schedule`: 저장 전 동일 사용자·날짜 기준 시간 겹침 조회 → 충돌 시 409 반환. `PUT /api/work-schedule/:id`: 수정 저장 전 자신을 제외한 다른 일정과의 겹침 검증 추가. 거절된 일정은 검증 제외 |
| `client/src/pages/employee/Schedule.jsx` | 등록 폼에 `watch`로 날짜·시작·종료 시간 실시간 감지 → 현재 월 데이터에서 겹치는 일정 탐색 후 노란 경고박스 표시. `mutation.isLoading` → `mutation.isPending` 수정 (TanStack Query v5 대응, 중복 제출 방지). 저장 성공/실패 메시지 색상 분리. 수정 모달에 서버 에러 메시지 표시 추가 |
| `scripts/deploy.sh` | `REACT_APP_API_URL` 인라인 주입 제거. 빌드 실패 시 `|| true`로 오류가 가려지던 문제 수정 → 빌드 실패 시 즉시 스크립트 중단 |

**겹침 판정 조건:**
- 거절(`rejected`) 상태 일정은 제외
- `startTime < 신규EndTime AND endTime > 신규StartTime` 을 만족하면 충돌
- 날짜 비교는 UTC 자정 기준 범위 쿼리(`$gte dateStart, $lt dateEnd`)로 처리

---

### 2026-05-08 — 직원 급여 확인 / 수정 요청 기능 구현

**배경:** 직원이 급여 내역을 검토한 후 이상 없음 확인 또는 수정 요청을 할 수 있는 기능이 설계되어 있었으나 미구현 상태였음.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `server/src/models/MonthlySalary.js` | `employeeConfirmed`, `employeeConfirmedAt`, `correctionRequest(message/requestedAt/status)` 필드 스키마 추가 |
| `server/src/routes/monthlySalary.route.js` | `PUT /:id/confirm-employee` (직원 확인완료), `PUT /:id/correction-request` (수정 요청 + 점주 알림) 엔드포인트 추가. `findByIdAndUpdate`+`$set` 방식으로 기존 문서 유효성 검사 오류 방지 |
| `server/src/routes/employee.route.js` | `GET /salary/:year/:month` 응답에 `salaryId`, `salaryStatus`, `employeeConfirmed`, `employeeConfirmedAt`, `correctionRequest` 추가 |
| `client/src/pages/employee/SalaryDetail.jsx` | 급여 확인 섹션 UI 추가: 확인완료 버튼 / 수정 요청 버튼+텍스트 입력 / 상태별 표시(대기·확인완료·확정) |

**흐름:**
1. 점주가 급여 산정 → 직원이 확인 섹션에서 내용 검토
2. 이상 없음: **확인완료** 버튼 클릭 → `employeeConfirmed: true`
3. 이상 있음: **수정 요청** 버튼 → 메시지 작성 후 전송 → 점주에게 알림 발송
4. 점주는 `employeeConfirmed: true` 상태일 때만 최종 확정 가능

---

### 2026-05-08 — 직원 급여 월 선택 시 홈 리다이렉트 버그 수정

**배경:** 직원 급여 메뉴에서 드롭다운으로 과거 월을 선택하면 급여 상세 페이지 대신 홈(대시보드)으로 이동하는 문제 발생.

**원인:**
1. `window.location.href` 로 전체 페이지 새로고침 → React 재초기화 시 `isAuthenticated=false` → `EmployeeLayout`이 `/login`으로 튕김 → `Login.jsx`가 인증 감지 후 `/employee/dashboard`(홈)으로 리다이렉트하는 연쇄 문제
2. `months` API 응답에 `id`, `monthLabel`만 포함되어 있어 `selected.year`/`selected.month`가 `undefined` → `/employee/salary/undefined/NaN` URL 생성으로 에러

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `client/src/pages/employee/Salary.jsx` | 드롭다운 `onChange`를 `window.location.href` → React Router `navigate()` 로 교체. `e.target.value`(YYYY-MM 형식)를 직접 파싱하여 URL 생성. error 체크를 data 구조분해 이전으로 이동 |

**브랜치:** `feature/user-model-extension`

---

### 2026-05-07 — 복지포인트 산정 로직 개선 및 독립 미리보기 API 구현

**배경:** 월 경계 주차(예: 4/27~5/3)에서 복지포인트가 월별로 분할 산정되는 문제 수정 요청. 또한 배포 버전에 이미 설계되어 있던 급여산정 전 복지포인트 미리보기(`WelfarePreviewTable`) 기능의 서버 API가 미구현 상태였음.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `server/src/routes/monthlySalary.route.js` | 복지포인트를 월요일 기준 월에 귀속하여 전체 주 근무시간으로 산정. `getMonthlyWeeksForHolidayPay` import 경로 버그 수정 (`dateHelpers` → `holidayPayCalculator`) |
| `server/src/routes/owner.route.js` | `GET /api/owner/salary-preview` 엔드포인트 신규 구현 |
| `server/src/models/MonthlySalary.js` | `totalWelfarePoints`, `weeklyDetails.welfarePoints` 필드 스키마 추가. `holidayPayStatus` enum에 `not_eligible`, `pending_next_month` 추가 |
| `client/src/pages/owner/Salary.jsx` | 산정 완료 후 주차별 복지포인트 표시를 클라이언트 계산 → 서버 계산값(`week.welfarePoints`) 사용으로 변경 |

**복지포인트 산정 규칙:**
- 공식: `Math.floor(주간 실 근로시간 / 4) × 1,700원`
- 월 경계 주차: 해당 주의 **월요일이 속한 월**에 귀속, 전체 주(월~일) 근무시간 기준으로 산정
- 월요일이 전월에 속하는 주(`startsInPrevMonth`)는 해당 월 산정에서 제외 (전월 포함)

**salary-preview API 응답 구조:**
```json
{
  "previewMap": {
    "<employeeId>": {
      "totalHours": 80,
      "totalBasePay": 802560,
      "totalWelfarePoints": 34000,
      "weeklyDetails": [
        { "weekNumber": 1, "range": "4/27(월) ~ 5/3(일)", "workHours": 20, "basePay": 200640, "welfarePoints": 8500 }
      ]
    }
  }
}
```

**브랜치:** `feature/user-model-extension` · 커밋 `4c2c00b`

---

### 2026-05-02 — 프론트엔드 배포 형상 동기화

**배경:** EC2 백엔드는 `feature/user-model-extension` 브랜치 기준으로 2026-04-26 배포되어 있었으나, S3 프론트엔드(버킷 `1770215884`)와 로컬 git 코드 간 형상 불일치 확인.

**수정 내용:**

| 파일 | 변경 |
|------|------|
| `client/src/App.js` | 점주 라우트 추가: 급여, 알림, 직원 상세 (`/owner/employees/:id`) |
| `client/src/layouts/OwnerLayout.jsx` | 하단 네비게이션에 급여(💰), 알림(🔔) 탭 추가 |
| `client/public/index.html` | 타이틀 `CSMS - 편의점 근무 관리`, theme-color `#059669`, lang `ko` 반영 |
| `client/src/pages/owner/Schedules.jsx` | 월간 달력 탭 추가 + 필터 UI 개선 (점포/인원·기간·상태 섹션 분리) |

**신규 추가 파일:**

| 파일 | 설명 |
|------|------|
| `client/src/pages/auth/ForgotPassword.jsx` | 비밀번호 찾기 페이지 |
| `client/src/pages/auth/ResetPassword.jsx` | 비밀번호 재설정 페이지 |
| `client/src/pages/owner/EmployeeDetail.jsx` | 직원 상세 페이지 |
| `client/src/pages/owner/Notifications.jsx` | 점주 알림 페이지 |
| `client/src/pages/owner/Salary.jsx` | 점주 급여 관리 페이지 |
| `client/src/pages/owner/ScheduleCalendar.jsx` | 월간 달력 컴포넌트 |
| `client/src/components/OfflineBanner.jsx` | PWA 오프라인 배너 |
| `client/src/hooks/usePersistedFilter.js` | sessionStorage 기반 필터 유지 훅 |
| `client/public/offline.html` | PWA 오프라인 폴백 페이지 |
| `client/.env.production` | 프로덕션 API URL (`http://3.34.96.132`) |
| `server/src/models/Notification.js` | 알림 모델 |
| `server/src/utils/excelExporter.js` | Excel 내보내기 유틸 |
| `server/src/utils/holidayPayCalculator.js` | 주휴수당 계산 유틸 |
| `server/src/utils/taxCalculator.js` | 세금 계산 유틸 |
| `server/src/utils/notificationHelper.js` | 알림 생성 헬퍼 |

**버그 수정:**
- `/owner/employees/:id` 라우트 누락으로 직원 상세보기 클릭 시 홈으로 리다이렉트되던 문제 수정

---

## 로컬 실행 방법

```bash
# 의존성 설치
npm install && cd client && npm install && cd ../server && npm install && cd ..

# 개발 서버 (프론트 + 백엔드 동시)
npm run dev

# 프론트만
npm run dev:client

# 백엔드만
npm run dev:server

# 프론트 프로덕션 빌드
npm run build
```

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 점주 | `owner@test.com` | `password123` |
| 직원1 | `employee1@test.com` | `password123` |
| 직원2 | `employee2@test.com` | `password123` |
