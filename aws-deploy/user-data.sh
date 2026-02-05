#!/bin/bash

# EC2 인스턴스 초기 설정 스크립트 (무료 티어 최적화)

# 로그 설정
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "🚀 EC2 초기 설정 시작..."

# 시스템 업데이트
apt-get update -y
apt-get upgrade -y

# 필수 패키지 설치
apt-get install -y curl wget git nginx certbot python3-certbot-nginx htop

# Node.js 18 LTS 설치
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# PM2 프로세스 매니저 설치
npm install -g pm2

# MongoDB 설치 (무료 티어에서는 EC2 내부에 설치)
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# MongoDB 서비스 시작
systemctl start mongod
systemctl enable mongod

# Redis 설치 (캐싱용)
apt-get install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# 애플리케이션 디렉토리 생성
mkdir -p /var/www/convenience-store
chown -R ubuntu:ubuntu /var/www/convenience-store

# Nginx 기본 설정
cat > /etc/nginx/sites-available/convenience-store << 'NGINX_EOF'
server {
    listen 80;
    server_name _;
    
    # API 프록시
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 기본 페이지 (S3 정적 사이트로 리다이렉트 - 배포 시 REPLACE_WITH_YOUR_S3_BUCKET 실제 버킷명으로 교체)
    location / {
        return 301 https://REPLACE_WITH_YOUR_S3_BUCKET.s3-website.ap-northeast-2.amazonaws.com$request_uri;
    }
}
NGINX_EOF

# Nginx 설정 활성화
ln -s /etc/nginx/sites-available/convenience-store /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# 방화벽 설정
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable

# 스왑 파일 생성 (t2.micro는 1GB RAM이므로 스왑 필요)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# 메모리 최적화 설정
echo 'vm.swappiness=10' >> /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf

echo "✅ EC2 초기 설정 완료!"
