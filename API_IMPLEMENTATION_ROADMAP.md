# CSMS 버전2 API 구현 로드맵

> 미구현 API부터 순차적으로 완성하는 구현 계획

---

## 🎯 구현 전략

### 개발 순서 (우선순위) - 수정됨

**권장: 하이브리드 접근** (빠른 결과물 + 점진적 발전)

0. **Phase 0: 부분 구현 API 빠른 완성** (1-2일) ← **먼저 시작!**
1. **Phase 1: 인증 시스템** (1주) ← 기반 구축
2. **Phase 2: 데이터 모델** (User, Store)
3. **Phase 3: 실제 DB 연동** (CRUD 완성)
4. **Phase 4: 점주 API**
5. **Phase 5: 급여 계산 로직**

> 💡 **전략 변경 이유**: 빠른 성취감 + 점진적 발전이 가장 효과적
> 자세한 내용은 `DEVELOPMENT_STRATEGY.md` 참고

### 개발 원칙

- ✅ **로컬에서 먼저 개발 및 테스트**
- ✅ **기능별로 구현 후 바로 테스트**
- ✅ **테스트 완료 후 AWS 배포**
- ✅ **하나씩 완성하면서 진행**

---

## 📋 구현 단계별 상세 계획

---

## Phase 0: WorkSchedule API 빠른 완성 (1-2일 예상) ← **먼저 시작!**

### 🎯 목표
- 부분 구현된 WorkSchedule API 실제 DB 연동
- 빠르게 동작하는 기능 하나 완성
- 클라이언트와 즉시 연동 확인

### 📦 필요한 작업

#### 0.1 MongoDB 연결 확인
**파일**: `server/src/lib/mongo.js` (이미 있음)

- `.env` 파일 설정 확인
- MongoDB 연결 테스트

#### 0.2 WorkSchedule 실제 DB 연동
**파일**: `server/src/routes/workSchedule.route.js` (이미 구현됨)

**현재 상태:**
- ✅ CRUD 엔드포인트 모두 구현됨
- ✅ MongoDB 모델 정의됨
- ⚠️ 실제 DB 연결만 확인 필요

**확인 사항:**
- MongoDB 실행 중인지 확인
- WorkSchedule 모델이 실제로 저장되는지 확인

#### 0.3 초기 시딩 스크립트
**파일**: `server/scripts/seed.js` (새로 생성)

```javascript
// 간단한 테스트 데이터 생성
- 테스트 User (ObjectId)
- 테스트 Store (ObjectId)
- 테스트 WorkSchedule 3-5개
```

**실행:**
```bash
node server/scripts/seed.js
```

#### 0.4 API 테스트
- Postman 또는 curl로 테스트
- `POST /api/work-schedule` - 생성
- `GET /api/work-schedule` - 조회
- `PUT /api/work-schedule/:id` - 수정
- `DELETE /api/work-schedule/:id` - 삭제

#### 0.5 클라이언트 연동 확인
- 클라이언트에서 실제 데이터 표시
- 근무일정 등록/조회 동작 확인

### ✅ 완료 기준
- [ ] MongoDB 연결 성공
- [ ] WorkSchedule 데이터 실제 저장/조회
- [ ] 초기 시딩 스크립트 실행 완료
- [ ] Postman/curl로 API 테스트 완료
- [ ] 클라이언트에서 실제 데이터 표시

### ⚠️ 주의사항
- **인증 없음**: 테스트 용도로만 사용
- **테스트 데이터**: 시딩 스크립트로 관리
- **Phase 1에서 인증 추가**: 이 단계에서는 인증 없이 진행

### 🎉 기대 효과
- ✅ 1-2일 내 동작하는 기능 확인
- ✅ MongoDB 연동 실전 경험
- ✅ 클라이언트와 즉시 연동
- ✅ 성취감과 동기부여

---

## Phase 1: 인증 시스템 (1주 예상) ← **기반 구축**

### 🎯 목표
- 사용자 로그인/회원가입
- JWT 토큰 발급 및 검증
- 인증 미들웨어 적용

### 📦 필요한 작업

#### 1.1 User 모델 생성
**파일**: `server/src/models/User.js`

```javascript
- 필드:
  - name, email, password (해시)
  - role: 'owner' | 'employee'
  - phone, storeId (employee만)
  - createdAt, updatedAt
```

#### 1.2 인증 라우트
**파일**: `server/src/routes/auth.route.js`

