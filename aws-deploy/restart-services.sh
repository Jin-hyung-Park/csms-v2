#!/bin/bash

# 서비스 재시작 스크립트

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[RESTART] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# deployment-info.txt 찾기 (프로젝트 루트 또는 aws-deploy)
if [ -f "deployment-info.txt" ]; then
    DEPLOY_INFO="deployment-info.txt"
elif [ -f "aws-deploy/deployment-info.txt" ]; then
    DEPLOY_INFO="aws-deploy/deployment-info.txt"
else
    error "deployment-info.txt 파일을 찾을 수 없습니다. 먼저 aws-deploy/deploy-free-tier.sh 로 배포하세요."
fi

PUBLIC_IP=$(grep "퍼블릭 IP:" "$DEPLOY_INFO" | awk '{print $NF}')
KEY_PATH=""
if [ -f "aws-deploy/convenience-store-key.pem" ]; then
    KEY_PATH="aws-deploy/convenience-store-key.pem"
elif [ -f "convenience-store-key.pem" ]; then
    KEY_PATH="convenience-store-key.pem"
else
    error "convenience-store-key.pem 을 찾을 수 없습니다. aws-deploy/ 또는 프로젝트 루트에 있는지 확인하세요."
fi

log "서비스 재시작 중..."

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP << 'REMOTE_COMMANDS'
# PM2 서비스 재시작
pm2 restart convenience-store

# Nginx 재시작
sudo systemctl restart nginx

# MongoDB 재시작
sudo systemctl restart mongod

# Redis 재시작
sudo systemctl restart redis-server

# 서비스 상태 확인
echo "=== 서비스 상태 ==="
pm2 status
sudo systemctl status nginx --no-pager -l
sudo systemctl status mongod --no-pager -l
sudo systemctl status redis-server --no-pager -l
REMOTE_COMMANDS

log "서비스 재시작 완료!"
