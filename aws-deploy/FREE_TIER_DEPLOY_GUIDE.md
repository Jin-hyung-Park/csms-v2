# AWS 무료 티어 배포 가이드

## 📋 사전 준비사항

1. **AWS 계정** (무료 티어 가능한 계정)
2. **AWS CLI 설치 및 설정**
3. **도메인** (선택사항, Freenom에서 무료 도메인 가능)

## 🚀 배포 단계

### 1단계: EC2 인스턴스 생성 (무료)

```bash
# 1. 키 페어 생성
aws ec2 create-key-pair --key-name convenience-store-key --query 'KeyMaterial' --output text > convenience-store-key.pem
chmod 400 convenience-store-key.pem

# 2. 보안 그룹 생성
aws ec2 create-security-group --group-name convenience-store-sg --description "Convenience Store Security Group"

# 3. 보안 그룹 규칙 추가
aws ec2 authorize-security-group-ingress --group-name convenience-store-sg --protocol tcp --port 22 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name convenience-store-sg --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-name convenience-store-sg --protocol tcp --port 443 --cidr 0.0.0.0/0

# 4. EC2 인스턴스 생성 (t2.micro - 무료 티어)
aws ec2 run-instances \
    --image-id ami-0c6e5afdd23291f73 \
    --count 1 \
    --instance-type t2.micro \
    --key-name convenience-store-key \
    --security-groups convenience-store-sg \
    --user-data file://user-data.sh
```

### 2단계: S3 정적 웹사이트 호스팅 (무료)

```bash
# 1. S3 버킷 생성
aws s3 mb s3://convenience-store-frontend-$(date +%s)

# 2. 정적 웹사이트 호스팅 설정
aws s3 website s3://convenience-store-frontend-$(date +%s) --index-document index.html --error-document error.html

# 3. 퍼블릭 액세스 허용
aws s3api put-bucket-policy --bucket convenience-store-frontend-$(date +%s) --policy file://bucket-policy.json
```

### 3단계: 애플리케이션 배포

```bash
# 1. React 앱 빌드
npm run build

# 2. S3에 업로드
aws s3 sync client/build/ s3://convenience-store-frontend-$(date +%s)/ --delete

# 3. EC2에 백엔드 배포 (SSH 접속 후)
ssh -i convenience-store-key.pem ubuntu@YOUR_EC2_IP
```

## 💡 비용 절약 팁

1. **MongoDB Atlas 무료 티어** 사용 (512MB)
2. **Cloudflare** 무료 CDN 사용
3. **Let's Encrypt** 무료 SSL 인증서
4. **AWS CloudWatch** 무료 티어 모니터링

## 📊 예상 월 비용

- EC2 t2.micro: $0 (무료 티어)
- S3: $0 (5GB 이하)
- Route 53: $0.50 (호스팅 존)
- **총합: $0.50/월**
