#!/bin/bash

# AWS EC2 배포 문제 수동 수정 스크립트 (AWS CLI 없이)

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

echo ""
log "🔧 AWS EC2 배포 문제 수정 스크립트"
echo ""

# 1. EC2 정보 입력받기
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EC2 인스턴스 정보 입력"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "EC2 퍼블릭 IP 주소를 입력하세요: " PUBLIC_IP
if [ -z "$PUBLIC_IP" ]; then
    error "IP 주소를 입력하지 않았습니다."
fi

echo ""
echo "SSH 키 파일 경로를 입력하세요."
echo "예시:"
echo "  - convenience-store-key.pem (현재 디렉토리)"
echo "  - /path/to/your-key.pem (절대 경로)"
echo ""
read -p "키 파일 경로: " KEY_FILE

if [ -z "$KEY_FILE" ]; then
    # 기본값 사용
    KEY_FILE="convenience-store-key.pem"
    warn "기본값 사용: $KEY_FILE"
fi

# 키 파일 존재 확인
if [ ! -f "$KEY_FILE" ]; then
    # 상위 디렉토리에서 찾기
    if [ -f "../$KEY_FILE" ]; then
        KEY_FILE="../$KEY_FILE"
    else
        error "키 파일을 찾을 수 없습니다: $KEY_FILE"
    fi
fi

chmod 400 "$KEY_FILE"

echo ""
log "입력된 정보:"
info "  EC2 IP: $PUBLIC_IP"
info "  키 파일: $KEY_FILE"
echo ""

read -p "계속하시겠습니까? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "취소되었습니다."
    exit 0
fi

echo ""
log "EC2 연결 테스트 중..."

# SSH 연결 테스트
if ! ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=10 -o LogLevel=ERROR \
    ubuntu@$PUBLIC_IP 'echo "연결 성공"' &>/dev/null; then
    error "EC2에 SSH 연결할 수 없습니다. IP 주소와 키 파일을 확인해주세요."
fi

log "✅ EC2 연결 성공!"
echo ""

# 2. 수정 스크립트 생성
log "수정 스크립트 생성 중..."

cat > /tmp/fix-ec2.sh << 'REMOTE_EOF'
#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔧 EC2 서버 수정 시작"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. MongoDB 상태 확인 및 시작
echo "📦 1. MongoDB 상태 확인..."
if ! sudo systemctl is-active --quiet mongod; then
    echo "   ⚠️  MongoDB가 실행되지 않음. 시작합니다..."
    sudo systemctl start mongod
    sudo systemctl enable mongod
    sleep 5
else
    echo "   ✅ MongoDB 이미 실행 중"
fi

# MongoDB 최종 확인
if sudo systemctl is-active --quiet mongod; then
    echo "   ✅ MongoDB 정상 작동 중"
    sudo systemctl status mongod --no-pager | grep Active
else
    echo "   ❌ MongoDB 시작 실패"
    echo "   로그 확인: sudo journalctl -u mongod -n 20"
    exit 1
fi

echo ""

# 2. Redis 상태 확인
echo "📦 2. Redis 상태 확인..."
if ! sudo systemctl is-active --quiet redis-server; then
    echo "   ⚠️  Redis가 실행되지 않음. 시작합니다..."
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
else
    echo "   ✅ Redis 이미 실행 중"
fi

echo ""

# 3. 애플리케이션 디렉토리 확인
echo "📁 3. 애플리케이션 디렉토리 확인..."
if [ -d "/var/www/convenience-store" ]; then
    cd /var/www/convenience-store
    echo "   ✅ 디렉토리 확인: $(pwd)"
else
    echo "   ❌ 애플리케이션 디렉토리를 찾을 수 없습니다."
    echo "   디렉토리를 생성합니다..."
    sudo mkdir -p /var/www/convenience-store
    sudo chown -R ubuntu:ubuntu /var/www/convenience-store
    cd /var/www/convenience-store
fi

echo ""

