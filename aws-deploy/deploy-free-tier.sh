#!/bin/bash

# AWS 무료 티어 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# 변수 설정
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REGION="ap-northeast-2"  # 서울 리전
KEY_NAME="convenience-store-key"
SG_NAME="convenience-store-sg"
BUCKET_NAME="convenience-store-frontend-$(date +%s)"

log "🚀 AWS 무료 티어 배포 시작..."

# AWS CLI 확인
if ! command -v aws &> /dev/null; then
    error "AWS CLI가 설치되지 않았습니다. 먼저 설치해주세요: https://aws.amazon.com/cli/"
fi

# AWS 자격 증명 확인 (프로필 있으면 사용, 없으면 default)
if aws sts get-caller-identity --profile convenience-store &> /dev/null; then
    AWS_PROFILE="convenience-store"
    AWS_OPT="--profile $AWS_PROFILE"
elif aws sts get-caller-identity &> /dev/null; then
    AWS_PROFILE=""
    AWS_OPT=""
else
    error "AWS 자격 증명이 없습니다. 'aws configure' 또는 'aws configure --profile convenience-store'를 실행해주세요."
fi

# 리전 설정
if [ -n "$AWS_PROFILE" ]; then
    aws configure set default.region $REGION --profile $AWS_PROFILE
fi

log "1. 키 페어 생성..."
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" $AWS_OPT &> /dev/null; then
    aws ec2 create-key-pair --key-name "$KEY_NAME" --query 'KeyMaterial' --output text $AWS_OPT > "$SCRIPT_DIR/${KEY_NAME}.pem" 2>/dev/null
    if [ $? -eq 0 ]; then
        chmod 400 "$SCRIPT_DIR/${KEY_NAME}.pem"
        log "키 페어 생성 완료: $SCRIPT_DIR/${KEY_NAME}.pem"
    else
        error "키 페어 생성에 실패했습니다."
    fi
else
    warn "키 페어가 이미 존재합니다."
fi

log "2. 보안 그룹 생성..."
if ! aws ec2 describe-security-groups --group-names "$SG_NAME" $AWS_OPT &> /dev/null; then
    SG_ID=$(aws ec2 create-security-group --group-name "$SG_NAME" --description "Convenience Store Security Group" --query 'GroupId' --output text $AWS_OPT)
    
    # 보안 그룹 규칙 추가
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 22 --cidr 0.0.0.0/0 $AWS_OPT
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 80 --cidr 0.0.0.0/0 $AWS_OPT
    aws ec2 authorize-security-group-ingress --group-id "$SG_ID" --protocol tcp --port 443 --cidr 0.0.0.0/0 $AWS_OPT
    
    log "보안 그룹 생성 완료: $SG_ID"
else
    SG_ID=$(aws ec2 describe-security-groups --group-names "$SG_NAME" --query 'SecurityGroups[0].GroupId' --output text $AWS_OPT)
    warn "보안 그룹이 이미 존재합니다: $SG_ID"
fi

log "3. EC2 인스턴스 생성 (t2.micro - 무료 티어)..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id ami-0c6e5afdd23291f73 \
    --count 1 \
    --instance-type t2.micro \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SG_ID" \
    --user-data "file://$SCRIPT_DIR/user-data.sh" \
    --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=convenience-store-server}]' \
    --query 'Instances[0].InstanceId' \
    --output text \
    $AWS_OPT)

log "EC2 인스턴스 생성 중: $INSTANCE_ID"

# 인스턴스 시작 대기
log "인스턴스 시작 대기 중..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID" $AWS_OPT

# 퍼블릭 IP 가져오기
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE_ID" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text $AWS_OPT)
log "EC2 퍼블릭 IP: $PUBLIC_IP"

log "4. S3 버킷 생성..."
aws s3 mb "s3://$BUCKET_NAME" $AWS_OPT

# 정적 웹사이트 호스팅 설정
aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document error.html $AWS_OPT

# S3 퍼블릭 액세스 차단 해제 (정적 웹사이트 호스팅용)
aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" $AWS_OPT

# 버킷 정책 설정
sed "s/BUCKET_NAME/$BUCKET_NAME/g" "$SCRIPT_DIR/bucket-policy.json" > "$SCRIPT_DIR/temp-policy.json"
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "file://$SCRIPT_DIR/temp-policy.json" $AWS_OPT
rm -f "$SCRIPT_DIR/temp-policy.json"

log "S3 버킷 생성 완료: $BUCKET_NAME"

