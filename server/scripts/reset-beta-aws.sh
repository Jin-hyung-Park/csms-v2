#!/bin/bash

# AWS EC2에서 베타 리셋을 실행하는 스크립트
# 배포 가이드 기반으로 실제 실행 가능한 명령어

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# AWS CLI 확인
if ! command -v aws &> /dev/null; then
    error "AWS CLI가 설치되어 있지 않습니다."
    echo "설치: brew install awscli (macOS) 또는 https://aws.amazon.com/cli/"
    exit 1
fi

# 1. EC2 인스턴스 찾기
log "실행 중인 EC2 인스턴스 확인 중..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=convenience-store*" "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text 2>/dev/null)

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" == "None" ]; then
    warn "convenience-store 태그가 있는 인스턴스를 찾을 수 없습니다."
    info "모든 실행 중인 인스턴스 목록:"
    aws ec2 describe-instances \
      --filters "Name=instance-state-name,Values=running" \
      --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0],PublicIpAddress]' \
      --output table
    
    read -p "인스턴스 ID를 직접 입력하세요 (또는 Enter로 종료): " INSTANCE_ID
    if [ -z "$INSTANCE_ID" ]; then
        error "인스턴스 ID가 필요합니다."
        exit 1
    fi
fi

log "인스턴스 ID: $INSTANCE_ID"

# 2. 퍼블릭 IP 가져오기
EC2_IP=$(aws ec2 describe-instances \
  --instance-ids $INSTANCE_ID \
  --query 'Reservations[0].Instances[0].PublicIpAddress' \
  --output text)

if [ -z "$EC2_IP" ] || [ "$EC2_IP" == "None" ]; then
    error "퍼블릭 IP를 가져올 수 없습니다."
    exit 1
fi

log "퍼블릭 IP: $EC2_IP"

# 3. 키 파일 찾기
KEY_FILE=""
POSSIBLE_PATHS=(
    "./convenience-store-key.pem"
    "../convenience-store-key.pem"
    "../../convenience-store-key.pem"
    "./aws-deploy/convenience-store-key.pem"
    "../aws-deploy/convenience-store-key.pem"
    "../../aws-deploy/convenience-store-key.pem"
    "$HOME/convenience-store-key.pem"
)

for path in "${POSSIBLE_PATHS[@]}"; do
    if [ -f "$path" ]; then
        KEY_FILE="$path"
        break
    fi
done

if [ -z "$KEY_FILE" ]; then
    error "키 파일을 찾을 수 없습니다."
    info "다음 위치에서 키 파일을 찾았습니다:"
    for path in "${POSSIBLE_PATHS[@]}"; do
        echo "  - $path"
    done
    read -p "키 파일 경로를 직접 입력하세요: " KEY_FILE
    if [ ! -f "$KEY_FILE" ]; then
        error "파일이 존재하지 않습니다: $KEY_FILE"
        exit 1
    fi
fi

log "키 파일: $KEY_FILE"

# 키 파일 권한 확인
chmod 400 "$KEY_FILE" 2>/dev/null || true

# 4. 확인
warn "⚠️  이 작업은 AWS 데이터베이스의 모든 테스트 데이터를 삭제합니다!"
info "인스턴스: $INSTANCE_ID ($EC2_IP)"
read -p "계속하시겠습니까? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    log "취소되었습니다."
    exit 0
fi

# 5. SSH 접속 및 리셋 실행
log "EC2에 연결하여 베타 리셋 실행 중..."

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@$EC2_IP << 'REMOTE_SCRIPT'
set -e

echo "🔍 프로젝트 디렉토리 찾는 중..."

# 가능한 경로들
POSSIBLE_DIRS=(
    "/var/www/convenience-store/server"
    "/var/www/convenience-store/csms-v2/server"
    "~/csms-v2/server"
    "/home/ubuntu/csms-v2/server"
    "/home/ubuntu/convenience-store/server"
)

FOUND_DIR=""
for dir in "${POSSIBLE_DIRS[@]}"; do
    expanded_dir=$(eval echo "$dir")
    if [ -d "$expanded_dir" ] && [ -f "$expanded_dir/scripts/reset-for-beta.js" ]; then
        FOUND_DIR="$expanded_dir"
        break
    fi
done

if [ -z "$FOUND_DIR" ]; then
    echo "❌ reset-for-beta.js 파일을 찾을 수 없습니다."
    echo "검색한 경로:"
    for dir in "${POSSIBLE_DIRS[@]}"; do
        echo "  - $dir"
    done
    echo ""
    echo "현재 디렉토리: $(pwd)"
    echo "파일 검색 중..."
    find /home /var/www -name "reset-for-beta.js" 2>/dev/null | head -5
    exit 1
fi

echo "✅ 프로젝트 디렉토리: $FOUND_DIR"
cd "$FOUND_DIR"

# .env 파일 확인
if [ ! -f ".env" ]; then
    echo "⚠️  .env 파일이 없습니다. 환경 변수를 확인하세요."
fi

# 스크립트 실행
echo "🚀 베타 리셋 스크립트 실행 중..."
node scripts/reset-for-beta.js --confirm

echo ""
echo "✅ 베타 리셋 완료!"
REMOTE_SCRIPT

if [ $? -eq 0 ]; then
    log ""
    log "✅ 베타 리셋이 성공적으로 완료되었습니다!"
    info "점주 계정: owner@cu002.local"
    info "비밀번호: change-me-after-first-login (첫 로그인 후 변경 권장)"
    info "매장코드: CU002"
else
    error "베타 리셋 실행 중 오류가 발생했습니다."
    exit 1
fi
