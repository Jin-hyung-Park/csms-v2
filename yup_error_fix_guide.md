# 🔧 Yup 스키마 오류 해결 가이드

## ✅ 문제 해결 완료!

### 🔍 발견된 문제:
- **Yup 스키마 오류**: `branch is not a function` 오류
- **원인**: `when` 조건문에서 `then`과 `otherwise` 함수가 올바르게 정의되지 않음

### 🛠️ 수정된 파일:
- `client/src/pages/auth/Register.js`

### 📝 수정 내용:

#### 수정 전 (오류 발생):
```javascript
hourlyWage: Yup.number()
  .min(0, '시급은 0 이상이어야 합니다')
  .when('role', {
    is: 'employee',
    then: Yup.number().required('시급을 입력해주세요'),
  }),
taxType: Yup.string()
  .oneOf(['일반', '청소년', '장애인'], '올바른 세금 신고 유형을 선택해주세요')
  .when('role', {
    is: 'employee',
    then: Yup.string().required('세금 신고 유형을 선택해주세요'),
  }),
```

#### 수정 후 (정상 작동):
```javascript
hourlyWage: Yup.number()
  .min(0, '시급은 0 이상이어야 합니다')
  .when('role', {
    is: 'employee',
    then: (schema) => schema.required('시급을 입력해주세요'),
    otherwise: (schema) => schema.optional(),
  }),
taxType: Yup.string()
  .oneOf(['일반', '청소년', '장애인'], '올바른 세금 신고 유형을 선택해주세요')
  .when('role', {
    is: 'employee',
    then: (schema) => schema.required('세금 신고 유형을 선택해주세요'),
    otherwise: (schema) => schema.optional(),
  }),
```

## 🚀 현재 상태

### ✅ 정상 작동 중인 서비스:
- **API 서버**: http://localhost:5001 ✅
- **React 앱**: http://localhost:3000 ✅
- **Yup 스키마**: 오류 수정 완료 ✅

### ✅ 해결된 문제:
- **Yup 스키마 오류**: `branch is not a function` 해결 ✅
- **조건부 검증**: 역할에 따른 필드 검증 정상 작동 ✅

## 🌐 브라우저에서 테스트

### 1. 브라우저 새로고침
```
브라우저에서 F5 또는 Cmd+R을 눌러 페이지를 새로고침하세요!
```

### 2. 회원가입 테스트
1. **http://localhost:3000** 접속
2. **회원가입** 버튼 클릭
3. **폼 작성**:
   - 사용자명: `testuser5`
   - 이메일: `test5@example.com`
   - 비밀번호: `password123`
   - 비밀번호 확인: `password123`
   - 역할: `근로자`
   - 시급: `10000`
   - 세금 신고 유형: `일반`

### 3. 조건부 검증 테스트
1. **역할을 '점주'로 변경** → 시급과 세금 신고 유형 필드가 사라지는지 확인
2. **역할을 '근로자'로 변경** → 시급과 세금 신고 유형 필드가 나타나는지 확인

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

#### 3. Yup 버전 확인
```bash
cd client && npm list yup
```

#### 4. 의존성 재설치
```bash
cd client && rm -rf node_modules package-lock.json && npm install
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
- **오류 없이 폼 제출**: Yup 스키마 오류가 발생하지 않음
- **조건부 필드**: 역할에 따라 필드가 올바르게 표시/숨김
- **검증 메시지**: 적절한 오류 메시지 표시

### 조건부 검증 동작:
- **근로자 선택 시**: 시급, 세금 신고 유형 필드 필수
- **점주 선택 시**: 시급, 세금 신고 유형 필드 선택사항

## 🚨 문제가 지속되는 경우

### 1. Yup 버전 확인
```bash
cd client && npm list yup
```

### 2. 다른 Yup 스키마 확인
```bash
grep -r "\.when(" client/src/
```

### 3. React 앱 재시작
```bash
cd client && npm start
```

### 4. 개발자 도구에서 오류 확인
```
F12 → Console 탭 → 오류 메시지 확인
```

## 💡 Yup 스키마 모범 사례

### 조건부 검증 올바른 방법:
```javascript
// ✅ 올바른 방법
.when('field', {
  is: 'value',
  then: (schema) => schema.required('필수입니다'),
  otherwise: (schema) => schema.optional(),
})

// ❌ 잘못된 방법
.when('field', {
  is: 'value',
  then: Yup.string().required('필수입니다'),
})
```

---

**💡 팁**: Yup 스키마에서 `when` 조건문을 사용할 때는 항상 `then`과 `otherwise` 함수를 명시적으로 정의해야 합니다! 