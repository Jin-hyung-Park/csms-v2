# CSMS v2 프로젝트 현황 정리 (Wrap Up)

> 작성일: 2025-01-27  
> 프로젝트: 편의점 근무 관리 시스템 v2 (CSMS v2)

---

## 📊 프로젝트 개요

**CSMS v2**는 편의점 프랜차이즈를 위한 종합 근무 관리 시스템의 재구현 버전입니다. 기존 시스템(`convenience_store_management/`)과 분리된 독립적인 디렉토리(`csms-v2/`)에서 개발 중입니다.

### 핵심 목표
- 📅 근무 일정 관리 및 승인 시스템
- 💰 자동 급여 계산 (시급, 주휴수당, 세금)
- 📊 통계 및 리포트 기능
- 👥 역할 기반 권한 관리 (점주/직원)

---

## ✅ 완료된 항목

### 1. 프로젝트 구조 및 인프라 ✅

#### 1.1 모노레포 구조
```
csms-v2/
├── client/          # React 18 + Tailwind CSS + React Query + Zustand
├── server/          # Express.js + MongoDB + JWT
└── package.json     # 통합 실행 스크립트
```

#### 1.2 기술 스택
- **Frontend**: React 19.2, Tailwind CSS 3.4, React Query 5.9, Zustand 5.0
- **Backend**: Express 5.1, Mongoose 8.19, JWT 인증
- **Database**: MongoDB (로컬/Atlas)
- **개발 환경**: concurrently로 프론트/백 동시 실행

#### 1.3 보안 설정
- ✅ CORS 설정
- ✅ Helmet (보안 헤더)
- ✅ Rate Limiting (100 req/min)
- ✅ Morgan (로깅)

### 2. 인증 시스템 ✅

#### 2.1 인증 API
- ✅ `POST /api/auth/register` - 회원가입
- ✅ `POST /api/auth/login` - 로그인
- ✅ `GET /api/auth/me` - 현재 사용자 정보 조회
- ✅ JWT 토큰 기반 인증
- ✅ 비밀번호 bcrypt 해싱

#### 2.2 인증 미들웨어
- ✅ `authenticate` - JWT 토큰 검증
- ✅ `requireEmployee` - 직원 권한 검증
- ✅ `requireOwner` - 점주 권한 검증 (준비됨)

### 3. 데이터 모델 ✅

#### 3.1 User 모델
```javascript
- name, email, password (해싱됨)
- role: 'employee' | 'owner'
- storeId: ObjectId (점포 참조)
- phone, isActive
```

#### 3.2 Store 모델
```javascript
- name, address
- ownerId: ObjectId (점주 참조)
- phone, isActive
```

#### 3.3 WorkSchedule 모델
```javascript
- userId, storeId (ObjectId 참조)
- workDate (Date)
- startTime, endTime (String: HH:MM)
- totalHours (자동 계산)
- status: 'pending' | 'approved' | 'rejected'
- notes
- 야간 근무 처리 (24시간 초과 시)
```

### 4. Employee API (실제 DB 연동 완료) ✅

#### 4.1 대시보드 API
- ✅ `GET /api/employee/dashboard`
  - 실제 사용자 정보 조회
  - 실제 점포 정보 조회
  - 이번 주 근무일정 실제 DB 조회
  - 지난 달 근무일정 실제 DB 조회
  - 통계 계산 (근무시간, 일수, 예상 급여)

#### 4.2 프로필 API
- ✅ `GET /api/employee/profile`
  - 실제 사용자 정보 조회
  - 실제 점포 정보 조회
  - 사용자 활성 상태 표시

#### 4.3 근무일정 API
- ✅ `GET /api/employee/work-schedule/defaults` - 근무일정 기본값
- ✅ `GET /api/employee/work-schedule` - 근무일정 조회 (주차별 그룹화, 월별 필터링)

#### 4.4 급여 API
- ✅ `GET /api/employee/salary/summary` - 급여 요약 (최근 2개월)
- ✅ `GET /api/employee/salary/:year/:month` - 월별 급여 상세
  - 주차별 통계 계산
  - 일별 근무일정 상세

