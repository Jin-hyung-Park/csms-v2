# AWS CLI 자격 증명 설정 가이드

## 📋 사전 준비

AWS CLI 자격 증명을 설정하려면 다음 정보가 필요합니다:
- **AWS Access Key ID**
- **AWS Secret Access Key**

이 정보는 AWS IAM 콘솔에서 생성할 수 있습니다.

---

## 🔑 1단계: AWS Access Key 생성

### AWS 콘솔에서 Access Key 만들기

1. **AWS 콘솔 로그인**
   - https://console.aws.amazon.com 접속
   - AWS 계정으로 로그인

2. **IAM 서비스로 이동**
   - 상단 검색창에 "IAM" 입력
   - "IAM" 서비스 선택

3. **사용자 선택**
   - 왼쪽 메뉴에서 "사용자" 클릭
   - 본인의 사용자 이름 클릭
   - (루트 계정 사용 시: 오른쪽 상단 계정명 클릭 → "보안 자격 증명")

4. **액세스 키 생성**
   - "보안 자격 증명" 탭 클릭
   - "액세스 키 만들기" 버튼 클릭
   - 사용 사례 선택: "Command Line Interface (CLI)" 선택
   - 체크박스 동의 후 "다음" 클릭
   - (선택) 설명 태그 추가
   - "액세스 키 만들기" 클릭

5. **키 정보 저장** ⚠️ 중요!
   - **Access Key ID**: 예) AKIAIOSFODNN7EXAMPLE
   - **Secret Access Key**: 예) wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   - ⚠️ **Secret Key는 이때만 확인 가능합니다. 반드시 저장하세요!**
   - CSV 파일 다운로드 권장

---

## 🔧 2단계: AWS CLI 설치

### macOS
```bash
# Homebrew로 설치 (권장)
brew install awscli

# 또는 공식 설치 프로그램
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

### 설치 확인
```bash
aws --version
# 출력 예: aws-cli/2.x.x Python/3.x.x Darwin/xx.x.x botocore/2.x.x
```

---

## ⚙️ 3단계: AWS CLI 자격 증명 설정

### 방법 1: 대화형 설정 (권장)

```bash
aws configure
```

입력 프롬프트가 나타나면 다음을 입력:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

### 방법 2: 프로파일을 사용한 설정

여러 AWS 계정을 사용하는 경우:

```bash
# 'convenience-store' 프로파일 생성
aws configure --profile convenience-store
```

입력 프롬프트:
```
AWS Access Key ID [None]: YOUR_ACCESS_KEY_ID
AWS Secret Access Key [None]: YOUR_SECRET_ACCESS_KEY
Default region name [None]: ap-northeast-2
Default output format [None]: json
```

### 방법 3: 직접 파일 편집

```bash
# 자격 증명 파일 편집
mkdir -p ~/.aws
nano ~/.aws/credentials
```

다음 내용 입력:
```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY

[convenience-store]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
```

설정 파일 편집:
```bash
nano ~/.aws/config
```

다음 내용 입력:
```ini
[default]
region = ap-northeast-2
output = json

[profile convenience-store]
region = ap-northeast-2
output = json
```

---

## ✅ 4단계: 설정 확인

### 자격 증명 테스트

```bash
# 기본 프로파일 확인
aws sts get-caller-identity

# 특정 프로파일 확인
aws sts get-caller-identity --profile convenience-store
```

**성공 시 출력:**
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### EC2 인스턴스 목록 확인

```bash
# 서울 리전의 EC2 인스턴스 확인
aws ec2 describe-instances --region ap-northeast-2

# 특정 프로파일 사용
aws ec2 describe-instances --region ap-northeast-2 --profile convenience-store
```

---

## 🚀 5단계: 배포 스크립트 실행

### 자동 수정 스크립트 실행

```bash
cd /Users/Jinhyung_1/convenience_store_management/aws-deploy

# 기본 프로파일 사용
./fix-aws-deployment.sh

# 특정 프로파일 사용
AWS_PROFILE=convenience-store ./fix-aws-deployment.sh
```

### 또는 수동 스크립트 사용 (AWS CLI 없이)

AWS CLI 설정이 어려운 경우:

```bash
# EC2 IP와 키 파일만으로 수정
./fix-aws-manual.sh
```

---

## 🔒 보안 권장 사항

### 1. IAM 사용자 권한 최소화
루트 계정 대신 IAM 사용자를 생성하고 필요한 권한만 부여:

**필요한 권한:**
- `AmazonEC2FullAccess` - EC2 관리
- `AmazonS3FullAccess` - S3 관리
- `CloudWatchLogsFullAccess` - 로그 확인

### 2. MFA(다중 인증) 활성화
- IAM 사용자에 MFA 설정
- 루트 계정에 MFA 필수 설정

### 3. Access Key 주기적 교체
- 90일마다 Access Key 교체 권장
- 사용하지 않는 키는 즉시 삭제

### 4. 키 관리
- Secret Key는 안전한 곳에 보관
- GitHub 등 공개 저장소에 업로드 금지
- `.gitignore`에 `~/.aws/` 추가

---

## 🐛 문제 해결

### "Unable to locate credentials" 오류

```bash
# 설정 파일 확인
cat ~/.aws/credentials
cat ~/.aws/config

# 파일 권한 확인
ls -la ~/.aws/

# 권한이 잘못된 경우 수정
chmod 600 ~/.aws/credentials
chmod 600 ~/.aws/config
```

### "Access Denied" 오류

IAM 사용자 권한 확인:
```bash
# 현재 사용자 정보 확인
aws iam get-user

# 권한 정책 확인
aws iam list-attached-user-policies --user-name YOUR_USERNAME
```

### 프로파일이 작동하지 않음

```bash
# 환경 변수로 프로파일 설정
export AWS_PROFILE=convenience-store

# 또는 매번 --profile 옵션 사용
aws ec2 describe-instances --profile convenience-store
```

---

## 📞 추가 도움이 필요한 경우

### AWS CLI 설정이 어려운 경우

수동 스크립트를 사용하세요:

```bash
cd aws-deploy
chmod +x fix-aws-manual.sh
./fix-aws-manual.sh
```

이 스크립트는:
- AWS CLI 없이 작동
- EC2 IP와 SSH 키만 필요
- 대화형으로 정보 입력

### 빠른 테스트

```bash
# 1. AWS CLI 설치 확인
aws --version

# 2. 자격 증명 확인
aws sts get-caller-identity

# 3. EC2 확인
aws ec2 describe-instances --region ap-northeast-2

# 모두 성공하면:
./fix-aws-deployment.sh
```

---

## 📚 참고 자료

- [AWS CLI 공식 문서](https://docs.aws.amazon.com/cli/latest/userguide/)
- [AWS 자격 증명 설정](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html)
- [IAM 사용자 생성](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_users_create.html)