**엔드포인트:**
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/refresh` - 토큰 갱신 (선택)
- `GET /api/auth/me` - 현재 사용자 정보

#### 1.3 JWT 미들웨어
**파일**: `server/src/middleware/auth.js`

- 토큰 검증 미들웨어
- 역할(role) 확인 미들웨어

#### 1.4 클라이언트 인증 페이지
**파일**: `client/src/pages/auth/Login.jsx`, `Register.jsx`

- 로그인 폼
- 회원가입 폼
- 토큰 저장 및 관리

#### 1.5 API 클라이언트에 토큰 인터셉터 추가
**파일**: `client/src/lib/apiClient.js`

- 요청 시 토큰 자동 추가
- 401 에러 시 로그인 페이지로 리다이렉트

### ✅ 완료 기준
- [ ] 회원가입 시 비밀번호 해싱
- [ ] 로그인 시 JWT 토큰 발급
- [ ] 보호된 API에 토큰 필요
- [ ] 클라이언트에서 자동 인증

---

## Phase 2: 데이터 모델 및 기본 CRUD (3일 예상)

### 🎯 목표
- User, Store 모델 생성
- WorkSchedule 실제 DB 연동
- 초기 데이터 시딩

### 📦 필요한 작업

#### 2.1 Store 모델 생성
**파일**: `server/src/models/Store.js`

```javascript
- 필드:
  - name, address
  - ownerId (User 참조)
  - phone, businessNumber
  - createdAt, updatedAt
