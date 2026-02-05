#!/bin/bash
# csms-v2를 기존 EC2·S3에 배포 (이전 버전 → csms-v2 교체)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REGION="ap-northeast-2"

# deployment-info.txt에서 EC2 IP, S3 버킷, 키 경로 읽기
if [ -f "$PROJECT_ROOT/deployment-info.txt" ]; then
  DEPLOY_INFO="$PROJECT_ROOT/deployment-info.txt"
elif [ -f "$SCRIPT_DIR/deployment-info.txt" ]; then
  DEPLOY_INFO="$SCRIPT_DIR/deployment-info.txt"
else
  echo "ERROR: deployment-info.txt 를 찾을 수 없습니다."
  exit 1
fi

PUBLIC_IP=$(grep "퍼블릭 IP:" "$DEPLOY_INFO" | awk '{print $NF}')
BUCKET_NAME=$(grep "버킷 이름:" "$DEPLOY_INFO" | awk '{print $NF}')
KEY_PATH="$SCRIPT_DIR/convenience-store-key.pem"
if [ ! -f "$KEY_PATH" ]; then
  KEY_PATH="$PROJECT_ROOT/aws-deploy/convenience-store-key.pem"
fi
if [ ! -f "$KEY_PATH" ]; then
  echo "ERROR: convenience-store-key.pem 을 찾을 수 없습니다."
  exit 1
fi

echo "=== csms-v2 배포 (기존 인프라 사용) ==="
echo "  EC2: $PUBLIC_IP"
echo "  S3:  $BUCKET_NAME"
echo ""

# 1. csms-v2 클라이언트 빌드
echo "[1/4] csms-v2 클라이언트 빌드..."
cd "$PROJECT_ROOT/csms-v2"
export REACT_APP_API_URL="http://$PUBLIC_IP"
export CI=false
npm install
(cd client && npm install --legacy-peer-deps)
npm run build

# 2. S3에 프론트엔드 업로드
echo "[2/4] S3에 프론트엔드 업로드..."
aws s3 sync client/build/ "s3://$BUCKET_NAME/" --delete --region "$REGION"

# S3 정적 웹사이트 설정: 404/403 시 index.html 반환 (SPA 새로고침 시 404 NoSuchKey 방지)
echo "  S3 웹사이트 설정 (에러 문서 → index.html)..."
aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document index.html 2>/dev/null || true

echo "  프론트엔드 URL: http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"

# 3. csms-v2 서버 패키징
echo "[3/4] csms-v2 서버 패키징..."
cd "$PROJECT_ROOT/csms-v2/server"
tar czf /tmp/csms-v2-server.tar.gz .

# 4. EC2에 업로드 후 배포
echo "[4/4] EC2에 서버 배포..."
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no /tmp/csms-v2-server.tar.gz ubuntu@$PUBLIC_IP:/tmp/

# EC2에서 실행할 배포 스크립트
DEPLOY_REMOTE=$(cat << 'DEPLOY_EOF'
set -e
APP_DIR="/var/www/convenience-store"
cd "$APP_DIR"

# 기존 프로세스 중지
pm2 delete convenience-store 2>/dev/null || true

# 기존 파일 백업 후 제거 (server/ 등)
rm -rf server package.json package-lock.json src scripts 2>/dev/null || true

# csms-v2 서버 압축 해제
tar xzf /tmp/csms-v2-server.tar.gz
rm /tmp/csms-v2-server.tar.gz

# 의존성 설치
npm install --omit=dev

# .env 생성 (PORT=5000: Nginx 프록시용)
cat > .env << ENV_EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/csms_ver2
JWT_SECRET=$(openssl rand -base64 32)
ENV_EOF

# PM2로 csms-v2 서버 기동 (진입점: src/index.js)
pm2 start src/index.js --name convenience-store
pm2 save

echo "csms-v2 서버 배포 완료."
pm2 status
DEPLOY_EOF
)

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$PUBLIC_IP "bash -s" <<< "$DEPLOY_REMOTE"

rm -f /tmp/csms-v2-server.tar.gz

echo ""
echo "=== csms-v2 배포 완료 ==="
echo "  프론트엔드: http://$BUCKET_NAME.s3-website.$REGION.amazonaws.com"
echo "  API:        http://$PUBLIC_IP/api"
echo "  헬스체크:   curl http://$PUBLIC_IP/api/health"
echo ""
echo "※ 502 발생 시 EC2에서 MongoDB 기동 후 PM2 재시작:"
echo "   ssh -i $KEY_PATH ubuntu@$PUBLIC_IP"
echo "   sudo systemctl start mongod && pm2 restart convenience-store"
echo ""