# 4. .env 파일 생성/수정
echo "⚙️  4. 환경 변수 파일 설정..."

# 기존 .env 백업
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "   📋 기존 .env 파일 백업 완료"
fi

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

echo "   ✅ .env 파일 생성 완료"
echo ""
echo "   환경 변수 내용:"
cat .env | sed 's/^/      /'

echo ""

# 5. package.json 확인
echo "📦 5. package.json 확인..."
if [ ! -f "package.json" ]; then
    echo "   ❌ package.json이 없습니다."
    echo "   ⚠️  애플리케이션 파일을 다시 배포해야 합니다."
    
    # 기본 package.json 생성 시도
    if [ -f "../package.json" ]; then
        cp ../package.json .
        echo "   ✅ 상위 디렉토리에서 package.json 복사 완료"
    else
        echo "   ℹ️  수동으로 애플리케이션을 배포해주세요."
    fi
else
    echo "   ✅ package.json 존재"
fi

echo ""

# 6. node_modules 확인 및 설치
echo "📦 6. 의존성 패키지 확인..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
    echo "   ⚠️  node_modules가 없거나 불완전합니다. 설치합니다..."
    if [ -f "package.json" ]; then
        npm install --production --quiet
        echo "   ✅ 의존성 패키지 설치 완료"
    else
        echo "   ❌ package.json이 없어 설치할 수 없습니다."
    fi
else
    echo "   ✅ node_modules 존재"
fi

echo ""

# 7. 애플리케이션 파일 확인
echo "📄 7. 애플리케이션 파일 구조 확인..."
if [ -f "server/index.js" ]; then
    APP_ENTRY="server/index.js"
    echo "   ✅ 엔트리 포인트: $APP_ENTRY"
elif [ -f "index.js" ]; then
    APP_ENTRY="index.js"
    echo "   ✅ 엔트리 포인트: $APP_ENTRY"
else
    echo "   ❌ 엔트리 포인트를 찾을 수 없습니다."
    echo "   ⚠️  애플리케이션을 다시 배포해야 합니다."
    APP_ENTRY=""
fi

echo ""

# 8. PM2 프로세스 관리
echo "🚀 8. PM2 프로세스 관리..."

if [ -z "$APP_ENTRY" ]; then
    echo "   ⚠️  애플리케이션 파일이 없어 PM2를 시작할 수 없습니다."
else
    if pm2 list | grep -q convenience-store; then
        echo "   ♻️  기존 프로세스를 재시작합니다..."
        pm2 restart convenience-store
        echo "   ✅ 프로세스 재시작 완료"
    else
        echo "   🆕 새로운 프로세스를 시작합니다..."
        pm2 start $APP_ENTRY --name convenience-store
        pm2 startup systemd -u ubuntu --hp /home/ubuntu
        pm2 save
        echo "   ✅ 프로세스 시작 완료"
    fi
    
    echo ""
    echo "   PM2 프로세스 상태:"
    pm2 status | sed 's/^/      /'
    
    echo ""
    echo "   최근 로그 (최근 15줄):"
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    sleep 2
    pm2 logs convenience-store --lines 15 --nostream | sed 's/^/      /'
    echo "   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ EC2 서버 수정 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

REMOTE_EOF

# 3. 스크립트를 EC2에 전송
log "수정 스크립트를 EC2에 전송 중..."
scp -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
    /tmp/fix-ec2.sh ubuntu@$PUBLIC_IP:/tmp/ 2>&1 | grep -v "Warning:" || true

echo ""
log "EC2에서 수정 스크립트 실행 중..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  EC2 서버 출력"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 4. EC2에서 스크립트 실행
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o LogLevel=ERROR \
    ubuntu@$PUBLIC_IP 'chmod +x /tmp/fix-ec2.sh && /tmp/fix-ec2.sh' 2>&1 | grep -v "Warning:" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 5. API 헬스체크
log "API 헬스체크 시도 중..."
sleep 3

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://$PUBLIC_IP/api/health 2>/dev/null || echo "000")

