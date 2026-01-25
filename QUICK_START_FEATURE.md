# Feature 브랜치 빠른 시작 가이드

> 새 기능 개발을 위한 빠른 시작 가이드

---

## 🚀 새 기능 개발 시작하기

### 1. develop 브랜치로 전환 및 최신 코드 가져오기

```bash
git checkout develop
git pull origin develop
```

### 2. 새 feature 브랜치 생성

```bash
# 브랜치명 규칙: feature/기능명
git checkout -b feature/salary-calculation
```

### 3. 개발 작업

```bash
# 코드 작성 및 수정
# ...

# 변경사항 커밋
git add .
git commit -m "feat: 주휴수당 계산 로직 추가"
```

### 4. 원격 저장소에 푸시

```bash
git push -u origin feature/salary-calculation
```

### 5. GitHub에서 Pull Request 생성

1. GitHub 저장소 접속: https://github.com/Jin-hyung-Park/csms-v2
2. "Compare & pull request" 버튼 클릭
3. Base: `develop` ← Compare: `feature/salary-calculation`
4. PR 제목과 설명 작성
5. 리뷰 요청

---

## 📋 다음 개발 항목별 브랜치 예시

### 급여 계산 로직 완성

```bash
git checkout develop
git checkout -b feature/salary-calculation
```

**작업 내용:**
- 주휴수당 자동 계산
- 세금 계산 로직
- MonthlySalary 모델 생성

### 급여 확정 프로세스

```bash
git checkout develop
git checkout -b feature/salary-confirmation
```

**작업 내용:**
- 3단계 프로세스 (산정/수정/확정)
- 확정 후 수정 불가 로직

### User 모델 확장

```bash
git checkout develop
git checkout -b feature/user-model-extension
```

**작업 내용:**
- 시급 필드 추가
- 근무 스케줄 필드 추가
- 세금 정보 필드 추가

### 알림 시스템 완성

```bash
git checkout develop
git checkout -b feature/notification-system
```

**작업 내용:**
- Notification 모델 생성
- 알림 생성 로직
- 실시간 알림 (선택사항)

---

## 🔄 작업 중 다른 브랜치로 전환해야 할 때

### 현재 작업 임시 저장

```bash
# 변경사항 임시 저장
git stash

# 다른 브랜치로 전환
git checkout develop

# 작업 복원
git checkout feature/salary-calculation
git stash pop
```

---

## ✅ 기능 완료 후 병합

### 1. 최종 커밋 및 푸시

```bash
git add .
git commit -m "feat: 주휴수당 계산 로직 완성"
git push origin feature/salary-calculation
```

### 2. GitHub에서 Pull Request 생성

- Base: `develop`
- Compare: `feature/salary-calculation`
- 리뷰 요청

### 3. PR 승인 후 병합

- GitHub에서 "Merge pull request" 클릭
- feature 브랜치 삭제 (선택사항)

### 4. 로컬 정리

```bash
# develop으로 전환
git checkout develop

# 최신 코드 가져오기
git pull origin develop

# 완료된 feature 브랜치 삭제
git branch -d feature/salary-calculation
```

---

## 🐛 버그 수정 시

```bash
# develop에서 fix 브랜치 생성
git checkout develop
git checkout -b fix/schedule-bug

# 버그 수정
# ...

# 커밋 및 푸시
git add .
git commit -m "fix: 근무일정 조회 오류 수정"
git push -u origin fix/schedule-bug

# PR 생성 (develop으로)
```

---

## 💡 팁

### 커밋 메시지 예시

```bash
# 좋은 예
git commit -m "feat: 주휴수당 자동 계산 기능 추가"
git commit -m "fix: 근무일정 날짜 필터링 오류 수정"
git commit -m "docs: README에 설치 방법 추가"

# 나쁜 예
git commit -m "수정"
git commit -m "업데이트"
git commit -m "asdf"
```

### 작은 단위로 자주 커밋

```bash
# 한 번에 많은 변경사항을 커밋하지 말고
# 논리적인 단위로 나눠서 커밋

git commit -m "feat: 주휴수당 계산 함수 추가"
git commit -m "feat: 주휴수당 계산 API 엔드포인트 추가"
git commit -m "test: 주휴수당 계산 테스트 추가"
```

---

**이제 feature 브랜치로 안전하게 개발할 수 있습니다! 🎉**
