# MongoDB Atlas 무료 설정 가이드

## 🚀 5분 안에 완료하기

### 1단계: MongoDB Atlas 가입 (1분)

1. https://www.mongodb.com/cloud/atlas/register 접속
2. Google 계정으로 가입 (또는 이메일 가입)
3. 무료 티어 선택

### 2단계: 클러스터 생성 (2분)

1. "Build a Database" 클릭
2. **M0 FREE** 선택 (512MB 무료)
3. 클라우드 제공자: **AWS**
4. 리전: **Seoul (ap-northeast-2)** 선택
5. Cluster Name: `convenience-store`
6. "Create" 클릭

### 3단계: 보안 설정 (1분)

1. **Database Access** (데이터베이스 액세스)
   - "Add New Database User" 클릭
   - Username: `storeAdmin`
   - Password: 자동 생성 (저장하세요!)
   - Database User Privileges: `Read and write to any database`
   - "Add User" 클릭

2. **Network Access** (네트워크 액세스)
   - "Add IP Address" 클릭
   - "Allow Access from Anywhere" 클릭 (0.0.0.0/0)
   - "Confirm" 클릭

### 4단계: 연결 문자열 복사 (1분)

1. "Databases" 탭으로 이동
2. 클러스터에서 "Connect" 클릭
3. "Connect your application" 선택
4. Driver: `Node.js`, Version: `4.1 or later`
5. 연결 문자열 복사:
   ```
   mongodb+srv://storeAdmin:<password>@convenience-store.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. `<password>`를 실제 비밀번호로 교체

### 5단계: EC2 환경 변수 업데이트

복사한 연결 문자열로 EC2의 `.env` 파일을 업데이트합니다.

---

## 📝 빠른 실행 명령어

MongoDB Atlas 연결 문자열을 준비한 후:

```bash
# 연결 문자열 예시
MONGODB_URI="mongodb+srv://storeAdmin:YOUR_PASSWORD@convenience-store.xxxxx.mongodb.net/convenience_store?retryWrites=true&w=majority"
```

---

## ✅ 장점

- 💰 **무료**: 512MB 영구 무료
- 🔒 **보안**: 자동 암호화
- 📊 **모니터링**: 실시간 대시보드
- 💾 **백업**: 자동 백업
- ⚡ **성능**: AWS Seoul 리전
- 🚀 **확장**: 필요시 쉽게 업그레이드

---

## 🔧 자동 설정 스크립트

MongoDB Atlas 연결 문자열을 준비했다면:

```bash
# EC2 IP와 MongoDB URI를 변수로 설정
EC2_IP="54.180.88.34"
MONGODB_URI="mongodb+srv://..."

# 스크립트 실행
./setup-mongodb-atlas.sh "$EC2_IP" "$MONGODB_URI"
```

---

## 💡 MongoDB Atlas vs EC2 MongoDB

| 항목 | MongoDB Atlas | EC2 MongoDB |
|------|---------------|-------------|
| 비용 | 무료 (512MB) | EC2 메모리 사용 |
| 관리 | 자동 | 수동 |
| 백업 | 자동 | 직접 설정 |
| 모니터링 | 내장 | 별도 설치 |
| 보안 | 자동 업데이트 | 직접 관리 |
| 성능 | 최적화됨 | 제한적 |

**결론**: MongoDB Atlas 사용 권장! 🌟

