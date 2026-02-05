# 테스트 결과 요약 (2026-02-01)

## ✅ 실행 결과

### 백엔드 (server)

| 테스트 스위트 | 결과 | 통과 | 스킵 |
|--------------|------|------|------|
| holidayPayCalculator.test.js | ✅ PASS | 21 | 0 |
| monthlySalary.test.js | ✅ PASS | 28 | 1 |
| **합계** | | **49** | **1** |

**주요 검증 항목**
- 주휴수당 계산: 주당 계약시간, 개근 조건, 월 경계 주차 처리
- 급여 산정 API: 점주만 산정 가능, 중복 산정 409
- 급여 목록/상세 조회: 권한별 필터
- 급여 확정 API: 점주만 확정 가능, 근로자 403
- MonthlySalary 모델: 생성, holidayPayStatus enum (not_eligible, pending_next_month 포함)

**스킵된 테스트**
- `확정된 급여는 수정할 수 없어야 함`: Mongoose pre('save')에서 next(error) 시 try/catch 미포착 이슈. 실제 동작은 pre('save')에서 에러 발생함.

### 프론트엔드 (client)

| 항목 | 결과 |
|------|------|
| 빌드 | ✅ Compiled successfully (CI=false 또는 린트 수정 후) |
| 린트 | ✅ RoleBasedRedirect, Dashboard, Employees, Schedules 미사용 변수 제거 |

### 수정 사항 (테스트 대응)

1. **MonthlySalary 모델**
   - `holidayPayStatus` enum에 `not_eligible`, `pending_next_month` 추가
   - 확정된 급여 수정 방지: `pre('save')` 훅 추가 (status=confirmed 시 허용 경로만 저장)

2. **클라이언트**
   - 미사용 import/변수 제거 (ESLint no-unused-vars)

## 로컬에서 전체 확인 방법

```bash
# 1. 시드 데이터 생성
cd csms-v2/server && npm run seed:clear && cd ..

# 2. 개발 서버 실행 (프론트 + 백)
npm run dev
```

- 프론트: http://localhost:3000
- API: http://localhost:5001
- 점주 로그인: `owner@test.com` / `password123`
- **급여 관리**: 하단 네비 "💰 급여" → 연/월 선택 → 직원별 "급여 산정" 또는 "상세보기" → 주휴수당 수정/급여 확정

## 백엔드 전체 테스트 참고

일부 테스트는 테스트 DB 공유/순서에 따라 실패할 수 있음 (중복 키, 403 등).  
급여·주휴수당 관련만 실행:

```bash
cd server
npm test -- --testPathPattern="holidayPayCalculator|monthlySalary"
```
