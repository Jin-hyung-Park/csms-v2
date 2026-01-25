# 남은 개발 기능 목록

> CSMS v2 프로젝트 미구현 기능 정리  
> 최종 업데이트: 2025-12-25

---

## 📊 전체 진행률: 약 75%

### ✅ 완료된 기능
- 인증 시스템 (JWT 기반)
- 직원(Employee) 기능 (UI + API)
- 점주(Owner) 기능 (UI + API)
- 근무일정 관리 (CRUD + 승인/거절)

---

## 🔴 Priority: HIGH (핵심 기능)

### 1. 급여 계산 로직 완성

**현재 상태:**
- ✅ 기본 급여 계산 (시급 × 근무시간)
- ❌ 주휴수당 계산: 미구현 (기본값 0)
- ⚠️ 세금 계산: 간단한 3.3%만 (정확한 로직 필요)

**필요한 작업:**

#### 1.1 주휴수당 계산 로직
- [ ] 주휴수당 계산 함수 구현
  - 주 15시간 이상 근무 시 지급
  - 산식: `(1주 근로계약상 근로시간의합 / 40) × 8 × 시급`
  - 월 경계 주차 처리 (1주차는 이전 달과 합산)
  - 개근 여부 확인
- [ ] 주차별 주휴수당 계산 API
- [ ] 점주가 주휴수당 수정 가능한 API

#### 1.2 세금 계산 로직
- [ ] 정확한 세금 계산 함수
  - 주 15시간 미만: 세금 면제
  - 사업자소득 (3.3%): 소득세 90%, 지방세 10% 분리
  - 근로소득 vs 사업자소득 구분
- [ ] 세금 타입별 계산 로직
- [ ] 세금 면제 조건 확인

#### 1.3 MonthlySalary 모델 생성
- [ ] MonthlySalary 스키마 정의
  - `userId`, `storeId`, `year`, `month`
  - `basePay`, `holidayPay`, `grossPay`
  - `taxAmount`, `netPay`
  - `status`: 'draft' | 'calculated' | 'adjusted' | 'confirmed'
  - `confirmedAt`, `confirmedBy`
  - 주차별 상세 데이터
- [ ] MonthlySalary CRUD API
- [ ] 급여 데이터 저장/조회 로직

**예상 시간:** 1주  
**관련 파일:**
- `server/src/models/MonthlySalary.js` (생성 필요)
- `server/src/utils/holidayPayCalculator.js` (생성 필요)
- `server/src/utils/taxCalculator.js` (생성 필요)
- `server/src/routes/monthlySalary.route.js` (생성 필요)

---

### 2. 급여 확정 프로세스 (3단계)

**현재 상태:**
- ⚠️ 산정: 부분 구현 (기본 급여만)
- ❌ 수정: 미구현
- ❌ 확정: 미구현

**필요한 작업:**

#### 2.1 급여 산정 (자동 계산)
- [ ] 월별 급여 자동 산정 API
  - 기본급 계산
  - 주휴수당 계산
  - 세금 계산
  - 상태: 'calculated'
- [ ] 산정 결과 저장 (MonthlySalary 모델)

#### 2.2 급여 수정 (점주만)
- [ ] 점주가 급여 수정 가능한 API
  - 주휴수당 금액 수정
  - 수정 사유 입력
  - 상태: 'adjusted'
- [ ] 수정 이력 저장
- [ ] 수정 권한 확인 (점주만)

#### 2.3 급여 확정 (점주만)
- [ ] 점주가 급여 확정하는 API
  - 상태: 'confirmed'
  - `confirmedAt`, `confirmedBy` 저장
  - 확정 후 수정 불가 로직
- [ ] 확정 알림 생성 (Notification)
- [ ] 확정된 급여 조회 API

**예상 시간:** 3일  
**관련 파일:**
- `server/src/routes/monthlySalary.route.js` (확장)
- `server/src/routes/owner.route.js` (급여 관련 API 추가)

---

### 3. User 모델 확장

**현재 상태:**
- ⚠️ 시급: 하드코딩 (10030)
- ⚠️ 근무 스케줄: 하드코딩
- ⚠️ 세금 정보: 하드코딩

**필요한 작업:**
- [ ] User 모델에 필드 추가
  - `hourlyWage`: Number (시급)
  - `workSchedule`: Object (요일별 근무 시간)
    ```javascript
    {
      monday: { start: '18:00', end: '23:00' },
      tuesday: { start: null, end: null },
      // ...
    }
    ```
  - `taxType`: String ('none' | 'business-income' | 'labor-income')
  - `position`: String (직책)
- [ ] 기존 하드코딩된 값 제거
- [ ] User 정보 수정 API (점주만)
- [ ] 마이그레이션 스크립트 (기존 사용자 데이터 업데이트)

**예상 시간:** 1일  
**관련 파일:**
- `server/src/models/User.js` (수정)
- `server/src/routes/owner.route.js` (직원 정보 수정 API 확장)

---

## 🟡 Priority: MEDIUM (중요 기능)

### 4. 알림 시스템 완성

**현재 상태:**
- ✅ 알림 API 구조 완성
- ✅ 알림 목록 UI 완성
- ❌ Notification 모델 미생성
- ❌ 알림 생성 로직 없음

