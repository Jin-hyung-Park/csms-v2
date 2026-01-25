# Phase 1 검증 가이드

> 구현된 인증 시스템의 실제 동작 확인

---

## 📋 검증 상태

### ✅ 완료된 검증

1. ✅ **자동화 테스트** - 모든 테스트 통과 (34개)
   - 인증 API 테스트: 17 passed
   - WorkSchedule 인증 테스트: 5 passed
   - WorkSchedule 테스트: 12 passed

2. ✅ **의존성 확인** - 모든 패키지 설치 완료
   - express, mongoose, jsonwebtoken, bcryptjs 확인

3. ✅ **환경 설정** - .env 파일 존재 확인
   - MONGODB_URI, JWT_SECRET 설정 확인

### ⚠️ 필요한 검증

1. ⏳ **실제 서버 실행 검증** - 서버가 정상 실행되는지 확인
2. ⏳ **실제 API 동작 검증** - API 엔드포인트가 실제로 동작하는지 확인
3. ⏳ **클라이언트 동작 검증** - 브라우저에서 로그인/회원가입 동작 확인

---

## 🚀 검증 방법

### 방법 1: 자동 검증 스크립트 (권장)

#### 1. 서버 실행 (터미널 1)

```bash
cd csms-v2/server
npm run dev
```

#### 2. 검증 스크립트 실행 (터미널 2)

```bash
cd csms-v2/server
npm run verify
```

**검증 항목:**
- ✅ 서버 헬스체크
- ✅ 회원가입 API
- ✅ 로그인 API
- ✅ 사용자 정보 조회 API
- ✅ 보호된 API 접근
- ✅ 유효하지 않은 토큰 처리
- ✅ WorkSchedule CRUD

### 방법 2: 수동 API 검증

#### 1. 시딩 (테스트 계정 생성)

```bash
cd csms-v2/server
npm run seed:clear
```

#### 2. 서버 실행

```bash
npm run dev
```

#### 3. API 테스트

**회원가입:**
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 사용자",
    "email": "test@example.com",
    "password": "password123",
    "role": "employee"
  }'
```

**로그인:**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee1@test.com",
    "password": "password123"
  }'
```

**토큰 사용 (TOKEN 변수에 저장):**
```bash
TOKEN="<위에서 받은 토큰>"

# 사용자 정보 조회
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 근무일정 조회
curl -X GET http://localhost:5001/api/work-schedule \
  -H "Authorization: Bearer $TOKEN"
```

### 방법 3: 브라우저 검증 (클라이언트)

#### 1. 서버 실행 (터미널 1)

```bash
cd csms-v2/server
npm run dev
```

#### 2. 클라이언트 실행 (터미널 2)

```bash
cd csms-v2/client
npm start
```

#### 3. 브라우저에서 확인

1. http://localhost:3000 접속
2. `/login` 페이지 확인
   - 이메일/비밀번호 입력 폼 확인
   - 로그인 버튼 확인
3. 로그인 테스트
   - 이메일: `employee1@test.com`
   - 비밀번호: `password123`
   - 로그인 성공 시 대시보드로 리다이렉트 확인
4. `/register` 페이지 확인
   - 회원가입 폼 확인
   - 필수 항목 검증 확인
5. 라우트 보호 확인
   - 로그아웃 후 `/employee/dashboard` 접근 시도
   - `/login`으로 리다이렉트 되는지 확인

---

## ✅ 검증 체크리스트

### 서버 검증

- [ ] 서버 정상 실행 (포트 5001)
- [ ] MongoDB 연결 확인
- [ ] 헬스체크 엔드포인트 동작 (`GET /api/health`)
- [ ] 회원가입 API 동작 (`POST /api/auth/register`)
- [ ] 로그인 API 동작 (`POST /api/auth/login`)
- [ ] 사용자 정보 조회 API 동작 (`GET /api/auth/me`)
- [ ] 토큰 없이 보호된 API 접근 시 401 에러
- [ ] 토큰과 함께 보호된 API 접근 성공
- [ ] WorkSchedule API CRUD 동작

### 클라이언트 검증

- [ ] 클라이언트 정상 실행 (포트 3000)
- [ ] 로그인 페이지 렌더링
- [ ] 회원가입 페이지 렌더링
- [ ] 로그인 성공 시 토큰 저장 (localStorage)
- [ ] 로그인 성공 시 대시보드로 리다이렉트
- [ ] 로그인 실패 시 에러 메시지 표시
- [ ] 회원가입 성공 시 자동 로그인
- [ ] 회원가입 실패 시 에러 메시지 표시
- [ ] 로그인 없이 보호된 페이지 접근 시 로그인 페이지로 리다이렉트
- [ ] API 요청 시 자동으로 토큰 추가 (요청 헤더)
- [ ] 401 에러 시 자동 로그아웃 및 리다이렉트

---

## 🔧 문제 해결

### 서버가 실행되지 않음

```bash
# MongoDB 확인 (macOS)
brew services list

# MongoDB 확인 (Linux)
sudo systemctl status mongod

# 포트 확인
lsof -i :5001

# 환경 변수 확인
cat csms-v2/server/.env
```

### 검증 스크립트 실행 실패

```bash
# 의존성 설치
cd csms-v2/server
npm install

# 서버 실행 여부 확인
curl http://localhost:5001/api/health

# 시딩 실행
npm run seed:clear
```

### 클라이언트 실행 실패

```bash
# 의존성 설치
cd csms-v2/client
npm install

# 포트 확인
lsof -i :3000

# 환경 변수 확인
cat .env
```

---

## 📊 검증 결과 예시

### 자동 검증 스크립트 성공 시

```
============================================================
Phase 1 인증 시스템 검증
============================================================

[정보] API URL: http://localhost:5001/api

[검증] 1. 서버 헬스체크...
[성공] 서버가 정상적으로 실행 중입니다.

[검증] 2. 회원가입 API 검증...
[성공] 회원가입 성공: verify-1234567890@test.com

[검증] 3. 로그인 API 검증...
[성공] 로그인 성공

[검증] 4. 사용자 정보 조회 API 검증...
[성공] 사용자 정보 조회 성공: employee1@test.com

[검증] 5. 보호된 API 검증 (WorkSchedule)...
[성공] 토큰 없이 접근 시 401 에러 반환 확인
[성공] 보호된 API 접근 성공: 3개의 근무일정 조회

[검증] 6. 유효하지 않은 토큰 검증...
[성공] 유효하지 않은 토큰 시 401 에러 반환 확인

[검증] 7. WorkSchedule CRUD 검증...
[성공] 근무일정 생성 성공
[성공] 생성한 근무일정 조회 성공
[성공] 근무일정 수정 성공
[성공] 근무일정 삭제 성공

============================================================
검증 결과 요약
============================================================
[성공] 성공: 10개

✅ 모든 검증이 완료되었습니다!
============================================================
```

---

## 📝 다음 단계

검증이 완료되면:

1. ✅ Phase 1 완료 확인
2. ➡️ Phase 2 진행 (데이터 모델 확장)
3. ➡️ Phase 3 진행 (Employee API 실제 연동)
4. ➡️ Phase 4 진행 (점주 기능)

---

**검증을 진행하시겠습니까?**

먼저 서버를 실행한 후 검증 스크립트를 실행하면 모든 기능이 정상 동작하는지 확인할 수 있습니다.

