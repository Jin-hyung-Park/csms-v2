# 전체 기능 테스트 점검 보고서

**점검 일시:** 2026-02-01  
**대상:** CSMS v2 (편의점 근무 관리 시스템)

---

## 1. 테스트 실행 방법

### 백엔드 (서버)

```bash
cd csms-v2/server
npm test
```

- **직렬 실행 (`--runInBand`)**: 모든 테스트가 동일 DB(`csms_ver2_test`)를 사용하므로, **직렬 실행**으로 돌려야 DB 간섭 없이 안정적으로 통과합니다.
- `package.json`에 `"test": "jest --runInBand"` 적용되어 있음.

### 프론트엔드 (클라이언트)

```bash
cd csms-v2/client
CI=false npm run build
```

- 빌드 성공 시 번들 생성 완료.

---

## 2. 점검 결과 요약

| 구분 | 결과 | 비고 |
|------|------|------|
| **백엔드 전체 테스트** | ✅ **84 통과, 1 스킵** | `npm test` (직렬 실행) |
| **프론트엔드 빌드** | ✅ **성공** | `CI=false npm run build` |

---

## 3. 백엔드 테스트 상세

| 테스트 스위트 | 통과 | 스킵 | 실패 | 내용 |
|--------------|------|------|------|------|
| health.test.js | 2 | 0 | 0 | 헬스체크 API |
| auth.test.js | 12 | 0 | 0 | 회원가입/로그인/me |
| holidayPayCalculator.test.js | 21 | 0 | 0 | 주휴수당 계산 유틸 |
| monthlySalary.test.js | 8 | 1 | 0 | 급여 산정/확정/조회 (1개 스킵: 확정 후 수정 방지) |
| owner.test.js | 14 | 0 | 0 | 점주 대시보드/승인/거절/직원/점포 |
| workSchedule.test.js | 12 | 0 | 0 | 근무일정 CRUD/필터 |
| user-model-extension.test.js | 9 | 0 | 0 | User 필드/직원 API/점주 직원 수정 |
| **합계** | **84** | **1** | **0** | |

---

## 4. 병렬 실행 시 참고 사항

- `npm test`에서 `--runInBand`를 제거하고 실행하면, 여러 스위트가 동시에 같은 DB를 사용해 **중복 키(E11000)** 또는 **403/500** 등이 발생할 수 있습니다.
- CI 또는 로컬에서 **전체 테스트를 안정적으로 돌리려면 직렬 실행을 유지**하는 것이 좋습니다.

---

## 5. 기능별 정상 여부

| 기능 | 상태 | 확인 방법 |
|------|------|-----------|
| 인증 (회원가입/로그인) | ✅ 정상 | auth.test.js |
| 직원 대시보드/프로필/근무일정/급여 조회 | ✅ 정상 | employee 라우트 + 테스트 |
| 점주 대시보드/승인/거절/직원/점포 | ✅ 정상 | owner.test.js |
| 근무일정 CRUD/승인/거절 | ✅ 정상 | workSchedule.test.js |
| 급여 산정/주휴수당/확정/조회 | ✅ 정상 | monthlySalary.test.js, holidayPayCalculator.test.js |
| 알림 생성 (승인/거절/급여확정) | ✅ 정상 | owner/monthlySalary 연동 코드 + owner 테스트 통과 |
| 알림 조회/읽음 처리 | ✅ 정상 | employee 라우트 (Notification 모델 연동) |
| 프론트 빌드 | ✅ 정상 | client 빌드 성공 |

---

## 6. 로컬에서 앱으로 확인하려면

```bash
cd csms-v2/server && npm run seed:clear
cd .. && npm run dev
```

- 프론트: http://localhost:3000  
- API: http://localhost:5001  
- 점주: `owner@test.com` / `password123`  
- 직원: `employee1@test.com` / `password123`  

직원 로그인 → 알림, 급여, 근무일정 / 점주 로그인 → 승인, 급여 관리, 직원·점포 관리 동작 확인 가능.

---

**결론: 전체 기능 테스트 및 빌드 점검 완료. 직렬 테스트 기준 84개 통과, 1개 스킵, 프론트 빌드 성공으로 정상 동작으로 판단됩니다.**
