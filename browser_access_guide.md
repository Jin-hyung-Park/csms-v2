# 🌐 웹브라우저 접속 가이드

## 🚀 현재 실행 중인 서비스

### ✅ 백엔드 API 서버
- **URL**: http://localhost:5001
- **상태**: 정상 실행 중
- **API 엔드포인트**: http://localhost:5001/api/health

### ✅ 프론트엔드 React 앱
- **URL**: http://localhost:3000
- **상태**: 정상 실행 중
- **웹 애플리케이션**: CSMS

## 📱 브라우저에서 접속하기

### 1. 메인 웹 애플리케이션
```
http://localhost:3000
```

### 2. API 서버 상태 확인
```
http://localhost:5001/api/health
```

## 🎯 접속 방법

### 방법 1: 직접 브라우저에서 접속
1. **웹 브라우저 열기** (Chrome, Safari, Firefox 등)
2. **주소창에 입력**: `http://localhost:3000`
3. **Enter 키 누르기**

### 방법 2: 터미널에서 브라우저 열기
```bash
# macOS에서 기본 브라우저로 열기
open http://localhost:3000

# 또는 Chrome으로 열기
open -a "Google Chrome" http://localhost:3000
```

### 방법 3: API 테스트용 브라우저 접속
```
http://localhost:5001/api/health
```

## 🏠 웹 애플리케이션 기능

### 로그인 페이지
- **URL**: http://localhost:3000/login
- **기능**: 사용자 로그인

### 회원가입 페이지
- **URL**: http://localhost:3000/register
- **기능**: 새 사용자 등록

### 직원 대시보드
- **URL**: http://localhost:3000/employee/dashboard
- **기능**: 직원용 메인 페이지

### 관리자 대시보드
- **URL**: http://localhost:3000/owner/dashboard
- **기능**: 관리자용 메인 페이지

## 🔧 문제 해결

### 브라우저에서 접속이 안 되는 경우:

#### 1. 포트 확인
```bash
# React 앱 포트 확인
lsof -i :3000

# API 서버 포트 확인
lsof -i :5001
```

#### 2. 서비스 재시작
```bash
# React 앱 재시작
cd client && npm start

# API 서버 재시작
cd server && node index.js
```

#### 3. 방화벽 확인
- macOS 시스템 환경설정 → 보안 및 개인정보 보호 → 방화벽

### CORS 오류가 발생하는 경우:
- 브라우저에서 `http://127.0.0.1:3000` 사용
- 또는 `http://localhost:3000` 사용

## 📱 모바일에서 접속

### 같은 Wi-Fi 네트워크에서:
1. **컴퓨터 IP 주소 확인**:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```

2. **모바일 브라우저에서 접속**:
   ```
   http://[컴퓨터IP]:3000
   ```

## 🎨 웹 애플리케이션 스크린샷

### 메인 페이지
- 로그인/회원가입 폼
- 반응형 디자인
- Material-UI 컴포넌트

### 대시보드
- 직원: 근무 일정, 알림
- 관리자: 직원 관리, 통계

## 🚀 빠른 시작

### 1. 브라우저 열기
### 2. 주소창에 입력: `http://localhost:3000`
### 3. CSMS 사용 시작!

---

**💡 팁**: 웹 애플리케이션에서 문제가 발생하면 브라우저의 개발자 도구(F12)를 열어 콘솔 로그를 확인하세요! 