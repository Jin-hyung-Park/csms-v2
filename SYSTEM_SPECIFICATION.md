# 편의점 관리 시스템 (CSMS) - 시스템 명세서

> **작성일**: 2025-11-13  
> **버전**: 2.0 (모바일 최적화 + 심플한 구조)  
> **작성 목적**: 시스템 재구현을 위한 기능 단위 정의 및 구조 명세

## 🚀 빠른 요약 (재구현 핵심)

### 추천 기술 스택
```
프론트엔드: React 18 + Tailwind CSS + PWA
상태 관리:  React Query (서버 상태) + Zustand (UI 상태)
백엔드:     Express.js
데이터베이스: MongoDB Atlas
배포:       Vercel (개발) → AWS EC2 (프로덕션)
```

### 기존 대비 주요 변경사항
| 항목 | 기존 | 변경 후 | 효과 |
|------|------|---------|------|
| UI 라이브러리 | Material-UI | Tailwind CSS | 번들 50% 감소, 모바일 우선 |
| 상태 관리 | Redux Toolkit | React Query + Zustand | 코드량 70% 감소 |
| 모바일 지원 | 반응형 웹 | PWA + 모바일 최적화 | 앱처럼 설치 가능 |
| 리버스 프록시 | Nginx (필수) | Nginx (선택) | 개발 단계 간소화 |

### 개발 기간
- **Phase 1 (MVP)**: 2~3주 - 모바일 웹 앱 완성
- **Phase 2 (프로덕션)**: 3~4주 - 배포 가능한 수준
- **Phase 3 (확장)**: 선택사항 - 네이티브 앱 전환

---

## 📋 목차

