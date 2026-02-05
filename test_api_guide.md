# CSMS API 테스트 가이드

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

### 🌐 웹 브라우저 테스트:
1. **접속**: http://localhost:3000
2. **로그인**: 위의 계정 정보로 로그인
3. **테스트**: 각 계정별 기능 테스트

### 📱 API 테스트:
아래 curl 명령어에서 `YOUR_JWT_TOKEN`을 실제 로그인 후 받은 토큰으로 교체하세요.

## 🚀 시스템 상태 확인

### 1. 서버 상태 확인
```bash
curl http://localhost:5001/api/health
```
**예상 응답:**
```json
{"status":"OK","timestamp":"2025-08-05T06:52:44.808Z"}
```

## 🔐 인증 API 테스트

### 2. 회원가입 테스트
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

### 3. 로그인 테스트

#### 직원 계정으로 로그인:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "employee@test.com",
    "password": "123456"
  }'
```

#### 점주 계정으로 로그인:
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@test.com",
    "password": "123456"
  }'
```

### 4. 사용자 정보 조회 (토큰 필요)
```bash
# 위의 로그인 응답에서 받은 토큰을 사용
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 👥 직원 API 테스트

### 5. 직원 대시보드 조회
```bash
curl -X GET http://localhost:5001/api/employee/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. 근무 일정 조회
```bash
curl -X GET http://localhost:5001/api/work-schedule \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 7. 근무 일정 생성
```bash
curl -X POST http://localhost:5001/api/work-schedule \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "date": "2025-08-06",
    "startTime": "09:00",
    "endTime": "17:00",
    "type": "regular"
  }'
```

## 📢 알림 API 테스트

### 8. 알림 목록 조회
```bash
curl -X GET http://localhost:5001/api/notifications \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 9. 알림 생성 (관리자용)
```bash
curl -X POST http://localhost:5001/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "테스트 알림",
    "message": "이것은 테스트 알림입니다.",
    "type": "info",
    "recipients": ["all"]
  }'
```

## 👨‍💼 관리자 API 테스트

### 10. 관리자 대시보드
```bash
curl -X GET http://localhost:5001/api/owner/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 11. 직원 관리
```bash
curl -X GET http://localhost:5001/api/owner/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 12. 통계 조회
```bash
curl -X GET http://localhost:5001/api/owner/statistics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🧪 브라우저에서 테스트

### 웹 브라우저에서 직접 테스트:
1. **서버 상태 확인**: http://localhost:5001/api/health
2. **API 문서**: http://localhost:5001/api/docs (Swagger UI가 설정된 경우)

## 📊 데이터베이스 확인

### MongoDB 직접 접속:
```bash
mongosh convenience_store
```

### 데이터베이스 상태 확인:
```bash
mongosh convenience_store --eval "db.stats()"
```

### 사용자 컬렉션 확인:
```bash
mongosh convenience_store --eval "db.users.find()"
```

## 🔧 문제 해결

### 서버 재시작:
```bash
# 서버 프로세스 종료
pkill -f "node index.js"

# 서버 재시작
cd server && node index.js
```

### MongoDB 재시작:
```bash
brew services restart mongodb/brew/mongodb-community
```

### 로그 확인:
```bash
# MongoDB 로그
tail -f /usr/local/var/log/mongodb/mongo.log

# 서버 로그 (터미널에서 직접 확인)
```

## 📝 테스트 시나리오

### 기본 테스트 플로우:
1. 서버 상태 확인
2. 테스트 계정으로 로그인
3. 토큰으로 보호된 API 호출
4. 데이터 생성/조회/수정/삭제

### 권한별 테스트:

#### 👤 **직원 계정 테스트** (`employee@test.com`):
- 근무 일정 관리 (입력, 수정, 삭제)
- 알림 확인
- 개인 정보 조회

#### 👨‍💼 **점주 계정 테스트** (`owner@test.com`):
- 직원 관리 (목록 조회, 정보 수정)
- 근무 승인/거절
- 통계 조회
- 알림 생성 및 관리

### 🎯 추천 테스트 순서:
1. **직원 계정으로 로그인** → 근무시간 입력 → 로그아웃
2. **점주 계정으로 로그인** → 근무 승인 → 통계 확인 → 로그아웃
3. **직원 계정으로 재로그인** → 승인된 근무시간 확인 