#!/bin/bash

# 프론트엔드 빠른 업데이트 스크립트

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

EC2_IP="54.180.88.34"
KEY_FILE="convenience-store-key.pem"

echo ""
log "🚀 프론트엔드 업데이트 시작..."
echo ""

# 1. 환경 변수 확인
if [ ! -f "../client/.env" ]; then
    warn ".env 파일이 없습니다. 생성합니다..."
    echo "REACT_APP_API_URL=http://${EC2_IP}/api" > ../client/.env
fi

# 2. React 빌드
log "📦 React 앱 빌드 중..."
cd ../client
npm run build > /dev/null 2>&1 || error "빌드 실패"
log "✅ 빌드 완료"

# 3. 압축
log "📦 빌드 파일 압축 중..."
tar czf build.tar.gz build/
log "✅ 압축 완료"

# 4. EC2로 전송
log "📤 EC2로 전송 중..."
scp -i ../aws-deploy/${KEY_FILE} -o StrictHostKeyChecking=no -o LogLevel=ERROR \
    build.tar.gz ubuntu@${EC2_IP}:/tmp/ || error "전송 실패"
rm build.tar.gz
log "✅ 전송 완료"

# 5. EC2에서 배포
log "🌐 EC2에서 배포 중..."
ssh -i ../aws-deploy/${KEY_FILE} -o StrictHostKeyChecking=no -o LogLevel=ERROR \
    ubuntu@${EC2_IP} << 'DEPLOY_EOF'
cd /tmp
tar xzf build.tar.gz
sudo cp -r build/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo systemctl reload nginx
rm -rf build*
echo "배포 완료"
DEPLOY_EOF

log "✅ 배포 완료"

# 6. 확인
echo ""
info "배포 확인 중..."
sleep 2

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://${EC2_IP}/)
if [ "$RESPONSE" == "200" ]; then
    log "✅ 프론트엔드가 정상적으로 작동합니다!"
    echo ""
    info "🌐 웹사이트: http://${EC2_IP}"
    info "🔗 브라우저에서 확인하세요!"
else
    warn "⚠️  응답 코드: $RESPONSE"
fi

echo ""
log "🎉 프론트엔드 업데이트 완료!"
echo ""