#### 4.5 알림 API (구조 완성)
- ✅ `GET /api/employee/notifications` - 알림 목록
- ✅ `PUT /api/employee/notifications/:id/read` - 알림 읽음 처리
- ⚠️ TODO: Notification 모델 연동 필요

### 5. WorkSchedule API ✅

#### 5.1 CRUD 엔드포인트
- ✅ `GET /api/work-schedule` - 목록 조회 (월별 필터링)
- ✅ `POST /api/work-schedule` - 신규 등록
- ✅ `PUT /api/work-schedule/:id` - 수정 (승인 전만)
- ✅ `DELETE /api/work-schedule/:id` - 삭제 (승인 전만)
- ✅ 실제 MongoDB 연동 완료
- ✅ 인증 미들웨어 적용

### 6. 클라이언트 구현 (직원 측) ✅

#### 6.1 페이지 구현
| 페이지 | 경로 | 상태 | 비고 |
|--------|------|------|------|
| 로그인 | `/auth/login` | ✅ 완료 | 실제 API 연동 |
| 회원가입 | `/auth/register` | ✅ 완료 | 실제 API 연동 |
| 대시보드 | `/employee/dashboard` | ✅ 완료 | 실제 DB 데이터 |
| 근무일정 | `/employee/schedule` | ✅ 완료 | 등록/조회/수정/삭제 |
| 급여 목록 | `/employee/salary` | ✅ 완료 | 실제 데이터 표시 |
| 급여 상세 | `/employee/salary/:year/:month` | ✅ 완료 | 주차별 상세 정보 |
| 프로필 | `/employee/profile` | ✅ 완료 | 계약 정보 표시 |
| 알림 | `/employee/notifications` | ✅ 완료 | 알림 목록 UI |

#### 6.2 레이아웃 및 네비게이션
- ✅ **EmployeeLayout** 구현 완료
  - 상단 헤더 (사용자 정보, 알림 배지)
  - 하단 네비게이션 바 (모바일 최적화)
  - 그라데이션 배경 및 Glass morphism 효과

#### 6.3 상태 관리
- ✅ **Zustand** 기반 인증 스토어
- ✅ **React Query** 통합 (서버 상태 관리)
- ✅ Axios 클라이언트 설정

### 7. 유틸리티 함수 ✅

#### 7.1 날짜 유틸리티 (`dateHelpers.js`)
- ✅ 날짜 포맷팅 함수
- ✅ 주차 계산 함수
- ✅ 날짜 범위 계산 함수
- ✅ 월별 주차 수 계산 함수

#### 7.2 JWT 유틸리티 (`jwt.js`)
- ✅ 토큰 생성 함수
- ✅ 토큰 검증 함수

---

## ⚠️ 부분 완료된 항목

### 1. 급여 계산 로직

**현재 상태:**
- ✅ 기본 급여 계산 (시급 × 근무시간)
- ⚠️ 주휴수당 계산: TODO (기본값 0)
- ⚠️ 세금 계산: 간단한 3.3% 계산만 (정확한 로직 필요)
- ⚠️ MonthlySalary 모델 연동 필요

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

### 1. 점주(Owner) 기능 (Priority: HIGH)

**필요한 작업:**
- [ ] OwnerLayout 컴포넌트
- [ ] 점주 대시보드 페이지 (`/owner/dashboard`)
- [ ] 근무일정 승인/거절 페이지 (`/owner/schedules`)
- [ ] 직원 관리 페이지 (`/owner/employees`)
- [ ] 점포 관리 페이지 (`/owner/stores`)
- [ ] 급여 확정 페이지 (`/owner/salary`)
- [ ] 점주 라우트 (`/api/owner/*`)

**참고:**
- `OwnerDashboardCard` 컴포넌트는 존재하나 실제 사용되지 않음
- 점주 관련 Mock 데이터만 준비됨

### 2. 급여 확정 프로세스 (Priority: HIGH)

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

### 3. Excel 다운로드 기능 (Priority: MEDIUM)

**필요한 작업:**
- [ ] 통계 데이터 Excel 내보내기
- [ ] 급여 명세서 Excel 다운로드
- [ ] 근무일정 Excel 내보내기

