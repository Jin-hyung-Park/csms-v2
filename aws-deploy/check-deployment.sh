#!/bin/bash

# 배포 상태 확인 스크립트

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[CHECK] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

if [ ! -f "deployment-info.txt" ]; then
    error "deployment-info.txt 파일을 찾을 수 없습니다. 먼저 배포를 실행하세요."
    exit 1
fi

# 배포 정보 읽기
PUBLIC_IP=$(grep "퍼블릭 IP:" deployment-info.txt | cut -d' ' -f3)
BUCKET_NAME=$(grep "버킷 이름:" deployment-info.txt | cut -d' ' -f3)
S3_URL=$(grep "웹사이트 URL:" deployment-info.txt | cut -d' ' -f3)

log "배포 상태 확인 중..."
echo "EC2 IP: $PUBLIC_IP"
echo "S3 버킷: $BUCKET_NAME"
echo "S3 URL: $S3_URL"
echo ""

# EC2 상태 확인
log "1. EC2 인스턴스 상태 확인..."
if ping -c 1 $PUBLIC_IP &> /dev/null; then
    echo "✅ EC2 인스턴스 접근 가능"
else
    error "❌ EC2 인스턴스 접근 불가"
fi

# 웹 서버 상태 확인
log "2. 웹 서버 상태 확인..."
if curl -s -o /dev/null -w "%{http_code}" http://$PUBLIC_IP | grep -q "200\|301\|302"; then
    echo "✅ 웹 서버 응답 정상"
else
    warn "⚠️ 웹 서버 응답 없음"
fi

# API 상태 확인
log "3. API 서버 상태 확인..."
if curl -s -o /dev/null -w "%{http_code}" http://$PUBLIC_IP/api/health | grep -q "200"; then
    echo "✅ API 서버 정상"
else
    warn "⚠️ API 서버 응답 없음"
fi

# S3 웹사이트 확인
log "4. S3 웹사이트 확인..."
if curl -s -o /dev/null -w "%{http_code}" $S3_URL | grep -q "200"; then
    echo "✅ S3 웹사이트 접근 가능"
else
    warn "⚠️ S3 웹사이트 접근 불가"
fi

log "배포 상태 확인 완료!"
echo ""
echo "🌐 서비스 URL:"
echo "   프론트엔드: $S3_URL"
echo "   백엔드 API: http://$PUBLIC_IP/api"
echo ""
echo "🔧 관리 명령어:"
echo "   SSH 접속: ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP"
echo "   서비스 상태: ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP 'pm2 status'"
echo "   로그 확인: ssh -i convenience-store-key.pem ubuntu@$PUBLIC_IP 'pm2 logs'"
