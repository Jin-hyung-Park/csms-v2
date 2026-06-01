#!/usr/bin/env bash
# CSMS v2 배포 스크립트
# 사용법:
#   ./scripts/deploy.sh          # 프론트 + 백엔드 전체 배포
#   ./scripts/deploy.sh frontend # 프론트엔드만
#   ./scripts/deploy.sh backend  # 백엔드만

set -e

# ── 설정 ──────────────────────────────────────────────
KEY="/Users/Jinhyung_1/01.개인/convenience_store_management/aws-deploy/convenience-store-key.pem"
EC2_USER="ubuntu"
EC2_HOST="3.34.96.132"
EC2_APP_DIR="/var/www/convenience-store"
PM2_APP="convenience-store"
S3_BUCKET="s3://convenience-store-frontend-1770215884"
SSH_OPTS="-i \"$KEY\" -o StrictHostKeyChecking=no"

# 스크립트 위치 기준으로 프로젝트 루트 설정
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# ── 색상 출력 ──────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${YELLOW}[deploy]${NC} $1"; }
success() { echo -e "${GREEN}[deploy] ✓${NC} $1"; }
error()   { echo -e "${RED}[deploy] ✗${NC} $1"; exit 1; }

# ── 백엔드 배포 ────────────────────────────────────────
deploy_backend() {
  info "백엔드 배포 시작..."

  # server/src/ 전체를 EC2로 rsync (삭제된 파일도 반영)
  rsync -avz --delete \
    -e "ssh -i \"$KEY\" -o StrictHostKeyChecking=no" \
    "$ROOT_DIR/server/src/" \
    "$EC2_USER@$EC2_HOST:$EC2_APP_DIR/src/" \
    --exclude="__tests__" \
    2>&1 | grep -E "sending|sent|^>" || true

  # package.json 변경 시 npm install (node_modules 직접 비교)
  LOCAL_PKG="$ROOT_DIR/server/package.json"
  REMOTE_PKG_HASH=$(ssh -i "$KEY" -o StrictHostKeyChecking=no \
    "$EC2_USER@$EC2_HOST" "md5sum $EC2_APP_DIR/package.json 2>/dev/null | cut -d' ' -f1" || echo "")
  LOCAL_PKG_HASH=$(md5 -q "$LOCAL_PKG" 2>/dev/null || md5sum "$LOCAL_PKG" | cut -d' ' -f1)

  if [ "$LOCAL_PKG_HASH" != "$REMOTE_PKG_HASH" ]; then
    info "package.json 변경 감지 → npm install 실행..."
    scp -i "$KEY" -o StrictHostKeyChecking=no \
      "$LOCAL_PKG" "$EC2_USER@$EC2_HOST:$EC2_APP_DIR/package.json"
    ssh -i "$KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" \
      "cd $EC2_APP_DIR && npm install --omit=dev 2>&1 | tail -3"
  fi

  # PM2 재시작
  ssh -i "$KEY" -o StrictHostKeyChecking=no "$EC2_USER@$EC2_HOST" \
    "pm2 restart $PM2_APP" 2>&1 | grep -v "WARNING\|session\|upgrade\|openssh" || true

  success "백엔드 배포 완료"
}

# ── 프론트엔드 배포 ────────────────────────────────────
deploy_frontend() {
  info "프론트엔드 빌드 시작..."

  CI=false DISABLE_ESLINT_PLUGIN=true npm run build --prefix "$ROOT_DIR/client" || error "프론트엔드 빌드 실패"

  info "S3 업로드 중..."
  aws s3 sync "$ROOT_DIR/client/build" "$S3_BUCKET" --delete \
    2>&1 | grep -E "upload:|delete:" | head -20 || true

  success "프론트엔드 배포 완료"
}

# ── 실행 ───────────────────────────────────────────────
TARGET="${1:-all}"

case "$TARGET" in
  backend)
    deploy_backend
    ;;
  frontend)
    deploy_frontend
    ;;
  all|"")
    deploy_backend
    deploy_frontend
    ;;
  *)
    echo "사용법: $0 [all|frontend|backend]"
    exit 1
    ;;
esac

success "배포가 완료되었습니다."
