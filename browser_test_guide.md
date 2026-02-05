# 🌐 브라우저 테스트 가이드

## 🎯 테스트 계정 정보

### ✅ 생성된 테스트 계정:

#### 👤 **직원 계정**
- **이메일**: `employee@test.com`
- **비밀번호**: `123456`
- **역할**: 직원 (employee)
- **시급**: 10,000원
- **세금신고유형**: 미신고

#### 👨‍💼 **점주 계정**
- **이메일**: `owner@test.com`
- **비밀번호**: `123456`
- **역할**: 점주 (owner)

### 🌐 웹 애플리케이션 테스트:
1. **접속**: http://localhost:3000
2. **로그인**: 위의 계정 정보로 로그인
3. **기능 테스트**: 각 계정별 권한에 따른 기능 테스트

## 📋 테스트할 수 있는 URL 목록

### 1. 서버 상태 확인
```
http://localhost:5001/api/health
```

### 2. API 엔드포인트 테스트
다음 URL들을 브라우저에서 직접 접속하여 테스트할 수 있습니다:

#### 기본 API 엔드포인트:
- `http://localhost:5001/api/auth/register` (POST 요청 필요)
- `http://localhost:5001/api/auth/login` (POST 요청 필요)
- `http://localhost:5001/api/employee/dashboard` (인증 필요)
- `http://localhost:5001/api/owner/dashboard` (인증 필요)

## 🛠️ Postman 또는 Insomnia 사용

### Postman Collection 예시:

#### 1. 직원 계정 로그인
```
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "employee@test.com",
  "password": "123456"
}
```

#### 2. 점주 계정 로그인
```
POST http://localhost:5001/api/auth/login
Content-Type: application/json

{
  "email": "owner@test.com",
  "password": "123456"
}
```

#### 3. 사용자 정보 조회
```
GET http://localhost:5001/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## 🔧 개발자 도구 사용

### 브라우저 개발자 도구에서 테스트:

1. **F12** 키를 눌러 개발자 도구 열기
2. **Console** 탭에서 다음 코드 실행:

```javascript
// 서버 상태 확인
fetch('http://localhost:5001/api/health')
  .then(response => response.json())
  .then(data => console.log('서버 상태:', data))
  .catch(error => console.error('오류:', error));

// 직원 계정 로그인 테스트
fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'employee@test.com',
    password: '123456'
  })
})
.then(response => response.json())
.then(data => {
  console.log('로그인 결과:', data);
  // 토큰을 localStorage에 저장
  if (data.token) {
    localStorage.setItem('token', data.token);
    console.log('토큰이 저장되었습니다.');
  }
})
.catch(error => console.error('오류:', error));

// 점주 계정 로그인 테스트
fetch('http://localhost:5001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'owner@test.com',
    password: '123456'
  })
})
.then(response => response.json())
.then(data => {
  console.log('로그인 결과:', data);
  // 토큰을 localStorage에 저장
  if (data.token) {
    localStorage.setItem('token', data.token);
    console.log('토큰이 저장되었습니다.');
  }
})
.catch(error => console.error('오류:', error));
```

## 📱 모바일 테스트

### 같은 네트워크에서 모바일 기기로 테스트:
1. 컴퓨터의 IP 주소 확인: `ifconfig | grep "inet " | grep -v 127.0.0.1`
2. 모바일에서 `http://[컴퓨터IP]:5001/api/health` 접속

## 🎯 단계별 테스트 시나리오

### 시나리오 1: 기본 기능 테스트
1. 브라우저에서 `http://localhost:5001/api/health` 접속
2. JSON 응답 확인: `{"status":"OK","timestamp":"..."}`

### 시나리오 2: 인증 기능 테스트
1. Postman에서 직원 계정 로그인 API 호출
2. 점주 계정 로그인 API 호출하여 토큰 받기
3. 받은 토큰으로 보호된 API 호출

### 시나리오 3: 웹 애플리케이션 테스트
1. http://localhost:3000 접속
2. 직원 계정으로 로그인하여 근무시간 입력
3. 점주 계정으로 로그인하여 근무 승인
4. 직원 계정으로 재로그인하여 승인된 근무시간 확인

### 시나리오 4: 데이터베이스 연동 테스트
1. MongoDB에서 테스트 계정 데이터 확인
2. 로그인 후 세션 정보 확인

## 🚨 문제 해결

### CORS 오류 발생 시:
- 브라우저에서 `http://localhost:5001` 대신 `http://127.0.0.1:5001` 사용

### 연결 거부 오류:
- 서버가 실행 중인지 확인: `ps aux | grep "node index.js"`
- 포트가 사용 중인지 확인: `lsof -i :5001`

### API 응답 오류:
- 브라우저 개발자 도구의 Network 탭에서 요청/응답 확인
- 서버 로그 확인 