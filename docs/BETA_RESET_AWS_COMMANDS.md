# AWS에서 베타 리셋 실행 명령어 가이드

배포 가이드를 기반으로 실제 실행 가능한 명령어입니다.

## 🔍 1단계: EC2 인스턴스 정보 확인

먼저 현재 실행 중인 EC2 인스턴스를 확인합니다.

```bash
# 실행 중인 EC2 인스턴스 목록 확인
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0],PublicIpAddress,PrivateIpAddress]' \
  --output table

# 또는 convenience-store 관련 인스턴스만 필터링
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=convenience-store*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,PrivateIpAddress]' \
  --output table
```

**출력 예시:**
```
--------------------------------------------------------
|              DescribeInstances                      |
+------------------+----------------+------------------+
|  i-1234567890    |  3.34.56.78    |  10.0.1.100     |
+------------------+----------------+------------------+
```

## 🔑 2단계: SSH 키 파일 확인

```bash
# 키 파일이 있는지 확인 (일반적인 위치)
ls -la ~/convenience-store-key.pem
ls -la ./convenience-store-key.pem
ls -la ./aws-deploy/convenience-store-key.pem

# 키 파일이 없다면, AWS에서 키 페어 이름 확인
aws ec2 describe-key-pairs --query 'KeyPairs[*].KeyName' --output table
```

## 🚀 3단계: EC2에 SSH 접속 및 리셋 실행

### 방법 A: 퍼블릭 IP를 알고 있는 경우

```bash
# 변수 설정 (실제 값으로 교체)
EC2_IP="3.34.56.78"  # 위에서 확인한 퍼블릭 IP
KEY_FILE="./convenience-store-key.pem"  # 키 파일 경로

# 키 파일 권한 설정 (처음 한 번만)
chmod 400 $KEY_FILE

# SSH 접속 및 리셋 실행
ssh -i $KEY_FILE ubuntu@$EC2_IP << 'EOF'
cd /var/www/convenience-store/server
node scripts/reset-for-beta.js --confirm
EOF
```

### 방법 B: 인스턴스 ID를 알고 있는 경우

```bash
# 변수 설정
INSTANCE_ID="i-1234567890abcdef0"
KEY_FILE="./convenience-store-key.pem"

# 퍼블릭 IP 가져오기
EC2_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

echo "EC2 IP: $EC2_IP"

# SSH 접속 및 리셋 실행
ssh -i $KEY_FILE ubuntu@$EC2_IP << 'EOF'
cd /var/www/convenience-store/server
node scripts/reset-for-beta.js --confirm
EOF
```

### 방법 C: 한 번에 실행 (권장)

```bash
# 프로젝트 루트에서 실행
cd /Users/Jinhyung_1/.cursor/worktrees/convenience_store_management/xuw

# EC2 인스턴스 정보 자동 확인 및 실행
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=convenience-store*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

if [ -z "$INSTANCE_ID" ]; then
  echo "❌ 실행 중인 convenience-store 인스턴스를 찾을 수 없습니다."
  exit 1
fi

EC2_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

KEY_FILE="./convenience-store-key.pem"
if [ ! -f "$KEY_FILE" ]; then
  KEY_FILE="./aws-deploy/convenience-store-key.pem"
fi

if [ ! -f "$KEY_FILE" ]; then
  echo "❌ 키 파일을 찾을 수 없습니다. 경로를 확인해주세요."
  exit 1
fi

echo "✅ EC2 인스턴스: $INSTANCE_ID"
echo "✅ 퍼블릭 IP: $EC2_IP"
echo "✅ 키 파일: $KEY_FILE"
echo ""
echo "🚀 베타 리셋 실행 중..."

ssh -i $KEY_FILE -o StrictHostKeyChecking=no ubuntu@$EC2_IP << 'REMOTE_SCRIPT'
cd /var/www/convenience-store/server || cd ~/csms-v2/server || cd /home/ubuntu/csms-v2/server
if [ ! -f "scripts/reset-for-beta.js" ]; then
  echo "❌ reset-for-beta.js 파일을 찾을 수 없습니다."
  echo "현재 디렉토리: $(pwd)"
  ls -la
  exit 1
fi
node scripts/reset-for-beta.js --confirm
REMOTE_SCRIPT

echo ""
echo "✅ 완료!"
```

## 📋 4단계: 실행 결과 확인

리셋 후 데이터베이스 상태를 확인하려면:

```bash
ssh -i $KEY_FILE ubuntu@$EC2_IP << 'EOF'
cd /var/www/convenience-store/server
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Store = require('./src/models/Store');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await User.find({});
  const stores = await Store.find({});
  console.log('사용자 수:', users.length);
  console.log('점포 수:', stores.length);
  users.forEach(u => console.log('-', u.email, u.role));
  stores.forEach(s => console.log('-', s.storeCode, s.name));
  await mongoose.connection.close();
})();
"
EOF
```

## 🔧 문제 해결

### 문제 1: "Permission denied (publickey)"
```bash
# 키 파일 권한 확인 및 수정
chmod 400 convenience-store-key.pem
```

### 문제 2: "reset-for-beta.js 파일을 찾을 수 없습니다"
```bash
# EC2에서 프로젝트 위치 확인
ssh -i $KEY_FILE ubuntu@$EC2_IP "find / -name 'reset-for-beta.js' 2>/dev/null"

# 또는 프로젝트 디렉토리 확인
ssh -i $KEY_FILE ubuntu@$EC2_IP "ls -la /var/www/convenience-store/"
ssh -i $KEY_FILE ubuntu@$EC2_IP "ls -la ~/csms-v2/"
```

### 문제 3: "MONGODB_URI is not defined"
```bash
# .env 파일 확인
ssh -i $KEY_FILE ubuntu@$EC2_IP "cat /var/www/convenience-store/server/.env | grep MONGODB_URI"

# MongoDB Atlas를 사용하는 경우, 환경 변수 직접 지정
ssh -i $KEY_FILE ubuntu@$EC2_IP << EOF
cd /var/www/convenience-store/server
MONGODB_URI="mongodb+srv://사용자:비밀번호@클러스터/DB이름" node scripts/reset-for-beta.js --confirm
EOF
```

## 📝 참고사항

- **프로젝트 경로**: 배포 가이드에 따르면 `/var/www/convenience-store`에 배포됩니다.
- **사용자**: Ubuntu 이미지를 사용하므로 `ubuntu` 사용자로 접속합니다.
- **MongoDB**: 로컬 MongoDB(`mongodb://localhost:27017/convenience_store`) 또는 Atlas를 사용할 수 있습니다.
- **환경 변수**: `.env` 파일은 `/var/www/convenience-store/server/.env`에 있습니다.
