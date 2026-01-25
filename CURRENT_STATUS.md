# CSMS v2 프로젝트 현재 상태 (최신 정리)

> 최종 업데이트: 2025-12-25  
> 프로젝트: 편의점 근무 관리 시스템 v2 (CSMS v2)

---

## 📊 프로젝트 개요

**CSMS v2**는 편의점 프랜차이즈를 위한 종합 근무 관리 시스템의 재구현 버전입니다. 기존 시스템과 분리된 독립적인 디렉토리(`csms-v2/`)에서 개발 중입니다.

### 핵심 목표
- 📅 근무 일정 관리 및 승인 시스템 ✅
- 💰 자동 급여 계산 (시급, 주휴수당, 세금) ⚠️ 부분 완료
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
- ✅ JWT 토큰 기반 인증
- ✅ 비밀번호 bcrypt 해싱
- ✅ 역할 기반 접근 제어 (점주/직원)
- ✅ 역할 기반 자동 리다이렉트

### 3. 데이터 모델 ✅

- ✅ User 모델 (점주/직원 구분)
- ✅ Store 모델 (점포 정보)
- ✅ WorkSchedule 모델 (근무일정, 승인 상태 관리)

### 4. 직원(Employee) 기능 ✅

#### 백엔드 API
- ✅ 대시보드 API (`GET /api/employee/dashboard`)
- ✅ 프로필 API (`GET /api/employee/profile`)
- ✅ 근무일정 조회 API (`GET /api/employee/work-schedule`)
- ✅ 급여 요약/상세 API (`GET /api/employee/salary/*`)
- ✅ 알림 API (구조 완성)

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
  - `GET /api/owner/employees` - 직원 목록
  - `GET /api/owner/employees/:id` - 직원 상세
  - `PUT /api/owner/employees/:id` - 직원 정보 수정
- ✅ 점포 관리 API
  - `GET /api/owner/stores` - 점포 목록
  - `POST /api/owner/stores` - 점포 생성
  - `PUT /api/owner/stores/:id` - 점포 수정
  - `DELETE /api/owner/stores/:id` - 점포 비활성화

#### 프론트엔드 페이지
- ✅ 점주 대시보드 (`/owner/dashboard`)
- ✅ 근무일정 승인 페이지 (`/owner/schedules`)
- ✅ 직원 관리 페이지 (`/owner/employees`)
- ✅ 점포 관리 페이지 (`/owner/stores`)
- ✅ OwnerLayout (하단 네비게이션)

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

### 1. 급여 계산 로직

**현재 상태:**
- ✅ 기본 급여 계산 (시급 × 근무시간)
- ⚠️ 주휴수당 계산: 미구현 (기본값 0)
- ⚠️ 세금 계산: 간단한 3.3% 계산만 (정확한 로직 필요)
- ⚠️ MonthlySalary 모델 미생성

**필요한 작업:**
- [ ] 주휴수당 자동 계산 로직
  - 주 15시간 이상 근무 시
  - 월 경계 주차 처리
- [ ] 정확한 세금 계산
  - 소득세, 지방소득세 분리
  - 사업자소득 vs 근로소득 구분
- [ ] MonthlySalary 모델 생성 및 연동

### 2. User 모델 확장

**현재 하드코딩된 값:**
- ⚠️ `hourlyWage`: 기본값 10030 (User 모델에 필드 추가 필요)
- ⚠️ `workSchedule`: 기본값 하드코딩 (User 모델에 필드 추가 필요)
- ⚠️ `taxType`: 기본값 하드코딩 (User 모델에 필드 추가 필요)

**필요한 작업:**
- [ ] User 모델에 시급 필드 추가
- [ ] User 모델에 근무 스케줄 필드 추가
- [ ] User 모델에 세금 정보 필드 추가

### 3. 알림 시스템

**현재 상태:**
- ✅ 알림 API 구조 완성
- ✅ 알림 목록 UI 완성
- ❌ Notification 모델 미생성
- ❌ 알림 생성 로직 없음

**필요한 작업:**
- [ ] Notification 모델 생성
- [ ] 근무일정 승인/거절 시 알림 생성
- [ ] 급여 확정 시 알림 생성
- [ ] 실시간 알림 (WebSocket 또는 Server-Sent Events)

---

## ❌ 미구현 항목

### 1. 급여 확정 프로세스 (Priority: HIGH)

