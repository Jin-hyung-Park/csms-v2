# 로컬 테스트 가이드

> 점주 기능을 로컬에서 테스트하는 방법

---

## 📋 사전 준비사항

### 1. MongoDB 실행 확인

로컬 MongoDB가 실행 중이어야 합니다:

```bash
# MongoDB 실행 확인
mongosh --eval "db.version()"
# 또는
mongo --eval "db.version()"
```

MongoDB가 실행되지 않은 경우:
```bash
# macOS (Homebrew)
brew services start mongodb-community

# 또는 직접 실행
mongod
```

### 2. 환경 변수 확인

`csms-v2/server/.env` 파일이 올바르게 설정되어 있는지 확인:

```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/csms_ver2
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
```

---

## 🚀 실행 방법

### 방법 1: 통합 실행 (권장)

```bash
# csms-v2 루트 디렉토리에서
cd /Users/Jinhyung_1/convenience_store_management/csms-v2

# 프론트엔드와 백엔드를 동시에 실행
npm run dev
```

이 명령어는:
- 백엔드 서버를 `http://localhost:5001`에서 실행
- 프론트엔드 개발 서버를 `http://localhost:3000`에서 실행

### 방법 2: 개별 실행

#### 백엔드 서버 실행

```bash
cd csms-v2/server
npm run dev
```

서버가 `http://localhost:5001`에서 실행됩니다.

#### 프론트엔드 클라이언트 실행

새 터미널 창에서:

```bash
cd csms-v2/client
npm start
```

클라이언트가 `http://localhost:3000`에서 실행됩니다.

---

## 📊 테스트 데이터 생성

### 시딩 스크립트 실행

테스트 데이터를 생성하려면:

```bash
cd csms-v2/server

# 기존 데이터 유지하고 추가
npm run seed

# 기존 데이터 삭제 후 새로 생성
npm run seed:clear
```

### 생성되는 테스트 계정

| 역할 | 이메일 | 비밀번호 | 설명 |
|------|--------|----------|------|
| **점주** | `owner@test.com` | `password123` | 점주 대시보드 테스트용 |
| **근로자1** | `employee1@test.com` | `password123` | 판교역점 소속 |
| **근로자2** | `employee2@test.com` | `password123` | 수지구청점 소속 |

### 생성되는 테스트 데이터

- **점포**: 2개
  - CSMS 판교역점
  - CSMS 수지구청점
- **근무일정**: 약 20개
  - 일부는 승인됨 (approved)
  - 일부는 승인 대기 (pending)

---

## 🧪 테스트 시나리오

### 1. 점주로 로그인하여 테스트

#### 1.1 점주 대시보드 확인

1. 브라우저에서 `http://localhost:3000` 접속
2. 로그인 페이지에서:
   - 이메일: `owner@test.com`
   - 비밀번호: `password123`
3. 로그인 후 자동으로 `/owner/dashboard`로 이동
4. 확인 사항:
   - 점포별 통계 카드 표시
   - 전체 통계 요약 (점포 수, 직원 수, 승인 대기 건수)
   - 빠른 액션 버튼

#### 1.2 근무일정 승인/거절 테스트

1. 하단 네비게이션에서 "승인" 메뉴 클릭
2. 확인 사항:
   - 승인 대기 중인 근무일정 목록 표시
   - 상태별 필터링 (대기/승인/거절)
   - 점포별 필터링
3. 근무일정 승인:
   - "승인" 버튼 클릭
   - 확인 대화상자에서 확인
   - 상태가 "승인됨"으로 변경되는지 확인
4. 근무일정 거절:
   - "거절" 버튼 클릭
   - 거절 사유 입력
   - "거절하기" 버튼 클릭
   - 상태가 "거절됨"으로 변경되는지 확인

#### 1.3 직원 관리 테스트

1. 하단 네비게이션에서 "직원" 메뉴 클릭
2. 확인 사항:
   - 직원 목록 표시
   - 각 직원의 통계 (근무시간, 승인 대기/승인 건수)
   - 점포별 필터링
3. 직원 상세보기:
   - "상세보기" 버튼 클릭
   - 직원 정보 및 통계 확인

#### 1.4 점포 관리 테스트