log "5. React 앱 빌드 (API URL: http://$PUBLIC_IP/api)..."
cd "$SCRIPT_DIR/.."
export REACT_APP_API_URL="http://$PUBLIC_IP/api"
# ESLint 경고로 빌드 실패 방지 (사용자 테스트 배포용)
export CI=false
npm install
(cd client && npm install)
npm run build

log "6. S3에 프론트엔드 업로드..."
aws s3 sync client/build/ "s3://$BUCKET_NAME/" --delete $AWS_OPT

# S3 웹사이트 URL
S3_WEBSITE_URL="http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"

log "7. 인스턴스 초기화 대기 (약 5분)..."
info "EC2 인스턴스가 초기화되는 동안 잠시 기다려주세요..."

# 5분 대기
sleep 300

log "8. 백엔드 배포 준비..."
# 백엔드 파일들을 tar로 압축
tar czf app.tar.gz server/ package.json package-lock.json env.example

log "9. EC2에 백엔드 배포..."
# 파일 전송
KEY_PATH="$SCRIPT_DIR/${KEY_NAME}.pem"
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no app.tar.gz ubuntu@$PUBLIC_IP:/tmp/

# 배포 스크립트 생성 및 전송
cat > deploy-backend.sh << 'BACKEND_EOF'
#!/bin/bash
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
CLIENT_URL=http://BUCKET_NAME.s3-website.ap-northeast-2.amazonaws.com
API_PUBLIC_URL=http://PUBLIC_IP_PLACEHOLDER/api
ENV_EOF

# PM2로 앱 시작
pm2 start server/index.js --name convenience-store
pm2 startup
pm2 save

# 사용자 테스트용 계정 생성 (owner@test.com, employee@test.com)
node server/scripts/createUserTestAccounts.js || true

# Nginx 설정 업데이트 (user-data의 REPLACE_WITH_YOUR_S3_BUCKET → 실제 버킷명)
sudo sed -i "s/REPLACE_WITH_YOUR_S3_BUCKET/BUCKET_NAME/g" /etc/nginx/sites-available/convenience-store
sudo systemctl reload nginx

echo "✅ 백엔드 배포 완료!"
BACKEND_EOF

sed -e "s/BUCKET_NAME/$BUCKET_NAME/g" -e "s/PUBLIC_IP_PLACEHOLDER/$PUBLIC_IP/g" deploy-backend.sh > temp-deploy.sh
KEY_PATH="$SCRIPT_DIR/${KEY_NAME}.pem"
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no temp-deploy.sh ubuntu@$PUBLIC_IP:/tmp/deploy-backend.sh

# EC2에서 배포 실행
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP 'chmod +x /tmp/deploy-backend.sh && /tmp/deploy-backend.sh'

# 임시 파일 정리
rm -f app.tar.gz deploy-backend.sh temp-deploy.sh

log "✅ 배포 완료!"
echo ""
echo "🌐 웹사이트 정보:"
echo "   프론트엔드: $S3_WEBSITE_URL"
echo "   백엔드 API: http://$PUBLIC_IP/api"
echo "   서버 SSH: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
echo ""
echo "📝 다음 단계:"
echo "   1. 도메인을 구매하고 DNS를 설정하세요"
echo "   2. SSL 인증서를 설정하세요:"
echo "      ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP"
echo "      sudo certbot --nginx -d your-domain.com"
echo "   3. MongoDB 데이터베이스를 확인하세요"
echo ""
echo "💰 예상 월 비용: \$0.50 (Route 53 호스팅 존만)"

log "배포 정보를 deployment-info.txt에 저장했습니다."
cat > deployment-info.txt << INFO_EOF
=== AWS 무료 티어 배포 정보 ===

배포 일시: $(date)
리전: $REGION

EC2 인스턴스:
- 인스턴스 ID: $INSTANCE_ID  
- 퍼블릭 IP: $PUBLIC_IP
- 키 파일: ${KEY_NAME}.pem
- SSH 접속: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP

S3 버킷:
- 버킷 이름: $BUCKET_NAME
- 웹사이트 URL: $S3_WEBSITE_URL

보안 그룹: $SG_ID

서비스 URL:
- 프론트엔드: $S3_WEBSITE_URL
- 백엔드 API: http://$PUBLIC_IP/api

관리 명령어:
- 서버 상태 확인: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'pm2 status'
- 로그 확인: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'pm2 logs'
- 서비스 재시작: ssh -i ${KEY_NAME}.pem ubuntu@$PUBLIC_IP 'pm2 restart convenience-store'

예상 월 비용: \$0.50
INFO_EOF

log "🎉 배포가 성공적으로 완료되었습니다!"
