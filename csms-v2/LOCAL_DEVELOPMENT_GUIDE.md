# CSMS 버전2 로컬 개발 가이드

> AWS 배포 전 로컬에서 개발 및 테스트하는 것이 **강력히 권장**됩니다.

---

## ✅ 로컬 개발을 권장하는 이유

### 1. **개발 효율성** 🚀

| 항목 | 로컬 개발 | AWS 직접 개발 |
|------|----------|--------------|
| 반복 속도 | 즉시 (1초) | 배포 시간 필요 (2-5분) |
| 디버깅 | 브레이크포인트, 콘솔 로그 | SSH 접속 후 로그 확인 |
| 오류 확인 | 즉시 확인 | 배포 후 확인 |
| 테스트 주기 | 수백 회 가능 | 시간 제약 |

### 2. **비용 절감** 💰

- **로컬**: 무료
- **AWS**: EC2 시간당 비용, 데이터 전송 비용
- 개발 중 실수로 높은 비용 발생 방지

### 3. **안전성** 🔒

- 프로덕션 데이터 손상 위험 없음
- 실험적 기능 테스트 안전
- 롤백이 즉시 가능

### 4. **네트워크 지연 없음** ⚡

- 로컬: 거의 0ms
- AWS: 네트워크 지연 발생

### 5. **오프라인 개발 가능** 📴

- 인터넷 연결 없이도 개발 가능
- AWS 장애와 무관하게 개발 진행

---

## 🛠️ 로컬 개발 환경 설정

### 1단계: MongoDB 설정 (선택지 2가지)

#### 옵션 A: 로컬 MongoDB 설치 (추천 - 간단)

```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0

# Linux (Ubuntu/Debian)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Windows
# MongoDB Community Server 다운로드: https://www.mongodb.com/try/download/community
# 설치 후 Windows 서비스로 실행
```

**확인:**
```bash
mongosh
# 또는
mongo
# MongoDB 쉘에 접속되면 성공
```

#### 옵션 B: MongoDB Atlas 사용 (권장 - 로컬 + AWS 공유)

**장점:**
- 로컬과 AWS에서 동일한 DB 사용
- 별도 설치 불필요
- 무료 512MB 제공

**설정 방법:**

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) 가입
2. 클러스터 생성 (M0 FREE)
3. Network Access: `0.0.0.0/0` 추가 (로컬 접근 허용)
4. Database User 생성
5. Connection String 복사

```bash
# 예시
mongodb+srv://username:password@cluster.mongodb.net/csms_ver2?retryWrites=true&w=majority
```

---

### 2단계: 환경 변수 설정

```bash
# csms-v2/server 디렉토리로 이동
cd csms-v2/server

# .env 파일 생성 (env.example 복사)
cp env.example .env
```

**`.env` 파일 내용:**

```env
# 로컬 MongoDB 사용 시
MONGODB_URI=mongodb://localhost:27017/csms_ver2

# 또는 MongoDB Atlas 사용 시
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/csms_ver2?retryWrites=true&w=majority

PORT=5001
NODE_ENV=development
JWT_SECRET=local-development-secret-key-change-in-production
JWT_EXPIRE=7d
```

**보안 주의사항:**
- `.env` 파일은 절대 Git에 커밋하지 마세요
- 프로덕션 JWT_SECRET은 강력한 랜덤 문자열 사용

---

### 3단계: 클라이언트 환경 변수 설정 (선택)

```bash
# csms-v2/client 디렉토리로 이동
cd csms-v2/client

# .env 파일 생성
cat > .env << EOF
REACT_APP_API_URL=http://localhost:5001
EOF
```

---

### 4단계: 의존성 설치

```bash
# csms-v2 루트 디렉토리에서
cd csms-v2

# 루트 의존성 (concurrently 등)
npm install

# 클라이언트 의존성
cd client
npm install
cd ..

# 서버 의존성
cd server
npm install
cd ..
```

---

### 5단계: 개발 서버 실행

```bash
# csms-v2 루트 디렉토리에서

# 프론트엔드 + 백엔드 동시 실행 (권장)
npm run dev

# 또는 개별 실행
npm run dev:client  # 클라이언트만 (http://localhost:3000)
npm run dev:server  # 서버만 (http://localhost:5001)
```

**접속 URL:**
- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5001/api

---

## 🧪 로컬 테스트 방법

### 1. API 테스트 (Postman 또는 curl)

```bash
# 헬스체크
curl http://localhost:5001/api/health

# 근무일정 조회
curl http://localhost:5001/api/work-schedule

# 근무일정 생성 (POST)
curl -X POST http://localhost:5001/api/work-schedule \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id",
    "storeId": "store-id",
    "workDate": "2025-11-20",
    "startTime": "09:00",
    "endTime": "18:00"
  }'
```

