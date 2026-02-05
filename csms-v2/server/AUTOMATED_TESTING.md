# 자동화 테스트 가이드

> Jest 기반 자동화 테스트 환경 설정 및 사용 방법

---

## 🎯 개요

이 프로젝트는 **Jest**와 **Supertest**를 사용한 자동화 테스트를 지원합니다.

### 테스트 유형

1. **통합 테스트 (Integration Tests)**
   - API 엔드포인트 전체 흐름 테스트
   - 실제 MongoDB 연동 (테스트용 DB)

2. **단위 테스트 (Unit Tests)** (추후 확장 가능)
   - 개별 함수/모듈 테스트

---

## 🚀 빠른 시작

### 1단계: 의존성 설치

```bash
cd csms-v2/server
npm install
```

### 2단계: 테스트 실행

```bash
# 모든 테스트 실행
npm test

# Watch 모드 (파일 변경 시 자동 재실행)
npm run test:watch

# 커버리지 리포트 생성
npm run test:coverage

# CI/CD용 (커버리지 포함)
npm run test:ci
```

---

## 📋 테스트 명령어

| 명령어 | 설명 |
|--------|------|
| `npm test` | 모든 테스트 실행 |
| `npm run test:watch` | Watch 모드 (파일 변경 시 자동 재실행) |
| `npm run test:coverage` | 커버리지 리포트 생성 |
| `npm run test:ci` | CI/CD용 테스트 (커버리지 포함) |
| `npm test -- workSchedule` | 특정 테스트 파일만 실행 |
| `npm test -- -t "근무일정을 생성"` | 특정 테스트 케이스만 실행 |

---

## 📁 테스트 파일 구조

```
server/
├── src/
│   ├── __tests__/
│   │   ├── health.test.js          # Health Check API 테스트
│   │   └── workSchedule.test.js    # WorkSchedule API 통합 테스트
│   ├── models/
│   ├── routes/
│   └── ...
├── jest.config.js                  # Jest 설정
├── jest.setup.js                   # Jest 초기 설정
└── package.json
```

### 테스트 파일 규칙

- 파일명: `*.test.js` 또는 `__tests__/**/*.test.js`
- 위치: 테스트 대상 파일과 같은 디렉토리 또는 `__tests__` 폴더

---

## ✍️ 테스트 작성 예시

### API 통합 테스트 예시

```javascript
const request = require('supertest');
const app = require('../app');

describe('WorkSchedule API', () => {
  it('근무일정을 생성할 수 있어야 함', async () => {
    const response = await request(app)
      .post('/api/work-schedule')
      .send({
        userId: 'user-id',
        storeId: 'store-id',
        workDate: '2025-11-20',
        startTime: '09:00',
        endTime: '18:00',
      })
      .expect(201);

    expect(response.body).toHaveProperty('schedule');
    expect(response.body.schedule.startTime).toBe('09:00');
  });
});
```

---

## 🔧 테스트 환경 설정

### 환경 변수

테스트는 별도의 환경 변수를 사용합니다:

1. **자동 설정** (기본값)
   - `NODE_ENV=test`
   - `PORT=5002`
   - `MONGODB_URI=mongodb://localhost:27017/csms_ver2_test`

2. **`.env.test` 파일 사용** (선택사항)

```bash
# .env.test 파일 생성
cp .env.test.example .env.test

# 필요한 값 수정
MONGODB_URI=mongodb://localhost:27017/csms_ver2_test
```

### 테스트용 MongoDB

- **기본**: `csms_ver2_test` 데이터베이스 사용
- **자동 정리**: 각 테스트 후 테스트 데이터 자동 삭제
- **격리**: 실제 데이터와 분리된 테스트 환경

---

## 📊 커버리지 리포트

### 커버리지 생성

```bash
npm run test:coverage
```

### 리포트 확인

커버리지 리포트는 다음 위치에 생성됩니다:

```
server/
├── coverage/
│   ├── lcov-report/
│   │   └── index.html  # 브라우저에서 열어서 확인
│   └── lcov.info       # CI/CD에서 사용
```

### 브라우저에서 확인

