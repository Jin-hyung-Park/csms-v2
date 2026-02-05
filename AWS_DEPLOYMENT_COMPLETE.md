# 🌐 AWS 배포 완료!

## ✅ 배포 성공

**배포 완료 일시**: 2025년 10월 8일

---

## 🌍 접속 정보

### 메인 웹사이트
```
http://54.180.88.34
```

- **프론트엔드**: React 앱 (Nginx 서빙)
- **백엔드 API**: Node.js + Express (포트 5000)
- **데이터베이스**: MongoDB 6.0.26

---

## 📊 배포된 서비스

| 서비스 | 상태 | 설명 |
|--------|------|------|
| 🌐 프론트엔드 | ✅ Running | React 앱 (Nginx) |
| 🔧 백엔드 API | ✅ Running | Node.js (PM2) |
| 💾 MongoDB | ✅ Running | 6.0.26 |
| 🔴 Redis | ✅ Running | 캐싱 |
| 🌐 Nginx | ✅ Running | 웹 서버 |

---

## 📦 복원된 데이터

| 컬렉션 | 문서 개수 |
|--------|----------|
| users | 10 |
| stores | 3 |
| workschedules | 120 |
| notifications | 398 |
| expenses | 4 |
| fixedexpenses | 1 |
| monthlysalaries | 7 |
| **총계** | **543** |

---

## 🔧 관리 명령어

### SSH 접속
```bash
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34
```

### 서비스 상태 확인
```bash
# PM2 프로세스 상태
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'pm2 status'

# MongoDB 상태
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'sudo systemctl status mongod'

# Nginx 상태
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'sudo systemctl status nginx'
```

### 로그 확인
```bash
# 백엔드 로그
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'pm2 logs convenience-store'

# Nginx 로그
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'sudo tail -50 /var/log/nginx/error.log'

# MongoDB 로그
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'sudo tail -50 /var/log/mongodb/mongod.log'
```

### 서비스 재시작
```bash
# 백엔드 재시작
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'pm2 restart convenience-store'

# MongoDB 재시작
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'sudo systemctl restart mongod'

# Nginx 재시작
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'sudo systemctl restart nginx'
```

---

## 🔄 프론트엔드 업데이트 방법

로컬에서 코드를 수정한 후:

```bash
# 1. 프론트엔드 빌드
cd client
npm run build

# 2. 빌드 파일 압축
tar czf build.tar.gz build/

# 3. EC2로 전송
scp -i ../aws-deploy/convenience-store-key.pem build.tar.gz ubuntu@54.180.88.34:/tmp/

# 4. EC2에서 배포
ssh -i ../aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34
cd /tmp
tar xzf build.tar.gz
sudo cp -r build/* /var/www/html/
sudo systemctl reload nginx
```

또는 자동 스크립트 사용:
```bash
cd aws-deploy
./deploy-frontend-update.sh
```

---

## 🔐 보안 설정

### 방화벽
- 포트 22 (SSH): 열림
- 포트 80 (HTTP): 열림
- 포트 443 (HTTPS): 열림 (SSL 설정 시)

### SSL 인증서 설정 (선택사항)

도메인이 있다면:
```bash
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34
sudo certbot --nginx -d your-domain.com
```

---

## 📊 모니터링

### API 헬스체크
```bash
curl http://54.180.88.34/api/health
```

### 시스템 리소스
```bash
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34 'htop'
```

---

## 💾 백업

### MongoDB 백업
```bash
# EC2에서 실행
ssh -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34
mongodump --db convenience_store --out /tmp/backup
tar czf backup-$(date +%Y%m%d).tar.gz /tmp/backup
```

### 로컬로 다운로드
```bash
scp -i aws-deploy/convenience-store-key.pem ubuntu@54.180.88.34:/tmp/backup-*.tar.gz ./
```

---

## 🚨 문제 해결

### 웹사이트가 안 열리는 경우
1. Nginx 상태 확인
2. 방화벽 확인 (보안 그룹)
3. EC2 인스턴스 상태 확인

### API 오류가 발생하는 경우
1. PM2 로그 확인
2. MongoDB 상태 확인
3. 환경 변수 확인

### 데이터가 안 보이는 경우
1. MongoDB 연결 확인
2. 데이터베이스 백업 복원
3. 컬렉션 확인

---

## 💰 예상 비용

- **EC2 t2.micro**: 무료 티어 (12개월)
- **데이터 전송**: 무료 티어 (월 15GB)
- **예상 월 비용**: $0 (무료 티어 기간)

---

## 📝 다음 단계

1. ✅ 도메인 연결 (선택사항)
2. ✅ SSL 인증서 설정 (선택사항)
3. ✅ CloudWatch 알림 설정 (선택사항)
4. ✅ 자동 백업 스크립트 설정 (선택사항)
5. ✅ PM2 Plus 모니터링 (선택사항)

---

## 🎉 축하합니다!

편의점 관리 시스템이 AWS에서 성공적으로 배포되었습니다!

- 모든 데이터 복원 완료
- 프론트엔드 + 백엔드 정상 작동
- 로컬 서버 종료 (AWS만 사용)

**메인 URL**: http://54.180.88.34

