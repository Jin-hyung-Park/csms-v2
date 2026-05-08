# 기여 가이드 (Contributing Guide)

> CSMS v2 프로젝트에 기여하는 방법

---

## 🌿 브랜치 전략

이 프로젝트는 **Git Flow** 기반의 브랜치 전략을 사용합니다.

### 브랜치 구조

```
master (프로덕션)
  └── develop (개발 통합)
       ├── feature/기능명 (새 기능 개발)
       ├── fix/버그명 (버그 수정)
       └── hotfix/긴급수정명 (긴급 수정)
```

### 브랜치 설명

- **master**: 프로덕션 준비 코드 (안정적인 버전만)
- **develop**: 개발 통합 브랜치 (모든 feature가 여기로 병합)
- **feature/***: 새 기능 개발
- **fix/***: 버그 수정
- **hotfix/***: 긴급 프로덕션 버그 수정

---

## 🚀 개발 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/Jin-hyung-Park/csms-v2.git
cd csms-v2
```

### 2. develop 브랜치로 전환

```bash
git checkout develop
git pull origin develop
```

### 3. 새 feature 브랜치 생성

```bash
# 브랜치명 규칙: feature/기능명
git checkout -b feature/salary-calculation
```

### 4. 개발 작업

```bash
# 코드 작성 및 수정
# ...

# 변경사항 커밋
git add .
git commit -m "feat: 주휴수당 계산 로직 추가"
```

### 5. 원격 저장소에 푸시

```bash
git push -u origin feature/salary-calculation
```

### 6. Pull Request 생성

1. GitHub에서 Pull Request 생성
2. Base: `develop` ← Compare: `feature/기능명`
3. PR 제목과 설명 작성
4. 리뷰 요청

---

## 📝 커밋 메시지 규칙

### 커밋 타입

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 수정
- `style`: 코드 포맷팅 (기능 변경 없음)
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드 설정, 패키지 관리 등

### 예시

```bash
feat: 주휴수당 자동 계산 기능 추가
fix: 근무일정 조회 시 날짜 오류 수정
docs: README에 설치 방법 추가
refactor: 급여 계산 로직 개선
test: 점주 API 테스트 추가
```

---

## 🔍 코드 리뷰 프로세스

### Pull Request 작성 시

1. **명확한 제목**
   - 예: `feat: 주휴수당 계산 로직 추가`

2. **상세한 설명**
   - 변경 사항 요약
   - 관련 이슈 번호 (있는 경우)
   - 테스트 방법

3. **체크리스트**
   - [ ] 테스트 통과 확인
   - [ ] 문서 업데이트 (필요한 경우)
   - [ ] 코드 리뷰 요청

### 리뷰어 체크리스트

- [ ] 코드가 프로젝트 스타일 가이드를 따르는가?
- [ ] 테스트가 충분한가?
- [ ] 문서가 업데이트되었는가?
- [ ] 성능에 문제가 없는가?
- [ ] 보안 이슈가 없는가?

---

## 🧪 테스트

### 백엔드 테스트

```bash
cd server
npm test
```

### 프론트엔드 테스트

```bash
cd client
npm test
```

### 모든 테스트 실행

```bash
# 루트 디렉토리에서
cd server && npm test && cd ../client && npm test
```

---

## 📋 코딩 스타일

### JavaScript/Node.js

- ES6+ 문법 사용
- async/await 사용 (Promise 체이닝 지양)
- 의미 있는 변수명 사용
- 함수는 한 가지 일만 수행

### React

- 함수형 컴포넌트 사용
- Hooks 사용 (useState, useEffect 등)
- Props 타입 명시 (필요시)
- 컴포넌트는 작고 재사용 가능하게

### 파일 구조

```
server/src/
├── routes/      # API 라우트
├── models/      # 데이터 모델
├── middleware/  # 미들웨어
└── utils/       # 유틸리티 함수

client/src/
├── pages/       # 페이지 컴포넌트
├── components/  # 재사용 컴포넌트
├── layouts/     # 레이아웃 컴포넌트
└── stores/      # 상태 관리
```

---

## 🐛 버그 리포트

### 버그 발견 시

1. **이슈 생성**
   - GitHub Issues에서 새 이슈 생성
   - 버그 설명, 재현 방법, 예상 동작, 실제 동작 작성

2. **버그 수정**
   - `fix/버그명` 브랜치 생성
   - 수정 후 PR 생성

---

## ✨ 기능 제안

### 새 기능 제안 시

1. **이슈 생성**
   - 기능 설명
   - 사용 사례
   - 구현 아이디어

2. **토론 후 개발**
   - 이슈에서 토론
   - 승인 후 `feature/기능명` 브랜치로 개발

---

## 📚 문서화

### 문서 작성 규칙

- Markdown 형식 사용
- 명확하고 간결하게 작성
- 예시 코드 포함
- 최신 상태 유지

### 문서 위치

- `README.md`: 프로젝트 개요
- `CURRENT_STATUS.md`: 현재 상태
- `BRANCH_STRATEGY.md`: 브랜치 전략
- `LOCAL_TEST_GUIDE.md`: 로컬 테스트 가이드

---

## 🔄 브랜치 병합 규칙

### develop → master

- 주요 마일스톤 달성 시
- 안정적인 버전 릴리스 시
- 모든 테스트 통과 후

### feature → develop

- 기능 개발 완료 후
- 코드 리뷰 완료 후
- 테스트 통과 후

---

## ⚠️ 주의사항

### 절대 하지 말아야 할 것

- ❌ `master` 브랜치에 직접 커밋
- ❌ `develop` 브랜치에 직접 커밋 (feature 브랜치 사용)
- ❌ 커밋 메시지 없이 커밋
- ❌ 테스트 없이 PR 생성

### 권장 사항

- ✅ 작은 단위로 자주 커밋
- ✅ 명확한 커밋 메시지 작성
- ✅ PR 전에 로컬에서 테스트
- ✅ 코드 리뷰 적극 활용

---

## 📞 문의

질문이나 제안사항이 있으시면:

- GitHub Issues 생성
- Pull Request에 코멘트
- 프로젝트 관리자에게 연락

---

**함께 만들어가는 CSMS v2 프로젝트에 기여해주셔서 감사합니다! 🎉**