```bash
# macOS
open coverage/lcov-report/index.html

# Linux
xdg-open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

---

## 🧪 현재 테스트 항목

### Health Check API (`health.test.js`)

- ✅ `GET /api/health` - 서버 상태 확인
- ✅ `GET /api/health/ping` - Ping 응답

### WorkSchedule API (`workSchedule.test.js`)

#### POST /api/work-schedule

- ✅ 근무일정 생성 성공
- ✅ 필수 항목 누락 시 400 에러
- ✅ 시간 자동 계산 확인

#### GET /api/work-schedule

- ✅ 전체 근무일정 조회
- ✅ 월별 필터링
- ✅ 사용자별 필터링

#### PUT /api/work-schedule/:id

- ✅ 대기 중인 근무일정 수정
- ✅ 승인된 근무일정 수정 불가
- ✅ 존재하지 않는 근무일정 404 에러

#### DELETE /api/work-schedule/:id

- ✅ 대기 중인 근무일정 삭제
- ✅ 승인된 근무일정 삭제 불가
- ✅ 존재하지 않는 근무일정 404 에러

---

## 🔄 Watch 모드

### 사용법

```bash
npm run test:watch
```

### 동작

- 파일 저장 시 자동으로 관련 테스트 실행
- 실패한 테스트만 자동 재실행
- 빠른 피드백 루프

### 단축키

- `a` - 모든 테스트 실행
- `f` - 실패한 테스트만 실행
- `q` - 종료
- `p` - 파일 이름 패턴 필터링

---

## 🚨 문제 해결

### MongoDB 연결 실패

**문제:** `MongoDB connection failed`

**해결:**
1. MongoDB가 실행 중인지 확인
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status mongod
   ```

2. 테스트용 DB 접근 권한 확인

### 포트 충돌

**문제:** `Port 5002 already in use`

**해결:**
```bash
# 사용 중인 포트 확인
lsof -i :5002

# 프로세스 종료
kill -9 <PID>
```

### 테스트 타임아웃

**문제:** `Timeout - Async callback was not invoked`

**해결:**
- `jest.setup.js`에서 타임아웃 증가
- 또는 테스트 파일에서 `jest.setTimeout(60000)`

### 테스트 데이터 충돌

**문제:** 테스트 간 데이터 간섭

**해결:**
- `beforeAll`, `afterEach`, `afterAll`에서 데이터 정리
- 각 테스트는 독립적으로 실행되어야 함

---

## 📈 CI/CD 통합

### GitHub Actions 예시

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:ci
        env:
          MONGODB_URI: mongodb://localhost:27017/csms_ver2_test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

---

## 💡 테스트 작성 팁

### 1. 테스트는 독립적이어야 함

```javascript
// ❌ 나쁜 예: 이전 테스트에 의존
it('수정 테스트', () => {
  // 이전 테스트에서 생성된 데이터 사용
});

// ✅ 좋은 예: 독립적인 테스트
it('수정 테스트', async () => {
  // 필요한 데이터 먼저 생성
  const schedule = await createTestSchedule();
  // 테스트 진행
});
```

### 2. 명확한 테스트 이름

```javascript
// ❌ 나쁜 예
it('test 1', () => {});

// ✅ 좋은 예
it('대기 중인 근무일정을 수정할 수 있어야 함', async () => {});
```

### 3. AAA 패턴 사용

```javascript
it('테스트 케이스', async () => {
  // Arrange (준비)
  const payload = { ... };
  
  // Act (실행)
  const response = await request(app).post('/api/...').send(payload);
  
  // Assert (확인)
  expect(response.status).toBe(201);
});
```

### 4. 에러 케이스도 테스트

```javascript
it('잘못된 입력은 400 에러를 반환해야 함', async () => {
  const response = await request(app)
    .post('/api/work-schedule')
    .send({}) // 빈 데이터
    .expect(400);
});
```

---

## 📚 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [Supertest 공식 문서](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## ✅ 체크리스트

- [x] Jest 설정 완료
- [x] 통합 테스트 작성
- [x] Watch 모드 지원
- [x] 커버리지 리포트
- [ ] 단위 테스트 추가 (추후)
- [ ] E2E 테스트 추가 (추후)

---

**자동화 테스트로 안정적인 코드를 유지하세요! 🚀**

