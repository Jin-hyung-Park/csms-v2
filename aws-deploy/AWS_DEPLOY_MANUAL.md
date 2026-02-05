# 🚀 편의점 관리 시스템 AWS 배포 메뉴얼

## 📋 목차
1. [사전 준비사항](#사전-준비사항)
2. [자동 배포 (권장)](#자동-배포-권장)
3. [수동 배포](#수동-배포)
4. [배포 후 설정](#배포-후-설정)
5. [문제 해결](#문제-해결)
6. [비용 관리](#비용-관리)

---

## 🔧 사전 준비사항

### 1. AWS 계정 및 CLI 설정

```bash
# AWS CLI 설치 (macOS)
brew install awscli

# AWS CLI 설치 (Linux)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# AWS 계정 설정
aws configure
```

**입력 정보:**
- AWS Access Key ID: [IAM에서 생성한 액세스 키]
- AWS Secret Access Key: [IAM에서 생성한 시크릿 키]
- Default region name: `ap-northeast-2` (서울 리전)
- Default output format: `json`

### 2. 필요한 권한 확인

IAM 사용자에게 다음 권한이 필요합니다:
- EC2FullAccess
- S3FullAccess
- IAMReadOnlyAccess (키페어 생성용)

---

## 🚀 자동 배포 (권장)

### 한 번에 모든 것을 배포하는 방법

```bash
# 1. 프로젝트 루트 디렉토리로 이동
cd /Users/Jinhyung_1/convenience_store_management

# 2. 배포 스크립트 실행
./aws-deploy/deploy-free-tier.sh
```

**배포 과정:**
1. ✅ 키 페어 생성
2. ✅ 보안 그룹 생성
3. ✅ EC2 인스턴스 생성 (t2.micro)
4. ✅ S3 버킷 생성 및 정적 웹사이트 설정
5. ✅ React 앱 빌드 및 S3 업로드
6. ✅ 백엔드 EC2 배포
7. ✅ 서비스 시작

**예상 시간:** 10-15분

---

## 🔨 수동 배포

자동 배포가 실패하거나 단계별로 진행하고 싶은 경우

### 1단계: EC2 인스턴스 생성

```bash
# 키 페어 생성
aws ec2 create-key-pair --key-name convenience-store-key --query 'KeyMaterial' --output text > convenience-store-key.pem
chmod 400 convenience-store-key.pem

# 보안 그룹 생성
SG_ID=$(aws ec2 create-security-group --group-name convenience-store-sg --description "Convenience Store Security Group" --query 'GroupId' --output text)

# 보안 그룹 규칙 추가
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0

# EC2 인스턴스 생성
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c6e5afdd23291f73 \
    --count 1 \
    --instance-type t2.micro \
    --key-name convenience-store-key \
    --security-group-ids $SG_ID \
    --user-data file://aws-deploy/user-data.sh \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=convenience-store-server}]' \
    --query 'Instances[0].InstanceId' \
    --output text)

# 인스턴스 시작 대기
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# 퍼블릭 IP 확인
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
echo "EC2 IP: $PUBLIC_IP"
```

### 2단계: S3 정적 웹사이트 설정

```bash
# 고유한 버킷 이름 생성
BUCKET_NAME="convenience-store-frontend-$(date +%s)"

# S3 버킷 생성
aws s3 mb s3://$BUCKET_NAME

# 정적 웹사이트 호스팅 설정
aws s3 website s3://$BUCKET_NAME --index-document index.html --error-document error.html

# 버킷 정책 설정 (퍼블릭 읽기 권한)
sed "s/BUCKET_NAME/$BUCKET_NAME/g" aws-deploy/bucket-policy.json > temp-policy.json
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://temp-policy.json
rm temp-policy.json

# React 앱 빌드 및 업로드
npm run build
aws s3 sync client/build/ s3://$BUCKET_NAME/ --delete

echo "S3 Website URL: http://$BUCKET_NAME.s3-website.ap-northeast-2.amazonaws.com"
```

### 3단계: 백엔드 배포

```bash
# 5-10분 대기 (EC2 초기화)
echo "EC2 초기화 대기 중... (5분)"
sleep 300

# 백엔드 파일 압축
tar czf app.tar.gz server/ package.json package-lock.json .env.example

# EC2로 파일 전송
scp -i convenience-store-key.pem -o StrictHostKeyChecking=no app.tar.gz ubuntu@$PUBLIC_IP:/tmp/

# SSH로 접속하여 배포
ssh -i convenience-store-key.pem -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'REMOTE_COMMANDS'
cd /var/www/convenience-store
tar xzf /tmp/app.tar.gz
npm install --production

# 환경 변수 설정
cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/convenience_store
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRE=7d
REDIS_URL=redis://localhost:6379
ENV_EOF

# PM2로 앱 시작
pm2 start server/index.js --name convenience-store
pm2 startup
pm2 save

# Nginx 설정 업데이트
sudo sed -i "s|your-s3-bucket.s3-website.ap-northeast-2.amazonaws.com|$BUCKET_NAME.s3-website.ap-northeast-2.amazonaws.com|g" /etc/nginx/sites-available/convenience-store
sudo systemctl reload nginx

echo "✅ 백엔드 배포 완료!"
REMOTE_COMMANDS

# 정리
rm app.tar.gz
```

---

## ⚙️ 배포 후 설정

### 1. SSL 인증서 설정 (Let's Encrypt)

```bash
# EC2에 SSH 접속
ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP

# 도메인이 있는 경우 SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo crontab -e
# 다음 라인 추가: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. 도메인 설정

**Route 53 사용 시:**
```bash
# 호스팅 존 생성
aws route53 create-hosted-zone --name your-domain.com --caller-reference $(date +%s)

# A 레코드 추가 (EC2 IP)
# AWS 콘솔에서 수동으로 설정하는 것을 권장
```

### 3. 모니터링 설정

```bash
# EC2에서 서비스 상태 확인
ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP

# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs convenience-store

# 시스템 리소스 확인
htop
```

---

## 🔍 문제 해결

### 자주 발생하는 문제들

#### 1. EC2 인스턴스에 접속할 수 없음
```bash
# 보안 그룹 확인
aws ec2 describe-security-groups --group-names convenience-store-sg

# 키 페어 권한 확인
chmod 400 convenience-store-key.pem

# SSH 연결 테스트
ssh -i convenience-store-key.pem -v ubuntu@$PUBLIC_IP
```

#### 2. 앱이 시작되지 않음
```bash
# EC2에 접속하여 로그 확인
ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP
pm2 logs convenience-store

# MongoDB 상태 확인
sudo systemctl status mongod

# 포트 확인
sudo netstat -tlnp | grep :5000
```

#### 3. S3 웹사이트에 접근할 수 없음
```bash
# 버킷 정책 확인
aws s3api get-bucket-policy --bucket $BUCKET_NAME

# 웹사이트 설정 확인
aws s3api get-bucket-website --bucket $BUCKET_NAME
```

#### 4. API 호출 실패
```bash
# Nginx 설정 확인
ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP
sudo nginx -t
sudo systemctl status nginx

# 백엔드 서비스 확인
curl http://localhost:5000/api/health
```

### 로그 확인 방법

```bash
# EC2 시스템 로그
ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP
sudo tail -f /var/log/syslog

# 애플리케이션 로그
pm2 logs convenience-store

# Nginx 로그
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# MongoDB 로그
sudo tail -f /var/log/mongodb/mongod.log
```

---

## 💰 비용 관리

### 무료 티어 한도 확인

```bash
# EC2 사용량 확인 (AWS 콘솔에서)
# - EC2 t2.micro: 750시간/월
# - S3: 5GB 저장공간
# - 데이터 전송: 15GB/월

# 비용 알림 설정 (AWS 콘솔에서)
# 1. AWS Budgets에서 예산 생성
# 2. $1 이상 사용 시 알림 설정
```

### 리소스 정리 (배포 취소)

```bash
# EC2 인스턴스 종료
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# S3 버킷 삭제
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3 rb s3://$BUCKET_NAME

# 보안 그룹 삭제
aws ec2 delete-security-group --group-id $SG_ID

# 키 페어 삭제
aws ec2 delete-key-pair --key-name convenience-store-key
rm convenience-store-key.pem
```

---

## 📞 지원

### 유용한 명령어

```bash
# 배포 상태 확인
./aws-deploy/check-deployment.sh

# 서비스 재시작
./aws-deploy/restart-services.sh

# 로그 수집
./aws-deploy/collect-logs.sh
```

### 연락처
- 기술 지원: [이메일 주소]
- 문서: [GitHub 링크]

---

**💡 팁:**
- 처음 배포 시에는 자동 배포 스크립트를 사용하세요
- 문제가 발생하면 로그를 먼저 확인하세요
- 무료 티어 한도를 주기적으로 확인하세요
- 정기적으로 백업을 수행하세요

**⚠️ 주의사항:**
- EC2 t2.micro는 CPU 크레딧 시스템을 사용합니다
- 과도한 트래픽 시 성능 저하가 발생할 수 있습니다
- 프로덕션 환경에서는 RDS 사용을 권장합니다
