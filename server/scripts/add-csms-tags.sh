#!/bin/bash

# 현재 사용 중인 AWS 리소스에 csms 태그 추가

set -e

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log "AWS 리소스에 csms 태그 추가 중..."

# 1. EC2 인스턴스 태그 추가
log "1. EC2 인스턴스 태그 추가..."
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text)

if [ -n "$INSTANCE_ID" ] && [ "$INSTANCE_ID" != "None" ]; then
    info "EC2 인스턴스: $INSTANCE_ID"
    
    # 기존 태그 확인
    CURRENT_NAME=$(aws ec2 describe-instances \
      --instance-ids $INSTANCE_ID \
      --query 'Reservations[0].Instances[0].Tags[?Key==`Name`].Value' \
      --output text)
    
    info "현재 Name 태그: $CURRENT_NAME"
    
    # csms 관련 태그 추가
    aws ec2 create-tags \
      --resources $INSTANCE_ID \
      --tags \
        Key=Project,Value=csms \
        Key=Application,Value=csms-v2 \
        Key=Environment,Value=production
    
    # Name 태그가 convenience-store로 되어 있다면 csms로 변경 (선택사항)
    if [ "$CURRENT_NAME" == "convenience-store-server" ]; then
        aws ec2 create-tags \
          --resources $INSTANCE_ID \
          --tags Key=Name,Value=csms-server
        info "Name 태그를 csms-server로 변경했습니다."
    fi
    
    log "✅ EC2 인스턴스 태그 추가 완료"
else
    warn "실행 중인 EC2 인스턴스를 찾을 수 없습니다."
fi

# 2. S3 버킷 태그 추가 (가장 최근 버킷)
log "2. S3 버킷 태그 추가..."
LATEST_BUCKET=$(aws s3 ls | grep convenience-store-frontend | sort | tail -1 | awk '{print $3}')

if [ -n "$LATEST_BUCKET" ]; then
    info "최근 S3 버킷: $LATEST_BUCKET"
    
    # S3 버킷 태그 추가
    aws s3api put-bucket-tagging \
      --bucket $LATEST_BUCKET \
      --tagging "TagSet=[{Key=Project,Value=csms},{Key=Application,Value=csms-v2},{Key=Environment,Value=production}]" 2>/dev/null || \
    aws s3api put-bucket-tagging \
      --bucket $LATEST_BUCKET \
      --tagging "TagSet=[{Key=Project,Value=csms},{Key=Application,Value=csms-v2},{Key=Environment,Value=production}]"
    
    log "✅ S3 버킷 태그 추가 완료: $LATEST_BUCKET"
    
    # 다른 convenience-store 버킷들도 태그 추가
    for bucket in $(aws s3 ls | grep convenience-store-frontend | awk '{print $3}'); do
        if [ "$bucket" != "$LATEST_BUCKET" ]; then
            info "다른 버킷 태그 추가: $bucket"
            aws s3api put-bucket-tagging \
              --bucket $bucket \
              --tagging "TagSet=[{Key=Project,Value=csms},{Key=Application,Value=csms-v2}]" 2>/dev/null || true
        fi
    done
else
    warn "S3 버킷을 찾을 수 없습니다."
fi

# 3. 보안 그룹 태그 추가
log "3. 보안 그룹 태그 추가..."
SG_ID=$(aws ec2 describe-security-groups \
  --group-names convenience-store-sg \
  --query 'SecurityGroups[0].GroupId' \
  --output text 2>/dev/null)

if [ -n "$SG_ID" ] && [ "$SG_ID" != "None" ]; then
    info "보안 그룹: $SG_ID"
    
    aws ec2 create-tags \
      --resources $SG_ID \
      --tags \
        Key=Project,Value=csms \
        Key=Application,Value=csms-v2 \
        Key=Name,Value=csms-sg
    
    log "✅ 보안 그룹 태그 추가 완료"
else
    warn "보안 그룹을 찾을 수 없습니다."
fi

# 4. 태그 확인
log ""
log "=== 태그 추가 완료 ==="
log ""
info "추가된 태그:"
info "  - Project=csms"
info "  - Application=csms-v2"
info "  - Environment=production"
log ""
info "태그 확인 명령어:"
info "  EC2: aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].Tags'"
info "  S3:  aws s3api get-bucket-tagging --bucket $LATEST_BUCKET"
info "  SG:  aws ec2 describe-tags --filters \"Name=resource-id,Values=$SG_ID\""
