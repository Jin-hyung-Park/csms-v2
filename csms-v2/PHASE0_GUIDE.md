# Phase 0: WorkSchedule API 완성 가이드

> 부분 구현된 WorkSchedule API를 실제 DB 연동으로 완성합니다.

---

## ✅ Phase 0 목표

- [x] MongoDB 연결 확인 및 개선
- [x] 테스트용 User/Store 모델 생성
- [x] 초기 시딩 스크립트 생성
- [x] WorkSchedule API 실제 DB 연동
- [x] API 테스트 스크립트 생성

---

## 🚀 시작하기

### 1단계: 환경 설정

```bash
# csms-v2/server 디렉토리로 이동
cd csms-v2/server

# .env 파일 생성 (아직 없다면)
cp env.example .env
```

**`.env` 파일 편집:**

```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/csms_ver2
# 또는 MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/csms_ver2?retryWrites=true&w=majority
JWT_SECRET=phase0-test-secret-key
```

### 2단계: MongoDB 준비

**옵션 A: 로컬 MongoDB 사용**

```bash
# macOS
brew services start mongodb-community@6.0

# Linux
sudo systemctl start mongod

# 연결 확인
mongosh
# MongoDB 쉘에 접속되면 성공
```

**옵션 B: MongoDB Atlas 사용**

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 가입
2. 클러스터 생성 (M0 FREE)
3. Network Access: `0.0.0.0/0` 추가
4. Database User 생성
5. Connection String 복사하여 `.env`의 `MONGODB_URI`에 설정

### 3단계: 의존성 확인

```bash
# 이미 설치되어 있다면 생략
npm install
```

---

## 📦 초기 데이터 시딩

### 시딩 스크립트 실행

```bash
# 기본 시딩 (기존 데이터 유지)
npm run seed

# 기존 데이터 삭제 후 시딩
npm run seed:clear
```

**생성되는 테스트 데이터:**

- **사용자 3명**
  - 근로자1: `employee1@test.com`
  - 근로자2: `employee2@test.com`
  - 점주: `owner@test.com`

- **점포 2개**
  - CSMS 판교역점
  - CSMS 수지구청점

- **근무일정 약 20개**
  - 오늘부터 2주치 근무일정
  - 과거 데이터 몇 개

**출력 예시:**

```
[시딩] 데이터베이스 시딩 시작...
[시딩] MongoDB 연결 성공
[시딩] 사용자 데이터 생성 중...
[시딩] 3명의 사용자 생성 완료
[시딩] 점포 데이터 생성 중...
[시딩] 2개의 점포 생성 완료
[시딩] 근무일정 데이터 생성 중...
[시딩] 20개의 근무일정 생성 완료
✅ 시딩 완료!
```

---

## 🧪 API 테스트

### 자동 테스트 스크립트 실행

**서버가 실행 중이어야 합니다:**

```bash
# 터미널 1: 서버 실행
npm run dev

# 터미널 2: API 테스트
npm run test:api
```

**테스트 항목:**

- ✅ 헬스체크 (`GET /api/health`)
- ✅ 근무일정 조회 (`GET /api/work-schedule`)
- ✅ 월별 조회 (`GET /api/work-schedule?month=YYYY-MM`)
- ✅ 근무일정 생성 (`POST /api/work-schedule`)
- ✅ 근무일정 수정 (`PUT /api/work-schedule/:id`)
- ✅ 근무일정 삭제 (`DELETE /api/work-schedule/:id`)

**출력 예시:**

```
============================================================
Phase 0: WorkSchedule API 테스트
============================================================

[정보] API URL: http://localhost:5001/api

[테스트] 헬스체크 테스트...
[성공] 헬스체크 통과: CSMS ver2 API 정상 동작 중

[테스트] 근무일정 조회 테스트 (GET /work-schedule)...
[성공] 20개의 근무일정 조회 성공

...

============================================================
[성공] 모든 테스트 완료!
============================================================
```

### 수동 테스트 (curl)

**근무일정 조회:**

```bash
# 전체 조회
curl http://localhost:5001/api/work-schedule

# 월별 조회
curl "http://localhost:5001/api/work-schedule?month=2025-11"

# 특정 사용자 조회
curl "http://localhost:5001/api/work-schedule?userId=USER_ID"
```

**근무일정 생성:**

```bash
curl -X POST http://localhost:5001/api/work-schedule \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "storeId": "STORE_ID",
    "workDate": "2025-11-20",
    "startTime": "09:00",
    "endTime": "18:00",
    "notes": "테스트 근무일정"
  }'
```

> **참고**: `USER_ID`와 `STORE_ID`는 시딩 스크립트 실행 후 MongoDB에서 확인하거나, 첫 번째 조회 결과에서 가져올 수 있습니다.

**근무일정 수정:**