### 2. MongoDB 확인

```bash
# MongoDB 쉘 접속
mongosh

# 또는 (구버전)
mongo

# 데이터베이스 선택
use csms_ver2

# 컬렉션 확인
show collections

# 데이터 조회
db.workschedules.find().pretty()
```

### 3. 프론트엔드 테스트

- 브라우저에서 http://localhost:3000 접속
- React DevTools로 상태 확인
- Network 탭에서 API 요청 확인

---

## 📋 개발 워크플로우

### 권장 개발 프로세스

```
1. 로컬에서 개발
   ↓
2. 로컬에서 테스트
   ↓
3. Git에 커밋 (feature 브랜치)
   ↓
4. 테스트 통과 확인
   ↓
5. AWS에 배포 (main 브랜치 병합 후)
   ↓
6. AWS에서 최종 확인
```

### Git 브랜치 전략 (권장)

```bash
# 기능 개발 브랜치
git checkout -b feature/authentication

# 로컬에서 개발 및 테스트
# ...

# 커밋
git add .
git commit -m "feat: 인증 시스템 구현"

# main 브랜치에 병합 후 AWS 배포
git checkout main
git merge feature/authentication
# AWS 배포 스크립트 실행
```

---

## 🔧 개발 중 유용한 도구

### 1. MongoDB Compass (GUI 도구)

- MongoDB 데이터 시각화
- 쿼리 테스트
- 데이터 편집

**설치:**
- https://www.mongodb.com/products/compass

### 2. Postman / Insomnia

- API 엔드포인트 테스트
- 요청/응답 확인

### 3. React DevTools

- React 컴포넌트 상태 확인
- Props 디버깅

**설치:**
- Chrome 확장 프로그램으로 설치

---

## 🚨 주의사항

### 1. 환경 변수 관리

- ❌ `.env` 파일을 Git에 커밋하지 마세요
- ✅ `.gitignore`에 `.env` 추가 확인
- ✅ `env.example`에는 예시 값만 포함

### 2. 데이터베이스 분리

- **로컬 개발 DB**: `csms_ver2_dev`
- **AWS 프로덕션 DB**: `csms_ver2_prod`
- 환경 변수로 자동 전환

### 3. 포트 충돌 방지

- 로컬: 5001 (서버), 3000 (클라이언트)
- AWS: 5000 (서버), 80 (Nginx)
- 포트가 사용 중이면 변경

```bash
# 포트 사용 확인 (macOS/Linux)
lsof -i :5001
lsof -i :3000

# 사용 중인 프로세스 종료
kill -9 <PID>
```

---

## 📊 로컬 vs AWS 비교

| 항목 | 로컬 개발 | AWS 개발 |
|------|----------|---------|
| **설정 시간** | 10분 | 30분+ |
| **개발 속도** | 빠름 | 느림 (배포 필요) |
| **디버깅** | 쉬움 | 어려움 |
| **비용** | 무료 | 유료 |
| **안전성** | 높음 | 낮음 |
| **실제 환경** | 약간 다름 | 동일 |
| **권장 시점** | 개발 중 | 테스트/배포 시 |

**결론: 개발은 로컬에서, 테스트/배포는 AWS에서!**

---

## 🎯 다음 단계

1. ✅ 로컬 개발 환경 설정 완료
2. ⬜ [API 구현 로드맵](./API_IMPLEMENTATION_ROADMAP.md) 확인
3. ⬜ 미구현 API부터 순차적으로 구현
4. ⬜ 로컬에서 테스트 완료 후 AWS 배포

---

## 💡 팁

### 빠른 MongoDB 재시작

```bash
# macOS
brew services restart mongodb-community@6.0

# Linux
sudo systemctl restart mongod
```

### 데이터베이스 초기화 (테스트용)

```bash
mongosh csms_ver2 --eval "db.dropDatabase()"
```

### 서버 자동 재시작 (nodemon)

이미 설정되어 있습니다! 파일 저장 시 자동으로 서버가 재시작됩니다.

---

## ❓ 문제 해결

### MongoDB 연결 실패

```bash
# MongoDB 실행 확인
brew services list  # macOS
sudo systemctl status mongod  # Linux

# 로그 확인
tail -f /usr/local/var/log/mongodb/mongo.log  # macOS
sudo tail -f /var/log/mongodb/mongod.log  # Linux
```

### 포트 충돌

```bash
# 사용 중인 포트 확인
lsof -i :5001
lsof -i :3000

# 프로세스 종료
kill -9 <PID>
```

### 의존성 설치 오류

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules package-lock.json
npm install
```

---

**이제 로컬에서 안전하고 빠르게 개발하실 수 있습니다! 🚀**

