# Phase 1 검증 체크리스트

> 구현된 인증 시스템의 실제 동작 확인

---

## 🔍 검증 항목

### 1. 서버 환경 확인

- [ ] MongoDB 연결 확인
- [ ] 환경 변수 설정 확인
- [ ] 의존성 설치 확인
- [ ] 서버 정상 실행 확인

### 2. 인증 API 검증

#### 2.1 회원가입 API
- [ ] `POST /api/auth/register` - 정상 회원가입
- [ ] 이메일 중복 체크
- [ ] 비밀번호 검증 (6자 이상)
- [ ] 이메일 형식 검증

#### 2.2 로그인 API
- [ ] `POST /api/auth/login` - 정상 로그인
- [ ] 잘못된 이메일 에러 처리
- [ ] 잘못된 비밀번호 에러 처리
- [ ] JWT 토큰 발급 확인

#### 2.3 사용자 정보 API
- [ ] `GET /api/auth/me` - 토큰으로 사용자 정보 조회
- [ ] 토큰 없이 접근 시 401 에러
- [ ] 유효하지 않은 토큰 시 401 에러

### 3. WorkSchedule API 인증 검증

#### 3.1 인증 필수 확인
- [ ] 토큰 없이 `GET /api/work-schedule` → 401
- [ ] 토큰 없이 `POST /api/work-schedule` → 401
- [ ] 토큰 없이 `PUT /api/work-schedule/:id` → 401
- [ ] 토큰 없이 `DELETE /api/work-schedule/:id` → 401

#### 3.2 권한 확인
- [ ] 근로자가 자신의 근무일정만 조회 가능
- [ ] 근로자가 자신의 근무일정만 생성 가능
- [ ] 근로자가 자신의 근무일정만 수정 가능
- [ ] 근로자가 자신의 근무일정만 삭제 가능
- [ ] 점주가 모든 근무일정 조회 가능

### 4. 클라이언트 검증

#### 4.1 로그인 페이지
- [ ] 로그인 폼 렌더링
- [ ] 이메일/비밀번호 입력
- [ ] 로그인 성공 시 대시보드로 리다이렉트
- [ ] 로그인 실패 시 에러 메시지 표시
- [ ] 토큰 저장 확인 (localStorage)

#### 4.2 회원가입 페이지
- [ ] 회원가입 폼 렌더링
- [ ] 필수 항목 검증
- [ ] 비밀번호 확인 일치 검증
- [ ] 회원가입 성공 시 자동 로그인
- [ ] 회원가입 실패 시 에러 메시지 표시

#### 4.3 라우트 보호
- [ ] 로그인 없이 `/employee/dashboard` 접근 → `/login` 리다이렉트
- [ ] 로그인 없이 `/employee/schedule` 접근 → `/login` 리다이렉트
- [ ] 로그인 후 보호된 페이지 접근 가능

#### 4.4 토큰 관리
- [ ] API 요청 시 자동으로 토큰 추가
- [ ] 401 에러 시 자동 로그아웃 및 리다이렉트
- [ ] 로그아웃 버튼 동작

---

## 🧪 검증 방법

### 방법 1: Postman/curl로 API 검증

#### 1. 회원가입 테스트

```bash
# 회원가입
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "테스트 사용자",
    "email": "test-verification@test.com",
    "password": "password123",
    "role": "employee"
  }'

# 응답에서 token 복사
```

#### 2. 로그인 테스트

```bash
# 로그인
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee1@test.com",
    "password": "password123"
  }'

# 응답에서 token 복사
```

#### 3. 토큰으로 API 사용

```bash
# TOKEN 변수에 토큰 저장
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 보호된 API 사용
curl -X GET http://localhost:5001/api/work-schedule \
  -H "Authorization: Bearer $TOKEN"

# 사용자 정보 조회
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### 방법 2: 브라우저로 클라이언트 검증

#### 1. 서버 실행

```bash
cd csms-v2/server
npm run dev
```

#### 2. 클라이언트 실행

```bash
cd csms-v2/client
npm start
```

#### 3. 브라우저에서 확인

1. http://localhost:3000 접속
2. `/login` 페이지 확인
3. 테스트 계정으로 로그인
4. 대시보드 접근 확인
5. 로그아웃 테스트
6. `/register` 페이지로 회원가입 테스트

---

## 📝 검증 스크립트

자동 검증 스크립트를 사용할 수도 있습니다:

```bash
cd csms-v2/server
npm run test:api
```

---

## ✅ 검증 완료 기준

다음 항목이 모두 확인되면 검증 완료:

1. ✅ 모든 API 테스트 통과
2. ✅ 서버 정상 실행
3. ✅ 클라이언트 정상 실행
4. ✅ 회원가입 동작 확인
5. ✅ 로그인 동작 확인
6. ✅ 보호된 API 접근 확인
7. ✅ 권한 기반 접근 제어 확인

---

## 🔧 검증 중 문제 해결

### 서버가 실행되지 않음

```bash
# MongoDB 실행 확인
brew services list  # macOS
# 또는
sudo systemctl status mongod  # Linux

# 환경 변수 확인
cat csms-v2/server/.env
```

### 클라이언트가 실행되지 않음

```bash
# 의존성 설치
cd csms-v2/client
npm install

# 포트 충돌 확인
lsof -i :3000
```

### API 호출 실패

```bash
# 서버 로그 확인
# 터미널에서 에러 메시지 확인

# 토큰 확인
# 브라우저 개발자 도구 → Application → Local Storage → token
```

---

**검증을 진행하시겠습니까?**

