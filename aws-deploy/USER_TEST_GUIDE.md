# 사용자 테스트 가이드 (AWS 배포 후)

AWS에 배포한 뒤 테스터/사용자가 접속해 볼 수 있도록 하는 방법입니다.

---

## 1. 배포 실행 (최초 1회)

### 사전 준비

- **AWS CLI** 설치 및 로그인  
  `aws configure` 또는 `aws configure --profile convenience-store`
- **리전**: 서울(`ap-northeast-2`) 권장

### 한 번에 배포

프로젝트 루트에서:

```bash
./aws-deploy/deploy-free-tier.sh
```

또는:

```bash
cd aws-deploy
./deploy-free-tier.sh
```

- EC2 생성, S3 버킷 생성, 프론트 빌드(API URL 자동 반영), S3 업로드, 백엔드 배포까지 자동 진행
- 끝나면 **프론트 URL**, **API URL**, **SSH 접속** 안내가 터미널에 출력됨
- 같은 내용이 프로젝트 루트의 **`deployment-info.txt`** 에 저장됨

### 예상 소요 시간

- 약 **10~15분** (EC2 초기화 대기 포함)

---

## 2. 배포 후 접속 정보 확인

배포가 끝나면 터미널 또는 `deployment-info.txt` 에서 아래를 확인하세요.

| 항목 | 예시 |
|------|------|
| **웹(사용자 테스트용)** | `http://버킷명.s3-website.ap-northeast-2.amazonaws.com` |
| **API** | `http://EC2_퍼블릭_IP/api` |
| **SSH** | `ssh -i aws-deploy/convenience-store-key.pem ubuntu@EC2_IP` |

- 테스터에게는 **웹 URL**만 알려주면 됩니다.
- 로그인/회원가입은 이 웹 주소에서 진행하면 API는 자동으로 위 API 주소로 연결됩니다.

---

## 3. 테스트 계정 (테스터에게 공유)

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| **점주** | owner@test.com | 123456 |
| **직원** | employee@test.com | 123456 |

- **배포 스크립트**가 EC2 배포 시 `createUserTestAccounts.js`를 실행해 위 계정을 자동 생성합니다.
- 계정이 없으면 웹에서 **회원가입**으로 점주 생성 후, 점포·직원을 등록해 테스트하면 됩니다.

### 테스트 계정이 없을 때 (수동 생성)

EC2에 MongoDB가 설치되어 있어야 합니다. user-data로 올린 인스턴스는 보통 자동 기동되나, 실패 시:

```bash
# EC2 SSH 접속 (deployment-info.txt 의 SSH 접속 명령 사용, 키는 aws-deploy/convenience-store-key.pem)
ssh -i aws-deploy/convenience-store-key.pem ubuntu@EC2_IP

# MongoDB 기동 확인
sudo systemctl start mongod
sudo systemctl status mongod

# 앱 디렉터리로 이동 (배포 스크립트는 /var/www/convenience-store 가 아닐 수 있음)
cd /var/www/convenience-store   # 또는 pm2 list 로 확인한 경로
node server/scripts/createUserTestAccounts.js
```

---

## 4. 사용자 테스트 시나리오 (요약)

테스터에게 아래 순서로 안내할 수 있습니다.

1. **접속**: 배포 완료 후 받은 **웹 URL** 로 접속
2. **회원가입/로그인**: 점주 또는 직원 계정으로 로그인
3. **점주**
   - 점포 등록·수정
   - 근무 일정 승인/거절
   - 통계·급여·주휴수당 확인
   - Excel 내보내기
4. **직원**
   - 근무 일정 등록
   - 내 주차별 근로/급여 확인
   - 알림 확인

---

## 5. 배포 상태·문제 확인

### 헬스체크

```bash
# deployment-info.txt 에서 퍼블릭 IP 확인 후
curl http://EC2_퍼블릭_IP/api/health
```

- `{"status":"OK",...}` 이 나오면 API 서버는 정상입니다.

### 서비스 재시작

프로젝트 루트에서:

```bash
./aws-deploy/restart-services.sh
```

- `deployment-info.txt` 와 `convenience-store-key.pem` 위치를 자동으로 찾습니다.

### 로그 확인

```bash
# deployment-info.txt 에서 SSH 접속 명령 확인
ssh -i aws-deploy/convenience-store-key.pem ubuntu@EC2_IP

# 접속 후
pm2 status
pm2 logs convenience-store
sudo systemctl status nginx
sudo systemctl status mongod
```

### 404 Not Found (NoSuchKey) — 페이지 새로고침 시

근로자/점주가 **특정 경로**(예: `/employee/dashboard`)에서 **새로고침**하면 S3가 해당 경로를 파일로 찾다가 없어 404(NoSuchKey)를 반환할 수 있습니다. SPA는 모든 경로를 `index.html`로 넘겨야 합니다.

**해결 (둘 중 하나):**

1. **재배포**  
   `./aws-deploy/deploy-csms-v2.sh` 를 다시 실행하면, 스크립트가 S3 웹사이트 설정을 **에러 문서 = index.html** 로 맞춥니다.

2. **배포 없이 S3만 수정**  
   `deployment-info.txt` 에 있는 **버킷 이름**을 사용해 한 번만 실행:

   ```bash
   BUCKET_NAME="버킷이름"   # deployment-info.txt 의 "버킷 이름:" 값
   aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document index.html
   ```

   이후 해당 경로에서 새로고침하면 `index.html`이 내려가고, 앱이 정상 동작합니다.

### 502 Bad Gateway가 나올 때

1. EC2에 SSH 접속 후 MongoDB 기동:
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```
2. Node 앱 재시작:
   ```bash
   pm2 restart convenience-store
   pm2 logs convenience-store
   ```
3. 테스트 계정 생성:
   ```bash
   cd /var/www/convenience-store
   node server/scripts/createUserTestAccounts.js
   ```

---

## 6. 주의사항

- **비용**: EC2·S3 등 사용량에 따라 소액 과금될 수 있음. 테스트 후 불필요한 인스턴스/버킷은 중지·삭제 권장.
- **보안**: 테스트용 계정 비밀번호(123456)는 실제 서비스에 사용하지 말 것.
- **CORS**: 프론트 URL이 바뀌면 서버 `.env` 의 `CLIENT_URL` 을 새 S3 웹사이트 URL로 맞춰야 할 수 있음 (재배포 스크립트에서 자동 설정됨).

---

**요약**: `./aws-deploy/deploy-free-tier.sh` 실행 → 완료 후 나온 **웹 URL**을 테스터에게 전달 → 위 테스트 계정으로 로그인해 사용자 테스트 진행.
