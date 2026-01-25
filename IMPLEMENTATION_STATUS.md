# CSMS 버전2 구현 진행사항 중간 보고

> 작성일: 2025-11-17  
> 기준: `SYSTEM_SPECIFICATION.md` 기반 재구현 프로젝트

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

