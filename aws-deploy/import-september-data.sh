#!/bin/bash

# AWS EC2에서 9월 데이터 임포트 스크립트

echo "📦 AWS EC2에서 9월 데이터 임포트 시작..."

# 1. 파일을 EC2로 전송
scp -i convenience-store-key.pem server/scripts/importSeptemberDataAWS.js ubuntu@54.180.88.34:/tmp/
scp -i convenience-store-key.pem 'sample data/25년 9월 CU대치:삼성메가 인건비 현황.xlsx' ubuntu@54.180.88.34:/tmp/

echo "✅ 파일 전송 완료"

# 2. EC2에서 스크립트 실행
ssh -i convenience-store-key.pem ubuntu@54.180.88.34 << 'EOF'
cd /var/www/convenience-store
cp -r /tmp/importSeptemberDataAWS.js server/scripts/
mkdir -p 'sample data'
cp /tmp/'25년 9월 CU대치:삼성메가 인건비 현황.xlsx' 'sample data/'

cd server/scripts
node importSeptemberDataAWS.js
EOF

echo "✅ 임포트 완료"

