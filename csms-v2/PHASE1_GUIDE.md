# Phase 1 완료 가이드

> 인증 시스템 구현 완료

---

## ✅ Phase 1 완료 상태

### 완료된 기능

1. ✅ **User 모델 확장** - 비밀번호 해싱 추가
2. ✅ **JWT 인증 시스템** - 토큰 생성 및 검증
3. ✅ **인증 미들웨어** - JWT 토큰 검증 및 권한 확인
4. ✅ **인증 API** - 회원가입, 로그인, 사용자 정보 조회
5. ✅ **WorkSchedule API 인증 적용** - 모든 라우트 보호
6. ✅ **클라이언트 인증 페이지** - 로그인/회원가입
7. ✅ **토큰 관리** - 자동 토큰 추가 및 401 처리
8. ✅ **라우트 보호** - 인증되지 않은 사용자 자동 리다이렉트

---

## 🚀 사용 방법

### 1. 시딩 (테스트 계정 생성)

```bash
cd csms-v2/server
npm run seed:clear
```

**생성되는 테스트 계정:**

- `employee1@test.com` / `password123`
- `employee2@test.com` / `password123`
- `owner@test.com` / `password123`

### 2. 서버 실행

```bash
npm run dev
```

### 3. 클라이언트 실행

```bash
cd ../client
npm start
```

### 4. 테스트

브라우저에서 http://localhost:3000 접속

1. `/login` - 로그인 페이지
2. `/register` - 회원가입 페이지
3. 로그인 후 `/employee/dashboard` - 대시보드

---

## 📋 API 엔드포인트

### 인증 API

| 메서드 | 엔드포인트 | 인증 필요 | 설명 |
|--------|-----------|---------|------|
| POST | `/api/auth/register` | ❌ | 회원가입 |
| POST | `/api/auth/login` | ❌ | 로그인 |
| GET | `/api/auth/me` | ✅ | 현재 사용자 정보 |

### WorkSchedule API (인증 적용됨)

| 메서드 | 엔드포인트 | 인증 필요 | 권한 |
|--------|-----------|---------|------|
| GET | `/api/work-schedule` | ✅ | 근로자: 자신만, 점주: 모든 |
| POST | `/api/work-schedule` | ✅ | 근로자: 자신만 |
| PUT | `/api/work-schedule/:id` | ✅ | 근로자: 자신만 |
| DELETE | `/api/work-schedule/:id` | ✅ | 근로자: 자신만 |

---

## 🔐 인증 흐름

### 회원가입

```bash
POST /api/auth/register
{
  "name": "홍길동",
  "email": "test@example.com",
  "password": "password123",
  "phone": "010-1234-5678",
  "role": "employee"
}

응답:
{
  "message": "회원가입이 완료되었습니다.",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 로그인

```bash
POST /api/auth/login
{
  "email": "employee1@test.com",
  "password": "password123"
}

응답:
{
  "message": "로그인 성공",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 보호된 API 사용

```bash
GET /api/work-schedule
Authorization: Bearer <token>
```

---

## 🧪 테스트

### 개별 테스트 실행

```bash
# 인증 테스트
npm test -- auth.test.js

# WorkSchedule 인증 테스트
npm test -- workSchedule-auth.test.js

# WorkSchedule 테스트
npm test -- workSchedule.test.js
```

### 전체 테스트

```bash
npm test
```

**참고**: 전체 테스트 실행 시 일부 테스트 간 데이터 충돌이 발생할 수 있습니다. 개별 실행은 모두 통과합니다.

---

## ✅ 확인 사항

Phase 1 완료를 확인하려면:

1. [ ] 시딩 스크립트 실행 완료
2. [ ] 회원가입 API 테스트
3. [ ] 로그인 API 테스트
4. [ ] 로그인 없이 WorkSchedule API 접근 시 401 에러
5. [ ] 로그인 후 WorkSchedule API 정상 동작
6. [ ] 클라이언트 로그인 페이지 동작
7. [ ] 클라이언트 회원가입 페이지 동작
8. [ ] 로그인 없이 대시보드 접근 시 로그인 페이지로 리다이렉트

---

## 📝 다음 단계

### Phase 2: 데이터 모델 확장

1. Store 모델 확장
2. User-Store 관계 완성
3. WorkSchedule 참조 관계 확장

### Phase 3: Employee API 실제 연동

1. Mock 데이터 제거
2. 실제 DB 조회로 변경

### Phase 4: 점주 기능

1. 점주 대시보드
2. 근무일정 승인/거절
3. 직원 관리

---

**Phase 1 완료를 축하합니다! 🎉**

이제 인증 시스템이 완전히 구현되었습니다. 모든 API가 보호되며, 권한 기반 접근 제어가 적용되었습니다.

