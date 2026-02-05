# 남은 개발 기능 목록

> CSMS v2 프로젝트 미구현/선택 기능 정리  
> **최종 업데이트: 2026-02-04**  
> 현재 상태 기준: [CURRENT_STATUS.md](./CURRENT_STATUS.md)

---

## 📊 전체 진행률: 약 90%

### ✅ 이미 완료된 기능 (참고용)

- 인증 시스템 (JWT, 매장코드 가입·점주 승인)
- 직원(Employee) 기능 (UI + API)
- 점주(Owner) 기능 (UI + API, 알림 발송·읽음 확인 포함)
- 근무일정 관리 (CRUD, 승인/거절, 점주 수정/삭제)
- **급여 계산**: 기본급, 주휴수당, 복지포인트, **세금(taxType별)** — none / under-15-hours / **business-income** / **labor-income** / **four-insurance**
- **MonthlySalary**: 산정·수정·확정, **근로자 확인·피드백** 후 점주 확정
- **알림**: Notification 모델, 승인/거절/급여확정/점주→근로자/근로자 피드백, 읽음 처리
- Excel 다운로드 (급여 목록·명세서·근무일정)
- PWA (오프라인 캐싱, 오프라인 폴백, 배너)

---

## 🔴 우선순위: 선택 (보강 가능)

### 1. 근로소득 세금 — 간이세액표 정확 반영 (선택)

**현재 상태:**  
- ✅ **이미 구현됨**: `taxType: 'labor-income'` 시 **구간별 누진세율**로 소득세·지방세 계산  
  - `server/src/utils/taxCalculator.js` → `calculateLaborIncomeTax()`  
  - 월 급여 구간별 0% ~ 45% 근사 (2024년 근로소득 원천징수세율 근사, 공제대상가족 0명 기준)

**선택적 보강:**  
- [ ] 국세청 **간이세액표**를 그대로 반영해 구간·세액을 정확히 맞추기  
- [ ] 공제대상가족 수 등 추가 인자 반영 (현재는 0명 기준)

**관련 문서:** [docs/LABOR_INCOME_TAX.md](./docs/LABOR_INCOME_TAX.md)

---

### 2. 실시간 알림 (선택)

**현재 상태:**  
- ✅ 알림 생성·조회·읽음 처리, 점주→근로자 발송·읽음 확인 완료

**미구현:**  
- [ ] **실시간 푸시**: 새 알림 시 즉시 화면 반영 (WebSocket 또는 Server-Sent Events)

---

## 🟢 기타 개선 (낮은 우선순위)

- [ ] 직원/근무일정/급여 **검색·고급 필터**
- [ ] 대시보드 **차트·월별/연도별 통계 리포트**
- [ ] 로딩·에러 메시지, 접근성 등 **UX 개선**

---

## 📋 문서 현행화 요약

| 문서 | 비고 |
|------|------|
| [CURRENT_STATUS.md](./CURRENT_STATUS.md) | 현재 상태·API·완료 항목 정리 (최신) |
| [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) | 최근 현행화 사항·진행률 |
| [DATABASE_DATA_OVERVIEW.md](../DATABASE_DATA_OVERVIEW.md) | DB 컬렉션·필드 정의 |

---

**실제 “꼭 해야 할” 필수 미구현 기능은 없으며, 위 항목은 보강·선택 사항입니다.**
