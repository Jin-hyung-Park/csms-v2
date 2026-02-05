# 프론트엔드 배포 가이드

## 현재 상황

- ✅ **로컬**: 주휴수당이 제거된 새로운 빌드 파일 생성 완료
- ❌ **AWS**: 이전 버전의 파일이 여전히 배포되어 있음
- ❌ **SSH 접속**: AWS EC2 인스턴스에 등록된 SSH 키 필요

## 배포 방법

### 1단계: 파일 준비 (완료)

다음 파일들이 준비되었습니다:
- `client-build-updated.tar.gz`: 새로운 빌드 파일 (주휴수당 UI 제거됨)
- `deploy-frontend.sh`: 배포 자동화 스크립트

### 2단계: AWS EC2 접속

#### 방법 A: AWS 콘솔 사용

1. [AWS EC2 콘솔](https://console.aws.amazon.com/ec2)에 접속
2. 인스턴스 선택 (IP: 54.180.88.34)
3. "Connect" 버튼 클릭
4. "Session Manager" 또는 "EC2 Instance Connect" 선택
5. 터미널 창이 열리면 다음 명령어 실행:

```bash
sudo su - ubuntu
cd /home/ubuntu/convenience_store_management
```

#### 방법 B: SSH 키 사용

AWS EC2 인스턴스 생성 시 다운로드한 `.pem` 파일을 사용:

```bash
# SSH 키 권한 설정 (최초 1회만)
chmod 400 /path/to/your-key.pem

# SSH 접속
ssh -i /path/to/your-key.pem ubuntu@54.180.88.34
```

### 3단계: 파일 업로드

로컬 컴퓨터에서 다음 명령어를 실행하여 파일을 AWS 서버로 업로드:

```bash
# 빌드 파일 업로드
scp -i /path/to/your-key.pem client-build-updated.tar.gz ubuntu@54.180.88.34:/home/ubuntu/convenience_store_management/

# 배포 스크립트 업로드
scp -i /path/to/your-key.pem deploy-frontend.sh ubuntu@54.180.88.34:/home/ubuntu/convenience_store_management/
```

### 4단계: 배포 실행

AWS 서버에 SSH 접속한 상태에서 다음 명령어 실행:

```bash
cd /home/ubuntu/convenience_store_management
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

### 5단계: 확인

배포가 완료되면 다음을 확인:

1. **웹사이트 접속**: http://54.180.88.34
2. **주휴수당 컬럼 제거 확인**: 주차별 근로 정보 페이지에서 주휴수당 컬럼이 사라졌는지 확인
3. **브라우저 캐시 삭제**: Ctrl+Shift+R (또는 Cmd+Shift+R) 강력 새로고침

## 문제 해결

### 문제 1: SSH 접속 실패

**원인**: SSH 키 권한 문제 또는 잘못된 키 사용

**해결방법**:
- AWS 콘솔의 "Connect" 기능 사용
- SSH 키 파일 권한 확인: `chmod 400 /path/to/your-key.pem`
- 올바른 SSH 키 파일 사용 확인

### 문제 2: 파일 업로드 실패

**원인**: SCP 권한 문제

**해결방법**:
- AWS 콘솔의 "Session Manager"를 통해 접속 후 직접 파일 복사
- AWS S3를 통한 파일 전송

### 문제 3: 배포 후에도 주휴수당 컬럼이 보임

**원인**: 브라우저 캐시

**해결방법**:
- 브라우저 강력 새로고침: Ctrl+Shift+R (또는 Cmd+Shift+R)
- 브라우저 캐시 완전 삭제
- 시크릿 모드로 접속하여 확인

## 배포 내역

### 변경사항

#### 백엔드 (server/routes/workSchedule.js)
- 주휴수당 계산 로직 완전 제거
- `holidayPay` 항상 0으로 설정
- 복잡한 근로계약상 근무일수 계산 로직 제거

#### 프론트엔드 (client/src/pages/)
- `employee/WeeklyStats.js`: 주휴수당 표시 UI 제거
- `owner/Statistics.js`: 주휴수당 표시 UI 제거
- 테이블 컬럼 단순화
- 주휴수당 안내 섹션 제거

### 영향 범위

- ✅ 주차별 근로 정보 페이지
- ✅ 통계 페이지
- ✅ 월별 급여 확정 기능
- ✅ 엑셀 다운로드 기능

## 지원

문제가 발생하면 다음 로그를 확인:

```bash
# Nginx 로그
sudo tail -f /var/log/nginx/error.log

# Node.js 로그 (PM2)
pm2 logs convenience-store

# 시스템 로그
sudo journalctl -u nginx -f
```

## 참고 사항

- **서버 IP**: 54.180.88.34
- **배포 경로**: `/home/ubuntu/convenience_store_management`
- **Nginx 설정**: `/etc/nginx/sites-available/default`
- **백업 위치**: `/home/ubuntu/convenience_store_management/client/build_backup_*`