```

#### 2.2 User 모델 생성
**파일**: `server/src/models/User.js` (Phase 1에서 생성했지만 보완)

- Store 참조 관계
- 인덱스 추가 (email, phone)

#### 2.3 WorkSchedule 실제 DB 연동
**파일**: `server/src/routes/workSchedule.route.js`

- Mock 데이터 제거
- 실제 MongoDB 연동
- 에러 처리 개선

#### 2.4 초기 데이터 시딩
**파일**: `server/scripts/seed.js`

- 테스트 점주 계정
- 테스트 점포
- 테스트 근로자 계정

### ✅ 완료 기준
- [ ] Store CRUD 동작
- [ ] WorkSchedule 실제 저장/조회
- [ ] 초기 데이터 자동 생성

---

## Phase 3: 근로자 API 실제 연동 (2일 예상)

### 🎯 목표
- 근로자 대시보드 실제 데이터 연동
- 근무일정 조회 실제 DB 사용

### 📦 필요한 작업

#### 3.1 근로자 대시보드 API 실제 연동
**파일**: `server/src/routes/employee.route.js`

- Mock 데이터 제거
- 실제 데이터 조회
  - `GET /api/employee/dashboard`
  - `GET /api/employee/work-schedule`
  - `GET /api/employee/salary/summary`

#### 3.2 근무일정 스마트 초기값 API
**파일**: `server/src/routes/employee.route.js`

- `GET /api/employee/work-schedule/defaults`
- 계약 정보 기반 초기값 계산

### ✅ 완료 기준
- [ ] 대시보드 실제 데이터 표시
- [ ] 근무일정 조회 실제 DB 사용
- [ ] 스마트 초기값 정확히 계산

---

## Phase 4: 점주 기능 (1.5주 예상)

### 🎯 목표
- 점주 대시보드
- 근무일정 승인/거절
- 직원 관리

### 📦 필요한 작업

#### 4.1 점주 라우트 생성
**파일**: `server/src/routes/owner.route.js`

**엔드포인트:**
- `GET /api/owner/dashboard` - 점주 대시보드
- `GET /api/owner/schedules/pending` - 승인 대기 목록
- `PUT /api/owner/schedules/:id/approve` - 승인
- `PUT /api/owner/schedules/:id/reject` - 거절
- `GET /api/owner/employees` - 직원 목록
- `POST /api/owner/employees` - 직원 등록
- `PUT /api/owner/employees/:id` - 직원 수정
- `DELETE /api/owner/employees/:id` - 직원 삭제

#### 4.2 점주 레이아웃 및 페이지
**파일**: `client/src/layouts/OwnerLayout.jsx`
**파일**: `client/src/pages/owner/*`

- OwnerLayout
- Dashboard
- ScheduleApproval (승인/거절)
- EmployeeList
- EmployeeDetail

#### 4.3 WorkSchedule 승인/거절 API
**파일**: `server/src/routes/workSchedule.route.js`

- `PUT /api/work-schedule/:id/approve`
- `PUT /api/work-schedule/:id/reject`
- 알림 생성 (추후)

### ✅ 완료 기준
- [ ] 점주 로그인 가능
- [ ] 대기 중인 근무일정 확인
- [ ] 승인/거절 동작
- [ ] 직원 관리 CRUD

---

## Phase 5: 급여 계산 로직 (1주 예상)

### 🎯 목표
- 주휴수당 자동 계산
- 세금 계산
- 월별 급여 산정

### 📦 필요한 작업

#### 5.1 MonthlySalary 모델 생성
**파일**: `server/src/models/MonthlySalary.js`

```javascript
- 필드:
  - userId, storeId
  - year, month
  - weeklyData (주차별 데이터)
  - monthlyTotal (월합계)
  - status: 'calculated' | 'modified' | 'confirmed'
  - confirmedAt
```

#### 5.2 주휴수당 계산 함수
**파일**: `server/src/utils/holidayPayCalculator.js`

- 주 15시간 이상 체크
- 월 경계 주차 처리
- `SYSTEM_SPECIFICATION.md` 로직 참고

#### 5.3 세금 계산 함수
**파일**: `server/src/utils/taxCalculator.js`

- 소득세 계산
- 지방소득세 계산
- 사업자소득 vs 근로소득

#### 5.4 급여 산정 API
**파일**: `server/src/routes/salary.route.js`

- `POST /api/salary/calculate/:year/:month` - 산정
- `PUT /api/salary/modify/:id` - 수정 (점주만)
- `PUT /api/salary/confirm/:id` - 확정 (점주만)
- `GET /api/salary/:year/:month` - 조회

### ✅ 완료 기준
- [ ] 주휴수당 정확히 계산
- [ ] 세금 정확히 계산
- [ ] 3단계 프로세스 (산정/수정/확정) 동작

---

## Phase 6: 알림 시스템 (3일 예상)

### 🎯 목표
- 근무일정 승인/거절 시 알림
- 급여 확정 시 알림

### 📦 필요한 작업

#### 6.1 Notification 모델 생성
**파일**: `server/src/models/Notification.js`

```javascript
- 필드:
  - userId
  - type: 'schedule' | 'payment' | 'system'
  - title, message
  - isRead
  - createdAt
```

#### 6.2 알림 생성 로직
- WorkSchedule 승인/거절 시
- MonthlySalary 확정 시

#### 6.3 알림 API
**파일**: `server/src/routes/notification.route.js`

- `GET /api/notifications` - 알림 목록
- `PUT /api/notifications/:id/read` - 읽음 처리

---

## 📊 전체 일정 요약

| Phase | 작업 | 예상 기간 | 우선순위 |
|-------|------|----------|---------|
| Phase 1 | 인증 시스템 | 1주 | 🔴 최우선 |
| Phase 2 | 데이터 모델 및 기본 CRUD | 3일 | 🔴 최우선 |
| Phase 3 | 근로자 API 실제 연동 | 2일 | 🟡 높음 |
| Phase 4 | 점주 기능 | 1.5주 | 🟡 높음 |
| Phase 5 | 급여 계산 로직 | 1주 | 🟢 중간 |
| Phase 6 | 알림 시스템 | 3일 | 🟢 낮음 |

**총 예상 기간**: 약 4-5주

---

## 🚀 시작하기

### 1단계: Phase 1 시작

```bash
# 로컬 개발 환경 확인
cd csms-v2/server
npm run dev  # 서버 실행 확인

# 새로운 브랜치 생성
git checkout -b feature/authentication

# User 모델 생성
touch server/src/models/User.js

# 인증 라우트 생성
touch server/src/routes/auth.route.js
```

### 2단계: 순차적 구현

1. 모델 생성
2. 라우트 구현
3. 로컬에서 테스트
4. 커밋
5. 다음 단계로

---

## ✅ 체크리스트

### Phase 1: 인증 시스템
- [ ] User 모델 생성
- [ ] 비밀번호 해싱 (bcryptjs)
- [ ] JWT 토큰 발급
- [ ] 인증 미들웨어
- [ ] 로그인/회원가입 API
- [ ] 클라이언트 로그인 페이지
- [ ] 토큰 저장 및 관리
- [ ] API 클라이언트 인터셉터

### Phase 2: 데이터 모델
- [ ] Store 모델
- [ ] User 모델 완성
- [ ] WorkSchedule 실제 DB 연동
- [ ] 초기 데이터 시딩

### Phase 3: 근로자 API
- [ ] 대시보드 실제 데이터
- [ ] 근무일정 실제 조회
- [ ] 스마트 초기값 계산

### Phase 4: 점주 기능
- [ ] 점주 라우트
- [ ] 점주 대시보드
- [ ] 근무일정 승인/거절
- [ ] 직원 관리

### Phase 5: 급여 계산
- [ ] MonthlySalary 모델
- [ ] 주휴수당 계산
- [ ] 세금 계산
- [ ] 급여 산정 API

### Phase 6: 알림
- [ ] Notification 모델
- [ ] 알림 생성 로직
- [ ] 알림 API

---

## 💡 구현 팁

### 1. 작은 단위로 구현

- 한 번에 너무 많이 구현하지 마세요
- 하나의 엔드포인트씩 완성
- 테스트 후 다음 단계로

### 2. 에러 처리 중요

- 모든 API에 try-catch
- 적절한 HTTP 상태 코드
- 명확한 에러 메시지

### 3. 데이터 검증

- express-validator 사용 권장
- 클라이언트와 서버 양쪽 검증

### 4. 로깅

- 중요한 작업은 로그 남기기
- 디버깅 시 유용

---

**이제 Phase 1부터 시작하세요! 🚀**