### 4. PWA 기능 강화 (Priority: LOW)

**현재 상태:**
- ✅ `manifest.json` 존재
- ✅ Service Worker 파일 존재

**미완료:**
- [ ] 오프라인 캐싱 전략
- [ ] 오프라인 폴백 페이지

---

## 📋 현재 개발 단계

### Phase 3 완료 ✅

**완료 내용:**
- Employee API 실제 DB 연동 완료
- 인증 미들웨어 적용 완료
- 날짜 유틸리티 함수 생성 완료

**문서:** `PHASE3_COMPLETE.md`

### 다음 단계: Phase 4 (점주 기능)

**예상 작업:**
1. 점주 대시보드
2. 근무일정 승인/거절 API
3. 직원 관리 API
4. 점포 관리 API

---

## 🏗️ 아키텍처

### 시스템 구조
```
┌─────────────┐
│   Client    │  React SPA (로컬 개발: localhost:3000)
│  (Frontend) │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐
│   Express   │  API Server (로컬 개발: localhost:5001)
│  (Port 5001)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  MongoDB    │  데이터베이스 (로컬/Atlas)
└─────────────┘
```

### 역할별 접근 권한

| 기능 | 직원 | 점주 |
|------|:----:|:----:|
| 근무 일정 등록 | ✅ | ✅ |
| 근무 일정 승인 | ❌ | ✅ |
| 급여 조회 | ✅ | ✅ |
| 급여 계산/수정 | ❌ | ✅ |
| 통계 조회 | 본인만 | 전체 |
| 직원 관리 | ❌ | ✅ |
| 점포 관리 | ❌ | ✅ |

---

## 🚀 실행 방법

### 개발 환경 실행

```bash
# 루트 디렉토리에서
cd csms-v2

# 의존성 설치
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# 환경 변수 설정
# server/.env 파일 생성 (server/env.example 참고)
# client/.env 파일 생성 (선택사항)

# 개발 서버 실행 (프론트/백 동시 실행)
npm run dev

# 또는 개별 실행
npm run dev:client  # 프론트만 (localhost:3000)
npm run dev:server  # 백엔드만 (localhost:5001)
```

### 환경 변수 설정

**server/.env:**
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/csms_ver2
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

**client/.env (선택사항):**
```env
REACT_APP_API_URL=http://localhost:5001
```

---

## 📝 주요 API 엔드포인트

### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

### 직원 API (인증 필요)
- `GET /api/employee/dashboard` - 대시보드
- `GET /api/employee/profile` - 프로필
- `GET /api/employee/work-schedule` - 근무일정 조회
- `GET /api/employee/work-schedule/defaults` - 근무일정 기본값
- `GET /api/employee/salary/summary` - 급여 요약
- `GET /api/employee/salary/:year/:month` - 월별 급여 상세
- `GET /api/employee/notifications` - 알림 목록
- `PUT /api/employee/notifications/:id/read` - 알림 읽음 처리

### 근무일정 API (인증 필요)
- `GET /api/work-schedule` - 목록 조회
- `POST /api/work-schedule` - 신규 등록
- `PUT /api/work-schedule/:id` - 수정
- `DELETE /api/work-schedule/:id` - 삭제

### 점주 API (미구현)
- `GET /api/owner/dashboard` - 점주 대시보드
- `GET /api/owner/schedules` - 근무일정 승인 대기 목록
- `PUT /api/owner/schedules/:id/approve` - 근무일정 승인
- `PUT /api/owner/schedules/:id/reject` - 근무일정 거절
- `GET /api/owner/employees` - 직원 목록
- `GET /api/owner/stores` - 점포 목록

---

## 🧪 테스트

### 백엔드 테스트
```bash
cd csms-v2/server
npm test
```

**테스트 파일:**
- `__tests__/auth.test.js` - 인증 테스트
- `__tests__/health.test.js` - 헬스체크 테스트
- `__tests__/workSchedule.test.js` - 근무일정 테스트
- `__tests__/workSchedule-auth.test.js` - 근무일정 인증 테스트

---

