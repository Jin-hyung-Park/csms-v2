#!/bin/bash

# AWS EC2 배포 문제 자동 수정 스크립트

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

log "🔧 AWS EC2 배포 문제 자동 수정 시작..."

# AWS 프로파일 설정
AWS_PROFILE="${AWS_PROFILE:-default}"
REGION="ap-northeast-2"
KEY_NAME="convenience-store-key"

# 1. AWS EC2 인스턴스 찾기
log "1. 실행 중인 EC2 인스턴스 검색 중..."

# convenience-store 태그가 있는 인스턴스 찾기
INSTANCE_INFO=$(aws ec2 describe-instances \
    --region $REGION \
    --filters "Name=tag:Name,Values=convenience-store-server" "Name=instance-state-name,Values=running" \
    --query 'Reservations[0].Instances[0].[InstanceId,PublicIpAddress]' \
    --output text 2>/dev/null || echo "")

if [ -z "$INSTANCE_INFO" ] || [ "$INSTANCE_INFO" == "None None" ]; then
    warn "태그가 있는 인스턴스를 찾을 수 없습니다. 모든 실행 중인 인스턴스를 검색합니다..."
    
    # 모든 실행 중인 인스턴스 표시
    aws ec2 describe-instances \
        --region $REGION \
        --filters "Name=instance-state-name,Values=running" \
        --query 'Reservations[*].Instances[*].[InstanceId,PublicIpAddress,Tags[?Key==`Name`].Value|[0]]' \
        --output table
    
    echo ""
    echo "실행 중인 EC2 인스턴스가 위에 표시됩니다."
    echo ""
    read -p "인스턴스 ID를 입력하세요 (예: i-1234567890abcdef0): " INSTANCE_ID
    
    if [ -z "$INSTANCE_ID" ]; then
        error "인스턴스 ID를 입력하지 않았습니다."
    fi
    
    # 선택한 인스턴스의 IP 가져오기
    PUBLIC_IP=$(aws ec2 describe-instances \
        --region $REGION \
        --instance-ids "$INSTANCE_ID" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
else
    INSTANCE_ID=$(echo $INSTANCE_INFO | awk '{print $1}')
    PUBLIC_IP=$(echo $INSTANCE_INFO | awk '{print $2}')
fi

if [ -z "$PUBLIC_IP" ] || [ "$PUBLIC_IP" == "None" ]; then
    error "인스턴스의 퍼블릭 IP를 찾을 수 없습니다."
fi

log "EC2 인스턴스 발견!"
info "  인스턴스 ID: $INSTANCE_ID"
info "  퍼블릭 IP: $PUBLIC_IP"

# 2. 키 페어 확인
log "2. SSH 키 페어 확인 중..."

KEY_FILE="${KEY_NAME}.pem"
if [ ! -f "$KEY_FILE" ]; then
    # 상위 디렉토리에서 찾기
    if [ -f "../${KEY_NAME}.pem" ]; then
        KEY_FILE="../${KEY_NAME}.pem"
    else
        error "키 파일을 찾을 수 없습니다: ${KEY_NAME}.pem"
    fi
fi

chmod 400 "$KEY_FILE"
log "키 파일 확인 완료: $KEY_FILE"

# 3. 수정 스크립트 생성
log "3. 수정 스크립트 생성 중..."

cat > /tmp/fix-ec2.sh << 'REMOTE_EOF'
#!/bin/bash

echo "🔧 EC2 서버 수정 시작..."

# MongoDB 상태 확인 및 시작
echo "1. MongoDB 상태 확인..."
if ! sudo systemctl is-active --quiet mongod; then
    echo "MongoDB가 실행되지 않음. 시작합니다..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
    sleep 5
fi

if sudo systemctl is-active --quiet mongod; then
    echo "✅ MongoDB 실행 중"
else
    echo "❌ MongoDB 시작 실패"
    exit 1
fi

# 애플리케이션 디렉토리로 이동
cd /var/www/convenience-store || {
    echo "❌ 애플리케이션 디렉토리를 찾을 수 없습니다."
    exit 1
}

# 2. .env 파일 생성/수정
echo "2. 환경 변수 파일 설정..."

# JWT Secret 생성
JWT_SECRET=$(openssl rand -base64 32)

cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/convenience_store
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=7d
REDIS_URL=redis://localhost:6379
ENV_EOF

echo "✅ .env 파일 생성 완료"
cat .env

# 3. package.json 확인
echo "3. package.json 확인..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json이 없습니다. 재배포가 필요합니다."
    exit 1
fi

# 4. node_modules 확인 및 설치
echo "4. 의존성 패키지 확인..."
if [ ! -d "node_modules" ]; then
    echo "node_modules가 없습니다. 설치합니다..."
    npm install --production
fi

# 5. PM2 프로세스 확인
echo "5. PM2 프로세스 상태 확인..."
if pm2 list | grep -q convenience-store; then
    echo "기존 프로세스를 재시작합니다..."
    pm2 restart convenience-store
else
    echo "새로운 프로세스를 시작합니다..."
    # server/index.js 경로 확인
    if [ -f "server/index.js" ]; then
        pm2 start server/index.js --name convenience-store
    elif [ -f "index.js" ]; then
        pm2 start index.js --name convenience-store
    else
        echo "❌ index.js를 찾을 수 없습니다."
        exit 1
    fi
    pm2 save
fi

# 6. PM2 로그 확인 (최근 20줄)
echo "6. 애플리케이션 로그 확인..."
sleep 3
pm2 logs convenience-store --lines 20 --nostream

echo ""
echo "✅ EC2 서버 수정 완료!"
echo ""
echo "서비스 상태:"
pm2 status

REMOTE_EOF

# 4. 스크립트를 EC2에 전송
log "4. 수정 스크립트를 EC2에 전송 중..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
    /tmp/fix-ec2.sh ubuntu@$PUBLIC_IP:/tmp/

# 5. EC2에서 스크립트 실행
log "5. EC2에서 수정 스크립트 실행 중..."
echo ""
info "=== EC2 서버 출력 ==="
echo ""

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
    ubuntu@$PUBLIC_IP 'chmod +x /tmp/fix-ec2.sh && /tmp/fix-ec2.sh'

echo ""
info "=== EC2 서버 출력 종료 ==="
echo ""

# 6. 상태 확인
log "6. 서비스 상태 최종 확인..."

# API 헬스체크
sleep 3
echo ""
info "API 헬스체크 시도 중..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://$PUBLIC_IP/api/health || echo "000")

if [ "$HEALTH_CHECK" == "200" ]; then
    log "✅ API 서버가 정상 작동 중입니다!"
    info "   API URL: http://$PUBLIC_IP/api"
else
    warn "⚠️  API 서버가 아직 응답하지 않습니다 (HTTP $HEALTH_CHECK)"
    warn "   몇 초 후 다시 시도해보세요: curl http://$PUBLIC_IP/api/health"
fi

# 7. 배포 정보 저장
log "7. 배포 정보 저장..."

cat > ../deployment-info.txt << INFO_EOF
=== AWS EC2 배포 정보 (수정 완료) ===

수정 일시: $(date)
리전: $REGION

EC2 인스턴스:
- 인스턴스 ID: $INSTANCE_ID
- 퍼블릭 IP: $PUBLIC_IP
- 키 파일: $KEY_FILE
- SSH 접속: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP

서비스 URL:
- 백엔드 API: http://$PUBLIC_IP/api
- 헬스체크: http://$PUBLIC_IP/api/health

관리 명령어:
- 서버 상태 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 status'
- 로그 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store'
- 서비스 재시작: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 restart convenience-store'
- MongoDB 상태: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl status mongod'

문제 해결:
- MongoDB 재시작: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl restart mongod'
- 환경 변수 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'cat /var/www/convenience-store/.env'
INFO_EOF

log "배포 정보를 deployment-info.txt에 저장했습니다."

echo ""
log "🎉 EC2 수정 작업이 완료되었습니다!"
echo ""
echo "📝 다음 단계:"
echo "   1. API 테스트: curl http://$PUBLIC_IP/api/health"
echo "   2. 로그 확인: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs'"
echo "   3. 프론트엔드 설정에서 API URL을 http://$PUBLIC_IP/api로 변경"
echo ""
echo "💡 팁: 문제가 계속되면 다음 명령어로 로그를 확인하세요:"
echo "   ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store --lines 50'"
echo ""