1. 하단 네비게이션에서 "점포" 메뉴 클릭
2. 점포 등록:
   - "+ 점포 등록" 버튼 클릭
   - 점포명, 주소 입력 (필수)
   - 전화번호, 사업자번호, 설명 입력 (선택)
   - "등록하기" 버튼 클릭
   - 점포 목록에 새 점포가 추가되는지 확인
3. 점포 수정:
   - 점포 카드의 "수정" 버튼 클릭
   - 정보 수정 후 "저장하기" 버튼 클릭
   - 변경사항이 반영되는지 확인
4. 점포 삭제:
   - 점포 카드의 "삭제" 버튼 클릭
   - 확인 대화상자에서 확인
   - 점포가 목록에서 사라지는지 확인

### 2. 근로자로 로그인하여 테스트

#### 2.1 근로자 대시보드 확인

1. 로그아웃 후 다시 로그인:
   - 이메일: `employee1@test.com`
   - 비밀번호: `password123`
2. 로그인 후 자동으로 `/employee/dashboard`로 이동
3. 확인 사항:
   - 근무 점포 정보 표시
   - 이번 주 근무 통계
   - 지난 달 급여 정보

#### 2.2 근무일정 등록 테스트

1. "근무표" 메뉴 클릭
2. 근무일정 등록:
   - 날짜 선택
   - 시작 시간, 종료 시간 입력
   - 메모 입력 (선택)
   - "등록" 버튼 클릭
3. 점주 계정으로 로그인하여 승인 대기 목록에서 확인

---

## 🔍 API 직접 테스트 (선택사항)

### curl을 사용한 API 테스트

#### 1. 점주 로그인

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "password123"
  }'
```

응답에서 `token` 값을 복사합니다.

#### 2. 점주 대시보드 조회

```bash
curl -X GET http://localhost:5001/api/owner/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 3. 근무일정 목록 조회

```bash
curl -X GET "http://localhost:5001/api/owner/schedules?status=pending" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 4. 근무일정 승인

```bash
curl -X PUT http://localhost:5001/api/owner/schedules/SCHEDULE_ID/approve \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## 🐛 문제 해결

### MongoDB 연결 오류

```
MongoServerError: connect ECONNREFUSED 127.0.0.1:27017
```

**해결 방법:**
1. MongoDB가 실행 중인지 확인
2. `MONGODB_URI` 환경 변수 확인
3. MongoDB 포트가 27017인지 확인

### 포트가 이미 사용 중

```
Error: listen EADDRINUSE: address already in use :::5001
```

**해결 방법:**
1. 다른 프로세스가 포트를 사용 중인지 확인:
   ```bash
   lsof -i :5001
   ```
2. 해당 프로세스 종료 또는 `.env`에서 다른 포트 사용

### CORS 오류

브라우저 콘솔에서 CORS 오류가 발생하는 경우:

1. 서버의 CORS 설정 확인
2. 클라이언트의 `REACT_APP_API_URL` 환경 변수 확인
3. 서버가 올바른 포트에서 실행 중인지 확인

### 인증 오류

```
401 Unauthorized
```

**해결 방법:**
1. 로그인하여 새 토큰 발급
2. 브라우저 개발자 도구에서 토큰 확인
3. 토큰이 만료되었는지 확인 (재로그인 필요)

---

## 📝 체크리스트

로컬 테스트 전 확인사항:

- [ ] MongoDB 실행 중
- [ ] 서버 `.env` 파일 설정 완료
- [ ] 테스트 데이터 시딩 완료
- [ ] 서버 실행 중 (`http://localhost:5001`)
- [ ] 클라이언트 실행 중 (`http://localhost:3000`)
- [ ] 테스트 계정 정보 확인

---

## 🎯 빠른 시작

```bash
# 1. 테스트 데이터 생성
cd csms-v2/server
npm run seed:clear

# 2. 서버 실행 (새 터미널)
cd csms-v2
npm run dev

# 3. 브라우저에서 접속
# http://localhost:3000

# 4. 로그인
# 점주: owner@test.com / password123
# 근로자: employee1@test.com / password123
```

---

## 📞 추가 도움말

문제가 발생하면:
1. 서버 콘솔 로그 확인
2. 브라우저 개발자 도구 콘솔 확인
3. MongoDB 연결 상태 확인
4. 환경 변수 설정 확인

---

**테스트 계정 정보**

- **점주**: `owner@test.com` / `password123`
- **근로자1**: `employee1@test.com` / `password123`
- **근로자2**: `employee2@test.com` / `password123`