```bash
curl -X PUT http://localhost:5001/api/work-schedule/SCHEDULE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "10:00",
    "endTime": "19:00",
    "notes": "수정된 메모"
  }'
```

**근무일정 삭제:**

```bash
curl -X DELETE http://localhost:5001/api/work-schedule/SCHEDULE_ID
```

---

## 📋 API 엔드포인트 목록

### WorkSchedule API

| 메서드 | 엔드포인트 | 설명 | 상태 |
|--------|-----------|------|------|
| GET | `/api/work-schedule` | 근무일정 조회 (전체) | ✅ |
| GET | `/api/work-schedule?month=YYYY-MM` | 월별 조회 | ✅ |
| GET | `/api/work-schedule?userId=USER_ID` | 사용자별 조회 | ✅ |
| POST | `/api/work-schedule` | 근무일정 생성 | ✅ |
| PUT | `/api/work-schedule/:id` | 근무일정 수정 | ✅ |
| DELETE | `/api/work-schedule/:id` | 근무일정 삭제 | ✅ |

### Health Check

| 메서드 | 엔드포인트 | 설명 | 상태 |
|--------|-----------|------|------|
| GET | `/api/health` | 서버 상태 확인 | ✅ |

---

## 🔍 데이터 확인 (MongoDB)

### MongoDB 쉘로 확인

```bash
# MongoDB 쉘 접속
mongosh

# 데이터베이스 선택
use csms_ver2

# 컬렉션 확인
show collections

# 사용자 조회
db.users.find().pretty()

# 점포 조회
db.stores.find().pretty()

# 근무일정 조회
db.workschedules.find().pretty()

# 개수 확인
db.workschedules.countDocuments()
```

### MongoDB Compass 사용

1. [MongoDB Compass](https://www.mongodb.com/products/compass) 다운로드
2. Connection String 입력 (`.env`의 `MONGODB_URI`)
3. `csms_ver2` 데이터베이스 선택
4. 컬렉션 확인 및 데이터 조회

---

## ✅ Phase 0 완료 확인

다음 항목을 확인하세요:

- [ ] MongoDB 연결 성공
- [ ] 시딩 스크립트 실행 완료
- [ ] API 테스트 스크립트 모두 통과
- [ ] `GET /api/work-schedule`로 데이터 조회 가능
- [ ] `POST /api/work-schedule`로 데이터 생성 가능
- [ ] `PUT /api/work-schedule/:id`로 데이터 수정 가능
- [ ] `DELETE /api/work-schedule/:id`로 데이터 삭제 가능
- [ ] 클라이언트에서 실제 데이터 표시 확인

---

## 🐛 문제 해결

### MongoDB 연결 실패

**문제:** `MONGODB_URI is not defined`

**해결:**
```bash
# .env 파일이 있는지 확인
ls -la csms-v2/server/.env

# .env 파일 생성
cp env.example .env

# MONGODB_URI 확인
cat .env | grep MONGODB_URI
```

### 시딩 스크립트 실패

**문제:** `Cannot connect to MongoDB`

**해결:**
1. MongoDB가 실행 중인지 확인
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mongod
   ```
2. 연결 문자열 확인
3. 네트워크 접근 권한 확인 (MongoDB Atlas 사용 시)

### API 테스트 실패

**문제:** `ECONNREFUSED`

**해결:**
1. 서버가 실행 중인지 확인
   ```bash
   npm run dev
   ```
2. 포트 확인 (기본값: 5001)
3. 다른 프로세스가 포트를 사용 중인지 확인
   ```bash
   lsof -i :5001
   ```

---

## 📝 다음 단계

Phase 0 완료 후:

1. **Phase 1: 인증 시스템 구현**
   - User 모델 확장 (비밀번호 해싱)
   - JWT 인증
   - 로그인/회원가입 API
   - Phase 0 API에 인증 추가

2. **Phase 2: 데이터 모델 확장**
   - Store 모델 확장
   - User-Store 관계 완성

3. **Phase 3: 근로자 API 실제 연동**
   - Employee API에서 Mock 데이터 제거
   - 실제 DB 조회로 변경

---

## 💡 팁

### 빠른 재시작

```bash
# 데이터 초기화 후 재시작
npm run seed:clear && npm run dev
```

### API 테스트 자동화

```bash
# 서버 실행 중에 자동 테스트
npm run dev &
sleep 5
npm run test:api
```

### 로그 확인

서버 실행 중에는 다음과 같은 로그가 출력됩니다:

```
✅ MongoDB 연결 완료
   데이터베이스: csms_ver2
   호스트: localhost
CSMS ver2 서버가 http://localhost:5001 에서 실행 중입니다.
```

---

**Phase 0 완료를 축하합니다! 🎉**

이제 실제로 동작하는 API가 준비되었습니다. 다음 단계로 진행하세요!