1. [시스템 개요](#1-시스템-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [사용자 역할 및 권한](#3-사용자-역할-및-권한)
4. [점주(Owner) 기능 단위](#4-점주owner-기능-단위)
5. [근로자(Employee) 기능 단위](#5-근로자employee-기능-단위)
6. [데이터 모델 구조](#6-데이터-모델-구조)
7. [주요 비즈니스 로직](#7-주요-비즈니스-로직)
8. [재구현 권장사항](#8-재구현-권장사항)

---

## 1. 시스템 개요

### 1.1 시스템 정의
**CSMS(Convenience Store Management System)**는 편의점의 근무 일정 관리, 급여 계산, 통계 분석을 위한 통합 관리 시스템입니다.

### 1.2 핵심 목표
- ✅ 근로자 근무 일정 등록 및 점주 승인 시스템
- ✅ 자동 급여 계산 (기본급 + 주휴수당 + 세금)
- ✅ 주차별/월별 통계 제공
- ✅ 다중 점포 지원

### 1.3 기술 스택 (재구현 권장)

| 구분 | 기술 | 선택 이유 |
|------|------|----------|
| **Frontend** | React 18, Tailwind CSS, PWA | 심플하고 모바일 최적화, 앱처럼 설치 가능 |
| **상태관리** | React Query, Zustand | Redux보다 간단하고 가벼움 |
| **Backend** | Node.js, Express.js | 검증된 기술, 심플한 구조 |
| **Database** | MongoDB (Atlas) | NoSQL, 유연한 스키마 |
| **인증** | JWT | 간단하고 효율적 |
| **배포** | AWS EC2 (또는 Vercel) | 프로덕션: EC2, 개발/테스트: Vercel |

#### 기존 기술 스택과 비교

| 항목 | 기존 | 재구현 | 변경 이유 |
|------|------|--------|----------|
| UI 라이브러리 | Material-UI | Tailwind CSS | 더 가볍고 커스터마이징 쉬움, 모바일 우선 |
| 상태 관리 | Redux Toolkit | React Query + Zustand | 코드량 50% 감소, 서버 상태 자동 관리 |
| 모바일 지원 | 반응형 웹 | PWA + 반응형 | 앱처럼 설치 가능, 오프라인 지원 |
| 리버스 프록시 | Nginx (필수) | Nginx (선택) | 개발 단계에서는 불필요 |

---

## 2. 시스템 아키텍처

### 2.1 전체 구조 (재구현 권장)

#### 개발/테스트 환경 (간소화)
```
┌─────────────────────┐
│  React PWA          │  프론트엔드 (localhost:3000)
│  + Tailwind CSS     │  - PWA로 앱처럼 동작
└──────────┬──────────┘  - 모바일 최적화
           │ HTTP
           ▼
┌─────────────────────┐
│  Express API        │  백엔드 (localhost:5001)
│  + JWT Auth         │  - RESTful API
└──────────┬──────────┘  - 인증/권한 관리
           │
           ▼
┌─────────────────────┐
│  MongoDB Atlas      │  클라우드 데이터베이스
│  (Free Tier)        │
└─────────────────────┘
```

#### 프로덕션 환경 (선택사항)
```
┌─────────────────────┐
│  React PWA (S3)     │  프론트엔드 정적 호스팅
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│  Nginx (선택)       │  리버스 프록시 (성능 향상)
│  Port: 80/443       │  - SSL 관리
└──────────┬──────────┘  - 정적 파일 캐싱
           │
           ▼
┌─────────────────────┐
│  Express API (EC2)  │  백엔드 서버
│  + PM2              │  - 프로세스 관리
└──────────┬──────────┘  - 자동 재시작
           │
           ▼
┌─────────────────────┐
│  MongoDB Atlas      │  데이터베이스
└─────────────────────┘
```

**💡 권장사항**: 
- **초기 개발**: Nginx 없이 Express만 사용 (간단함)
- **프로덕션**: 필요시 Nginx 추가 (성능/보안)

### 2.2 디렉토리 구조 (재구현 권장)

```
csms/                                # 프로젝트 루트
├── client/                          # 프론트엔드 (React PWA)
│   ├── public/
│   │   ├── manifest.json           # PWA 설정
│   │   ├── service-worker.js       # 오프라인 지원
│   │   └── icons/                  # 앱 아이콘
│   └── src/
│       ├── api/
│       │   └── client.js           # Axios 설정 (JWT 인터셉터)
│       ├── components/             # 재사용 컴포넌트
│       │   ├── common/
│       │   │   ├── Button.jsx
│       │   │   ├── Card.jsx
│       │   │   ├── Loading.jsx
│       │   │   └── MobileBottomNav.jsx
│       │   ├── schedule/
│       │   │   ├── ScheduleCard.jsx
│       │   │   └── ScheduleForm.jsx
│       │   └── layout/
│       │       ├── Header.jsx
│       │       └── Layout.jsx
│       ├── pages/
│       │   ├── owner/              # 점주 페이지
│       │   │   ├── Dashboard.jsx
│       │   │   ├── EmployeeList.jsx
│       │   │   ├── SalaryCalendar.jsx  # 급여 정보 (통계 → 급여 캘린더)
│       │   │   └── ApproveRequests.jsx
│       │   ├── employee/           # 근로자 페이지
│       │   │   ├── Dashboard.jsx
│       │   │   ├── WorkSchedule.jsx
│       │   │   ├── SalaryDetails.jsx  # 급여 상세 (주차별 통계 → 급여)
│       │   │   └── Profile.jsx
│       │   └── auth/
│       │       ├── Login.jsx
│       │       └── Register.jsx
│       ├── hooks/                  # 커스텀 훅
│       │   ├── useAuth.js          # 인증 훅
│       │   ├── useSchedules.js     # React Query 훅
│       │   └── useStats.js
│       ├── store/                  # Zustand 스토어
│       │   ├── authStore.js        # 인증 상태
│       │   └── uiStore.js          # UI 상태 (모달, 토스트 등)
│       ├── utils/
│       │   ├── format.js           # 날짜/숫자 포맷팅
│       │   └── constants.js        # 상수
│       ├── App.jsx
│       ├── index.css               # Tailwind 설정
│       └── index.jsx
│
├── server/                          # 백엔드 (Express)
│   ├── routes/
│   │   ├── auth.js                 # 인증 API
│   │   ├── schedules.js            # 근무일정 API (RESTful)
│   │   ├── salary.js               # 급여 API (점주/근로자)
│   │   ├── employees.js            # 직원 관리 API (점주)
│   │   └── stores.js               # 점포 API
│   ├── models/
│   │   ├── User.js                 # 사용자 모델
│   │   ├── WorkSchedule.js         # 근무일정 모델
│   │   ├── Store.js                # 점포 모델
│   │   └── MonthlySalary.js        # 월별급여 모델 (선택)
│   ├── middleware/
│   │   ├── auth.js                 # JWT 인증
│   │   ├── authorize.js            # 권한 체크
│   │   └── errorHandler.js         # 에러 핸들러
│   ├── utils/
│   │   ├── workHours.js            # 근무시간 계산 (간소화)
│   │   ├── holidayPay.js           # 주휴수당 계산 (간소화)
│   │   ├── tax.js                  # 세금 계산
│   │   └── week.js                 # 주차 계산 (간소화)
│   ├── config/
│   │   └── database.js             # MongoDB 연결
│   └── index.js                    # 서버 진입점
│
├── .env.example                     # 환경 변수 템플릿
├── package.json                     # 루트 패키지
└── README.md                        # 프로젝트 문서
```

#### 주요 변경사항

| 변경 전 | 변경 후 | 이유 |
|---------|---------|------|
| `store/` (Redux) | `store/` (Zustand) + `hooks/` (React Query) | 코드 간소화, 서버 상태 자동 관리 |
| `services/` | `api/` + `hooks/` | React Query로 통합 |
| Material-UI 컴포넌트 | Tailwind 기반 커스텀 컴포넌트 | 가벼움, 모바일 최적화 |
| 복잡한 utils | 간소화된 utils | 핵심 기능만 유지 |
| AWS 배포 폴더 | 제거 (선택사항) | 초기에는 Vercel/Railway 사용 권장 |

---

## 3. 사용자 역할 및 권한

### 3.1 역할 정의 (간소화)

| 역할 | 권한 수준 | 주요 기능 |
|------|----------|----------|
| **Owner (점주)** | 관리자 | 전체 시스템 관리, 승인, 급여 관리 |
| **Employee (근로자)** | 일반 사용자 | 본인 근무 등록 및 급여 조회 |

**💡 변경 이유**: 
- 매니저 역할 제거로 권한 체계 단순화
- 2단계 권한 구조로 개발/유지보수 간편
- 필요시 점주가 여러 명일 수 있음 (다중 점포)

### 3.2 기능별 권한 매트릭스

| 기능 | 근로자 | 점주 |
|------|:------:|:----:|
| 근무 일정 등록 | ✅ | ✅ |
| 근무 일정 승인/거절 | ❌ | ✅ |
| 근무 일정 수정 | 본인만 | 전체 |
| 급여 조회 (주차별) | 본인만 | 전체 |
| 주휴수당 산정/수정/확정 | ❌ | ✅ |
| 직원 관리 | ❌ | ✅ |
| 급여 캘린더 조회 | ❌ | ✅ |
| 점포 관리 | ❌ | ✅ |
| 지출 관리 | ❌ | ✅ |

---

## 4. 점주(Owner) 기능 단위

### 4.1 대시보드 (Dashboard)

**API**: `GET /api/owner/dashboard`

**기능**: 점포 중심의 통합 관리 대시보드
- 점주가 관리하고 있는 점포 정보 조회
- 점포별 근무 인원 현황
- 점포별 승인된 근로시간 총합
- 점포별 근로시간 승인 요청 건수

**표시 정보**:
```javascript
{
  stores: [                      // 점포 목록
    {
      storeId: ObjectId,
      storeName: String,         // 점포명
      address: String,           // 점포 주소
      
      // 근무 인원
      employeeCount: Number,     // 총 근무 인원
      activeEmployees: Number,   // 활성 근로자 수
      
      // 승인된 근로시간 (이번 달)
      totalApprovedHours: Number,  // 승인된 총 근로시간
      totalApprovedPay: Number,    // 예상 급여 총액
      
      // 승인 요청
      pendingRequests: Number,   // 승인 대기 중인 근무 일정 수
      lastUpdated: Date,         // 마지막 업데이트 시간
      
      // 클릭 시 이동할 페이지 정보
      links: {
        employees: "/owner/employees?storeId={storeId}",
        schedules: "/owner/schedules?storeId={storeId}",
        statistics: "/owner/statistics?storeId={storeId}",
        approveRequests: "/owner/approve?storeId={storeId}"
      }
    }
  ],
  summary: {                     // 전체 요약
    totalStores: Number,         // 총 점포 수
    totalEmployees: Number,      // 전체 근로자 수
    totalPendingRequests: Number, // 전체 승인 대기 건수
    totalMonthlyHours: Number    // 이번 달 전체 근로시간
  }
}
```

**UI/UX**:
- 각 점포는 카드 형태로 표시 (모바일 최적화)
- 점포 카드 클릭 시 해당 점포의 상세 페이지로 이동
- 승인 요청 건수가 있으면 뱃지로 강조 표시
- 점포별 데이터를 한눈에 비교 가능

**예시 화면 구조**:
```
┌─────────────────────────────────┐
│  전체 요약                        │
│  • 총 3개 점포                    │
│  • 총 12명 근로자                 │
│  • 승인 대기 5건                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📍 CU 대치점                     │
│  ────────────────────────────    │
│  👥 근무 인원: 5명                │
│  ⏰ 승인된 시간: 180시간           │
│  📋 승인 요청: 3건 🔴             │
│  💰 예상 급여: ₩1,800,000         │
│  → 상세보기                       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📍 CU 삼성점                     │
│  ────────────────────────────    │
│  👥 근무 인원: 4명                │
│  ⏰ 승인된 시간: 150시간           │
│  📋 승인 요청: 2건 🔴             │
│  💰 예상 급여: ₩1,500,000         │
│  → 상세보기                       │
└─────────────────────────────────┘
```

### 4.2 직원 관리 (Employee Management)

#### 4.2.1 직원 목록 조회 (리스트 + 팝업 상세)

**리스트 API**: `GET /api/owner/employees`

**기능**:
- 점포별 필터링
- 검색 (이름, 전화번호)
- 페이지네이션 또는 무한 스크롤

**리스트 화면 표시 정보** (간소화):
```javascript
{
  employees: [
    {
      id: ObjectId,
      name: String,              // 이름
      storeInfo: {               // 소속 점포
        storeId: ObjectId,
        storeName: String
      },
      workInfo: {                // 근무 정보 요약
        workDays: String,        // "월, 수, 금"
        workTime: String,        // "09:00-18:00"
        weeklyHours: Number      // 주 24시간
      },
      profileImage: String,      // 프로필 이미지
      isActive: Boolean          // 활성 상태
    }
  ]
}
```

**리스트 UI 예시**:
```
┌──────────────────────────────────┐
│  [검색] [점포 필터 ▼]             │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  👤 홍길동          ✅ 활성       │
│  📍 CU 대치점                     │
│  🗓️  월, 수, 금 | 09:00-18:00    │
│  ⏰ 주 24시간                     │
│  → 클릭하여 상세보기              │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  👤 김철수          ❌ 비활성     │
│  📍 CU 삼성점                     │
│  🗓️  화, 목, 토 | 14:00-22:00    │
│  ⏰ 주 24시간                     │
│  → 클릭하여 상세보기              │
└──────────────────────────────────┘
```

#### 4.2.2 직원 상세 정보 팝업

**상세 API**: `GET /api/owner/employees/:id`

**팝업 표시 정보** (전체):
```javascript
{
  // 기본 정보
  id: ObjectId,
  name: String,                  // 이름
  email: String,                 // 이메일
  phoneNumber: String,           // 전화번호
  profileImage: String,          // 프로필 이미지
  
  // 점포 정보
  storeInfo: {
    storeId: ObjectId,
    storeName: String,
    address: String
  },
  
  // 근무 일정
  workSchedule: {                // 요일별 근무시간
    monday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    wednesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
    // ... 나머지 요일
  },
  weeklyHours: Number,           // 주간 총 근무시간 (자동 계산)
  
  // 급여 정보
  hourlyWage: Number,            // 시급
  taxType: String,               // 세금 신고 유형
  
  // 계약 정보
  hireDate: Date,                // 입사일
  terminationDate: Date,         // 퇴사일 (있는 경우)
  ssn: String,                   // 주민번호 (마스킹: 123456-1******)
  
  // 추가 정보
  address: String,               // 주소
  emergencyContact: {            // 비상연락처
    name: String,
    phone: String,
    relationship: String
  },
  
  // 상태
  isActive: Boolean,
  
  // 최근 통계 (3개월)
  recentStats: {
    totalHours: Number,          // 총 근무시간
    totalPay: Number,            // 총 급여
    attendanceRate: Number       // 출석률 (%)
  }
}
```

**팝업 UI 구조**:
```
┌─────────────────────────────────┐
│  👤 직원 상세 정보          [✕]  │
├─────────────────────────────────┤
│                                  │
│  [프로필 사진]                   │
│                                  │
│  📋 기본 정보                    │
│  • 이름: 홍길동                  │
│  • 이메일: hong@example.com     │
│  • 전화: 010-1234-5678          │
│  • 주소: 서울시 강남구...        │
│                                  │
│  🏪 소속 점포                    │
│  • CU 대치점                     │
│  • 서울시 강남구 대치동 123      │
│                                  │
│  🗓️  근무 일정                   │
│  ┌──────────────────────────┐  │
│  │ 월 ✅ 09:00 - 18:00      │  │
│  │ 수 ✅ 09:00 - 18:00      │  │
│  │ 금 ✅ 09:00 - 18:00      │  │
│  └──────────────────────────┘  │
│  • 주 24시간                     │
│                                  │
│  💰 급여 정보                    │
│  • 시급: ₩10,030                │
│  • 세금 유형: 사업자소득(3.3%)   │
│                                  │
│  📄 계약 정보                    │
│  • 입사일: 2024-01-15           │
│  • 퇴사일: -           │
│  • 주민번호: 901234-1******     │
│                                  │
│  [수정] [퇴사 처리] [닫기]       │
└─────────────────────────────────┘
```

#### 4.2.3 직원 정보 수정 (팝업 내 수정)

**수정 API**: `PUT /api/owner/employees/:id`

**수정 가능 항목**:
```javascript
{
  // 기본 정보
  phoneNumber: String,           // 전화번호
  address: String,               // 주소
  
  // 점포 변경
  storeId: ObjectId,
  
  // 근무 일정 변경
  workSchedule: {
    monday: { enabled, startTime, endTime },
    tuesday: { enabled, startTime, endTime },
    // ... 전체 요일
  },
  
  // 급여 정보
  hourlyWage: Number,            // 시급
  taxType: String,               // 세금 신고 유형
  
  // 계약 정보
  hireDate: Date,                // 입사일
  ssn: String,                   // 주민번호
  
  // 비상연락처
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  
  // 상태
  isActive: Boolean              // 활성/비활성
}
```

**수정 모드 동작**:
1. 팝업에서 [수정] 버튼 클릭
2. 모든 필드가 입력 가능 상태로 변경
3. 버튼이 [저장] [취소]로 변경
4. [저장] 클릭 시 유효성 검사 후 저장
5. 실시간 검증:
   - 시급: 최저시급 이상
   - 전화번호: 형식 검증
   - 근무시간: 논리적 검증 (시작 < 종료)

**프론트엔드 구현 예시**:
```jsx
// 직원 목록 페이지
function EmployeeList() {
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [storeFilter, setStoreFilter] = useState('all');
  
  // React Query로 직원 목록 조회
  const { data: employees } = useQuery({
    queryKey: ['employees', storeFilter],
    queryFn: () => api.get(`/api/owner/employees?storeId=${storeFilter}`)
  });

  return (
    <div className="p-4">
      {/* 필터 */}
      <div className="mb-4 flex gap-2">
        <input 
          type="search" 
          placeholder="이름, 전화번호 검색"
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select 
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">전체 점포</option>
          <option value="store1">CU 대치점</option>
          <option value="store2">CU 삼성점</option>
        </select>
      </div>

      {/* 직원 리스트 */}
      <div className="space-y-3">
        {employees?.map(employee => (
          <EmployeeCard 
            key={employee.id} 
            employee={employee}
            onClick={() => setSelectedEmployee(employee.id)}
          />
        ))}
      </div>

      {/* 상세 팝업 */}
      {selectedEmployee && (
        <EmployeeDetailModal 
          employeeId={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}

// 직원 카드 컴포넌트
function EmployeeCard({ employee, onClick }) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          {employee.profileImage ? (
            <img 
              src={employee.profileImage} 
              className="w-12 h-12 rounded-full"
              alt={employee.name}
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              👤
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold">{employee.name}</h3>
            <p className="text-sm text-gray-600">📍 {employee.storeInfo.storeName}</p>
          </div>
        </div>
        <span className={`
          text-xs px-2 py-1 rounded-full
          ${employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
        `}>
          {employee.isActive ? '✅ 활성' : '❌ 비활성'}
        </span>
      </div>
      
      <div className="text-sm text-gray-700">
        <p>🗓️  {employee.workInfo.workDays} | {employee.workInfo.workTime}</p>
        <p>⏰ 주 {employee.workInfo.weeklyHours}시간</p>
      </div>
      
      <p className="text-sm text-blue-600 mt-2">→ 클릭하여 상세보기</p>
    </div>
  );
}

// 상세 팝업 컴포넌트
function EmployeeDetailModal({ employeeId, onClose }) {
  const [isEditing, setIsEditing] = useState(false);
  
  // 상세 정보 조회
  const { data: employee } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: () => api.get(`/api/owner/employees/${employeeId}`)
  });
  
  // 수정 뮤테이션
  const updateMutation = useMutation({
    mutationFn: (data) => api.put(`/api/owner/employees/${employeeId}`, data),
    onSuccess: () => {
      setIsEditing(false);
      // 리스트 새로고침
      queryClient.invalidateQueries(['employees']);
    }
  });

  if (!employee) return <Loading />;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">👤 직원 상세 정보</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-6">
          {/* 프로필 이미지 */}
          <div className="flex justify-center">
            {employee.profileImage ? (
              <img 
                src={employee.profileImage} 
                className="w-24 h-24 rounded-full"
                alt={employee.name}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-4xl">
                👤
              </div>
            )}
          </div>

          {/* 기본 정보 */}
          <InfoSection title="📋 기본 정보">
            <InfoField label="이름" value={employee.name} />
            <InfoField label="이메일" value={employee.email} />
            <InfoField 
              label="전화" 
              value={employee.phoneNumber} 
              editable={isEditing}
            />
            <InfoField 
              label="주소" 
              value={employee.address} 
              editable={isEditing}
            />
          </InfoSection>

          {/* 소속 점포 */}
          <InfoSection title="🏪 소속 점포">
            <InfoField label="점포명" value={employee.storeInfo.storeName} />
            <InfoField label="주소" value={employee.storeInfo.address} />
          </InfoSection>

          {/* 근무 일정 */}
          <InfoSection title="🗓️  근무 일정">
            <WorkScheduleView 
              schedule={employee.workSchedule} 
              editable={isEditing}
            />
            <p className="mt-2 text-sm text-gray-600">
              • 주 {employee.weeklyHours}시간
            </p>
          </InfoSection>

          {/* 급여 정보 */}
          <InfoSection title="💰 급여 정보">
            <InfoField 
              label="시급" 
              value={`₩${employee.hourlyWage.toLocaleString()}`}
              editable={isEditing}
            />
            <InfoField 
              label="세금 유형" 
              value={employee.taxType}
              editable={isEditing}
            />
          </InfoSection>

          {/* 계약 정보 */}
          <InfoSection title="📄 계약 정보">
            <InfoField 
              label="입사일" 
              value={new Date(employee.hireDate).toLocaleDateString()}
            />
            <InfoField 
              label="주민번호" 
              value={employee.ssn}
              editable={isEditing}
            />
          </InfoSection>

          {/* 비상연락처 */}
          <InfoSection title="🚨 비상연락처">
            <InfoField 
              label="이름" 
              value={employee.emergencyContact?.name}
              editable={isEditing}
            />
            <InfoField 
              label="전화" 
              value={employee.emergencyContact?.phone}
              editable={isEditing}
            />
            <InfoField 
              label="관계" 
              value={employee.emergencyContact?.relationship}
              editable={isEditing}
            />
          </InfoSection>

          {/* 최근 통계 */}
          <InfoSection title="📊 최근 3개월 통계">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">총 근무시간</p>
                <p className="text-xl font-bold">{employee.recentStats.totalHours}h</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">총 급여</p>
                <p className="text-xl font-bold">₩{employee.recentStats.totalPay.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">출석률</p>
                <p className="text-xl font-bold">{employee.recentStats.attendanceRate}%</p>
              </div>
            </div>
          </InfoSection>
        </div>

        {/* 버튼 */}
        <div className="sticky bottom-0 bg-white border-t p-4 flex gap-2">
          {!isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg"
              >
                수정
              </button>
              <button className="flex-1 bg-red-600 text-white py-2 rounded-lg">
                퇴사 처리
              </button>
              <button 
                onClick={onClose}
                className="px-6 bg-gray-200 py-2 rounded-lg"
              >
                닫기
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => updateMutation.mutate(/* 수정된 데이터 */)}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg"
              >
                저장
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-200 py-2 rounded-lg"
              >
                취소
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

#### 4.2.4 직원 삭제

**삭제 API**: `DELETE /api/owner/employees/:id`

**기능**:
- 직원 및 관련 데이터 완전 삭제
- 연쇄 삭제: 근무 일정, 알림, 급여 정보 등 모두 삭제

**삭제 확인 팝업**:
```
┌─────────────────────────────────┐
│  ⚠️  직원 삭제 확인               │
├─────────────────────────────────┤
│                                  │
│  정말로 "홍길동" 직원을           │
│  삭제하시겠습니까?                │
│                                  │
│  삭제 시 다음 데이터도            │
│  모두 삭제됩니다:                 │
│  • 근무 일정 (35건)              │
│  • 급여 정보 (3개월)             │
│  • 알림 내역                     │
│                                  │
│  ⚠️ 이 작업은 되돌릴 수 없습니다  │
│                                  │
│  [삭제] [취소]                   │
└─────────────────────────────────┘
```

**💡 참고**: 
- 퇴사 처리는 `isActive: false`로 설정 (데이터 보존)
- 완전 삭제는 신중하게 사용
- 4.2.1의 팝업에서 모든 정보 수정 가능 (별도 근로계약 관리 페이지 불필요)

---

**직원 관리 전체 흐름**:
```
1. 리스트 화면 (간소화)
   ↓ 클릭
2. 팝업 (전체 정보)
   ↓ [수정] 버튼
3. 수정 모드 (입력 활성화)
   ↓ [저장] 버튼
4. API 호출 및 리스트 새로고침
```

**모바일 최적화 포인트**:
- ✅ 리스트는 필수 정보만 (스크롤 최소화)
- ✅ 팝업은 전체 화면 (모바일에서 읽기 쉬움)
- ✅ 터치 영역 충분 (최소 44px)
- ✅ 스와이프로 닫기 가능
- ✅ 로딩 상태 표시

### 4.3 근무 일정 승인 (Approve Requests)

**API**: `GET /api/owner/schedules`

**기능**:
- 대기 중인 근무 일정 목록 조회
- 점포별, 직원별, 상태별 필터링
- 월별 필터링

**승인/거절** (`PUT /api/work-schedule/:id/approve` | `PUT /api/work-schedule/:id/reject`):
- 개별 일정 승인/거절
- 거절 사유 입력
- 일괄 승인 기능

**수정** (`PUT /api/work-schedule/:id`):
- 근무 시간 수정
- 수정 사유 입력
- 수정 후 자동 승인

### 4.4 급여 정보 (Salary Management)

#### 4.4.1 급여 캘린더 (월별 전체 근로자 급여 조회)

**API**: `GET /api/owner/salary-calendar`

**기능**:
- 해당 월 전체 근로자의 급여 정보를 캘린더 형태로 조회
- 점포별 필터링
- 월별 이동 (이전/다음 달)

**조회 정보**:
```javascript
{
  year: Number,                  // 연도
  month: Number,                 // 월
  storeId: ObjectId,             // 점포 (필터)
  
  employees: [                   // 근로자 목록
    {
      employeeId: ObjectId,
      employeeName: String,
      storeId: ObjectId,
      storeName: String,
      hourlyWage: Number,
      
      // 주차별 급여 정보 (1~6주차)
      weeklyData: {
        1: {                     // 1주차
          weekNumber: 1,
          startDate: "2025-11-04",  // 월요일
          endDate: "2025-11-10",    // 일요일
          
          // 근무 현황
          totalHours: Number,    // 총 근무시간
          workDays: Number,      // 근무일수
          
          // 급여 계산
          basePay: Number,       // 기본급 (시급 × 시간)
          holidayPay: Number,    // 주휴수당
          weeklyTotal: Number,   // 주간 총액
          
          // 주휴수당 상태
          holidayPayStatus: String,  // 'not_calculated' | 'calculated' | 'adjusted' | 'confirmed'
          
          // 일별 근무 (캘린더용)
          dailySchedules: [
            {
              date: "2025-11-04",
              dayOfWeek: "월",
              startTime: "09:00",
              endTime: "18:00",
              hours: 8,
              pay: 80240,
              status: "approved"  // 승인 상태
            },
            // ... 해당 주의 근무일들
          ]
        },
        2: { /* 2주차 */ },
        3: { /* 3주차 */ },
        // ... 최대 6주차
      },
      
      // 월별 합계
      monthlyTotal: {
        totalHours: Number,
        totalBasePay: Number,
        totalHolidayPay: Number,
        totalGrossPay: Number,
        taxInfo: {
          taxAmount: Number,
          incomeTax: Number,
          localTax: Number,
          netPay: Number
        }
      }
    }
  ],
  
  // 전체 합계
  summary: {
    totalEmployees: Number,
    totalHours: Number,
    totalPay: Number,
    totalHolidayPay: Number
  }
}
```

**캘린더 UI 구조**:
```
┌─────────────────────────────────────────┐
│  [◀ 2025년 10월] [2025년 11월] [12월 ▶] │
│  [점포: CU 대치점 ▼]                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  👤 홍길동 (시급: ₩10,030)               │
├─────────────────────────────────────────┤
│  월별 합계: 180h | ₩1,805,400 | 세후 ₩1,745,626 │
├─────────────────────────────────────────┤
│                                          │
│  [1주차] 11/04(월) ~ 11/10(일)           │
│  ┌──┬──┬──┬──┬──┬──┬──┐              │
│  │월│화│수│목│금│토│일│              │
│  ├──┼──┼──┼──┼──┼──┼──┤              │
│  │8h│ -│8h│ -│8h│ -│ -│              │
│  │✅│  │✅│  │✅│  │  │              │
│  └──┴──┴──┴──┴──┴──┴──┘              │
│  근무: 24h | 급여: ₩240,720            │
│  주휴수당: ₩20,060 [산정] [수정] [확정]  │
│  주간 총액: ₩260,780                   │
│                                          │
│  [2주차] 11/11(월) ~ 11/17(일)           │
│  ┌──┬──┬──┬──┬──┬──┬──┐              │
│  │월│화│수│목│금│토│일│              │
│  ├──┼──┼──┼──┼──┼──┼──┤              │
│  │8h│ -│8h│ -│8h│ -│ -│              │
│  │✅│  │✅│  │✅│  │  │              │
│  └──┴──┴──┴──┴──┴──┴──┘              │
│  근무: 24h | 급여: ₩240,720            │
│  주휴수당: ₩20,060 ✅ 확정됨            │
│  주간 총액: ₩260,780                   │
│                                          │
│  ... (3~6주차)                           │
│                                          │
├─────────────────────────────────────────┤
│  👤 김철수 (시급: ₩10,500)               │
│  ... (동일 형식)                         │
└─────────────────────────────────────────┘

[Excel 다운로드]
```

#### 4.4.2 주휴수당 관리

**주휴수당 3단계 프로세스**:

##### 1단계: 산정 (Calculate)
**API**: `POST /api/owner/salary/holiday-pay/calculate`

**요청**:
```javascript
{
  employeeId: ObjectId,
  year: Number,
  month: Number,
  weekNumber: Number           // 1~6
}
```

**기능**:
- 주휴수당 자동 계산
- 계산 조건 확인:
  - 근로계약상 주 15시간 이상
  - 소정근로일 개근 여부
- 계산 공식: `(주간 근로계약 시간 / 40) × 8 × 시급`

**응답**:
```javascript
{
  weekNumber: 1,
  calculation: {
    contractWeeklyHours: 24,   // 근로계약상 주간 시간
    actualWorkHours: 24,       // 실제 근무시간
    contractWorkDays: 3,       // 근로계약상 근무일수
    actualWorkDays: 3,         // 실제 근무일수
    isEligible: true,          // 지급 자격 여부
    calculatedAmount: 20060,   // 계산된 금액
    reason: String             // 계산 사유 (지급/미지급)
  },
  status: 'calculated'
}
```

**UI 동작**:
- [산정] 버튼 클릭 → 자동 계산
- 계산 결과 표시
- 상태가 'calculated'로 변경

##### 2단계: 수정 (Adjust)
**API**: `PUT /api/owner/salary/holiday-pay/adjust`

**요청**:
```javascript
{
  employeeId: ObjectId,
  year: Number,
  month: Number,
  weekNumber: Number,
  adjustedAmount: Number,      // 수정된 금액
  reason: String,              // 수정 사유 (필수)
  notes: String                // 추가 메모
}
```

**기능**:
- 점주가 주휴수당 금액 직접 수정
- 수정 사유 입력 필수
- 수정 이력 저장

**UI 동작**:
- [수정] 버튼 클릭 → 입력 모달 표시
- 금액 입력 필드
- 수정 사유 입력 (필수)
- 저장 시 상태가 'adjusted'로 변경

**수정 모달**:
```
┌─────────────────────────────────┐
│  주휴수당 수정                    │
├─────────────────────────────────┤
│                                  │
│  대상: 홍길동 - 1주차             │
│                                  │
│  자동 계산 금액: ₩20,060         │
│                                  │
│  수정 금액:                       │
│  [₩ ____________]               │
│                                  │
│  수정 사유: (필수)                │
│  [결근 1일 발생으로 감액]         │
│                                  │
│  추가 메모:                       │
│  [____________________]         │
│                                  │
│  [저장] [취소]                   │
└─────────────────────────────────┘
```

##### 3단계: 확정 (Confirm)
**API**: `POST /api/owner/salary/holiday-pay/confirm`

**요청**:
```javascript
{
  employeeId: ObjectId,
  year: Number,
  month: Number,
  weekNumber: Number
}
```

**기능**:
- 주휴수당 최종 확정
- 확정 후 수정 불가 (재산정 필요)
- 근로자에게 표시

**응답**:
```javascript
{
  weekNumber: 1,
  holidayPay: 20060,
  status: 'confirmed',
  confirmedAt: Date,
  confirmedBy: ObjectId
}
```

**UI 동작**:
- [확정] 버튼 클릭 → 확인 팝업
- 확정 후 ✅ 표시
- 버튼이 [재산정]으로 변경

**버튼 상태별 표시**:
```javascript
// 미산정
주휴수당: - [산정]

// 산정됨
주휴수당: ₩20,060 [수정] [확정]

// 수정됨
주휴수당: ₩15,000 (수정됨) [재수정] [확정]

// 확정됨
주휴수당: ₩20,060 ✅ 확정됨 [재산정]
```

#### 4.4.3 급여 리포트 다운로드

**API**: `GET /api/owner/salary-report/excel`

**기능**:
- 월별 급여 명세서 Excel 다운로드
- 점포별 시트 분리
- 주차별 상세 정보 포함

**Excel 구조**:
```
Sheet 1: CU 대치점
┌──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│근로자│주차  │근무  │기본급│주휴  │주간  │세후  │
│명    │      │시간  │      │수당  │총액  │수령액│
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│홍길동│1주차 │24h   │240,720│20,060│260,780│252,355│
│홍길동│2주차 │24h   │240,720│20,060│260,780│252,355│
│...   │...   │...   │...   │...   │...   │...   │
│합계  │-     │180h  │1,805,400│160,480│1,965,880│1,902,902│
├──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│김철수│...   │...   │...   │...   │...   │...   │
└──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

---

**프론트엔드 구현 예시**:

```jsx
// 급여 캘린더 페이지
function SalaryCalendar() {
  const [selectedMonth, setSelectedMonth] = useState('2025-11');
  const [storeFilter, setStoreFilter] = useState('all');
  const [expandedEmployees, setExpandedEmployees] = useState([]);

  // 급여 캘린더 데이터 조회
  const { data: salaryData } = useQuery({
    queryKey: ['salary-calendar', selectedMonth, storeFilter],
    queryFn: () => api.get(`/api/owner/salary-calendar?month=${selectedMonth}&storeId=${storeFilter}`)
  });

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 월 선택 및 필터 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="p-2">◀</button>
          <h2 className="text-xl font-bold">{selectedMonth} 급여 현황</h2>
          <button onClick={() => changeMonth(1)} className="p-2">▶</button>
        </div>
        
        <select 
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="all">전체 점포</option>
          <option value="store1">CU 대치점</option>
          <option value="store2">CU 삼성점</option>
        </select>
      </div>

      {/* 전체 요약 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <h3 className="font-semibold mb-3">전체 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard label="근로자" value={`${salaryData.summary.totalEmployees}명`} />
          <SummaryCard label="총 근무시간" value={`${salaryData.summary.totalHours}h`} />
          <SummaryCard label="총 급여" value={`₩${salaryData.summary.totalPay.toLocaleString()}`} />
          <SummaryCard label="주휴수당" value={`₩${salaryData.summary.totalHolidayPay.toLocaleString()}`} />
        </div>
      </div>

      {/* 근로자별 급여 캘린더 */}
      <div className="space-y-4">
        {salaryData.employees?.map(employee => (
          <EmployeeSalaryCard 
            key={employee.employeeId}
            employee={employee}
            expanded={expandedEmployees.includes(employee.employeeId)}
            onToggle={() => toggleEmployee(employee.employeeId)}
          />
        ))}
      </div>

      {/* Excel 다운로드 */}
      <button className="fixed bottom-20 right-4 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg">
        📥 Excel 다운로드
      </button>
    </div>
  );
}

// 근로자별 급여 카드
function EmployeeSalaryCard({ employee, expanded, onToggle }) {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* 헤더 (항상 표시) */}
      <div 
        onClick={onToggle}
        className="p-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
      >
        <div>
          <h3 className="text-lg font-semibold">
            👤 {employee.employeeName}
          </h3>
          <p className="text-sm text-gray-600">
            📍 {employee.storeName} | 시급: ₩{employee.hourlyWage.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">월 합계</p>
          <p className="text-lg font-bold text-blue-600">
            ₩{employee.monthlyTotal.totalGrossPay.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            세후 ₩{employee.monthlyTotal.taxInfo.netPay.toLocaleString()}
          </p>
        </div>
        <span className="ml-2">{expanded ? '▼' : '▶'}</span>
      </div>

      {/* 주차별 상세 (확장 시) */}
      {expanded && (
        <div className="border-t">
          {/* 월별 합계 바 */}
          <div className="bg-blue-50 p-3 text-sm">
            <span className="mr-4">📊 총 {employee.monthlyTotal.totalHours}시간</span>
            <span className="mr-4">💰 기본급 ₩{employee.monthlyTotal.totalBasePay.toLocaleString()}</span>
            <span>🎁 주휴수당 ₩{employee.monthlyTotal.totalHolidayPay.toLocaleString()}</span>
          </div>

          {/* 주차별 캘린더 */}
          <div className="p-4 space-y-6">
            {Object.values(employee.weeklyData).map(week => (
              <WeeklyCalendar 
                key={week.weekNumber}
                week={week}
                employee={employee}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 주차별 캘린더 컴포넌트
function WeeklyCalendar({ week, employee }) {
  const [showHolidayPayModal, setShowHolidayPayModal] = useState(false);

  // 주휴수당 산정
  const calculateMutation = useMutation({
    mutationFn: () => api.post('/api/owner/salary/holiday-pay/calculate', {
      employeeId: employee.employeeId,
      year: 2025,
      month: 11,
      weekNumber: week.weekNumber
    })
  });

  // 주휴수당 확정
  const confirmMutation = useMutation({
    mutationFn: () => api.post('/api/owner/salary/holiday-pay/confirm', {
      employeeId: employee.employeeId,
      year: 2025,
      month: 11,
      weekNumber: week.weekNumber
    })
  });

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* 주차 헤더 */}
      <div className="bg-gray-100 px-4 py-2 font-semibold">
        {week.weekNumber}주차 | {week.startDate} ~ {week.endDate}
      </div>

      {/* 캘린더 그리드 */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {['월', '화', '수', '목', '금', '토', '일'].map(day => (
            <div key={day} className="text-center text-xs text-gray-600 font-semibold">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {week.dailySchedules?.map((schedule, idx) => (
            <DayCell key={idx} schedule={schedule} />
          ))}
          {/* 빈 날짜는 빈 셀 */}
          {Array(7 - (week.dailySchedules?.length || 0)).fill(null).map((_, idx) => (
            <div key={`empty-${idx}`} className="aspect-square border border-gray-200 rounded bg-gray-50" />
          ))}
        </div>

        {/* 주간 요약 */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span>근무시간:</span>
            <span className="font-semibold">{week.totalHours}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>기본급:</span>
            <span className="font-semibold">₩{week.basePay.toLocaleString()}</span>
          </div>
          
          {/* 주휴수당 섹션 */}
          <div className="border-t pt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">주휴수당:</span>
              <div className="flex items-center gap-2">
                {week.holidayPayStatus === 'not_calculated' && (
                  <>
                    <span className="text-sm text-gray-500">미산정</span>
                    <button 
                      onClick={() => calculateMutation.mutate()}
                      className="bg-blue-600 text-white text-xs px-3 py-1 rounded"
                    >
                      산정
                    </button>
                  </>
                )}
                
                {week.holidayPayStatus === 'calculated' && (
                  <>
                    <span className="text-sm font-semibold">₩{week.holidayPay.toLocaleString()}</span>
                    <button 
                      onClick={() => setShowHolidayPayModal(true)}
                      className="bg-yellow-600 text-white text-xs px-3 py-1 rounded"
                    >
                      수정
                    </button>
                    <button 
                      onClick={() => confirmMutation.mutate()}
                      className="bg-green-600 text-white text-xs px-3 py-1 rounded"
                    >
                      확정
                    </button>
                  </>
                )}
                
                {week.holidayPayStatus === 'adjusted' && (
                  <>
                    <span className="text-sm font-semibold text-orange-600">
                      ₩{week.holidayPay.toLocaleString()} (수정됨)
                    </span>
                    <button 
                      onClick={() => setShowHolidayPayModal(true)}
                      className="bg-yellow-600 text-white text-xs px-3 py-1 rounded"
                    >
                      재수정
                    </button>
                    <button 
                      onClick={() => confirmMutation.mutate()}
                      className="bg-green-600 text-white text-xs px-3 py-1 rounded"
                    >
                      확정
                    </button>
                  </>
                )}
                
                {week.holidayPayStatus === 'confirmed' && (
                  <>
                    <span className="text-sm font-semibold text-green-600">
                      ₩{week.holidayPay.toLocaleString()} ✅
                    </span>
                    <button 
                      onClick={() => calculateMutation.mutate()}
                      className="bg-gray-500 text-white text-xs px-3 py-1 rounded"
                    >
                      재산정
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between font-semibold text-blue-600 border-t pt-2">
            <span>주간 총액:</span>
            <span>₩{week.weeklyTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* 주휴수당 수정 모달 */}
      {showHolidayPayModal && (
        <HolidayPayAdjustModal 
          employee={employee}
          week={week}
          onClose={() => setShowHolidayPayModal(false)}
        />
      )}
    </div>
  );
}

// 일별 셀 컴포넌트
function DayCell({ schedule }) {
  if (!schedule) {
    return <div className="aspect-square border border-gray-200 rounded bg-gray-50" />;
  }

  const statusColors = {
    approved: 'bg-green-50 border-green-300',
    pending: 'bg-yellow-50 border-yellow-300',
    rejected: 'bg-red-50 border-red-300'
  };

  return (
    <div className={`
      aspect-square border-2 rounded p-1 text-center
      ${statusColors[schedule.status] || 'bg-gray-50 border-gray-200'}
    `}>
      <div className="text-xs font-semibold">{schedule.hours}h</div>
      <div className="text-[10px] text-gray-600">
        {schedule.startTime.substring(0, 5)}
      </div>
      {schedule.status === 'approved' && (
        <div className="text-xs">✅</div>
      )}
    </div>
  );
}

// 주휴수당 수정 모달
function HolidayPayAdjustModal({ employee, week, onClose }) {
  const [amount, setAmount] = useState(week.holidayPay || 0);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const adjustMutation = useMutation({
    mutationFn: (data) => api.put('/api/owner/salary/holiday-pay/adjust', data),
    onSuccess: () => {
      onClose();
      queryClient.invalidateQueries(['salary-calendar']);
    }
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      alert('수정 사유를 입력해주세요');
      return;
    }

    adjustMutation.mutate({
      employeeId: employee.employeeId,
      year: 2025,
      month: 11,
      weekNumber: week.weekNumber,
      adjustedAmount: amount,
      reason: reason,
      notes: notes
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-4">주휴수당 수정</h3>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">대상: {employee.employeeName} - {week.weekNumber}주차</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">자동 계산 금액</label>
            <input 
              type="text"
              value={`₩${week.holidayPay?.toLocaleString() || 0}`}
              disabled
              className="w-full px-4 py-2 border rounded-lg bg-gray-50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">수정 금액</label>
            <input 
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="수정할 금액 입력"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              수정 사유 <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="예: 결근 1일 발생으로 감액"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">추가 메모</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
              rows="3"
              placeholder="추가 메모 입력 (선택)"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button 
            onClick={handleSubmit}
            disabled={!reason.trim()}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg disabled:bg-gray-300"
          >
            저장
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-gray-200 py-2 rounded-lg"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
```

**주휴수당 관리 흐름**:
```
1. 월 선택 및 점포 필터링
   ↓
2. 근로자별 캘린더 표시
   ↓
3. 주차별 근무 내역 확인
   ↓
4. 주휴수당 관리
   ├─ [산정] → 자동 계산
   ├─ [수정] → 금액/사유 입력
   └─ [확정] → 최종 확정 (근로자에게 표시)
   ↓
5. Excel 다운로드
```

**모바일 최적화**:
- ✅ 아코디언 방식 (펼치기/접기)
- ✅ 주차별 캘린더 그리드
- ✅ 터치 친화적 버튼
- ✅ 고정 다운로드 버튼 (우하단)

### 4.5 점포 관리 (Store Management)

**API**: `GET /api/store`, `POST /api/store`, `PUT /api/store/:id`

**기능**:
- 점포 목록 조회
- 신규 점포 생성
- 점포 정보 수정

**점포 정보**:
- 점포명
- 주소
- 점주명
- 사업자번호
- 활성 상태

### 4.6 지출 관리 (Expense Management)

**API**: `GET /api/expense`, `POST /api/expense`, `PUT /api/expense/:id`

**기능**:
- 지출 내역 조회 (일반/고정)
- 지출 등록
- 지출 수정/삭제

**지출 정보**:
- 날짜
- 카테고리
- 금액
- 내역
- 점포

---

## 5. 근로자(Employee) 기능 단위

### 5.1 대시보드 (Dashboard)

**API**: `GET /api/employee/dashboard`

**기능**: 핵심 정보 3가지 카드 형태 표시
1. 근로하는 점포와 근로계약상 근로 정보
2. 조회시점의 해당 주 근로 시간 총합
3. 직전월 급여 정보

**표시 정보**:
```javascript
{
  // 1. 근로 점포 및 계약 정보
  workInfo: {
    storeId: ObjectId,
    storeName: String,           // "CU 대치점"
    storeAddress: String,        // "서울시 강남구..."
    
    contractInfo: {              // 근로계약상 정보
      workDays: String,          // "월, 수, 금"
      workTime: String,          // "09:00-18:00"
      weeklyHours: Number,       // 주 24시간
      hourlyWage: Number,        // 시급 ₩10,030
      taxType: String            // "사업자소득(3.3%)"
    },
    
    link: "/employee/profile"    // 클릭 시 프로필로 이동
  },
  
  // 2. 이번 주 근무 현황
  thisWeekWork: {
    weekNumber: Number,          // 주차 (예: 2주차)
    weekRange: String,           // "11/11(월) ~ 11/17(일)"
    
    totalHours: Number,          // 총 근무시간 (24h)
    workDays: Number,            // 근무일수 (3일)
    estimatedPay: Number,        // 예상 급여 ₩240,720
    
    pendingCount: Number,        // 승인 대기 (1건)
    approvedCount: Number,       // 승인 완료 (2건)
    
    link: "/employee/schedule"   // 클릭 시 근무일정으로 이동
  },
  
  // 3. 직전월 급여 정보
  lastMonthSalary: {
    year: Number,                // 2025
    month: Number,               // 10
    monthLabel: String,          // "2025년 10월"
    
    totalHours: Number,          // 총 근무시간 (180h)
    basePay: Number,             // 기본급 ₩1,805,400
    holidayPay: Number,          // 주휴수당 ₩160,480
    grossPay: Number,            // 총 지급액 ₩1,965,880
    
    taxInfo: {
      taxAmount: Number,         // 세금 ₩64,874
      netPay: Number             // 실수령액 ₩1,901,006
    },
    
    isConfirmed: Boolean,        // 확정 여부
    link: "/employee/salary/2025-10"  // 클릭 시 해당 월 급여 상세로 이동
  },
  
  // 알림
  unreadNotifications: Number    // 읽지 않은 알림 (3건)
}
```

**대시보드 UI 구조**:
```
┌─────────────────────────────────┐
│  👤 홍길동님, 안녕하세요         │
│  🔔 읽지 않은 알림 3건           │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  🏪 근무 점포 및 계약 정보       │
├─────────────────────────────────┤
│  📍 CU 대치점                    │
│  서울시 강남구 대치동 123         │
│                                  │
│  🗓️  근무 요일: 월, 수, 금        │
│  ⏰ 근무 시간: 09:00 - 18:00     │
│  📊 주간 계약: 24시간             │
│                                  │
│  💰 시급: ₩10,030                │
│  📋 세금: 사업자소득(3.3%)        │
│                                  │
│  → 프로필에서 자세히 보기         │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  📅 이번 주 근무 현황 (2주차)    │
├─────────────────────────────────┤
│  11/11(월) ~ 11/17(일)           │
│                                  │
│  ⏰ 총 근무시간: 16시간           │
│  🗓️  근무일수: 2일                │
│  💰 예상 급여: ₩160,480          │
│                                  │
│  상태:                            │
│  • ✅ 승인 완료: 2건              │
│  • ⏳ 승인 대기: 1건              │
│                                  │
│  → 근무 일정에서 자세히 보기      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  💵 직전월 급여 (2025년 10월)    │
├─────────────────────────────────┤
│  ⏰ 총 근무시간: 180시간          │
│                                  │
│  💰 기본급:     ₩1,805,400       │
│  🎁 주휴수당:   ₩160,480         │
│  ━━━━━━━━━━━━━━━━━━━━━━━      │
│  📊 총 지급액:  ₩1,965,880       │
│  💸 세금:       ₩64,874          │
│  ━━━━━━━━━━━━━━━━━━━━━━━      │
│  💵 실수령액:   ₩1,901,006  ✅   │
│                                  │
│  → 급여 상세 내역 보기            │
└─────────────────────────────────┘
```

**클릭 동작**:
- **점포 및 계약 정보 카드** → `/employee/profile` (프로필 페이지)
- **이번 주 근무 현황 카드** → `/employee/schedule` (근무 일정 페이지)
- **직전월 급여 카드** → `/employee/salary/2025-10` (급여 상세 페이지)

---

**프론트엔드 구현 예시**:

```jsx
// 근로자 대시보드
function EmployeeDashboard() {
  const { user } = useAuthStore();
  
  // 대시보드 데이터 조회
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['employee-dashboard'],
    queryFn: () => api.get('/api/employee/dashboard')
  });

  if (isLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">👤 {user.username}님, 안녕하세요</h1>
        {dashboard.unreadNotifications > 0 && (
          <p className="text-sm text-orange-600 mt-1">
            🔔 읽지 않은 알림 {dashboard.unreadNotifications}건
          </p>
        )}
      </div>

      {/* 3가지 핵심 카드 */}
      <div className="space-y-4">
        {/* 1. 근무 점포 및 계약 정보 */}
        <DashboardCard
          icon="🏪"
          title="근무 점포 및 계약 정보"
          link={dashboard.workInfo.link}
        >
          <div className="space-y-3">
            <div>
              <p className="text-base font-semibold">📍 {dashboard.workInfo.storeName}</p>
              <p className="text-sm text-gray-600">{dashboard.workInfo.storeAddress}</p>
            </div>
            
            <div className="border-t pt-3 space-y-1">
              <InfoRow 
                label="🗓️  근무 요일" 
                value={dashboard.workInfo.contractInfo.workDays} 
              />
              <InfoRow 
                label="⏰ 근무 시간" 
                value={dashboard.workInfo.contractInfo.workTime} 
              />
              <InfoRow 
                label="📊 주간 계약" 
                value={`${dashboard.workInfo.contractInfo.weeklyHours}시간`} 
              />
            </div>
            
            <div className="border-t pt-3 space-y-1">
              <InfoRow 
                label="💰 시급" 
                value={`₩${dashboard.workInfo.contractInfo.hourlyWage.toLocaleString()}`}
                highlight 
              />
              <InfoRow 
                label="📋 세금" 
                value={dashboard.workInfo.contractInfo.taxType} 
              />
            </div>
          </div>
        </DashboardCard>

        {/* 2. 이번 주 근무 현황 */}
        <DashboardCard
          icon="📅"
          title={`이번 주 근무 현황 (${dashboard.thisWeekWork.weekNumber}주차)`}
          link={dashboard.thisWeekWork.link}
        >
          <div className="space-y-3">
            <p className="text-sm text-gray-600 text-center">
              {dashboard.thisWeekWork.weekRange}
            </p>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-gray-600">총 근무시간</p>
                <p className="text-xl font-bold text-blue-600">
                  {dashboard.thisWeekWork.totalHours}h
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">근무일수</p>
                <p className="text-xl font-bold text-blue-600">
                  {dashboard.thisWeekWork.workDays}일
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">예상 급여</p>
                <p className="text-xl font-bold text-blue-600">
                  ₩{(dashboard.thisWeekWork.estimatedPay / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <p className="text-sm text-gray-700 mb-1">상태:</p>
              <div className="flex gap-2">
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  ✅ 승인 {dashboard.thisWeekWork.approvedCount}건
                </span>
                {dashboard.thisWeekWork.pendingCount > 0 && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                    ⏳ 대기 {dashboard.thisWeekWork.pendingCount}건
                  </span>
                )}
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* 3. 직전월 급여 */}
        <DashboardCard
          icon="💵"
          title={`직전월 급여 (${dashboard.lastMonthSalary.monthLabel})`}
          link={dashboard.lastMonthSalary.link}
          highlight={dashboard.lastMonthSalary.isConfirmed}
        >
          <div className="space-y-2">
            <InfoRow 
              label="⏰ 총 근무시간" 
              value={`${dashboard.lastMonthSalary.totalHours}시간`} 
            />
            
            <div className="border-t pt-2 space-y-1">
              <InfoRow 
                label="💰 기본급" 
                value={`₩${dashboard.lastMonthSalary.basePay.toLocaleString()}`} 
              />
              <InfoRow 
                label="🎁 주휴수당" 
                value={`₩${dashboard.lastMonthSalary.holidayPay.toLocaleString()}`} 
              />
            </div>
            
            <div className="border-t pt-2 bg-blue-50 -mx-4 px-4 py-2">
              <InfoRow 
                label="📊 총 지급액" 
                value={`₩${dashboard.lastMonthSalary.grossPay.toLocaleString()}`}
                highlight
              />
              <InfoRow 
                label="💸 세금" 
                value={`-₩${dashboard.lastMonthSalary.taxInfo.taxAmount.toLocaleString()}`}
                className="text-red-600"
              />
            </div>
            
            <div className="border-t pt-2 bg-green-50 -mx-4 px-4 py-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">💵 실수령액</span>
                <span className="text-2xl font-bold text-green-600">
                  ₩{dashboard.lastMonthSalary.taxInfo.netPay.toLocaleString()}
                </span>
              </div>
              {dashboard.lastMonthSalary.isConfirmed && (
                <p className="text-xs text-green-600 text-center mt-1">✅ 확정됨</p>
              )}
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* 하단 네비게이션 */}
      <MobileBottomNav />
    </div>
  );
}

// 대시보드 카드 컴포넌트
function DashboardCard({ icon, title, link, highlight, children }) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate(link)}
      className={`
        bg-white rounded-lg shadow-sm overflow-hidden
        cursor-pointer hover:shadow-md transition-shadow
        ${highlight ? 'ring-2 ring-green-500' : ''}
      `}
    >
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span>{title}</span>
        </h3>
      </div>

      {/* 내용 */}
      <div className="p-4">
        {children}
      </div>

      {/* 하단 링크 */}
      <div className="px-4 py-2 bg-gray-50 text-center">
        <p className="text-sm text-blue-600">→ 자세히 보기</p>
      </div>
    </div>
  );
}

// 정보 행 컴포넌트
function InfoRow({ label, value, highlight, className }) {
  return (
    <div className={`flex justify-between items-center ${className || ''}`}>
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm ${highlight ? 'font-bold text-blue-600' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

// 하단 네비게이션 바
function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const navItems = [
    { icon: '🏠', label: '홈', path: '/employee/dashboard' },
    { icon: '📅', label: '일정', path: '/employee/schedule' },
    { icon: '💵', label: '급여', path: '/employee/salary' },
    { icon: '👤', label: '내정보', path: '/employee/profile' }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex justify-around py-2">
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`
              flex flex-col items-center px-4 py-2 min-w-[60px]
              ${location.pathname === item.path ? 'text-blue-600' : 'text-gray-600'}
            `}
          >
            <span className="text-2xl mb-1">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
```

**대시보드 특징**:
- ✅ 3가지 핵심 정보만 표시 (간결함)
- ✅ 카드별 클릭으로 상세 페이지 이동
- ✅ 모바일 우선 디자인 (터치 친화적)
- ✅ 하단 네비게이션 고정
- ✅ 시각적 피드백 (hover, active)

### 5.2 근무 일정 등록 (Work Schedule)

**API**: `POST /api/work-schedule`

**기능**:
- 근무 일정 간편 등록
- 야간 근무 자동 감지 (다음날까지 이어짐)
- **스마트 초기값**: 근로계약서상 일정으로 자동 설정

**입력 정보** (간소화):
```javascript
{
  workDate: Date,            // 근무 날짜 (기본값: 오늘)
  startTime: String,         // 시작 시간 (기본값: 계약서상 시간)
  endTime: String,           // 종료 시간 (기본값: 계약서상 시간)
  notes: String              // 메모 (선택)
}
```

**스마트 초기값 설정 로직**:
```javascript
// 1. 근무 날짜 초기값
workDate: 오늘 날짜

// 2. 시작/종료 시간 초기값
// 근로계약서에서 해당 요일의 근무시간 자동 설정
const dayOfWeek = new Date(workDate).getDay();  // 0=일, 1=월, ..., 6=토
const dayName = ['sunday', 'monday', 'tuesday', ...][dayOfWeek];

if (user.workSchedule[dayName]?.enabled) {
  // 계약서상 근무일이면 해당 시간으로 자동 설정
  startTime: user.workSchedule[dayName].startTime  // 예: "09:00"
  endTime: user.workSchedule[dayName].endTime      // 예: "18:00"
} else {
  // 계약서상 근무일이 아니면 기본값
  startTime: "09:00"
  endTime: "18:00"
}
```

**자동 계산** (간소화):
```javascript
// 총 근무시간 계산 (휴식시간 없음)
totalHours = (endTime - startTime)

// 야간근무 자동 감지
if (endTime < startTime) {
  endDate = workDate + 1일  // 다음날로 자동 설정
  totalHours = (24:00 - startTime) + endTime
}
```

**등록 폼 UI 구조**:
```
┌─────────────────────────────────┐
│  📅 근무 일정 등록                │
├─────────────────────────────────┤
│                                  │
│  근무 날짜: *                     │
│  [2025-11-13] 📅                │
│  (기본값: 오늘)                   │
│                                  │
│  근무 시간: *                     │
│  [09:00] ~ [18:00]              │
│  (근로계약서 기준 자동 설정)       │
│                                  │
│  💡 오늘(수요일)은 계약상          │
│     근무일입니다                  │
│                                  │
│  📝 메모 (선택):                  │
│  [___________________]          │
│                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━      │
│  예상 근무시간: 9시간             │
│  예상 급여: ₩90,270              │
│  ━━━━━━━━━━━━━━━━━━━━━━━      │
│                                  │
│  [등록] [취소]                   │
└─────────────────────────────────┘
```

**프론트엔드 구현 예시**:
```jsx
function WorkScheduleForm() {
  const { user } = useAuthStore();
  const today = new Date();
  
  // 오늘 요일에 맞는 계약 정보 가져오기
  const getTodayContract = () => {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[today.getDay()];
    
    if (user.workSchedule[dayName]?.enabled) {
      return {
        isContractDay: true,
        startTime: user.workSchedule[dayName].startTime,
        endTime: user.workSchedule[dayName].endTime
      };
    }
    
    return {
      isContractDay: false,
      startTime: '09:00',
      endTime: '18:00'
    };
  };
  
  const contractInfo = getTodayContract();
  
  // 폼 상태 (초기값 자동 설정)
  const [formData, setFormData] = useState({
    workDate: today.toISOString().split('T')[0],  // 오늘 날짜
    startTime: contractInfo.startTime,             // 계약서 시간
    endTime: contractInfo.endTime,                 // 계약서 시간
    notes: ''
  });

  // 예상 근무시간 및 급여 계산
  const calculatePreview = () => {
    const start = new Date(`2000-01-01T${formData.startTime}`);
    const end = new Date(`2000-01-01T${formData.endTime}`);
    
    if (end <= start) {
      end.setDate(end.getDate() + 1);  // 야간근무
    }
    
    const hours = (end - start) / (1000 * 60 * 60);
    const pay = hours * user.hourlyWage;
    
    return { hours, pay };
  };
  
  const preview = calculatePreview();

  // 날짜 변경 시 해당 요일의 계약 정보로 시간 업데이트
  const handleDateChange = (newDate) => {
    setFormData({ ...formData, workDate: newDate });
    
    const selectedDate = new Date(newDate);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[selectedDate.getDay()];
    
    if (user.workSchedule[dayName]?.enabled) {
      setFormData({
        ...formData,
        workDate: newDate,
        startTime: user.workSchedule[dayName].startTime,
        endTime: user.workSchedule[dayName].endTime
      });
    }
  };

  // 등록
  const createMutation = useMutation({
    mutationFn: (data) => api.post('/api/work-schedule', data),
    onSuccess: () => {
      // 성공 메시지 및 페이지 이동
      toast.success('근무 일정이 등록되었습니다');
      navigate('/employee/schedule');
    }
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-6">📅 근무 일정 등록</h2>
        
        {/* 근무 날짜 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            근무 날짜 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.workDate}
            onChange={(e) => handleDateChange(e.target.value)}
            max={today.toISOString().split('T')[0]}  // 오늘까지만
            className="w-full px-4 py-3 border rounded-lg text-lg"
          />
          <p className="text-xs text-gray-500 mt-1">
            기본값: 오늘 날짜
          </p>
        </div>

        {/* 근무 시간 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            근무 시간 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              className="flex-1 px-4 py-3 border rounded-lg text-lg"
            />
            <span className="text-gray-500">~</span>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              className="flex-1 px-4 py-3 border rounded-lg text-lg"
            />
          </div>
          
          {/* 계약 정보 표시 */}
          {contractInfo.isContractDay ? (
            <p className="text-xs text-green-600 mt-2">
              💡 오늘은 근로계약상 근무일입니다 (계약 시간으로 자동 설정됨)
            </p>
          ) : (
            <p className="text-xs text-orange-600 mt-2">
              ⚠️ 오늘은 근로계약상 근무일이 아닙니다
            </p>
          )}
        </div>

        {/* 메모 */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            메모 (선택)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-4 py-3 border rounded-lg"
            rows="3"
            placeholder="특이사항이 있으면 입력해주세요"
          />
        </div>

        {/* 예상 정보 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold mb-2">📊 예상 정보</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">예상 근무시간:</span>
              <span className="text-sm font-bold">{preview.hours}시간</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">예상 급여:</span>
              <span className="text-sm font-bold text-blue-600">
                ₩{Math.floor(preview.pay).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={() => createMutation.mutate(formData)}
            disabled={!formData.workDate || !formData.startTime || !formData.endTime}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-medium disabled:bg-gray-300"
          >
            등록
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 bg-gray-200 py-3 rounded-lg font-medium"
          >
            취소
          </button>
        </div>
      </div>
      
      {/* 안내 메시지 */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-gray-700">
          💡 <strong>자동 설정 안내</strong>
        </p>
        <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
          <li>• 근무 날짜는 오늘로 자동 설정됩니다</li>
          <li>• 근무 시간은 근로계약서 기준으로 자동 설정됩니다</li>
          <li>• 야간 근무는 자동으로 감지됩니다</li>
          <li>• 등록 후 점주 승인을 기다려주세요</li>
        </ul>
      </div>
    </div>
  );
}

// 빠른 등록 버튼 (대시보드/일정 페이지)
function QuickScheduleButton() {
  const { user } = useAuthStore();
  const today = new Date();
  
  // 오늘이 계약 근무일인지 확인
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayName = dayNames[today.getDay()];
  const todayContract = user.workSchedule[todayDayName];
  
  // 오늘 근무일이면 빠른 등록 버튼 표시
  if (!todayContract?.enabled) return null;
  
  const quickRegister = useMutation({
    mutationFn: () => api.post('/api/work-schedule', {
      workDate: today.toISOString().split('T')[0],
      startTime: todayContract.startTime,
      endTime: todayContract.endTime
    }),
    onSuccess: () => {
      toast.success('오늘 근무가 등록되었습니다');
    }
  });

  return (
    <button 
      onClick={() => quickRegister.mutate()}
      className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium shadow-sm"
    >
      ⚡ 오늘 근무 빠른 등록 ({todayContract.startTime} ~ {todayContract.endTime})
    </button>
  );
}
```

**등록 프로세스**:
```
1. 페이지 진입
   ↓ (자동)
2. 날짜: 오늘로 설정
   요일 확인 → 계약서에서 해당 요일 시간 가져오기
   ↓ (자동)
3. 시작/종료 시간: 계약서 시간으로 설정
   예) 수요일 → 09:00 ~ 18:00 (계약서 기준)
   ↓
4. 필요시 시간 수정
   ↓
5. [등록] 클릭 → 자동 계산 → 저장
   ↓
6. 점주 승인 대기
```

**빠른 등록 기능** (추가):
- 오늘이 근로계약상 근무일인 경우
- "⚡ 오늘 근무 빠른 등록" 버튼 표시
- 클릭 한 번으로 계약서 시간으로 즉시 등록

**💡 간소화 효과**:
- ❌ 휴식시간 입력 제거 → 입력 필드 감소
- ❌ 초과근무 개념 제거 → 계산 단순화
- ✅ 스마트 초기값 → 입력 편의성 향상
- ✅ 빠른 등록 → 클릭 한 번으로 등록

### 5.3 급여 상세 내역 (Salary Details)

**API**: `GET /api/employee/salary/:month`

**기능**:
- 월별 급여 상세 내역 조회 (주차별)
- 주차별 근무시간, 급여, 주휴수당 표시
- 월별 합계 및 세금 정보
- 확정 여부 확인

**표시 정보**:
```javascript
{
  year: Number,                // 2025
  month: Number,               // 11
  monthLabel: String,          // "2025년 11월"
  
  // 주차별 급여 (캘린더 형식)
  weeklyData: {
    1: {                       // 1주차
      weekNumber: 1,
      startDate: "2025-11-04", // 월요일
      endDate: "2025-11-10",   // 일요일
      
      // 근무 현황
      totalHours: Number,      // 총 근무시간 (24h)
      workDays: Number,        // 근무일수 (3일)
      
      // 급여 계산
      basePay: Number,         // 기본급 ₩240,720
      holidayPay: Number,      // 주휴수당 ₩20,060
      weeklyTotal: Number,     // 주간 총액 ₩260,780
      
      holidayPayStatus: String, // 주휴수당 상태 ('confirmed', 'calculated', etc)
      
      // 일별 근무 (캘린더용)
      dailySchedules: [
        {
          date: "2025-11-04",
          dayOfWeek: "월",
          startTime: "09:00",
          endTime: "18:00",
          hours: 8,
          pay: 80240,
          status: "approved"
        },
        // ... 해당 주의 근무일들
      ]
    },
    2: { /* 2주차 */ },
    // ... 최대 6주차
  },
  
  // 월별 합계
  monthlyTotal: {
    totalHours: Number,        // 총 근무시간 (180h)
    totalBasePay: Number,      // 총 기본급 ₩1,805,400
    totalHolidayPay: Number,   // 총 주휴수당 ₩160,480
    totalGrossPay: Number,     // 총 지급액 ₩1,965,880
    
    taxInfo: {                 // 세금 정보
      taxAmount: Number,       // 세금 ₩64,874
      incomeTax: Number,       // 소득세 ₩58,387
      localTax: Number,        // 지방세 ₩6,487
      netPay: Number           // 실수령액 ₩1,901,006
    }
  },
  
  // 확정 정보
  isConfirmed: Boolean,        // 확정 여부
  confirmedAt: Date            // 확정 일시
}
```

**급여 상세 UI 구조** (근로자용 - 조회만):
```
┌─────────────────────────────────┐
│  [◀ 10월] [2025년 11월] [12월 ▶] │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  💵 월별 급여 합계                │
├─────────────────────────────────┤
│  ⏰ 총 근무: 180시간              │
│  💰 기본급: ₩1,805,400           │
│  🎁 주휴수당: ₩160,480           │
│  ━━━━━━━━━━━━━━━━━━━━━━━      │
│  📊 총액: ₩1,965,880             │
│  💸 세금: -₩64,874               │
│  ━━━━━━━━━━━━━━━━━━━━━━━      │
│  💵 실수령: ₩1,901,006  ✅       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  [1주차] 11/04(월) ~ 11/10(일)   │
├─────────────────────────────────┤
│  ┌──┬──┬──┬──┬──┬──┬──┐       │
│  │월│화│수│목│금│토│일│       │
│  ├──┼──┼──┼──┼──┼──┼──┤       │
│  │8h│ -│8h│ -│8h│ -│ -│       │
│  │✅│  │✅│  │✅│  │  │       │
│  └──┴──┴──┴──┴──┴──┴──┘       │
│                                  │
│  근무: 24h | 급여: ₩240,720      │
│  주휴수당: ₩20,060  ✅ 확정      │
│  주간 총액: ₩260,780             │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  [2주차] 11/11(월) ~ 11/17(일)   │
│  ... (동일 형식)                  │
└─────────────────────────────────┘

... (3~6주차)
```

### 5.4 프로필 (Profile)

**API**: `GET /api/auth/me`, `PUT /api/employee/profile`

**기능**:
- 기본 정보 및 근로 계약 정보 조회
- 프로필 정보 수정 (제한적)

**표시 정보**:
```javascript
{
  // 기본 정보
  name: String,
  email: String,
  phoneNumber: String,
  address: String,
  profileImage: String,
  
  // 점포 정보
  storeInfo: {
    storeName: String,
    storeAddress: String
  },
  
  // 근로 계약 정보 (읽기 전용)
  contractInfo: {
    workSchedule: Object,      // 요일별 근무시간
    weeklyHours: Number,       // 주간 계약 시간
    hourlyWage: Number,        // 시급
    taxType: String,           // 세금 유형
    hireDate: Date            // 입사일
  },
  
  // 비상연락처
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}
```

**수정 가능 항목** (근로자 본인):
- 전화번호
- 주소
- 비상연락처
- 프로필 이미지

**수정 불가 항목** (점주만 수정 가능):
- 이름
- 이메일
- 시급
- 세금 유형
- 근무 일정
- 점포

### 5.5 알림 (Notifications)

**API**: `GET /api/notification`, `PUT /api/notification/:id/read`

**기능**:
- 알림 목록 조회
- 읽음 처리
- 알림 삭제

**알림 유형**:
- 근무 일정 승인/거절
- 급여 정보 업데이트
- 시스템 공지

### 5.6 복지포인트 (Welfare Points)

**API**: `GET /api/employee/welfare-points`

**기능**:
- 2025년 9월 15일부터 적용
- 4시간 단위로 1,700원 지급
- 월별 복지포인트 조회

---

## 6. 데이터 모델 구조

### 6.1 User (사용자)

```javascript
{
  _id: ObjectId,
  username: String,              // 사용자명
  email: String,                 // 이메일 (unique)
  password: String,              // 암호화된 비밀번호
  role: String,                  // 'employee' | 'owner' (매니저 제거)
  storeId: ObjectId,             // 소속 점포 (ref: Store)
  hourlyWage: Number,            // 시급 (기본값: 10030)
  taxType: String,               // 세금 신고 유형
  workSchedule: {                // 근무 요일/시간 (근로자만)
    monday: { enabled, startTime, endTime },
    tuesday: { enabled, startTime, endTime },
    // ... 나머지 요일
  },
  isActive: Boolean,             // 활성 상태
  profileImage: String,          // 프로필 이미지 URL
  phoneNumber: String,           // 전화번호
  address: String,               // 주소
  emergencyContact: {            // 비상연락처
    name: String,
    phone: String,
    relationship: String
  },
  ssn: String,                   // 주민번호 (000000-0000000)
  hireDate: Date,                // 입사일
  terminationDate: Date,         // 퇴사일
  payslipAlternativeConsent: Boolean,  // 임금명세서 동의
  payslipDeliveryMethod: String, // 발송 방법
  createdAt: Date,
  updatedAt: Date
}
```

**💡 주요 변경**: 
- `role`에서 `manager` 제거 → 2단계 권한 구조로 간소화
- 점주는 `storeId` 없음 (여러 점포 소유 가능)
- 근로자는 `storeId` 필수
- 소셜 로그인(카카오) 제거 → 이메일/비밀번호 인증만 사용

### 6.2 WorkSchedule (근무 일정) - 간소화

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // 근로자 (ref: User)
  storeId: ObjectId,             // 근무 점포 (ref: Store)
  workDate: Date,                // 근무 날짜 (오늘까지만 입력 가능)
  startTime: String,             // 시작 시간 (HH:MM)
  endTime: String,               // 종료 시간 (HH:MM)
  totalHours: Number,            // 총 근무시간 (자동 계산)
  status: String,                // 'pending' | 'approved' | 'rejected'
  approvedBy: ObjectId,          // 승인자 (ref: User)
  approvedAt: Date,              // 승인 일시
  rejectionReason: String,       // 거절 사유
  notes: String,                 // 메모
  createdAt: Date,
  updatedAt: Date
}
```

**💡 주요 변경**:
- ❌ `breakTime` 제거 - 휴식시간 입력 불필요
- ❌ `overtimeHours` 제거 - 초과근무 개념 제거
- ❌ `hourlyWage` 제거 - User에서 참조 (중복 제거)
- ❌ `totalPay` 제거 - 조회 시 계산 (중복 제거)
- ❌ `endDate` 제거 - workDate만 사용 (야간근무는 시간으로 판단)
- ❌ `modificationReason` 제거 - 수정은 재등록으로 처리

**자동 계산**:
```javascript
// Pre-save hook
workScheduleSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}`);
    const end = new Date(`2000-01-01T${this.endTime}`);
    
    // 야간근무 감지
    if (end <= start) {
      end.setDate(end.getDate() + 1);
    }
    
    // 총 근무시간 계산 (휴식시간 없음)
    const diffMs = end - start;
    this.totalHours = diffMs / (1000 * 60 * 60);
  }
  next();
});
```

### 6.3 MonthlySalary (월별 급여)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // 근로자 (ref: User)
  storeId: ObjectId,             // 점포 (ref: Store)
  year: Number,                  // 연도
  month: Number,                 // 월
  employeeName: String,          // 근로자명
  employeeEmail: String,         // 근로자 이메일
  hourlyWage: Number,            // 시급
  taxType: String,               // 세금 신고 유형
  totalWorkHours: Number,        // 총 근무시간
  totalWorkDays: Number,         // 총 근무일수
  totalBasePay: Number,          // 총 기본급
  totalHolidayPay: Number,       // 총 주휴수당
  totalGrossPay: Number,         // 총 지급액
  taxInfo: {                     // 세금 정보
    incomeTax: Number,           // 소득세
    localTax: Number,            // 지방세
    totalTax: Number,            // 총 세금
    netPay: Number               // 실수령액
  },
  weeklyDetails: [               // 주차별 상세
    {
      weekNumber: Number,        // 주차 번호
      startDate: String,         // 시작일 (YYYY-MM-DD)
      endDate: String,           // 종료일
      workHours: Number,         // 근무시간
      workDays: Number,          // 근무일수
      basePay: Number,           // 기본급
      holidayPay: Number,        // 주휴수당
      weeklyTotal: Number,       // 주간 총액
      holidayPayStatus: String,  // 주휴수당 상태
      holidayPayCalculation: {   // 주휴수당 계산 정보
        calculated: {            // 자동 계산
          totalHours: Number,
          isEligible: Boolean,
          amount: Number
        },
        adjusted: {              // 수동 조정
          amount: Number,
          reason: String,
          notes: String,
          adjustedBy: ObjectId,
          adjustedAt: Date
        }
      }
    }
  ],
  status: String,                // 'confirmed' | 'cancelled'
  confirmedAt: Date,
  confirmedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### 6.4 Store (점포)

```javascript
{
  _id: ObjectId,
  ownerId: ObjectId,             // 점주 (ref: User)
  name: String,                  // 점포명
  address: String,               // 주소
  ownerName: String,             // 점주명
  businessNumber: String,        // 사업자번호
  isActive: Boolean,             // 활성 상태
  description: String,           // 설명
  createdAt: Date,
  updatedAt: Date
}
```

### 6.5 Expense (지출)

```javascript
{
  _id: ObjectId,
  storeId: ObjectId,             // 점포 (ref: Store)
  category: String,              // 카테고리
  amount: Number,                // 금액
  description: String,           // 내역
  date: Date,                    // 지출 날짜
  type: String,                  // 'regular' | 'fixed'
  createdBy: ObjectId,           // 등록자 (ref: User)
  createdAt: Date,
  updatedAt: Date
}
```

### 6.6 Notification (알림)

```javascript
{
  _id: ObjectId,
  userId: ObjectId,              // 수신자 (ref: User)
  title: String,                 // 제목
  message: String,               // 내용
  type: String,                  // 알림 유형
  relatedId: ObjectId,           // 관련 문서 ID
  isRead: Boolean,               // 읽음 여부
  createdAt: Date,
  updatedAt: Date
}
```

---

## 7. 주요 비즈니스 로직

### 7.1 근무시간 계산 (간소화)

**위치**: `server/utils/workHours.js`

#### 7.1.1 근무시간 계산
```javascript
function calculateWorkHours(schedule) {
  const start = new Date(`2000-01-01T${schedule.startTime}:00`);
  const end = new Date(`2000-01-01T${schedule.endTime}:00`);
  
  // 야간근무 처리 (종료시간 < 시작시간)
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffMs = end - start;
  const totalHours = diffMs / (1000 * 60 * 60);
  
  return Math.round(totalHours * 100) / 100;  // 소수점 2자리
}
```

**💡 간소화**:
- ❌ 휴식시간 차감 로직 제거
- ❌ 초과근무 계산 함수 제거
- ✅ 단순히 시작~종료 시간만 계산

### 7.2 주휴수당 계산

**위치**: `server/utils/holidayPay.js`

#### 핵심 원칙 ⭐

```
1️⃣ 한 주는 월요일 ~ 일요일 (고정)

2️⃣ 월 경계 주차는 익월에 주휴수당 산정
   예: 10/27(월) ~ 11/02(일) 
   → 11월에 주휴수당 산정

3️⃣ 개근 확인은 전체 주(월~일) 기준
   예: 10/27 ~ 11/02 전체 7일 중 계약일 모두 출근 확인

4️⃣ 전월 마지막 주차 = 당월 1주차
   예: 10월 마지막 주차를 11월 1주차로 처리
```

#### 7.2.1 주(week) 정의
```
한 주는 월요일부터 일요일까지 (고정)
예: 11/04(월) ~ 11/10(일)
```

#### 7.2.2 지급 조건
1. **근로계약상 주 15시간 이상**
2. **소정근로일 개근** (근로계약서상 요일에 **전체 주 기준** 모두 출근)

#### 7.2.3 계산 공식
```javascript
주휴수당 = (주간 근로계약 시간 / 40) × 8 × 시급
```

#### 7.2.4 월 경계 주차 처리 (핵심) ⚠️

**규칙**: 
- 한 주 중 월이 바뀌는 경우 → **익월에 주휴수당 산정**
- 개근 확인 시 **전월 날짜도 포함**하여 체크

**예시 1: 당월 1주차 (전월 날짜 포함)**
```
2025년 11월 1주차
┌────────────────────────────────────┐
│ 10/27(월) 10/28(화) ... 10/31(목)  │  ← 전월 (10월)
│ 11/01(금) 11/02(토)  11/03(일)     │  ← 당월 (11월)
└────────────────────────────────────┘

주휴수당 산정 시기: 11월에 산정
개근 확인 범위: 10/27 ~ 11/03 (전체 7일)
```

**예시 2: 전월 마지막 주차 (익월 날짜 포함)**
```
2025년 10월 마지막 주차
┌────────────────────────────────────┐
│ 10/27(월) 10/28(화) ... 10/31(목)  │  ← 당월 (10월)
│ 11/01(금) 11/02(토)  11/03(일)     │  ← 익월 (11월)
└────────────────────────────────────┘

주휴수당 산정 시기: 11월에 산정 (익월 처리)
→ 10월에는 주휴수당 산정 안 함
```

**월별 주휴수당 산정 시기 요약표**:

| 주차 | 날짜 범위 | 10월 산정 | 11월 산정 | 비고 |
|------|----------|----------|----------|------|
| 10월 1주차 | 09/30(월)~10/06(일) | ✅ | - | 전월 포함, 당월 산정 |
| 10월 2주차 | 10/07(월)~10/13(일) | ✅ | - | 당월 전체 |
| 10월 3주차 | 10/14(월)~10/20(일) | ✅ | - | 당월 전체 |
| 10월 4주차 | 10/21(월)~10/27(일) | ✅ | - | 당월 전체 |
| 10월 마지막 | 10/27(월)~11/02(일) | ❌ | ✅ | **익월 산정** |
| 11월 1주차 | (10월 마지막과 동일) | - | ✅ | 전월 포함, 당월 산정 |
| 11월 2주차 | 11/03(월)~11/09(일) | - | ✅ | 당월 전체 |
| ... | ... | - | ✅ | ... |
| 11월 마지막 | 11/24(월)~11/30(일) | - | ✅ | 당월 전체 |
| (12월 1주차) | 12/01(월)~12/07(일) | - | ❌ | **12월 산정** |

#### 7.2.5 주휴수당 산정 로직

```javascript
/**
 * 주휴수당 계산
 * @param {Object} employee - 근로자 정보
 * @param {Object} weekData - 해당 주 근무 데이터
 * @param {String} targetMonth - 급여 산정 대상 월 (YYYY-MM)
 * @returns {Number} 주휴수당 (원)
 */
function calculateHolidayPay(employee, weekData, targetMonth) {
  // 1. 근로계약상 주당 근로시간 계산
  const weeklyContractHours = calculateWeeklyContractHours(employee.workSchedule);
  
  // 2. 근로계약상 주 15시간 미만이면 미지급
  if (weeklyContractHours < 15) {
    return {
      amount: 0,
      reason: '근로계약상 주 15시간 미만'
    };
  }
  
  // 3. 해당 주의 전체 기간 (월 경계 포함) 근무 데이터 조회
  const fullWeekSchedules = await WorkSchedule.find({
    userId: employee._id,
    workDate: {
      $gte: weekData.startDate,  // 월요일 (전월 포함 가능)
      $lte: weekData.endDate      // 일요일 (익월 포함 가능)
    }
  });
  
  // 4. 근로계약상 요일에 모두 출근했는지 확인 (전체 주 기준)
  const contractDays = getContractDays(employee.workSchedule);  // ['monday', 'wednesday', 'friday']
  const workedDays = fullWeekSchedules.map(s => getDayName(s.workDate));
  
  const isFullAttendance = contractDays.every(day => workedDays.includes(day));
  
  if (!isFullAttendance) {
    return {
      amount: 0,
      reason: '소정근로일 개근 미충족'
    };
  }
  
  // 5. 주휴수당 계산
  const holidayPay = Math.floor((weeklyContractHours / 40) * 8 * employee.hourlyWage);
  
  return {
    amount: holidayPay,
    reason: '지급 조건 충족',
    calculation: {
      weeklyContractHours,
      formula: `(${weeklyContractHours} / 40) × 8 × ${employee.hourlyWage}`,
      result: holidayPay
    }
  };
}
```

#### 7.2.6 월별 주차 분류 및 산정

```javascript
/**
 * 월별 주차 분류
 * - 해당 월에 속한 날짜가 있는 모든 주를 포함
 * - 월 경계 주차는 익월에 주휴수당 산정
 */
function getMonthlyWeeks(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // 1일이 포함된 주의 월요일 찾기
  let currentMonday = new Date(firstDay);
  const firstDayOfWeek = firstDay.getDay();
  const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  currentMonday.setDate(firstDay.getDate() + daysToMonday);
  
  let weekNumber = 1;
  
  while (currentMonday <= lastDay) {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    
    // 해당 주가 당월에 포함되는지 확인
    const hasCurrentMonthDays = (
      (currentMonday >= firstDay && currentMonday <= lastDay) ||
      (sunday >= firstDay && sunday <= lastDay)
    );
    
    if (hasCurrentMonthDays) {
      // 월 경계 확인
      const crossesMonthBoundary = (
        currentMonday < firstDay || sunday > lastDay
      );
      
      weeks.push({
        weekNumber,
        startDate: currentMonday.toISOString().split('T')[0],
        endDate: sunday.toISOString().split('T')[0],
        
        // 주휴수당 산정 규칙
        holidayPayMonth: crossesMonthBoundary && sunday > lastDay 
          ? `${year}-${String(month + 1).padStart(2, '0')}`  // 익월에 산정
          : `${year}-${String(month).padStart(2, '0')}`,      // 당월에 산정
        
        crossesMonthBoundary,
        note: crossesMonthBoundary && sunday > lastDay 
          ? '월 경계 주차 - 익월에 주휴수당 산정'
          : crossesMonthBoundary && currentMonday < firstDay
          ? '전월에서 이어진 주차 - 당월에 주휴수당 산정'
          : '당월 주차'
      });
      
      weekNumber++;
    }
    
    // 다음 주 월요일로 이동
    currentMonday.setDate(currentMonday.getDate() + 7);
  }
  
  return weeks;
}
```

#### 7.2.7 실제 적용 예시

**2025년 11월 예시**:
```
11월 1일: 토요일

┌─────────────────────────────────────────┐
│ 1주차: 10/27(월) ~ 11/02(일)             │
│ ├─ 10월: 10/27 ~ 10/31 (5일)            │
│ └─ 11월: 11/01 ~ 11/02 (2일)            │
│                                          │
│ 주휴수당 산정 시기: 11월 ✅               │
│ 개근 확인: 10/27 ~ 11/02 전체 확인       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 2주차: 11/03(월) ~ 11/09(일)             │
│ └─ 11월: 11/03 ~ 11/09 (7일)            │
│                                          │
│ 주휴수당 산정 시기: 11월 ✅               │
│ 개근 확인: 11/03 ~ 11/09만 확인          │
└─────────────────────────────────────────┘

...

┌─────────────────────────────────────────┐
│ 5주차: 11/24(월) ~ 11/30(일)             │
│ └─ 11월: 11/24 ~ 11/30 (7일)            │
│                                          │
│ 주휴수당 산정 시기: 11월 ✅               │
│ 개근 확인: 11/24 ~ 11/30만 확인          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 6주차: 12/01(월) ~ 12/07(일)             │
│ ├─ 11월: (없음)                          │
│ └─ 12월: 12/01 ~ 12/07 (7일)            │
│                                          │
│ 주휴수당 산정 시기: 12월 ⏩               │
│ 11월에는 산정 안 함                       │
└─────────────────────────────────────────┘
```

**2025년 10월 마지막 주차 처리**:
```
10월 마지막 주차: 10/27(월) ~ 11/02(일)

┌─────────────────────────────────────────┐
│ 10월 급여 산정 시                         │
│ ├─ 1~4주차: 10월에 산정 ✅               │
│ └─ 마지막 주차: 익월(11월)에 산정 ⏩      │
│                                          │
│ 11월 급여 산정 시                         │
│ ├─ 10월 마지막 주차: 11월 1주차로 산정 ✅ │
│ ├─ 2~5주차: 11월에 산정 ✅               │
│ └─ 마지막 주차: 12월에 산정 ⏩            │
└─────────────────────────────────────────┘
```

#### 7.2.8 주휴수당 산정 단계별 프로세스

```javascript
/**
 * 1단계: 해당 월의 주차 분류
 */
function classifyMonthlyWeeks(year, month) {
  const weeks = getMonthlyWeeks(year, month);
  
  return weeks.map(week => ({
    ...week,
    // 이 주차의 주휴수당을 현재 월에 산정할지 결정
    shouldCalculateInThisMonth: week.holidayPayMonth === `${year}-${String(month).padStart(2, '0')}`
  }));
}

/**
 * 2단계: 주휴수당 산정 (월별)
 */
async function calculateMonthlyHolidayPay(employee, year, month) {
  const weeks = classifyMonthlyWeeks(year, month);
  const results = [];
  
  for (const week of weeks) {
    if (week.shouldCalculateInThisMonth) {
      // 해당 주의 전체 근무 데이터 조회 (월 경계 포함)
      const weekSchedules = await WorkSchedule.find({
        userId: employee._id,
        workDate: {
          $gte: new Date(week.startDate),
          $lte: new Date(week.endDate)
        },
        status: 'approved'
      });
      
      // 주휴수당 계산
      const result = calculateHolidayPay(employee, {
        startDate: week.startDate,
        endDate: week.endDate,
        schedules: weekSchedules
      }, month);
      
      results.push({
        weekNumber: week.weekNumber,
        weekRange: `${week.startDate} ~ ${week.endDate}`,
        ...result
      });
    } else {
      // 익월에 산정 예정
      results.push({
        weekNumber: week.weekNumber,
        weekRange: `${week.startDate} ~ ${week.endDate}`,
        amount: null,
        reason: `${week.holidayPayMonth}에 산정 예정`,
        shouldCalculateInThisMonth: false
      });
    }
  }
  
  return results;
}

/**
 * 3단계: 개근 확인 (전체 주 기준)
 */
function checkFullAttendance(employee, schedules, startDate, endDate) {
  // 해당 주의 근로계약상 근무일 목록
  const contractDays = [];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // 월요일부터 일요일까지 순회
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dayName = dayNames[d.getDay()];
    
    if (employee.workSchedule[dayName]?.enabled) {
      contractDays.push({
        date: new Date(d).toISOString().split('T')[0],
        dayName
      });
    }
  }
  
  // 실제 근무일 목록
  const workedDates = schedules.map(s => s.workDate.toISOString().split('T')[0]);
  
  // 모든 계약일에 출근했는지 확인
  const absentDays = contractDays.filter(cd => !workedDates.includes(cd.date));
  
  return {
    isFullAttendance: absentDays.length === 0,
    contractDaysCount: contractDays.length,
    workedDaysCount: schedules.length,
    absentDaysCount: absentDays.length,
    absentDays: absentDays.map(d => d.date)
  };
}
```

#### 7.2.9 UI에서의 표시 방법

**점주 급여 캘린더**:
```
2025년 10월
┌─────────────────────────────────┐
│ 1주차: 09/30(월) ~ 10/06(일)    │
│ 주휴수당: ₩20,060 ✅ (10월 산정)│
│                                  │
│ 2~4주차: ...                     │
│                                  │
│ 마지막 주차: 10/27(월) ~ 11/02(일)│
│ 주휴수당: - (11월에 산정 예정) ⏩ │
└─────────────────────────────────┘

2025년 11월
┌─────────────────────────────────┐
│ 1주차: 10/27(월) ~ 11/02(일)    │
│ 주휴수당: ₩20,060 [산정] [확정] │
│ (10월 마지막 주차 처리)          │
│                                  │
│ 2~5주차: ...                     │
└─────────────────────────────────┘
```

**근로자 급여 상세**:
```
2025년 11월 급여
┌─────────────────────────────────┐
│ 1주차: 10/27(월) ~ 11/02(일)    │
│ (전월 날짜 포함)                 │
│                                  │
│ 근무: 24h | 급여: ₩240,720      │
│ 주휴수당: ₩20,060 ✅            │
│ 주간 총액: ₩260,780             │
│                                  │
│ 📌 전월(10/27~10/31) 근무도     │
│    이번 달 주휴수당에 포함됨     │
└─────────────────────────────────┘
```

### 7.3 세금 계산

**위치**: `server/utils/taxCalculator.js`

#### 7.3.1 세금 신고 유형별 처리

| 세금 신고 유형 | 세금 계산 방식 |
|---------------|---------------|
| **미신고** | 세금 없음 (0원) |
| **주15시간미만** | 세금 없음 (0원) |
| **사업자소득(3.3%)** | 총액의 3.3% (소득세 90% + 지방세 10%) |

#### 7.3.2 계산 로직
```javascript
function calculateWeeklyTax(taxType, grossPay, actualWorkHours) {
  // 1. 주 15시간 미만은 무조건 세금 면제
  if (actualWorkHours < 15) {
    return {
      taxAmount: 0,
      incomeTax: 0,
      localTax: 0,
      netPay: grossPay
    };
  }
  
  // 2. 세금 신고 유형별 처리
  switch(taxType) {
    case '미신고':
    case '주15시간미만':
      return {
        taxAmount: 0,
        incomeTax: 0,
        localTax: 0,
        netPay: grossPay
      };
      
    case '사업자소득(3.3%)':
      const totalTax = Math.floor(grossPay * 0.033);
      const incomeTax = Math.floor(totalTax * 0.9);  // 90%
      const localTax = totalTax - incomeTax;         // 10%
      
      return {
        taxAmount: totalTax,
        incomeTax: incomeTax,
        localTax: localTax,
        netPay: grossPay - totalTax
      };
      
    default:
      return {
        taxAmount: 0,
        incomeTax: 0,
        localTax: 0,
        netPay: grossPay
      };
  }
}
```

### 7.4 주차 계산 로직 (간소화)

**위치**: `server/utils/week.js`

#### 7.4.1 주의 정의 (명확)
```
한 주는 항상 월요일 ~ 일요일 (7일 고정)
월 경계와 무관하게 항상 7일
```

#### 7.4.2 월별 주차 계산 원칙

**1주차**:
- 해당 월 1일이 포함된 주의 월요일 ~ 일요일
- 전월 날짜 포함 가능

**2주차 이후**:
- 이전 주 일요일 다음날(월요일)부터 7일간
- 항상 월요일 ~ 일요일

**마지막 주차**:
- 해당 월 날짜를 포함하는 마지막 주
- 익월 날짜 포함 가능 → 익월에 주휴수당 산정

#### 7.4.3 간소화된 주차 계산 함수

```javascript
/**
 * 월별 주차 목록 생성
 * @param {Number} year - 연도
 * @param {Number} month - 월 (1~12)
 * @returns {Array} 주차 목록
 */
function getMonthlyWeeks(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // 1일이 포함된 주의 월요일 찾기
  let currentMonday = getMonday(firstDay);
  let weekNumber = 1;
  
  // 해당 월에 속한 모든 주 찾기
  while (currentMonday <= lastDay) {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    
    // 월 경계 확인
    const startsInPrevMonth = currentMonday < firstDay;
    const endsInNextMonth = sunday > lastDay;
    
    weeks.push({
      weekNumber,
      startDate: currentMonday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
      
      // 주휴수당 산정 월 결정
      holidayPayMonth: endsInNextMonth 
        ? getNextMonth(year, month)    // 익월에 산정
        : `${year}-${String(month).padStart(2, '0')}`,  // 당월에 산정
      
      // 메타 정보
      startsInPrevMonth,
      endsInNextMonth,
      isFullyInCurrentMonth: !startsInPrevMonth && !endsInNextMonth
    });
    
    weekNumber++;
    currentMonday.setDate(currentMonday.getDate() + 7);
  }
  
  return weeks;
}

/**
 * 해당 날짜가 포함된 주의 월요일 반환
 */
function getMonday(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * 다음 월 구하기
 */
function getNextMonth(year, month) {
  if (month === 12) {
    return `${year + 1}-01`;
  }
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}
```

### 7.5 복지포인트 계산

**적용 기간**: 2025년 9월 15일부터

**지급 기준**: 4시간 단위로 1,700원

```javascript
function calculateWelfarePoints(totalHours, startDate) {
  const welfareStartDate = new Date('2025-09-15');
  
  // 9월 15일 이전은 0원
  if (startDate < welfareStartDate) {
    return 0;
  }
  
  // 4시간 단위로 지급
  const fourHourUnits = Math.floor(totalHours / 4);
  return fourHourUnits * 1700;
}
```

---

## 8. 재구현 권장사항

### 8.1 핵심 구현 포인트 ⭐

#### 8.1.1 주차 계산 (7.2 주휴수당 계산 기준)

**핵심 규칙** (7.2에서 정의):

```
1️⃣ 한 주 = 월요일(시작) ~ 일요일(종료) - 항상 7일

2️⃣ 월 경계 주차 처리:
   - 주 중에 월이 바뀌면 → 익월에 주휴수당 산정
   - 예: 10/27(월) ~ 11/02(일) → 11월에 산정
   
3️⃣ 전월 마지막 주차 = 당월 1주차
   - 10월 마지막 주차를 11월 1주차로 처리
   - 10월 급여에는 포함 안 함, 11월 급여에 포함
   
4️⃣ 개근 확인은 전체 주(월~일) 기준
   - 전월 날짜도 포함하여 확인
   - 예: 10/27 ~ 11/02 전체 7일 중 계약일 모두 출근 확인
```

**구현 함수** (7.4 참조):

```javascript
/**
 * 월별 주차 목록 생성
 * - 해당 월에 포함되는 모든 주 반환
 * - 월 경계 주차의 주휴수당 산정 월 자동 결정
 */
function getMonthlyWeeks(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // 1일이 포함된 주의 월요일부터 시작
  let currentMonday = getMonday(firstDay);
  let weekNumber = 1;
  
  while (currentMonday <= lastDay) {
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    
    // 월 경계 확인
    const startsInPrevMonth = currentMonday < firstDay;
    const endsInNextMonth = sunday > lastDay;
    
    weeks.push({
      weekNumber,
      startDate: currentMonday.toISOString().split('T')[0],
      endDate: sunday.toISOString().split('T')[0],
      
      // 주휴수당 산정 월 자동 결정
      holidayPayMonth: endsInNextMonth 
        ? getNextMonth(year, month)              // 익월에 산정 ⏩
        : `${year}-${String(month).padStart(2, '0')}`,  // 당월에 산정 ✅
      
      startsInPrevMonth,   // 전월 시작 여부
      endsInNextMonth      // 익월 종료 여부
    });
    
    weekNumber++;
    currentMonday.setDate(currentMonday.getDate() + 7);
  }
  
  return weeks;
}

/**
 * 헬퍼 함수: 해당 날짜가 포함된 주의 월요일 반환
 */
function getMonday(date) {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setDate(d.getDate() + diff);
  return d;
}
```

**실제 적용 예시**:

```javascript
// 2025년 11월 주차 계산
const weeks = getMonthlyWeeks(2025, 11);

/*
결과:
[
  {
    weekNumber: 1,
    startDate: '2025-10-27',      // 월요일 (전월!)
    endDate: '2025-11-02',        // 일요일
    holidayPayMonth: '2025-11',   // 11월에 산정 ✅
    startsInPrevMonth: true,
    endsInNextMonth: false
  },
  {
    weekNumber: 2,
    startDate: '2025-11-03',      // 월요일
    endDate: '2025-11-09',        // 일요일
    holidayPayMonth: '2025-11',   // 11월에 산정 ✅
    startsInPrevMonth: false,
    endsInNextMonth: false
  },
  // ... 3~5주차
]
*/

// 2025년 10월 주차 계산
const octWeeks = getMonthlyWeeks(2025, 10);
const lastWeek = octWeeks[octWeeks.length - 1];

/*
마지막 주차:
{
  weekNumber: 5,
  startDate: '2025-10-27',      // 월요일
  endDate: '2025-11-02',        // 일요일 (익월!)
  holidayPayMonth: '2025-11',   // 11월에 산정 ⏩
  startsInPrevMonth: false,
  endsInNextMonth: true         // 익월로 넘어감
}

→ 10월 급여에서는 주휴수당 산정 안 함
→ 11월 급여에서 1주차로 산정 ✅
*/
```

**주의사항**:
- ⚠️ **전월 마지막 주차 = 당월 1주차** (동일한 주)
- ⚠️ 주휴수당은 익월에만 산정 (중복 산정 방지)
- ⚠️ DB 조회 시 `workDate`가 월 경계를 넘는 경우 포함
- ⚠️ 개근 확인은 전월 날짜도 포함하여 전체 주 기준

#### 8.1.2 주휴수당 산정 (7.2 기준, 투명한 프로세스)

**3단계 프로세스** (7.2.5 참조):

```javascript
// 1단계: [산정] - 자동 계산
POST /api/owner/salary/holiday-pay/calculate
{
  employeeId, year, month, weekNumber
}

// 2단계: [수정] - 점주가 조정 (선택)
PUT /api/owner/salary/holiday-pay/adjust
{
  employeeId, year, month, weekNumber,
  adjustedAmount, reason, notes
}

// 3단계: [확정] - 최종 확정
POST /api/owner/salary/holiday-pay/confirm
{
  employeeId, year, month, weekNumber
}
```

**핵심 구현 로직** (7.2.5 참조):

```javascript
/**
 * 주휴수당 계산 (월 경계 주차 처리 포함)
 */
async function calculateHolidayPay(employee, weekData, targetMonth) {
  // 1. 근로계약상 주당 근로시간 계산
  const weeklyContractHours = calculateWeeklyContractHours(employee.workSchedule);
  
  // 2. 근로계약상 주 15시간 미만이면 미지급
  if (weeklyContractHours < 15) {
    return {
      amount: 0,
      reason: '근로계약상 주 15시간 미만'
    };
  }
  
  // 3. 해당 주의 전체 근무 데이터 조회 (월 경계 포함 ⚠️)
  const fullWeekSchedules = await WorkSchedule.find({
    userId: employee._id,
    workDate: {
      $gte: new Date(weekData.startDate),  // 월요일 (전월 포함 가능)
      $lte: new Date(weekData.endDate)     // 일요일 (익월 포함 가능)
    },
    status: 'approved'
  });
  
  // 4. 근로계약상 요일에 모두 출근했는지 확인 (전체 주 기준 ⚠️)
  const attendance = checkFullAttendance(
    employee, 
    fullWeekSchedules, 
    weekData.startDate, 
    weekData.endDate
  );
  
  if (!attendance.isFullAttendance) {
    return {
      amount: 0,
      reason: `소정근로일 개근 미충족 (결근 ${attendance.absentDaysCount}일)`,
      details: attendance
    };
  }
  
  // 5. 주휴수당 계산
  const holidayPay = Math.floor((weeklyContractHours / 40) * 8 * employee.hourlyWage);
  
  return {
    amount: holidayPay,
    reason: '지급 조건 충족',
    calculation: {
      weeklyContractHours,
      formula: `(${weeklyContractHours} / 40) × 8 × ${employee.hourlyWage}`,
      result: holidayPay
    }
  };
}
```

**개근 확인 로직** (7.2.8 참조):

```javascript
/**
 * 개근 확인 (전체 주 기준 - 월 경계 포함)
 */
function checkFullAttendance(employee, schedules, startDate, endDate) {
  const contractDays = [];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // 월요일부터 일요일까지 전체 순회 (월 경계 포함 ⚠️)
  for (let d = new Date(startDate); d <= new Date(endDate); d.setDate(d.getDate() + 1)) {
    const dayName = dayNames[d.getDay()];
    
    if (employee.workSchedule[dayName]?.enabled) {
      contractDays.push({
        date: new Date(d).toISOString().split('T')[0],
        dayName,
        month: d.getMonth() + 1  // 어느 월인지 기록
      });
    }
  }
  
  // 실제 근무일 목록
  const workedDates = schedules.map(s => s.workDate.toISOString().split('T')[0]);
  
  // 모든 계약일에 출근했는지 확인
  const absentDays = contractDays.filter(cd => !workedDates.includes(cd.date));
  
  return {
    isFullAttendance: absentDays.length === 0,
    contractDaysCount: contractDays.length,
    workedDaysCount: schedules.length,
    absentDaysCount: absentDays.length,
    absentDays: absentDays.map(d => ({
      date: d.date,
      dayName: d.dayName,
      month: d.month
    }))
  };
}
```

**예시: 월 경계 주차 개근 확인**:

```javascript
// 11월 1주차: 10/27(월) ~ 11/02(일)
// 계약 근무일: 월, 수, 금

const contractDays = [
  { date: '2025-10-27', dayName: 'monday', month: 10 },    // 10월
  { date: '2025-10-29', dayName: 'wednesday', month: 10 }, // 10월
  { date: '2025-10-31', dayName: 'friday', month: 10 },    // 10월
  { date: '2025-11-01', dayName: 'saturday', month: 11 }   // 11월 ⚠️
];

// 실제 근무일
const workedDates = [
  '2025-10-27',  // ✅ 출근
  '2025-10-29',  // ✅ 출근
  '2025-10-31',  // ✅ 출근
  // '2025-11-01' // ❌ 결근 (11월 날짜인데 결근!)
];

// 결과: 개근 실패 → 주휴수당 0원
// 이유: 11/01(금) 결근 (전월 날짜는 모두 출근해도 익월 날짜 결근으로 미지급)
```

### 8.2 데이터베이스 설계 개선

#### 8.2.1 중복 데이터 제거 ✅

**적용됨**:
- ✅ `WorkSchedule`에서 `hourlyWage`, `totalPay`, `breakTime`, `overtimeHours` 제거
- ✅ 근무 시간 정보만 저장 (날짜, 시작/종료 시간, 총 시간)
- ✅ 급여는 조회 시 User 정보 참조하여 계산

**WorkSchedule 최종 구조**:
```javascript
{
  userId, storeId, workDate,     // 기본 정보
  startTime, endTime, totalHours, // 근무 시간만
  status, notes                   // 상태 및 메모
}
```

**장점**:
- 데이터 일관성 유지
- 시급 변경 시 과거 데이터 영향 없음
- DB 필드 감소

#### 8.2.2 인덱스 최적화
```javascript
// WorkSchedule 인덱스
workScheduleSchema.index({ userId: 1, workDate: -1 });
workScheduleSchema.index({ storeId: 1, workDate: -1 });
workScheduleSchema.index({ status: 1, workDate: -1 });

// MonthlySalary 인덱스
monthlySalarySchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });
monthlySalarySchema.index({ storeId: 1, year: 1, month: 1 });
```

### 8.3 API 구조 개선

#### 8.3.1 RESTful API 표준화
**현재 문제**:
- 일부 API가 RESTful 원칙을 따르지 않음
- 동사형 엔드포인트 사용 (예: `/calculate-holiday-pay`)

**개선 방안**:
```
AS-IS: POST /api/monthly-salary/calculate-holiday-pay
TO-BE: POST /api/monthly-salaries/:id/holiday-pay

AS-IS: PUT /api/monthly-salary/adjust-holiday-pay
TO-BE: PATCH /api/monthly-salaries/:id/holiday-pay

AS-IS: GET /api/employee/all-weekly-stats
TO-BE: GET /api/statistics/weekly?employeeId=all
```

#### 8.3.2 응답 형식 통일
```javascript
// 성공 응답
{
  success: true,
  data: { ... },
  message: "작업이 완료되었습니다"
}

// 에러 응답
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "입력 데이터가 올바르지 않습니다",
    details: [...]
  }
}
```

### 8.4 프론트엔드 개선 (핵심)

#### 8.4.1 상태 관리 간소화
**변경 전 (Redux Toolkit)**:
```javascript
// 복잡한 Redux 설정 (많은 보일러플레이트)
// store/scheduleSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchSchedules = createAsyncThunk(
  'schedules/fetch',
  async () => {
    const response = await api.get('/schedules');
    return response.data;
  }
);

const scheduleSlice = createSlice({
  name: 'schedules',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      });
  }
});
```

**변경 후 (React Query + Zustand)**:
```javascript
// 1. 서버 상태: React Query (자동 캐싱, 리페칭)
// hooks/useSchedules.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useSchedules() {
  return useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get('/schedules').then(r => r.data),
    staleTime: 5 * 60 * 1000, // 5분간 캐시
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.post('/schedules', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['schedules']); // 자동 리페치
    }
  });
}

// 2. 전역 UI 상태: Zustand (간단함)
// store/authStore.js
import create from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  
  setAuth: (user, token) => {
    localStorage.setItem('token', token);
    set({ user, token });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));

// 사용 (매우 간단)
function Dashboard() {
  const { data: schedules, isLoading } = useSchedules();
  const { user } = useAuthStore();
  
  if (isLoading) return <Loading />;
  return <div>{schedules.map(s => ...)}</div>;
}
```

**코드량 비교**: Redux 대비 **70% 감소**

#### 8.4.2 Tailwind CSS 모바일 최적화
```javascript
// Material-UI (무거움, 커스터마이징 어려움)
import { Card, CardContent, Button, Typography } from '@mui/material';

function ScheduleCard({ schedule }) {
  return (
    <Card sx={{ margin: 2 }}>
      <CardContent>
        <Typography variant="h6">{schedule.date}</Typography>
        <Button variant="contained">승인</Button>
      </CardContent>
    </Card>
  );
}

// Tailwind CSS (가벼움, 모바일 우선)
function ScheduleCard({ schedule }) {
  return (
    <div className="
      bg-white rounded-lg shadow-sm p-4 mb-4
      hover:shadow-md transition-shadow
      md:p-6  // 데스크톱에서만 패딩 증가
    ">
      <h3 className="text-lg font-semibold mb-2">
        {schedule.date}
      </h3>
      
      {/* 모바일 최적화 버튼 */}
      <button className="
        w-full md:w-auto  // 모바일: 전체, 데스크톱: 자동
        bg-blue-600 text-white px-6 py-3
        rounded-lg font-medium
        active:bg-blue-700  // 터치 피드백
        min-h-[44px]  // iOS 권장 최소 크기
      ">
        승인
      </button>
    </div>
  );
}
```

#### 8.4.3 PWA 설정 (앱처럼 동작)
```javascript
// public/manifest.json
{
  "name": "편의점 관리 시스템",
  "short_name": "CSMS",
  "start_url": "/",
  "display": "standalone",  // 앱처럼 표시
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}

// public/service-worker.js (오프라인 지원)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

**결과**: 
- 📱 홈 화면에 설치 가능
- 📶 오프라인에서도 일부 기능 동작
- 🔔 푸시 알림 가능 (선택)

#### 8.4.4 컴포넌트 구조 개선
```
변경 전: 
  pages/owner/Statistics.js (800+ lines)

변경 후:
  pages/owner/SalaryCalendar/
    ├── index.jsx (메인, 100 lines)
    ├── EmployeeSalaryCard.jsx
    ├── WeeklyCalendar.jsx
    ├── DayCell.jsx
    ├── HolidayPayModal.jsx
    ├── ExcelDownloadButton.jsx
    └── MonthSelector.jsx

장점:
  ✅ 유지보수 쉬움
  ✅ 재사용 가능
  ✅ 테스트 쉬움
  ✅ 모바일 최적화 컴포넌트 분리
```

### 8.5 테스트 추가

#### 8.5.1 단위 테스트
```javascript
// workHours.test.js (간소화)
describe('calculateWorkHours', () => {
  test('일반 근무시간 계산', () => {
    const schedule = {
      startTime: '09:00',
      endTime: '18:00'
    };
    expect(calculateWorkHours(schedule)).toBe(9);
  });
  
  test('야간 근무시간 계산', () => {
    const schedule = {
      startTime: '22:00',
      endTime: '06:00'
    };
    expect(calculateWorkHours(schedule)).toBe(8);
  });
  
  test('짧은 근무시간 계산', () => {
    const schedule = {
      startTime: '14:00',
      endTime: '18:00'
    };
    expect(calculateWorkHours(schedule)).toBe(4);
  });
});

// 주휴수당 계산 테스트
describe('calculateHolidayPay', () => {
  test('주 15시간 이상, 개근 시 지급', () => {
    const employee = {
      hourlyWage: 10030,
      workSchedule: { /* 주 24시간 계약 */ }
    };
    const weekData = {
      totalHours: 24,
      contractWorkDays: 3,
      actualWorkDays: 3  // 개근
    };
    
    const holidayPay = calculateHolidayPay(employee, weekData);
    expect(holidayPay).toBe(20060); // (24/40) * 8 * 10030
  });
  
  test('주 15시간 미만 시 미지급', () => {
    const employee = {
      hourlyWage: 10030,
      workSchedule: { /* 주 12시간 계약 */ }
    };
    const weekData = {
      totalHours: 12,
      contractWorkDays: 3,
      actualWorkDays: 3
    };
    
    const holidayPay = calculateHolidayPay(employee, weekData);
    expect(holidayPay).toBe(0);
  });
  
  test('결근 시 미지급', () => {
    const employee = {
      hourlyWage: 10030,
      workSchedule: { /* 주 24시간 계약 */ }
    };
    const weekData = {
      totalHours: 16,
      contractWorkDays: 3,
      actualWorkDays: 2  // 결근 1일
    };
    
    const holidayPay = calculateHolidayPay(employee, weekData);
    expect(holidayPay).toBe(0);
  });
  
  test('월 경계 주차 - 전월 근무 포함 개근 확인', () => {
    const employee = {
      hourlyWage: 10030,
      workSchedule: {
        monday: { enabled: true, startTime: '09:00', endTime: '18:00' },
        wednesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
        friday: { enabled: true, startTime: '09:00', endTime: '18:00' }
      }
    };
    
    // 10/27(월) ~ 11/02(일) 주차
    // 계약일: 월(10/27), 수(10/29), 금(10/31, 11/01)
    const weekData = {
      startDate: '2025-10-27',
      endDate: '2025-11-02',
      schedules: [
        { workDate: '2025-10-27' },  // 월 (10월)
        { workDate: '2025-10-29' },  // 수 (10월)
        { workDate: '2025-10-31' },  // 금 (10월)
        // { workDate: '2025-11-01' }  // 금 (11월) - 결근!
      ]
    };
    
    const holidayPay = calculateHolidayPay(employee, weekData);
    expect(holidayPay).toBe(0);  // 11/01(금) 결근으로 미지급
  });
});

// 주차 계산 테스트
describe('getMonthlyWeeks', () => {
  test('2025년 11월 주차 계산', () => {
    const weeks = getMonthlyWeeks(2025, 11);
    
    expect(weeks[0]).toEqual({
      weekNumber: 1,
      startDate: '2025-10-27',  // 월요일 (전월)
      endDate: '2025-11-02',    // 일요일
      holidayPayMonth: '2025-11',  // 11월에 산정
      startsInPrevMonth: true,
      endsInNextMonth: false
    });
  });
  
  test('월 경계 주차는 익월에 산정', () => {
    const weeks = getMonthlyWeeks(2025, 10);
    const lastWeek = weeks[weeks.length - 1];
    
    // 10월 마지막 주차가 11월로 넘어가면
    if (lastWeek.endsInNextMonth) {
      expect(lastWeek.holidayPayMonth).toBe('2025-11');  // 11월에 산정
    }
  });
});
```

#### 8.5.2 통합 테스트
```javascript
// owner.test.js
describe('Owner API', () => {
  test('GET /api/owner/employees - 직원 목록 조회', async () => {
    const response = await request(app)
      .get('/api/owner/employees')
      .set('Authorization', `Bearer ${ownerToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body.employees).toBeInstanceOf(Array);
  });
});
```

### 8.6 보안 강화

#### 8.6.1 입력 검증
```javascript
// express-validator 활용
router.post('/api/work-schedule', [
  body('workDate')
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value > new Date()) {
        throw new Error('미래 날짜는 입력할 수 없습니다');
      }
      return true;
    }),
  body('startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('storeId')
    .isMongoId()
    .withMessage('올바른 점포 ID를 입력해주세요')
], validateRequest, createWorkSchedule);

// 역할 검증 (간소화: owner, employee만)
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: '권한이 없습니다' });
  }
  next();
};

// 사용 예시
router.get('/api/owner/dashboard', protect, authorize('owner'), getDashboard);
router.get('/api/employee/stats', protect, authorize('employee'), getStats);
```

#### 8.6.2 권한 검증 강화
```javascript
// 미들웨어로 통합
const checkOwnership = (model) => async (req, res, next) => {
  const doc = await model.findById(req.params.id);
  
  if (!doc) {
    return res.status(404).json({ message: '리소스를 찾을 수 없습니다' });
  }
  
  if (doc.userId.toString() !== req.user._id.toString() && req.user.role !== 'owner') {
    return res.status(403).json({ message: '권한이 없습니다' });
  }
  
  req.doc = doc;
  next();
};

router.put('/api/work-schedule/:id', protect, checkOwnership(WorkSchedule), updateSchedule);
```

### 8.7 성능 최적화

#### 8.7.1 쿼리 최적화
```javascript
// 현재: N+1 문제 발생
const schedules = await WorkSchedule.find({ userId });
for (const schedule of schedules) {
  const user = await User.findById(schedule.userId);
}

// 개선: populate 활용
const schedules = await WorkSchedule.find({ userId })
  .populate('userId', 'username hourlyWage')
  .populate('storeId', 'name');
```

#### 8.7.2 캐싱 추가
```javascript
// Redis 캐싱 예시
const getEmployeeStats = async (userId, month) => {
  const cacheKey = `stats:${userId}:${month}`;
  
  // 캐시 확인
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 계산
  const stats = await calculateStats(userId, month);
  
  // 캐시 저장 (1시간)
  await redis.setex(cacheKey, 3600, JSON.stringify(stats));
  
  return stats;
};
```

### 8.8 에러 처리 개선

#### 8.8.1 글로벌 에러 핸들러
```javascript
// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  logger.error(err);
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: '입력 데이터가 올바르지 않습니다',
        details: Object.values(err.errors).map(e => e.message)
      }
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_ID',
        message: '올바르지 않은 ID 형식입니다'
      }
    });
  }
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류가 발생했습니다'
    }
  });
};
```

### 8.9 문서화

#### 8.9.1 API 문서
- Swagger/OpenAPI 스펙 작성
- 각 API 엔드포인트 설명
- 요청/응답 예시

#### 8.9.2 코드 문서
```javascript
/**
 * 주휴수당을 계산합니다
 * 
 * @param {Object} employee - 직원 정보
 * @param {Object} weekData - 주차별 근무 데이터
 * @param {Number} weekNumber - 주차 번호 (1~6)
 * @param {Boolean} isFirstWeek - 1주차 여부
 * @returns {Number} 주휴수당 (원)
 * 
 * @example
 * const holidayPay = calculateHolidayPay(employee, weekData, 1, true);
 * // => 33000
 */
function calculateHolidayPay(employee, weekData, weekNumber, isFirstWeek) {
  // ...
}
```

---

## 9. 재구현 우선순위

### 9.1 필수 기능 (Phase 1) - 2~3주
1. ✅ 사용자 인증 (로그인/회원가입 + JWT)
2. ✅ 근무 일정 등록 (근로자)
3. ✅ 근무 일정 승인/거절 (점주)
4. ✅ 기본 급여 계산 (시급 × 시간)
5. ✅ 주차별 급여 조회 (캘린더 형식)
6. ✅ **모바일 반응형 UI** (Tailwind 모바일 우선)
7. ✅ **PWA 기본 설정** (manifest.json)

**목표**: 웹에서 모바일로 사용 가능한 MVP

### 9.2 중요 기능 (Phase 2) - 3~4주
1. ✅ 주휴수당 자동 계산 (간소화된 버전)
2. ✅ 세금 계산
3. ✅ 직원 관리 (CRUD)
4. ✅ 점포 관리
5. ✅ 급여 리포트 다운로드 (Excel)
6. ✅ **하단 네비게이션 바** (모바일 UX)
7. ✅ **스와이프 제스처** (삭제, 승인 등)

**목표**: 프로덕션 배포 가능한 수준

### 9.3 추가 기능 (Phase 3) - 선택사항
1. ⏳ 알림 시스템 (푸시 알림)
2. ⏳ 지출 관리
3. ⏳ 복지포인트
4. ⏳ 대시보드 차트 (Chart.js)
5. ⏳ **네이티브 앱 전환** (React Native)
6. ⏳ 오프라인 모드 강화
7. ⏳ 생체 인증 (지문/Face ID)

---

## 10. 결론

이 시스템은 **근무 시간 관리**, **급여 계산**, **통계 제공**을 핵심 기능으로 하는 편의점 관리 시스템입니다.

### 재구현 권장 기술 스택 (최종)

```
✅ Frontend: React 18 + Tailwind CSS + PWA
✅ 상태관리: React Query + Zustand
✅ Backend: Express.js
✅ Database: MongoDB Atlas
✅ 배포: Vercel (개발) → AWS EC2 (프로덕션)
```

### 핵심 개선사항:

#### 1. 기술 스택 간소화
| 변경사항 | 효과 |
|---------|------|
| Redux → React Query + Zustand | 코드량 70% 감소 |
| Material-UI → Tailwind CSS | 번들 크기 50% 감소 |
| 복잡한 주차 계산 → 간소화 | 유지보수 용이 |
| Nginx 필수 → 선택 | 초기 개발 간편 |

#### 2. 모바일 최적화 (핵심)
- ✅ PWA로 앱처럼 설치 가능
- ✅ 모바일 우선 디자인 (Tailwind)
- ✅ 터치 친화적 UI (최소 44px)
- ✅ 하단 네비게이션
- ✅ 스와이프 제스처
- ✅ 나중에 React Native로 전환 쉬움

#### 3. 복잡도 감소 ✅

**적용된 간소화**:
- ✅ 휴식시간 입력 제거 → 입력 필드 감소
- ✅ 초과근무 개념 제거 → 계산 단순화
- ✅ 중복 데이터 저장 최소화 (WorkSchedule 간소화)
- ✅ 명확한 주 정의 (월요일~일요일 고정)
- ✅ 월 경계 주차 처리 룰 명확화 (익월 산정)
- ✅ RESTful API 표준화
- ✅ 매니저 역할 제거 (2단계 권한)
- ✅ 소셜 로그인 제거 (JWT만 사용)

**유지된 핵심 기능**:
- ✅ 주휴수당 정확한 계산 (월 경계 포함)
- ✅ 3단계 프로세스 (산정/수정/확정)
- ✅ 스마트 초기값 (근로계약서 기반)

### 개발 로드맵

```
Phase 1 (2~3주): MVP
  ├─ 인증 + 근무일정 등록/승인
  ├─ 기본 급여 계산
  ├─ 모바일 반응형 UI
  └─ PWA 설정

Phase 2 (3~4주): 프로덕션
  ├─ 주휴수당/세금 계산
  ├─ 직원/점포 관리
  ├─ Excel 다운로드
  └─ 모바일 UX 강화

Phase 3 (선택): 확장
  ├─ 알림 시스템
  ├─ 네이티브 앱 (React Native)
  └─ 고급 기능
```

### 시작 방법

```bash
# 1. 프로젝트 생성
npx create-react-app csms --template pwa
cd csms

# 2. 의존성 설치
npm install @tanstack/react-query zustand tailwindcss
npm install axios react-router-dom

# 3. 백엔드 설정
npm install express mongoose jsonwebtoken bcryptjs

# 4. 개발 시작
npm run dev
```

---

**작성자**: AI Assistant  
**최종 수정일**: 2025-11-13  
**버전**: 2.0 (모바일 최적화 + 기술 스택 간소화)

