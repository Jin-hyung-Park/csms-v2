# ⚡ AWS 배포 빠른 시작 가이드

## 🚀 3분 만에 배포하기

### 1단계: 사전 준비 (1분)

```bash
# AWS CLI 설치 확인
aws --version

# 없다면 설치 (macOS)
brew install awscli

# AWS 계정 설정
aws configure
# Access Key ID: [IAM에서 생성한 키]
# Secret Access Key: [IAM에서 생성한 시크릿]
# Region: ap-northeast-2
# Output: json
```

### 2단계: 자동 배포 실행 (10분)

```bash
# 프로젝트 디렉토리로 이동
cd /Users/Jinhyung_1/convenience_store_management

# 배포 스크립트 실행
./aws-deploy/deploy-free-tier.sh
```

### 3단계: 배포 확인 (1분)

```bash
# 배포 상태 확인
./aws-deploy/check-deployment.sh
```

## 🎯 완료!

배포가 완료되면 다음 정보가 표시됩니다:

- **프론트엔드**: http://your-bucket.s3-website.ap-northeast-2.amazonaws.com
- **백엔드 API**: http://your-ec2-ip/api
- **SSH 접속**: `ssh -i convenience-store-key.pem ubuntu@your-ec2-ip`

## 💰 예상 비용: $0.50/월

## 🔧 관리 명령어

```bash
# 서비스 재시작
./aws-deploy/restart-services.sh

# 배포 상태 확인
./aws-deploy/check-deployment.sh

# SSH 접속
ssh -i convenience-store-key.pem ubuntu@$(grep "퍼블릭 IP:" deployment-info.txt | cut -d' ' -f3)
```

## ❓ 문제가 생겼다면?

1. **로그 확인**: `ssh -i convenience-store-key.pem ubuntu@your-ip 'pm2 logs'`
2. **서비스 재시작**: `./aws-deploy/restart-services.sh`
3. **메뉴얼 참고**: `aws-deploy/AWS_DEPLOY_MANUAL.md`

---

**💡 팁**: 처음 배포 시에는 EC2 초기화에 5-10분이 소요됩니다.
