# EC2 접속이 되지 않을 때

SSH 또는 서비스 접속이 안 될 때 아래를 순서대로 확인하세요.

---

## 1. SSH 접속 불가 (Connection refused / timeout)

### 1) EC2 인스턴스 상태 확인

```bash
# 로컬 Mac에서 (AWS CLI 설정됐을 때)
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=convenience-store*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PublicIpAddress]' \
  --output table
```

- **running**이 아니면 인스턴스가 꺼져 있음 → AWS 콘솔에서 인스턴스 시작.
- **PublicIpAddress**가 바뀌었을 수 있음(재부팅 시). 위에서 나온 IP로 다시 접속.

### 2) 퍼블릭 IP 변경 여부

인스턴스를 중지했다가 다시 켜면 **퍼블릭 IP가 바뀝니다.**  
예전에 쓰던 `3.34.96.132`가 아니라, 위 명령으로 나온 **현재 PublicIpAddress**로 접속해야 합니다.

```bash
ssh -i convenience-store-key.pem ubuntu@<현재_퍼블릭_IP>
```

### 3) 키 파일 경로와 권한

```bash
# 키 경로 (csms-v2/server에 있을 때)
cd /Users/Jinhyung_1/01.\ 개인/convenience_store_management/csms-v2/server
chmod 400 convenience-store-key.pem
ssh -i convenience-store-key.pem ubuntu@<EC2_IP>
```

### 4) 보안 그룹(22번 포트)

- AWS 콘솔 → EC2 → 해당 인스턴스 → 보안 그룹
- **인바운드**에 **SSH(22)** 가 있고, 출처가 **내 IP** 또는 **0.0.0.0/0**인지 확인.

---

## 2. 계정이 안 보일 때 – csms-v2 vs 예전 server / DB 확인

**지금 EC2에서 돌아가는 게 예전 server인지, csms-v2인지에 따라 DB가 다릅니다.**

| 구분 | 예전 server | csms-v2 |
|------|-------------|---------|
| DB 이름 | `convenience_store` | `csms_ver2` |
| User 필드 | username, email | name, email |

- EC2 `.env`에 `MONGODB_URI=.../convenience_store` 만 있으면, **예전 server**가 그 DB를 쓰는 경우가 많습니다.
- **실제 서비스가 csms-v2**(S3 프론트가 csms-v2 빌드)라면, 백엔드가 **csms_ver2** DB를 쓰도록 배포됐을 수 있습니다.

**EC2에서 사용자 목록 확인 (어느 DB에 데이터가 있는지):**

```bash
cd ~/server

# 1) 현재 .env 기준 DB (보통 convenience_store)
node scripts/list-users.js

# 2) csms-v2 DB도 확인
node scripts/list-users.js csms_ver2
```

- `list-users.js`는 **convenience_store_management/server/scripts/** 에 있으므로, 위처럼 scp로 EC2 `~/server/scripts/`에 넣어 두고 실행하면 됩니다.
- **csms_ver2**에만 계정이 있으면: 실제 서비스는 csms-v2 기준입니다. 비밀번호 재설정은 EC2에 **csms-v2 서버 코드**가 있을 때 `MONGODB_URI=mongodb://localhost:27017/csms_ver2 node scripts/reset-password.js 이메일 새비밀번호` 로 실행하거나, 로컬에서 MongoDB Atlas 등으로 **csms_ver2**에 연결 가능할 때 같은 방식으로 실행하면 됩니다.

---

## 3. 접속 가능해지면 – 계정 확인/비밀번호 재설정

EC2에 올라간 코드가 **예전 server** 구조(`convenience_store_management/server`)이면 아래 스크립트는 그 구조에 맞습니다.

### 스크립트 위치 (로컬)

- `convenience_store_management/server/scripts/check-user.js`
- `convenience_store_management/server/scripts/reset-password.js`

### EC2에 스크립트 올리기

**방법 A: scp로 복사**

```bash
# 로컬에서 (server가 convenience_store_management/server 기준)
cd /Users/Jinhyung_1/01.\ 개인/convenience_store_management
scp -i server/convenience-store-key.pem server/scripts/check-user.js server/scripts/reset-password.js ubuntu@<EC2_퍼블릭_IP>:~/server/scripts/
```

**방법 B: 배포 시 server 폴더에 포함**

배포할 때 위 두 파일이 `server/scripts/` 안에 포함되도록 하면 EC2에도 같이 올라갑니다.

### EC2에서 실행

```bash
# SSH 접속 후
cd ~/server

# 계정 존재 여부 확인 (이메일 지정 가능)
node scripts/check-user.js yhs3571@naver.com

# 비밀번호 재설정
node scripts/reset-password.js yhs3571@naver.com 새비밀번호
```

EC2의 `~/.env` 또는 `~/server/.env`에 `MONGODB_URI=mongodb://localhost:27017/convenience_store` 가 있으면 그대로 사용됩니다.

---

## 3. 요약

| 증상 | 확인 사항 |
|------|-----------|
| SSH 연결 안 됨 | 인스턴스 running 여부, **현재 퍼블릭 IP**, 보안 그룹 22번 포트 |
| IP 변경됨 | `aws ec2 describe-instances` 로 현재 PublicIpAddress 확인 후 해당 IP로 SSH |
| 스크립트 없음 | `server/scripts/check-user.js`, `reset-password.js` 를 scp로 EC2 `~/server/scripts/`에 복사 |
