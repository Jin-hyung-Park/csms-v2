# 브랜치 전략 가이드

> CSMS v2 프로젝트 브랜치 관리 전략

---

## 🌿 권장 브랜치 전략

### 브랜치 구조

```
master (main)
  └── develop
       ├── feature/salary-calculation
       ├── feature/salary-confirmation
       ├── feature/user-model-extension
       └── fix/bug-description
```

### 브랜치 설명

1. **master (main)**
   - 프로덕션 준비 코드
   - 안정적인 버전만 유지
   - 직접 커밋하지 않음 (merge만)

2. **develop**
   - 개발 통합 브랜치
   - 모든 feature 브랜치가 여기로 병합
   - 테스트 완료 후 master로 병합

3. **feature/***
   - 새 기능 개발 브랜치
   - 예: `feature/salary-calculation`, `feature/notification-system`
   - develop에서 분기, develop로 병합

4. **fix/***
   - 버그 수정 브랜치
   - 예: `fix/login-error`, `fix/schedule-bug`
   - develop에서 분기, develop로 병합

5. **hotfix/***
   - 긴급 프로덕션 버그 수정
   - master에서 분기, master와 develop 모두로 병합

---

## 🚀 브랜치 전략 설정

### 1. develop 브랜치 생성

```bash
# develop 브랜치 생성 및 전환
git checkout -b develop

# 원격 저장소에 푸시
git push -u origin develop
```

### 2. 기본 브랜치를 develop으로 설정 (선택사항)

GitHub에서 기본 브랜치를 develop으로 변경할 수 있습니다:
- Settings → Branches → Default branch 변경

---

## 📋 개발 워크플로우

### 새 기능 개발 시

```bash
# 1. develop 브랜치로 전환
git checkout develop

# 2. 최신 코드 가져오기
git pull origin develop

# 3. 새 feature 브랜치 생성
git checkout -b feature/salary-calculation

# 4. 개발 작업
# ... 코드 작성 ...

# 5. 커밋
git add .
git commit -m "feat: 주휴수당 계산 로직 추가"

# 6. 원격 저장소에 푸시
git push -u origin feature/salary-calculation

# 7. GitHub에서 Pull Request 생성
# base: develop ← compare: feature/salary-calculation
```

### 기능 완료 후 병합

```bash
# 1. GitHub에서 Pull Request 생성 및 리뷰
# 2. PR 승인 후 merge
# 3. 로컬에서 develop 업데이트
git checkout develop
git pull origin develop

# 4. 완료된 feature 브랜치 삭제
git branch -d feature/salary-calculation
git push origin --delete feature/salary-calculation
```

### 버그 수정 시

```bash
# 1. develop에서 fix 브랜치 생성
git checkout develop
git checkout -b fix/schedule-bug

# 2. 버그 수정 및 커밋
git add .
git commit -m "fix: 근무일정 조회 오류 수정"

# 3. 푸시 및 PR 생성
git push -u origin fix/schedule-bug
```

---

## 🎯 현재 프로젝트에 적용할 브랜치

### 다음 개발 항목별 브랜치

1. **급여 계산 로직 완성**
   ```bash
   git checkout -b feature/salary-calculation
   ```
   - 주휴수당 계산
   - 세금 계산
   - MonthlySalary 모델

2. **급여 확정 프로세스**
   ```bash
   git checkout -b feature/salary-confirmation
   ```
   - 3단계 프로세스 (산정/수정/확정)

3. **User 모델 확장**
   ```bash
   git checkout -b feature/user-model-extension
   ```
   - 시급, 근무 스케줄, 세금 정보 필드 추가

4. **알림 시스템 완성**
   ```bash
   git checkout -b feature/notification-system
   ```
   - Notification 모델
   - 알림 생성 로직

---

## ✅ 브랜치 사용의 장점

### 1. 안전한 개발
- ✅ master 브랜치를 안정적으로 유지
- ✅ 실험적인 기능을 독립적으로 개발
- ✅ 버그 수정과 기능 개발 분리

### 2. 협업 용이
- ✅ 여러 기능을 동시에 개발 가능
- ✅ Pull Request를 통한 코드 리뷰
- ✅ 충돌 최소화

### 3. 버전 관리
- ✅ 각 기능의 개발 이력 추적
- ✅ 필요시 특정 기능 롤백 가능
- ✅ 릴리스 관리 용이

---

## 🔄 브랜치 전환 팁

### 현재 브랜치 확인
```bash
git branch
# 또는
git status
```

### 브랜치 전환
```bash
git checkout develop
# 또는 (Git 2.23+)
git switch develop
```

### 작업 중인 내용 임시 저장
```bash
# 현재 작업 임시 저장
git stash

# 다른 브랜치로 전환
git checkout develop

# 작업 복원
git stash pop
```

---

## 📊 브랜치 상태 확인

### 모든 브랜치 보기
```bash
# 로컬 브랜치
git branch

# 원격 브랜치 포함
git branch -a

# 그래프로 보기
git log --oneline --graph --all
```

### 브랜치 비교
```bash
# develop과 feature 브랜치 차이
git diff develop..feature/salary-calculation

# 커밋 차이
git log develop..feature/salary-calculation
```

---

## ⚠️ 주의사항

### 1. 브랜치 네이밍 규칙
- ✅ `feature/기능명` - 기능 개발
- ✅ `fix/버그명` - 버그 수정
- ✅ `hotfix/긴급수정명` - 긴급 수정
- ❌ 의미 없는 이름 사용 금지

### 2. 브랜치 병합 전 확인
- ✅ 테스트 통과 확인
- ✅ 코드 리뷰 완료
- ✅ 충돌 해결 완료

### 3. 오래된 브랜치 정리
```bash
# 로컬 브랜치 삭제
git branch -d feature/old-feature

# 원격 브랜치 삭제
git push origin --delete feature/old-feature
```

---

## 🎯 권장 사항

### 지금 바로 시작하기

1. **develop 브랜치 생성** (권장)
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

2. **다음 기능 개발 시 feature 브랜치 사용**
   ```bash
   git checkout develop
   git checkout -b feature/salary-calculation
   ```

3. **master는 안정적인 버전만 유지**
   - 주요 마일스톤 달성 시에만 merge

### 단순한 프로젝트라면?

혼자 개발하거나 작은 프로젝트라면:
- ✅ `master` 브랜치만 사용해도 무방
- ✅ 기능별로 커밋만 잘 구분하면 됨
- ✅ 나중에 필요하면 브랜치 추가 가능

---

## 📚 참고 자료

- [Git Branching 전략](https://git-scm.com/book/en/v2/Git-Branching-Branching-Workflows)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

**브랜치 전략 선택 가이드:**

- **혼자 개발 + 빠른 개발**: master만 사용
- **협업 또는 안정성 중시**: develop + feature 브랜치 사용
- **대규모 프로젝트**: Git Flow 전략 사용