echo ""
if [ "$HEALTH_CHECK" == "200" ]; then
    log "✅ API 서버가 정상 작동 중입니다!"
    echo ""
    info "  🌐 API URL: http://$PUBLIC_IP/api"
    info "  💚 헬스체크: http://$PUBLIC_IP/api/health"
    
    # API 응답 내용 표시
    echo ""
    echo "  API 응답:"
    curl -s http://$PUBLIC_IP/api/health | python3 -m json.tool 2>/dev/null | sed 's/^/    /' || echo "    (JSON 파싱 실패)"
elif [ "$HEALTH_CHECK" == "502" ] || [ "$HEALTH_CHECK" == "503" ]; then
    warn "⚠️  API 서버가 시작 중입니다 (HTTP $HEALTH_CHECK)"
    info "   10초 후 다시 확인합니다..."
    sleep 10
    
    HEALTH_CHECK2=$(curl -s -o /dev/null -w "%{http_code}" http://$PUBLIC_IP/api/health 2>/dev/null || echo "000")
    if [ "$HEALTH_CHECK2" == "200" ]; then
        log "✅ API 서버가 정상 작동 중입니다!"
        info "  🌐 API URL: http://$PUBLIC_IP/api"
    else
        warn "⚠️  API 서버가 아직 응답하지 않습니다"
        echo ""
        echo "  다음 명령어로 로그를 확인해보세요:"
        echo "  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store'"
    fi
else
    warn "⚠️  API 서버가 응답하지 않습니다 (HTTP $HEALTH_CHECK)"
    echo ""
    echo "  Nginx가 실행 중인지 확인:"
    echo "  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl status nginx'"
    echo ""
    echo "  PM2 로그 확인:"
    echo "  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store --lines 30'"
fi

# 6. 배포 정보 저장
echo ""
log "배포 정보 저장 중..."

PARENT_DIR=$(dirname "$(pwd)")
cat > "$PARENT_DIR/deployment-info.txt" << INFO_EOF
=== AWS EC2 배포 정보 (수정 완료) ===

수정 일시: $(date)

EC2 인스턴스:
- 퍼블릭 IP: $PUBLIC_IP
- 키 파일: $KEY_FILE
- SSH 접속: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP

서비스 URL:
- 백엔드 API: http://$PUBLIC_IP/api
- 헬스체크: http://$PUBLIC_IP/api/health

관리 명령어:
- 서버 상태 확인:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 status'

- 로그 확인:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store'

- 서비스 재시작:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 restart convenience-store'

- MongoDB 상태:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl status mongod'

- Nginx 상태:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl status nginx'

문제 해결:
- MongoDB 재시작:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl restart mongod'

- 환경 변수 확인:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'cat /var/www/convenience-store/.env'

- 전체 로그 확인:
  ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store --lines 100'

- 애플리케이션 재배포:
  ./aws-deploy/fix-aws-manual.sh
INFO_EOF

log "배포 정보를 deployment-info.txt에 저장했습니다."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "🎉 EC2 수정 작업이 완료되었습니다!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 다음 단계:"
echo ""
echo "  1. API 테스트:"
echo "     curl http://$PUBLIC_IP/api/health"
echo ""
echo "  2. 로그 실시간 모니터링:"
echo "     ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 logs convenience-store'"
echo ""
echo "  3. 프론트엔드 설정:"
echo "     - API URL을 http://$PUBLIC_IP/api로 변경"
echo "     - client/.env 또는 환경 변수에서 REACT_APP_API_URL 수정"
echo ""
echo "  4. 문제가 계속되면:"
echo "     - MongoDB: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'sudo systemctl restart mongod'"
echo "     - 애플리케이션: ssh -i $KEY_FILE ubuntu@$PUBLIC_IP 'pm2 restart convenience-store'"
echo ""
echo "💡 모든 정보는 deployment-info.txt 파일에 저장되어 있습니다."
echo ""

