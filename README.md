# 🏪 편의점 근무 관리 시스템 (CSMS)

> Convenience Store Management System - 편의점의 근무 일정 관리, 급여 계산, 통계 분석을 위한 통합 관리 시스템

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-16+-brightgreen.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)

## 📋 목차

- [개요](#-개요)
- [주요 기능](#-주요-기능)
- [기술 스택](#️-기술-스택)
- [시스템 아키텍처](#-시스템-아키텍처)
- [프로젝트 구조](#-프로젝트-구조)
- [시작하기](#-시작하기)
- [배포](#-배포)
- [API 문서](#-api-문서)
- [주요 기능 상세](#-주요-기능-상세)

---

## 📖 개요

**CSMS (Convenience Store Management System)**는 편의점 프랜차이즈를 위한 종합 근무 관리 시스템입니다. 직원의 근무 일정 관리부터 급여 계산, 통계 분석까지 편의점 운영에 필요한 모든 기능을 제공합니다.

### 핵심 가치

- 📅 **효율적인 근무 일정 관리**: 직원별 근무 일정 등록 및 승인 시스템
- 💰 **정확한 급여 계산**: 시급 기반 급여 및 주휴수당 자동 계산
- 📊 **실시간 통계 분석**: 월별/주차별 근무 통계 및 리포트
- 🏢 **다중 점포 지원**: 여러 점포의 데이터 통합 관리
- 🔐 **안전한 인증 시스템**: JWT 기반 인증 및 카카오 소셜 로그인

---

## ✨ 주요 기능

### 👥 사용자 관리

- **역할 기반 권한 관리**: 점주(Owner), 매니저(Manager), 직원(Employee) 구분
- **카카오 소셜 로그인**: 간편한 로그인 및 회원가입
- **프로필 관리**: 직원 정보 관리 및 시급 설정
- **다중 점포 할당**: 점주는 여러 점포 관리, 직원은 소속 점포 지정

### 📅 근무 일정 관리

- **근무 일정 등록**: 직원이 자신의 근무 일정 등록
- **승인 시스템**: 점주의 근무 일정 승인/거절/수정
- **일괄 승인**: 여러 일정을 한 번에 승인
- **야간 근무 지원**: 다음날까지 이어지는 야간 근무 시간 자동 계산
- **휴식시간 반영**: 근무 시간 계산 시 휴식시간 자동 차감

### 💵 급여 관리

#### 자동 급여 계산
- **시급 기반 계산**: 설정된 시급에 따른 기본급 자동 계산
- **초과근무수당**: 8시간 초과 시 1.5배 수당 자동 계산
- **주휴수당**: 
  - 근로계약상 주 15시간 이상 근무 시 지급
  - 산식: `(1주 근로계약상 근로시간의합 / 40) × 8 × 시급`
  - 점주가 주차별로 산출/수정 가능
- **세금 계산**:
  - 주 15시간 미만: 세금 면제
  - 사업자소득(3.3%): 모든 주차에 적용
  - 소득세/지방세 자동 분리 계산

#### 급여 관리 기능
- **월별 급여 관리**: 월별 급여 정보 생성 및 관리
- **주차별 통계**: 직원별 주차별 근무 시간 및 급여 통계
- **급여 명세서**: 급여 상세 내역 조회 및 다운로드
- **급여 수정**: 점주가 주휴수당 등 수정 가능

### 📊 통계 및 리포트

- **직원별 주차별 통계**: 각 직원의 주차별 근무 시간, 급여 통계
- **월별 통계**: 월별 총 근무 시간, 급여, 세금 정보
- **점포별 통계**: 점포별 직원 통계 및 성과 분석
- **근무 패턴 분석**: 근무 시간 패턴 및 출석률 분석
- **엑셀 내보내기**: 통계 데이터를 Excel 파일로 내보내기

### 💰 지출 관리

- **일반 지출 관리**: 점포 운영에 필요한 지출 기록
- **고정 지출 관리**: 월별 고정 지출 항목 관리
- **지출 카테고리**: 지출 항목별 분류 및 통계

### 🔔 알림 시스템

- **근무 일정 승인 알림**: 근무 일정 승인/거절 시 알림
- **급여 관련 알림**: 급여 계산 완료 알림
- **시스템 알림**: 중요한 시스템 이벤트 알림

---

## 🛠️ 기술 스택

### Frontend

| 기술 | 버전 | 용도 |
|------|------|------|
| **React** | 18.x | UI 프레임워크 |
| **Redux Toolkit** | Latest | 상태 관리 |
| **Material-UI** | Latest | UI 컴포넌트 라이브러리 |
| **Formik + Yup** | Latest | 폼 관리 및 검증 |
| **React Router** | 6.x | 클라이언트 사이드 라우팅 |
| **Axios** | Latest | HTTP 클라이언트 |

### Backend

| 기술 | 버전 | 용도 |
|------|------|------|
| **Node.js** | 16+ | 서버 런타임 |
| **Express.js** | 4.x | 웹 프레임워크 |
| **MongoDB** | 4.4+ | NoSQL 데이터베이스 |
| **Mongoose** | 6.x | MongoDB ODM |
| **JWT** | Latest | 인증 토큰 |
| **Winston** | Latest | 로깅 시스템 |
| **Express Rate Limit** | Latest | API 요청 제한 |

### 인프라 (AWS)

- **EC2**: 서버 호스팅
- **S3**: 프론트엔드 정적 파일 호스팅
- **MongoDB Atlas**: 클라우드 데이터베이스
- **Nginx**: 리버스 프록시 및 웹 서버
- **PM2**: 프로세스 관리
- **CloudFormation**: 인프라 자동화

### 개발 도구

- **ESLint**: 코드 품질 관리
- **Prettier**: 코드 포맷팅
- **Jest**: 테스팅 프레임워크
- **Docker**: 컨테이너화
- **Git**: 버전 관리

---

## 🏗️ 시스템 아키텍처

```
┌─────────────┐
│   Client    │  React SPA (S3)
│  (Frontend) │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────┐
│    Nginx    │  리버스 프록시
│   (Port 80) │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Express   │  API Server (EC2)
│  (Port 5000)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  MongoDB    │  데이터베이스 (Atlas)
│   Atlas     │
└─────────────┘
```

### 역할별 접근 권한

| 기능 | 직원 | 매니저 | 점주 |
|------|:----:|:------:|:----:|
| 근무 일정 등록 | ✅ | ✅ | ✅ |
| 근무 일정 승인 | ❌ | ❌ | ✅ |
| 급여 조회 | ✅ | ✅ | ✅ |
| 급여 계산/수정 | ❌ | ❌ | ✅ |
| 통계 조회 | 본인만 | 본인만 | 전체 |
| 직원 관리 | ❌ | ❌ | ✅ |
| 점포 관리 | ❌ | ❌ | ✅ |

---

## 📁 프로젝트 구조

```
convenience_store_management/
├── 📂 client/                    # Frontend (React)
│   ├── 📂 src/
│   │   ├── 📂 components/        # 재사용 가능한 컴포넌트
│   │   │   ├── auth/            # 인증 관련 컴포넌트
│   │   │   ├── common/          # 공통 컴포넌트
│   │   │   └── layout/          # 레이아웃 컴포넌트
│   │   ├── 📂 pages/            # 페이지 컴포넌트
│   │   │   ├── auth/            # 로그인/회원가입
│   │   │   ├── employee/        # 직원 페이지
│   │   │   └── owner/           # 점주 페이지
│   │   ├── 📂 services/         # API 서비스 레이어
│   │   ├── 📂 store/            # Redux 스토어 및 슬라이스
│   │   ├── 📂 hooks/            # 커스텀 훅
│   │   └── 📂 utils/            # 유틸리티 함수
│   ├── 📂 public/               # 정적 파일
│   └── package.json
│
├── 📂 server/                   # Backend (Node.js/Express)
│   ├── 📂 config/               # 설정 파일
│   │   └── database.js          # MongoDB 연결 설정
│   ├── 📂 middleware/           # Express 미들웨어
│   │   ├── auth.js              # JWT 인증 미들웨어
│   │   └── errorHandler.js      # 에러 핸들링
│   ├── 📂 models/               # MongoDB 모델
│   │   ├── User.js              # 사용자 모델
│   │   ├── WorkSchedule.js      # 근무 일정 모델
│   │   ├── MonthlySalary.js     # 월별 급여 모델
│   │   ├── Store.js             # 점포 모델
│   │   ├── Expense.js           # 지출 모델
│   │   └── Notification.js      # 알림 모델
│   ├── 📂 routes/               # API 라우트
│   │   ├── auth.js              # 인증 라우트
│   │   ├── employee.js          # 직원 관련 API
│   │   ├── owner.js             # 점주 관련 API
│   │   ├── workSchedule.js      # 근무 일정 API
│   │   ├── monthlySalary.js     # 급여 관리 API
│   │   └── ...
│   ├── 📂 utils/                # 유틸리티 함수
│   │   ├── workHoursCalculator.js    # 근무 시간 계산
│   │   ├── holidayPayCalculator.js   # 주휴수당 계산
│   │   ├── taxCalculator.js          # 세금 계산
│   │   └── logger.js                 # 로깅 유틸
│   ├── 📂 scripts/              # 데이터 마이그레이션 스크립트
│   └── index.js                 # 서버 진입점
│
├── 📂 aws-deploy/               # AWS 배포 관련 파일
│   ├── 📂 cloudformation/       # CloudFormation 템플릿
│   ├── 📂 docker/               # Docker 설정
│   └── 📂 scripts/              # 배포 스크립트
│
├── 📄 README.md                 # 프로젝트 문서
├── 📄 package.json              # 프로젝트 설정
└── 📄 docker-compose.yml        # Docker Compose 설정
```

---

## 🚀 시작하기

### 필수 요구사항

- **Node.js** 16.x 이상
- **MongoDB** 4.4 이상 (또는 MongoDB Atlas)
- **npm** 또는 **yarn**

### 설치 및 실행

#### 1. 저장소 클론

```bash
git clone <repository-url>
cd convenience_store_management
```

#### 2. 의존성 설치

```bash
# 루트 의존성 설치
npm install

# 클라이언트 의존성 설치
cd client && npm install && cd ..
```

#### 3. 환경 변수 설정

루트 디렉토리에 `.env` 파일을 생성하고 다음 내용을 추가:

```env
# 서버 설정
PORT=5001
NODE_ENV=development

# 데이터베이스
MONGODB_URI=mongodb://localhost:27017/convenience_store
# 또는 MongoDB Atlas
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname

# JWT
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production

# 클라이언트 URL
CLIENT_URL=http://localhost:3000

# 카카오 로그인 (선택사항)
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
```

#### 4. 데이터베이스 설정

**로컬 MongoDB 사용 시:**
```bash
mongod
```

**MongoDB Atlas 사용 시:**
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)에서 클러스터 생성
- Connection String을 `.env` 파일의 `MONGODB_URI`에 설정

#### 5. 개발 서버 실행

```bash
# 전체 애플리케이션 실행 (백엔드 + 프론트엔드)
npm run dev

# 또는 개별 실행
npm run server    # Backend 서버만 (http://localhost:5001)
npm run client    # Frontend 개발 서버만 (http://localhost:3000)
```

#### 6. 브라우저에서 접속

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001/api

---

## 📦 배포

### AWS 배포

이 프로젝트는 AWS EC2, S3, MongoDB Atlas를 사용하여 배포됩니다.

#### 배포 구조

```
Frontend (S3) → Nginx (EC2) → Express API (EC2) → MongoDB Atlas
```

#### 배포 가이드

자세한 배포 가이드는 다음 문서를 참조하세요:

- [AWS 배포 가이드](./aws-deploy/AWS_DEPLOY_MANUAL.md)
- [프리 티어 배포 가이드](./aws-deploy/FREE_TIER_DEPLOY_GUIDE.md)
- [빠른 시작 가이드](./aws-deploy/QUICK_START.md)

#### 주요 배포 명령어

```bash
# 프론트엔드 빌드 및 배포
cd client && npm run build
# S3에 업로드 (aws-cli 필요)

# 백엔드 배포
scp -i key.pem server/** ubuntu@ec2-instance:/var/www/convenience-store/server/
ssh -i key.pem ubuntu@ec2-instance 'pm2 restart convenience-store'
```

---

## 📡 API 문서

### 인증

모든 API 요청에는 JWT 토큰이 필요합니다:

```http
Authorization: Bearer <jwt_token>
```

### 주요 API 엔드포인트

#### 인증
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `GET /api/auth/me` - 현재 사용자 정보

#### 근무 일정
- `GET /api/work-schedule` - 근무 일정 조회
- `POST /api/work-schedule` - 근무 일정 등록
- `PUT /api/work-schedule/:id/approve` - 근무 일정 승인
- `PUT /api/work-schedule/:id/reject` - 근무 일정 거절
- `PUT /api/work-schedule/:id` - 근무 일정 수정

#### 급여 관리
- `GET /api/employee/all-weekly-stats` - 직원별 주차별 통계 (점주)
- `GET /api/employee/weekly-stats` - 주차별 통계 (직원)
- `POST /api/monthly-salary/calculate-holiday-pay` - 주휴수당 산출
- `PUT /api/monthly-salary/adjust-holiday-pay` - 주휴수당 조정
- `POST /api/monthly-salary/confirm-holiday-pay` - 주휴수당 확정

#### 점포 관리 (점주)
- `GET /api/store` - 점포 목록 조회
- `POST /api/store` - 점포 생성
- `GET /api/owner/employees` - 직원 목록 조회

### API 응답 형식

#### 성공 응답
```json
{
  "data": {...},
  "message": "성공 메시지"
}
```

#### 에러 응답
```json
{
  "message": "에러 메시지",
  "errors": [...]
}
```

---

## 🔧 주요 기능 상세

### 💰 주휴수당 계산 시스템

#### 지급 조건
1. **근로계약상 주당 근로시간**: 15시간 이상
2. **소정근로일 개근**: 계약된 모든 근로일에 출근

#### 계산 공식
```
주휴수당 = (1주 근로계약상 근로시간의합 / 40) × 8 × 시급
```

#### 산출 프로세스
1. 점주가 통계 페이지에서 "산출" 버튼 클릭
2. 시스템이 다음을 자동 계산:
   - 실제 근무 시간
   - 근로계약상 근로 시간
   - 개근 여부
   - 주휴수당 금액
3. 점주가 필요 시 금액 및 사유 수정 가능
4. 직원은 주차별 근로정보에서 확인 가능

### 📊 급여 계산 로직

#### 기본 급여
```
기본급 = 실제 근무 시간 × 시급
```

#### 초과근무수당
```
초과근무시간 = 총 근무시간 - 8시간
초과근무수당 = 초과근무시간 × 시급 × 1.5
```

#### 세금 계산

**주 15시간 미만**
- 세금 면제

**사업자소득 (3.3%)**
- 모든 주차에 적용
- 소득세 90%, 지방세 10% 자동 분리

**기타 세제**
- 미신고: 세금 면제

### 📅 주차 계산 규칙

- **주의 시작**: 월요일
- **주의 종료**: 일요일
- **1주차**: 해당 월 1일이 포함된 주 (월요일 기준)
- **월 경계 처리**: 1주차는 이전 달 마지막 주와 합산하여 계산

---

## 🔐 보안

### 인증 및 인가
- JWT 토큰 기반 인증
- 역할 기반 접근 제어 (RBAC)
- 비밀번호 bcrypt 암호화

### 데이터 보호
- 입력 데이터 검증 (express-validator)
- SQL 인젝션 방지 (Mongoose ODM)
- XSS 방지 (Helmet.js)
- Rate Limiting (express-rate-limit)

### 로깅
- Winston을 통한 구조화된 로깅
- 에러 추적 및 모니터링
- 민감 정보 마스킹

---

## 🧪 테스팅

```bash
# 전체 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage

# 특정 파일 테스트
npm test -- --testPathPattern=WorkSchedule
```

---

## 📝 코드 스타일

### ESLint
```bash
npm run lint
npm run lint:fix
```

### Prettier
```bash
npm run format
```

### 주요 규칙
- ES6+ 문법 사용
- 함수형 프로그래밍 패러다임
- camelCase (변수, 함수), PascalCase (컴포넌트)
- 의미 있는 변수명 및 함수명

---

## 🤝 기여하기

1. 이 저장소를 Fork합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

---

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

---

## 📞 지원 및 문의

- **이슈 리포팅**: GitHub Issues를 통해 버그 리포트 및 기능 요청
- **문의사항**: 프로젝트 관리자에게 문의

---

## 🎯 향후 계획

- [ ] 모바일 앱 개발 (React Native)
- [ ] 실시간 알림 시스템 (WebSocket)
- [ ] 대시보드 개선 (차트 및 그래프)
- [ ] 자동 급여 지급 연동
- [ ] 고급 통계 및 분석 기능

---

**CSMS Development Team**  
**최종 업데이트**: 2025년 10월
