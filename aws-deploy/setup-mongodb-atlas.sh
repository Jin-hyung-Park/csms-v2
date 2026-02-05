#!/bin/bash

# MongoDB Atlas 자동 설정 스크립트

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

EC2_IP="$1"
MONGODB_URI="$2"
KEY_FILE="${3:-convenience-store-key.pem}"

if [ -z "$EC2_IP" ]; then
    error "EC2 IP 주소가 제공되지 않았습니다. 사용법: $0 <EC2_IP> <MONGODB_URI>"
fi

if [ -z "$MONGODB_URI" ]; then
    error "MongoDB URI가 제공되지 않았습니다. 사용법: $0 <EC2_IP> <MONGODB_URI>"
fi

echo ""
log "🚀 MongoDB Atlas 설정 시작..."
echo ""
info "EC2 IP: $EC2_IP"
info "MongoDB URI: ${MONGODB_URI:0:50}..."
echo ""

# SSH 연결 테스트
log "EC2 연결 테스트 중..."
if ! ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o LogLevel=ERROR ubuntu@$EC2_IP 'echo "연결 성공"' &>/dev/null; then
    error "EC2에 연결할 수 없습니다. IP 주소와 키 파일을 확인해주세요."
fi
log "✅ EC2 연결 성공"

echo ""
log "환경 변수 설정 스크립트 생성 중..."

# 원격 스크립트 생성
cat > /tmp/setup-atlas.sh << REMOTE_EOF
#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌐 MongoDB Atlas 설정"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 애플리케이션 디렉토리로 이동
cd /var/www/convenience-store || {
    echo "⚠️  애플리케이션 디렉토리가 없습니다."
    sudo mkdir -p /var/www/convenience-store
    sudo chown -R ubuntu:ubuntu /var/www/convenience-store
    cd /var/www/convenience-store
}

echo "1. 기존 .env 파일 백업..."
if [ -f ".env" ]; then
    cp .env .env.backup.atlas.\$(date +%Y%m%d_%H%M%S)
    echo "   ✅ 백업 완료"
fi

echo ""
echo "2. 새로운 환경 변수 설정..."

# JWT Secret 생성
JWT_SECRET=\$(openssl rand -base64 32)

cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=${MONGODB_URI}
JWT_SECRET=\${JWT_SECRET}
JWT_EXPIRE=7d
REDIS_URL=redis://localhost:6379
ENV_EOF

echo "   ✅ .env 파일 생성 완료"
echo ""
echo "   환경 변수 내용:"
cat .env | sed 's/MONGODB_URI=.*/MONGODB_URI=mongodb+srv:\/\/***HIDDEN***/' | sed 's/^/      /'

echo ""
echo "3. MongoDB Atlas 연결 테스트..."

# Node.js로 연결 테스트 (간단한 스크립트)
cat > /tmp/test-atlas.js << 'TEST_EOF'
const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI || '${MONGODB_URI}';

console.log('   MongoDB Atlas 연결 시도 중...');

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('   ✅ MongoDB Atlas 연결 성공!');
  process.exit(0);
})
.catch((err) => {
  console.log('   ❌ MongoDB Atlas 연결 실패:', err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log('   ⏱️  연결 시간 초과');
  process.exit(1);
}, 15000);
TEST_EOF

if [ -f "package.json" ]; then
    node /tmp/test-atlas.js 2>&1
else
    echo "   ⚠️  package.json이 없어 연결 테스트를 건너뜁니다."
fi

echo ""
echo "4. PM2 프로세스 재시작..."

if pm2 list | grep -q convenience-store; then
    echo "   ♻️  애플리케이션 재시작 중..."
    pm2 restart convenience-store
    sleep 3
    echo "   ✅ 재시작 완료"
    
    echo ""
    echo "   프로세스 상태:"
    pm2 status | sed 's/^/      /'
    
    echo ""
    echo "   최근 로그:"
    pm2 logs convenience-store --lines 15 --nostream 2>&1 | sed 's/^/      /'
else
    echo "   ⚠️  PM2 프로세스가 없습니다."
    
    if [ -f "server/index.js" ]; then
        echo "   🆕 새로운 프로세스 시작..."
        pm2 start server/index.js --name convenience-store
        pm2 save
        sleep 3
        pm2 logs convenience-store --lines 10 --nostream 2>&1 | sed 's/^/      /'
    elif [ -f "index.js" ]; then
        echo "   🆕 새로운 프로세스 시작..."
        pm2 start index.js --name convenience-store
        pm2 save
        sleep 3
        pm2 logs convenience-store --lines 10 --nostream 2>&1 | sed 's/^/      /'
    else
        echo "   ❌ 애플리케이션 파일을 찾을 수 없습니다."
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ MongoDB Atlas 설정 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REMOTE_EOF

chmod +x /tmp/setup-atlas.sh

log "스크립트를 EC2에 전송 중..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -o LogLevel=ERROR /tmp/setup-atlas.sh ubuntu@$EC2_IP:/tmp/ 2>&1 | grep -v "Warning:" || true

echo ""
log "EC2에서 설정 스크립트 실행 중..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EC2 서버 출력"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o LogLevel=ERROR ubuntu@$EC2_IP 'chmod +x /tmp/setup-atlas.sh && /tmp/setup-atlas.sh' 2>&1 | grep -v "Warning:" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# API 헬스체크
log "API 서버 확인 중..."
sleep 3

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://$EC2_IP/api/health 2>/dev/null || echo "000")

echo ""
if [ "$HEALTH_CHECK" == "200" ]; then
    log "✅ API 서버가 정상 작동 중입니다!"
    echo ""
    info "  🌐 API URL: http://$EC2_IP/api"
    info "  💚 헬스체크: http://$EC2_IP/api/health"
    
    echo ""
    echo "  API 응답:"
    curl -s http://$EC2_IP/api/health | python3 -m json.tool 2>/dev/null | sed 's/^/    /' || echo "    (응답 확인 중...)"
else
    warn "⚠️  API 서버가 아직 응답하지 않습니다 (HTTP $HEALTH_CHECK)"
    echo ""
    echo "  잠시 후 다시 확인해보세요:"
    echo "  curl http://$EC2_IP/api/health"
    echo ""
    echo "  로그 확인:"
    echo "  ssh -i $KEY_FILE ubuntu@$EC2_IP 'pm2 logs convenience-store'"
fi

echo ""
log "🎉 MongoDB Atlas 설정 완료!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📝 다음 단계"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. API 테스트:"
echo "     curl http://$EC2_IP/api/health"
echo ""
echo "  2. MongoDB Atlas 대시보드 확인:"
echo "     https://cloud.mongodb.com"
echo ""
echo "  3. 데이터베이스 백업 설정:"
echo "     Atlas 대시보드 → Backup 탭"
echo ""
echo "  4. 로그 모니터링:"
echo "     ssh -i $KEY_FILE ubuntu@$EC2_IP 'pm2 logs convenience-store'"
echo ""

