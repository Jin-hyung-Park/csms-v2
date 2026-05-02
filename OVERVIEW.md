# CSMS v2 프로젝트 개요

> 편의점 프랜차이즈 종합 근무 관리 시스템 (Convenience Store Management System v2)  
> 최종 업데이트: 2026-05-02

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

---

## 변경 이력

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
