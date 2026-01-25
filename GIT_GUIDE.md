# Git 사용 가이드

> CSMS v2 프로젝트 Git 저장소 관리 가이드

---

## ✅ 현재 상태

Git 저장소가 성공적으로 초기화되었습니다!

- ✅ Git 저장소 초기화 완료
- ✅ .gitignore 파일 설정 완료
- ✅ 모든 소스 파일 커밋 완료 (2개 커밋)

### 커밋 내역

1. **Initial commit** - 프로젝트 기본 구조 및 서버 코드
2. **Add client directory files** - 클라이언트 React 애플리케이션

---

## 📋 .gitignore 설정

다음 항목들이 Git에서 제외됩니다:

- `node_modules/` - 의존성 패키지
- `.env` - 환경 변수 파일 (민감한 정보)
- `build/`, `dist/` - 빌드 결과물
- `*.log` - 로그 파일
- `.DS_Store` - macOS 시스템 파일
- `coverage/` - 테스트 커버리지

---

## 🚀 기본 Git 명령어

### 현재 상태 확인

```bash
# 변경된 파일 확인
git status

# 커밋 히스토리 확인
git log --oneline

# 파일 변경 내용 확인
git diff
```

### 변경사항 커밋

```bash
# 변경된 파일 스테이징
git add .

# 또는 특정 파일만
git add server/src/routes/owner.route.js

# 커밋 생성
git commit -m "커밋 메시지"

# 예시
git commit -m "feat: 급여 계산 로직 추가"
```

### 커밋 메시지 컨벤션 (권장)

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가/수정
chore: 빌드 설정 등 기타 작업
```

---

## 🔗 원격 저장소 연결

### GitHub에 저장소 생성 후 연결

1. **GitHub에서 새 저장소 생성**
   - GitHub.com 접속
   - "New repository" 클릭
   - 저장소 이름 입력 (예: `csms-v2`)
   - Public 또는 Private 선택
   - "Create repository" 클릭

2. **로컬 저장소와 연결**

```bash
# 원격 저장소 추가
git remote add origin https://github.com/사용자명/csms-v2.git

# 또는 SSH 사용
git remote add origin git@github.com:사용자명/csms-v2.git

# 원격 저장소 확인
git remote -v
```

3. **코드 푸시**

```bash
# 첫 푸시 (main 또는 master 브랜치)
git push -u origin master

# 또는 main 브랜치 사용 시
git branch -M main
git push -u origin main
```

---

## 🌿 브랜치 관리

### 브랜치 생성 및 전환

```bash
# 새 브랜치 생성
git checkout -b feature/salary-calculation

# 또는 (Git 2.23+)
git switch -c feature/salary-calculation

# 브랜치 목록 확인
git branch

# 브랜치 전환
git checkout feature/salary-calculation
# 또는
git switch feature/salary-calculation
```

### 브랜치 병합

```bash
# main 브랜치로 전환
git checkout main

# feature 브랜치 병합
git merge feature/salary-calculation

# 병합 후 브랜치 삭제
git branch -d feature/salary-calculation
```

---

## 📤 자주 사용하는 워크플로우

### 1. 새 기능 개발

```bash
# 1. 새 브랜치 생성
git checkout -b feature/new-feature

# 2. 코드 작성 및 수정
# ...

# 3. 변경사항 커밋
git add .
git commit -m "feat: 새 기능 추가"

# 4. 원격 저장소에 푸시
git push origin feature/new-feature

# 5. GitHub에서 Pull Request 생성
```

### 2. 버그 수정

```bash
# 1. 버그 수정 브랜치 생성
git checkout -b fix/bug-description

# 2. 버그 수정
# ...

# 3. 커밋
git add .
git commit -m "fix: 버그 설명"

# 4. 푸시 및 PR 생성
git push origin fix/bug-description
```

### 3. 문서 업데이트

```bash
# 1. 문서 수정
# ...

# 2. 커밋
git add .
git commit -m "docs: README 업데이트"

# 3. 푸시
git push origin master
```

---

## 🔄 원격 저장소와 동기화

### 최신 변경사항 가져오기

```bash
# 원격 저장소의 변경사항 가져오기
git fetch origin

# 가져온 변경사항 확인
git log origin/master..HEAD

# 원격 변경사항 병합
git pull origin master
```

### 충돌 해결

```bash
# 충돌 발생 시
git pull origin master

# 충돌 파일 수정 후
git add .
git commit -m "merge: 충돌 해결"
```

---

## 📊 유용한 Git 명령어

### 히스토리 확인

```bash
# 간단한 로그
git log --oneline

# 그래프 형태로 보기
git log --oneline --graph --all

# 특정 파일의 변경 이력
git log --oneline -- server/src/routes/owner.route.js

# 변경 내용 확인
git show 커밋해시
```

### 변경사항 되돌리기

```bash
# 마지막 커밋 취소 (변경사항 유지)
git reset --soft HEAD~1

# 마지막 커밋 취소 (변경사항 삭제)
git reset --hard HEAD~1

# 특정 파일만 되돌리기
git checkout HEAD -- 파일경로
```

### 임시 저장

```bash
# 작업 중인 내용 임시 저장
git stash

# 임시 저장 목록 확인
git stash list

# 임시 저장 내용 복원
git stash pop
```

---

## ⚠️ 주의사항

### 절대 커밋하지 말아야 할 것

- ❌ `.env` 파일 (환경 변수, 비밀키)
- ❌ `node_modules/` (의존성 패키지)
- ❌ 빌드 결과물 (`build/`, `dist/`)
- ❌ 개인 설정 파일
- ❌ 임시 파일

### 커밋 전 확인사항

- ✅ `.gitignore`에 민감한 정보가 제외되어 있는지 확인
- ✅ 테스트가 통과하는지 확인
- ✅ 불필요한 파일이 포함되지 않았는지 확인
- ✅ 커밋 메시지가 명확한지 확인

---

## 🎯 다음 단계

1. **원격 저장소 생성 및 연결**
   ```bash
   git remote add origin <저장소_URL>
   git push -u origin master
   ```

2. **브랜치 전략 수립**
   - `main/master`: 프로덕션 코드
   - `develop`: 개발 브랜치
   - `feature/*`: 기능 개발 브랜치
   - `fix/*`: 버그 수정 브랜치

3. **협업 규칙 설정**
   - 커밋 메시지 컨벤션
   - 코드 리뷰 프로세스
   - Pull Request 템플릿

---

## 📚 추가 리소스

- [Git 공식 문서](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Pro Git Book](https://git-scm.com/book)

---

**Git 저장소 준비 완료! 🎉**

이제 안전하게 코드를 관리하고 버전을 추적할 수 있습니다.