**필요한 작업:**
- [ ] Notification 모델 생성
  - `userId`, `title`, `message`, `type`
  - `isRead`, `readAt`
  - `relatedId`, `relatedType` (근무일정, 급여 등)
- [ ] 알림 생성 로직
  - 근무일정 승인 시 알림 생성
  - 근무일정 거절 시 알림 생성
  - 급여 확정 시 알림 생성
- [ ] 알림 조회 API (실제 DB 연동)
- [ ] 알림 읽음 처리 API (실제 DB 연동)
- [ ] 실시간 알림 (선택사항)
  - WebSocket 또는 Server-Sent Events

**예상 시간:** 3일  
**관련 파일:**
- `server/src/models/Notification.js` (생성 필요)
- `server/src/routes/notification.route.js` (생성 필요)
- `server/src/routes/owner.route.js` (알림 생성 로직 추가)
- `server/src/routes/employee.route.js` (알림 조회 API 수정)

---

### 5. Excel 다운로드 기능

**필요한 작업:**
- [ ] Excel 라이브러리 설치 (예: `xlsx` 또는 `exceljs`)
- [ ] 통계 데이터 Excel 내보내기 API
  - 점주: 점포별 통계
  - 직원: 개인 통계
- [ ] 급여 명세서 Excel 다운로드 API
  - 월별 급여 상세
  - 주차별 상세
- [ ] 근무일정 Excel 내보내기 API
  - 월별 근무일정
  - 주차별 근무일정
- [ ] 프론트엔드 다운로드 버튼 추가

**예상 시간:** 2일  
**관련 파일:**
- `server/src/utils/excelExporter.js` (생성 필요)
- `server/src/routes/export.route.js` (생성 필요)
- `client/src/pages/owner/*` (다운로드 버튼 추가)
- `client/src/pages/employee/*` (다운로드 버튼 추가)

---

## 🟢 Priority: LOW (선택 기능)

### 6. PWA 기능 강화

**현재 상태:**
- ✅ `manifest.json` 존재
- ✅ Service Worker 파일 존재

**필요한 작업:**
- [ ] 오프라인 캐싱 전략
  - 정적 자산 캐싱
  - API 응답 캐싱
- [ ] 오프라인 폴백 페이지
- [ ] 백그라운드 동기화
- [ ] 푸시 알림 (선택사항)

**예상 시간:** 2일

---

### 7. 추가 개선 사항

#### 7.1 검색 및 필터링
- [ ] 직원 검색 기능
- [ ] 근무일정 고급 필터링
- [ ] 급여 검색 기능

#### 7.2 통계 및 리포트
- [ ] 대시보드 차트 추가
- [ ] 월별/연도별 통계 리포트
- [ ] 성과 분석 리포트

#### 7.3 사용자 경험 개선
- [ ] 로딩 상태 개선
- [ ] 에러 메시지 개선
- [ ] 반응형 디자인 개선
- [ ] 접근성 개선

---

## 📋 개발 우선순위 로드맵

### Phase 5: 급여 시스템 완성 (1-2주)

**Week 1:**
1. User 모델 확장 (1일)
2. MonthlySalary 모델 생성 (1일)
3. 주휴수당 계산 로직 (2일)
4. 세금 계산 로직 (1일)

**Week 2:**
5. 급여 확정 프로세스 (3단계) (3일)
6. 테스트 및 버그 수정 (2일)

### Phase 6: 알림 시스템 (3일)

1. Notification 모델 생성 (1일)
2. 알림 생성 로직 (1일)
3. 알림 조회/읽음 처리 (1일)

### Phase 7: Excel 다운로드 (2일)

1. Excel 라이브러리 통합 (1일)
2. 다운로드 API 및 UI (1일)

---

## 🎯 다음 개발 항목 추천

### 즉시 시작 가능한 항목

1. **User 모델 확장** (가장 간단, 기반 작업)
   - 다른 기능들의 기반이 됨
   - 예상 시간: 1일

2. **MonthlySalary 모델 생성** (급여 시스템의 기반)
   - 급여 데이터 저장 구조
   - 예상 시간: 1일

3. **주휴수당 계산 로직** (핵심 비즈니스 로직)
   - 가장 중요한 계산 로직
   - 예상 시간: 2일

---

## 📝 개발 시 주의사항

### 1. 브랜치 사용
```bash
# 새 기능 개발 시
git checkout develop
git checkout -b feature/salary-calculation
```

### 2. 테스트 작성
- 새 기능 개발 시 테스트 코드 함께 작성
- `server/src/__tests__/` 디렉토리에 테스트 파일 추가

### 3. 문서 업데이트
- API 변경 시 문서 업데이트
- `CURRENT_STATUS.md` 업데이트

---

## 🔗 관련 문서

- [CURRENT_STATUS.md](./CURRENT_STATUS.md) - 현재 프로젝트 상태
- [BRANCH_STRATEGY.md](./BRANCH_STRATEGY.md) - 브랜치 전략
- [CONTRIBUTING.md](./CONTRIBUTING.md) - 기여 가이드
- [QUICK_START_FEATURE.md](./QUICK_START_FEATURE.md) - 빠른 시작 가이드

---

**다음 개발을 시작하시겠습니까? 어떤 기능부터 진행할까요?** 🚀
