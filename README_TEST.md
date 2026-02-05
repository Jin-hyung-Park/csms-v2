# 🧪 CSMS 테스트 가이드

## 📋 빠른 시작

### 1. 시스템 상태 확인
```bash
# 서버 상태 확인
curl http://localhost:5001/api/health

# MongoDB 상태 확인
brew services list | grep mongodb

# 서버 프로세스 확인
ps aux | grep "node index.js"
```

### 2. 자동 테스트 실행
```bash
./test_script.sh
```

### 3. 브라우저에서 테스트
브라우저에서 다음 URL 접속:
- **서버 상태**: http://localhost:5001/api/health

## 🛠️ 수동 테스트 방법

### A. 터미널에서 curl 사용

#### 1. 서버 상태 확인
```bash
curl http://localhost:5001/api/health
```

#### 2. 회원가입
```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "role": "employee",
    "name": "테스트 사용자",
    "phone": "010-1234-5678"
  }'
```

#### 3. 로그인
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### B. 브라우저 개발자 도구 사용

1. **F12** 키를 눌러 개발자 도구 열기
2. **Console** 탭에서 다음 코드 실행:

```javascript
// 서버 상태 확인
fetch('http://localhost:5001/api/health')
  .then(response => response.json())
  .then(data => console.log('서버 상태:', data));

// 회원가입 테스트
fetch('http://localhost:5001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    role: 'employee',
    name: '테스트 사용자',
    phone: '010-1234-5678'
  })
})
.then(response => response.json())
.then(data => console.log('회원가입 결과:', data));
```

### C. Postman 사용

1. **Postman** 설치 및 실행
2. **New Collection** 생성
3. 다음 요청들 추가:

#### 회원가입 요청
- **Method**: POST
- **URL**: `http://localhost:5001/api/auth/register`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "role": "employee",
  "name": "테스트 사용자",
  "phone": "010-1234-5678"
}
```

#### 로그인 요청
- **Method**: POST
- **URL**: `http://localhost:5001/api/auth/login`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "password123"
}
```

## 📊 데이터베이스 확인

### MongoDB 직접 접속
```bash
mongosh convenience_store
```

### 데이터베이스 상태 확인
```bash
mongosh convenience_store --eval "db.stats()"
```

### 사용자 데이터 확인
```bash
mongosh convenience_store --eval "db.users.find()"
```

## 🔧 문제 해결

### 서버가 실행되지 않는 경우
```bash
# 서버 프로세스 종료
pkill -f "node index.js"

# 서버 재시작
cd server && node index.js
```

### MongoDB 연결 오류
```bash
# MongoDB 재시작
brew services restart mongodb/brew/mongodb-community

# MongoDB 상태 확인
brew services list | grep mongodb
```

### 포트 충돌
```bash
# 포트 사용 확인
lsof -i :5001
lsof -i :27017

# 프로세스 종료
kill -9 [PID]
```

## 📝 테스트 체크리스트

- [ ] 서버가 정상 실행 중인가?
- [ ] MongoDB가 정상 실행 중인가?
- [ ] `/api/health` 엔드포인트가 응답하는가?
- [ ] 회원가입 API가 작동하는가?
- [ ] 로그인 API가 작동하는가?
- [ ] 데이터베이스에 데이터가 저장되는가?

## 📚 추가 문서

- `test_api_guide.md`: 상세한 API 테스트 가이드
- `browser_test_guide.md`: 브라우저 테스트 가이드
- `test_script.sh`: 자동화된 테스트 스크립트

## 🎯 예상 결과

### 성공적인 테스트 결과:
1. **서버 상태**: `{"status":"OK","timestamp":"..."}`
2. **회원가입**: `{"message":"회원가입이 완료되었습니다"}`
3. **로그인**: `{"token":"jwt_token_here","user":{...}}`
4. **MongoDB**: `{ ok: 1 }`

---

**💡 팁**: 테스트 중 문제가 발생하면 서버 로그를 확인하거나 MongoDB 연결 상태를 점검하세요! 