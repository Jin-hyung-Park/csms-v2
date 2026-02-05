# AWS 배포 전·후 체크리스트

배포 전에 아래 항목을 확인하고, 배포 후 설정을 적용하세요.

---

## 1. 배포 전 코드/설정 확인

### 1.1 환경 변수 (서버 .env)

EC2 또는 배포 환경의 **서버** `.env`에 다음을 설정하세요.

| 변수 | 필수 | 설명 |
|------|------|------|
| `NODE_ENV` | ✅ | `production` |
| `PORT` | ✅ | **5000** (Nginx가 5000으로 프록시하므로) |
| `MONGODB_URI` | ✅ | Atlas 사용 시 `mongodb+srv://...`, EC2 로컬 시 `mongodb://localhost:27017/convenience_store` |
| `JWT_SECRET` | ✅ | 강한 비밀키 (운영용으로 별도 생성) |
| `CLIENT_URL` | ✅ | 프론트 접속 URL (CORS용). 예: `https://버킷명.s3-website.ap-northeast-2.amazonaws.com` 또는 `http://EC2_IP` |
| `API_PUBLIC_URL` | 선택 | Excel 등 서버 내부에서 API 호출 시 사용. 예: `http://EC2_IP/api` 또는 `https://도메인/api` |

### 1.2 프론트엔드 빌드 시 환경 변수

**클라이언트** 빌드 시 API 주소를 지정해야 합니다.

```bash
# client/.env 또는 빌드 시 지정
REACT_APP_API_URL=http://YOUR_EC2_IP/api
# 또는 S3 + EC2 분리 시 (프론트가 S3, API가 EC2)
REACT_APP_API_URL=http://YOUR_EC2_IP/api
```

- EC2에서 Nginx로 프론트·API 둘 다 제공하면: `REACT_APP_API_URL=http://EC2_IP/api`
- 프론트만 S3, API는 EC2면: `REACT_APP_API_URL=http://EC2_IP/api` (실제 API 서버 주소)

### 1.3 CORS (서버)

`server/index.js`의 CORS `origin`에 **실제 프론트 URL**이 들어가야 합니다.

- `CLIENT_URL`을 .env에 넣어두면 자동 반영됩니다.
- 기존에 하드코딩된 S3 URL은 예전 배포용이므로, **새 버킷/도메인을 쓰면 반드시 `CLIENT_URL`로 설정**하세요.

### 1.4 Nginx (user-data 또는 EC2 설정)

- `aws-deploy/user-data.sh` 사용 시:  
  **`REPLACE_WITH_YOUR_S3_BUCKET`** 을 실제 S3 버킷 이름으로 바꾼 뒤 적용하세요.
- API 프록시는 `proxy_pass http://localhost:5000;` 이므로, **Node 서버는 반드시 PORT=5000**으로 기동되어야 합니다.

---

## 2. 수정 완료된 사항 (이미 반영됨)

| 항목 | 내용 |
|------|------|
| **Statistics.js** | 주휴수당 산출/수정/확정 API URL 하드코딩 제거 → `REACT_APP_API_URL` 또는 동일 오리진 `/api` 사용 |
| **api.js** | 기본 API URL: 개발은 `localhost:5001`, 프로덕션은 `/api`(동일 오리진). 특정 IP 하드코딩 제거 |
| **owner.js** | Excel 내부 API 호출 baseURL: `localhost` 제거 → `API_PUBLIC_URL` 또는 `req.protocol/host` 사용 |
| **user-data.sh** | Nginx `proxy_pass` 세미콜론 이스케이프 제거, S3 리다이렉트 URL을 `REPLACE_WITH_YOUR_S3_BUCKET` 플레이스홀더로 정리 |

---

## 3. 배포 후 확인

1. **헬스체크**  
   `curl http://EC2_IP/api/health` → `{"status":"OK",...}`

2. **프론트 접속**  
   S3 웹사이트 URL 또는 `http://EC2_IP` 로 로그인·API 호출 동작 확인

3. **CORS**  
   브라우저 콘솔에 CORS 에러 없어야 함. 있으면 서버 `CLIENT_URL`과 실제 프론트 URL 일치 여부 확인

4. **통계 페이지**  
   점주 로그인 → 통계 → 주휴수당 산출/수정/확정이 정상 동작하는지 확인

5. **Excel 다운로드**  
   점주 통계에서 Excel 내보내기 시 서버가 내부적으로 API 호출하는데, 이때 `API_PUBLIC_URL` 또는 Nginx Host가 맞아야 합니다.

---

## 4. 새 EC2 IP/도메인으로 배포할 때

- **client**: 빌드 전 `REACT_APP_API_URL=http://NEW_EC2_IP/api` 설정 후 `npm run build`
- **서버 .env**: `CLIENT_URL`을 새 프론트 URL로, 필요 시 `API_PUBLIC_URL`을 새 API URL로
- **문서/스크립트**: `DEPLOYMENT_GUIDE.md`, `deploy-frontend.sh` 등에 적힌 예전 IP(54.180.88.34 등)를 새 IP로 교체해 두면 유지보수에 유리합니다.

---

## 5. CloudFormation / AMI

- `aws-deploy/cloudformation/infrastructure.yaml`의 **AMI ID** (`ami-0c6e5afdd23291f73`)는 리전·시점에 따라 deprecated 될 수 있습니다.
- 새 스택 배포 전 [AWS 문서](https://docs.aws.amazon.com/ko_kr/AWSEC2/latest/UserGuide/finding-an-ami.html)에서 **ap-northeast-2(서울) Ubuntu 22.04 LTS** 최신 AMI ID로 교체하는 것을 권장합니다.

---

**요약**:  
서버는 **PORT=5000**, **CLIENT_URL·JWT_SECRET·MONGODB_URI** 필수.  
클라이언트는 빌드 시 **REACT_APP_API_URL**을 실제 API 주소로 설정.  
Nginx와 user-data의 S3 버킷명·CORS만 배포 환경에 맞게 맞추면 됩니다.