**3단계 프로세스:**
1. **산정**: 자동 계산 (현재 부분 구현)
2. **수정**: 점주 수정 가능 (미구현)
3. **확정**: 최종 확정 후 수정 불가 (미구현)

**필요한 작업:**
- [ ] MonthlySalary 모델 생성
- [ ] 급여 산정 API
- [ ] 급여 수정 API (점주만)
- [ ] 급여 확정 API (점주만)
- [ ] 확정 후 수정 불가 로직

### 2. Excel 다운로드 기능 (Priority: MEDIUM)

**필요한 작업:**
- [ ] 통계 데이터 Excel 내보내기
- [ ] 급여 명세서 Excel 다운로드
- [ ] 근무일정 Excel 내보내기

### 3. PWA 기능 강화 (Priority: LOW)

**현재 상태:**
- ✅ `manifest.json` 존재
- ✅ Service Worker 파일 존재

**미완료:**
- [ ] 오프라인 캐싱 전략
- [ ] 오프라인 폴백 페이지

---

## 📈 전체 진행률

### 진행률: 약 75%

| 구분 | 항목 | 상태 | 진행률 |
|------|------|------|--------|
| **인프라** | 기본 구조 | ✅ 완료 | 100% |
| | 인증 시스템 | ✅ 완료 | 100% |
| | 데이터 모델 | ✅ 완료 | 80% |
| **직원 기능** | UI 구현 | ✅ 완료 | 100% |
| | API 구현 | ✅ 완료 | 100% |
| **점주 기능** | UI 구현 | ✅ 완료 | 100% |
| | API 구현 | ✅ 완료 | 100% |
| **급여 시스템** | 기본 계산 | ⚠️ 부분완료 | 50% |
| | 주휴수당 | ❌ 미구현 | 0% |
| | 세금 계산 | ⚠️ 부분완료 | 30% |
| | 확정 프로세스 | ❌ 미구현 | 0% |
| **알림 시스템** | 구조 | ✅ 완료 | 50% |
| | 모델/로직 | ❌ 미구현 | 0% |

---

## 🎯 다음 우선순위 작업

### 1. 급여 계산 로직 완성 (Priority: HIGH)
- 예상 시간: 1주
- 주휴수당 자동 계산
- 정확한 세금 계산
- MonthlySalary 모델 연동

### 2. 급여 확정 프로세스 (Priority: HIGH)
- 예상 시간: 3일
- 3단계 프로세스 구현
- 확정 후 수정 불가 로직

### 3. User 모델 확장 (Priority: MEDIUM)
- 예상 시간: 1일
- 시급, 근무 스케줄, 세금 정보 필드 추가
- 하드코딩된 값 제거

### 4. 알림 시스템 완성 (Priority: MEDIUM)
- 예상 시간: 3일
- Notification 모델 생성
- 알림 생성 로직
- 실시간 알림 (선택사항)

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
- `PROJECT_WRAP_UP.md` - 이전 정리 문서
- `OWNER_FEATURE_TEST_RESULTS.md` - 점주 기능 테스트 결과
- `LOCAL_TEST_GUIDE.md` - 로컬 테스트 가이드
- `LOCAL_DEVELOPMENT_GUIDE.md` - 로컬 개발 가이드

### Phase 문서
- `PHASE3_COMPLETE.md` - Phase 3 완료 보고
- `DEVELOPMENT_STRATEGY.md` - 개발 전략

---

## ✅ 최근 완료 사항

### 점주 기능 구현 완료 (2025-01-27)
- ✅ 점주 API 라우트 전체 구현
- ✅ 점주 프론트엔드 페이지 전체 구현
- ✅ 근무일정 승인/거절 기능
- ✅ 직원 관리 기능
- ✅ 점포 관리 기능
- ✅ 테스트 완료 (14개 테스트 모두 통과)

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
- ⚠️ **급여 계산 부분 완료** - 기본 계산만, 주휴수당/세금 계산 필요
- ⚠️ **급여 확정 프로세스 미구현** - 3단계 프로세스 필요

**다음 단계:**
1. 급여 계산 로직 완성 (주휴수당, 세금)
2. 급여 확정 프로세스 구현
3. User 모델 확장
4. 알림 시스템 완성

**MVP 완성까지 약 2주 예상**

---

**프로젝트 상태: 개발 중 (Phase 4 완료, Phase 5 진행 예정)**  
**최종 업데이트: 2025-12-25**