## 📈 진행률 요약

### 전체 진행률: 약 60%

| 구분 | 항목 | 상태 | 진행률 |
|------|------|------|--------|
| **인프라** | 기본 구조 | ✅ 완료 | 100% |
| | 인증 시스템 | ✅ 완료 | 100% |
| | 데이터 모델 | ✅ 완료 | 80% |
| **직원 기능** | UI 구현 | ✅ 완료 | 100% |
| | API 구현 | ✅ 완료 | 90% |
| **점주 기능** | UI 구현 | ❌ 미구현 | 0% |
| | API 구현 | ❌ 미구현 | 0% |
| **급여 시스템** | 기본 계산 | ⚠️ 부분완료 | 50% |
| | 주휴수당 | ❌ 미구현 | 0% |
| | 세금 계산 | ⚠️ 부분완료 | 30% |
| | 확정 프로세스 | ❌ 미구현 | 0% |

---

## 🎯 다음 우선순위 작업

### 1. 점주 기능 구현 (Priority: HIGH)
- 예상 시간: 1.5주
- 점주 대시보드
- 근무일정 승인/거절
- 직원 관리
- 점포 관리

### 2. 급여 계산 로직 완성 (Priority: HIGH)
- 예상 시간: 1주
- 주휴수당 자동 계산
- 정확한 세금 계산
- MonthlySalary 모델 연동

### 3. 급여 확정 프로세스 (Priority: MEDIUM)
- 예상 시간: 3일
- 3단계 프로세스 구현
- 확정 후 수정 불가 로직

### 4. 알림 시스템 완성 (Priority: MEDIUM)
- 예상 시간: 3일
- Notification 모델 생성
- 알림 생성 로직
- 실시간 알림 (선택사항)

---

## 📚 참고 문서

### 프로젝트 문서
- `README.md` - 프로젝트 개요
- `DEVELOPMENT_STRATEGY.md` - 개발 전략
- `IMPLEMENTATION_STATUS.md` - 구현 상태
- `PHASE3_COMPLETE.md` - Phase 3 완료 보고
- `LOCAL_DEVELOPMENT_GUIDE.md` - 로컬 개발 가이드

### 시스템 명세서
- `../SYSTEM_SPECIFICATION.md` - 전체 시스템 명세서

---

## 🔍 기술적 이슈 및 제약사항

### 현재 이슈
1. **User 모델 확장 필요**
   - 시급, 근무 스케줄, 세금 정보 필드 추가 필요
   - 현재 하드코딩된 값들이 많음

2. **MonthlySalary 모델 미생성**
   - 급여 확정 프로세스 구현 불가
   - 주휴수당 계산 결과 저장 불가

3. **점주 기능 완전 부재**
   - 시스템의 핵심 기능인 승인 프로세스 미작동
   - 3단계 프로세스 구현 불가

### 아키텍처 고려사항
- ✅ **모노레포 구조**: 프론트/백 분리 유지, 향후 독립 배포 가능
- ✅ **PWA 준비**: 모바일 앱처럼 설치 가능한 구조 준비됨
- ✅ **상태 관리**: React Query + Zustand 조합으로 서버/클라이언트 상태 분리 잘 됨

---

## ✅ 결론

**현재 상태:**
- ✅ **인증 시스템 완료** - JWT 기반 인증 및 권한 관리
- ✅ **직원 기능 대부분 완료** - UI 및 API 실제 DB 연동 완료
- ✅ **근무일정 관리 완료** - CRUD 및 실제 DB 연동 완료
- ⚠️ **급여 계산 부분 완료** - 기본 계산만, 주휴수당/세금 계산 필요
- ❌ **점주 기능 미구현** - 핵심 기능인 승인 프로세스 필요

**다음 단계:**
1. 점주 기능 구현 (최우선)
2. 급여 계산 로직 완성
3. 급여 확정 프로세스 구현

위 3가지만 완료하면 최소한의 MVP로 동작할 수 있을 것으로 예상됩니다.

---

**프로젝트 상태: 개발 중 (Phase 3 완료, Phase 4 진행 예정)**  
**최종 업데이트: 2025-01-27**

