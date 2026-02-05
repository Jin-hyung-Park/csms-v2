# 🔧 회원가입 오류 해결 가이드

## ✅ 문제 해결 완료!

### 🔍 발견된 문제:
- **API URL 불일치**: 클라이언트에서 `localhost:5000`으로 요청하지만 서버는 `localhost:5001`에서 실행 중

### 🛠️ 수정된 파일들:
1. `client/src/services/authService.js`
2. `client/src/services/ownerService.js`
3. `client/src/services/notificationService.js`
4. `client/src/services/employeeService.js`
5. `client/src/services/workScheduleService.js`

### 📝 수정 내용:
```javascript
// 수정 전
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// 수정 후
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
```

## 🚀 현재 상태

### ✅ 정상 작동 중인 서비스:
- **API 서버**: http://localhost:5001 ✅
- **React 앱**: http://localhost:3000 ✅
- **MongoDB**: 포트 27017 ✅

### ✅ 테스트 완료:
- **회원가입 API**: 정상 작동 ✅
- **로그인 API**: 정상 작동 ✅
- **사용자 정보 조회**: 정상 작동 ✅

## 🌐 브라우저에서 테스트

### 1. 브라우저 새로고침
```
브라우저에서 F5 또는 Cmd+R을 눌러 페이지를 새로고침하세요!
```

### 2. 회원가입 테스트
1. **http://localhost:3000** 접속
2. **회원가입** 버튼 클릭
3. **폼 작성**:
   - 사용자명: `testuser4`
   - 이메일: `test4@example.com`
   - 비밀번호: `password123`
   - 역할: `근로자`
   - 시급: `10000`
   - 세금 신고 유형: `일반`

### 3. 로그인 테스트
1. **로그인** 페이지로 이동
2. **이메일과 비밀번호** 입력
3. **로그인** 버튼 클릭

## 🔧 추가 문제 해결

### 만약 여전히 오류가 발생한다면:

#### 1. 브라우저 캐시 삭제
```
Chrome: Cmd+Shift+Delete
Safari: Cmd+Option+E
Firefox: Cmd+Shift+Delete
```

#### 2. 개발자 도구에서 확인
```
F12 → Console 탭 → 오류 메시지 확인
```

#### 3. 네트워크 탭에서 확인
```
F12 → Network 탭 → API 요청/응답 확인
```

#### 4. 서비스 재시작
```bash
# React 앱 재시작
cd client && npm start

# API 서버 재시작
cd server && node index.js
```

## 📱 모바일에서 테스트

### 같은 Wi-Fi 네트워크에서:
1. **컴퓨터 IP 확인**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **모바일 브라우저에서 접속**:
   ```
   http://[컴퓨터IP]:3000
   ```

## 🎯 예상 결과

### 성공적인 회원가입:
```json
{
  "_id": "6891b53533110523289b1690",
  "username": "testuser4",
  "email": "test4@example.com",
  "role": "employee",
  "hourlyWage": 10000,
  "taxType": "일반",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 성공적인 로그인:
```json
{
  "_id": "6891b53533110523289b1690",
  "username": "testuser4",
  "email": "test4@example.com",
  "role": "employee",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 🚨 문제가 지속되는 경우

### 1. 서버 로그 확인
```bash
# API 서버 프로세스 확인
ps aux | grep "node index.js"

# 포트 사용 확인
lsof -i :5001
```

### 2. 데이터베이스 확인
```bash
# MongoDB 연결 확인
mongosh convenience_store --eval "db.runCommand('ping')"

# 사용자 데이터 확인
mongosh convenience_store --eval "db.users.find()"
```

### 3. 네트워크 연결 확인
```bash
# API 서버 응답 확인
curl http://localhost:5001/api/health

# React 앱 응답 확인
curl http://localhost:3000
```

---

**💡 팁**: 브라우저에서 회원가입을 시도할 때 개발자 도구(F12)를 열어두면 실시간으로 오류를 확인할 수 있습니다! 