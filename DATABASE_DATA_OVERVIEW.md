# DB 적재 데이터 개요

CSMS에서 MongoDB에 저장하는 데이터는 **7개 컬렉션(모델)**로 구성됩니다.

---

## 1. User (사용자)

| 필드 | 타입 | 설명 |
|------|------|------|
| username | String | 사용자명 (2~50자) |
| email | String | 이메일 (unique) |
| password | String | 비밀번호 (bcrypt 해시, select: false) |
| role | String | 역할: `employee` \| `manager` \| `owner` |
| storeId | ObjectId | 소속 점포 (직원/매니저일 때 필수) |
| hourlyWage | Number | 시급 (기본 10030) |
| taxType | String | 세금 유형: `미신고` \| `주15시간미만` \| `사업자소득(3.3%)` |
| workSchedule | Object | 요일별 근로 계약 (enabled, startTime, endTime) |
| kakaoId | String | 카카오 로그인 시 카카오 ID (optional) |
| isActive | Boolean | 재직 여부 |
| profileImage | String | 프로필 이미지 URL |
| phoneNumber | String | 전화번호 |
| address | String | 주소 |
| emergencyContact | Object | 비상연락처 (name, phone, relationship) |
| ssn | String | 주민번호 (000000-0000000 형식) |
| hireDate / terminationDate | Date | 입사일 / 퇴사일 |
| payslipAlternativeConsent | Boolean | 임금명세서 발송 대체 동의 |
| payslipDeliveryMethod | String | 임금명세서 전달 방식: email \| sms \| app \| paper |
| createdAt / updatedAt | Date | timestamps |

---

## 2. Store (점포)

| 필드 | 타입 | 설명 |
|------|------|------|
| ownerId | ObjectId | 점주 User 참조 |
| name | String | 점포명 (점주별 unique) |
| address | String | 주소 |
| ownerName | String | 점주명 |
| businessNumber | String | 사업자번호 |
| isActive | Boolean | 운영 여부 |
| description | String | 설명 |
| createdAt / updatedAt | Date | timestamps |

---

## 3. WorkSchedule (근무 일정)

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | ObjectId | 직원 User 참조 |
| storeId | ObjectId | 근무 점포 |
| workLocation | String | 근무 장소(레거시) |
| workDate | Date | 근무 날짜 (오늘 이전만 허용) |
| endDate | Date | 종료일 (야간근무 시 다음날) |
| startTime / endTime | String | 시작/종료 시간 (HH:MM) |
| totalHours | Number | 총 근무시간 (휴식 제외, 자동 계산) |
| breakTime | Number | 휴식시간(분) |
| overtimeHours | Number | 초과근무시간 (8시간 초과분, 자동 계산) |
| hourlyWage / totalPay | Number | 해당 일정 적용 시급·총 급여 (자동 계산) |
| status | String | pending \| approved \| rejected \| modified \| modified_by_owner |
| approvedBy / approvedAt | ObjectId, Date | 승인자·승인 시각 |
| rejectionReason / modificationReason | String | 거절/수정 사유 |
| notes | String | 메모 |
| createdAt / updatedAt | Date | timestamps |

---

## 4. MonthlySalary (월별 급여)

| 필드 | 타입 | 설명 |
|------|------|------|
| userId / storeId | ObjectId | 직원·점포 참조 |
| year / month | Number | 해당 연·월 |
| employeeName / employeeEmail | String | 직원 이름·이메일 |
| hourlyWage / taxType | Number, String | 시급·세금 유형 |
| totalWorkHours / totalWorkDays | Number | 총 근무시간·근무일수 |
| totalBasePay / totalHolidayPay / totalGrossPay | Number | 기본급·주휴수당·총 지급액 |
| totalWelfarePoints | Number | 복지포인트 (주차별 합산) |
| taxInfo | Object | incomeTax, localTax, totalTax, netPay (4대보험 시 nationalPension 등) |
| weeklyDetails | Array | 주차별 상세 (주차번호, 기간, 근무시간/일수, 기본급, 주휴수당, 상태, 산출/조정 정보) |
| holidayPaySettings | Object | 주휴수당 산출·수정·확정 정보 (enabled, calculatedBy, calculatedAt 등) |
| **employeeConfirmed** | Boolean | 근로자 급여 내용 확인 완료 여부 (분쟁 방지용) |
| **employeeConfirmedAt** | Date | 근로자 확인 시각 |
| **employeeFeedbackMessage** | String | 근로자 피드백 내용 (이상 시 점주에게 전달·보관) |
| **employeeFeedbackAt** | Date | 근로자 피드백 등록 시각 |
| confirmedAt / confirmedBy | Date, ObjectId | 확정 시각·확정자 (점주는 근로자 확인 후에만 확정 가능) |
| status | String | draft \| calculated \| adjusted \| **confirmed** |
| notes | String | 메모 |
| createdAt / updatedAt | Date | timestamps |

**제약**: (userId, year, month) 조합 unique. 점주 확정은 **employeeConfirmed === true** 일 때만 가능.

---

## 5. Expense (지출/수입 – 점포·월별)

| 필드 | 타입 | 설명 |
|------|------|------|
| ownerId / storeId | ObjectId | 점주·점포 참조 |
| year / month | Number | 연·월 (1~12) |
| settlementAmount | Number | 월 정산 금액(기본 수입) |
| incomeItems | Array | 추가 수입 (category, description, amount, date) — 월 정산, 부가 수입, 임대 수입 등 |
| expenses | Array | 지출 (category, description, amount, paymentMethod, notes, date, isRecurring) — 카드/계좌이체/현금 등 |
| notes | String | 메모 |
| totalIncome / totalExpenses / netProfit / profitMargin | Number | 자동 계산 필드 |
| createdAt / updatedAt | Date | timestamps |

**제약**: (storeId, year, month) 조합 unique.

---

## 6. FixedExpense (고정 지출)

| 필드 | 타입 | 설명 |
|------|------|------|
| ownerId | ObjectId | 점주 User 참조 |
| category | String | 임대료 \| 전기세 \| 수도세 \| 가스비 \| 인터넷비 \| 보험료 \| 세금 \| 기타 |
| description | String | 설명 |
| amount | Number | 금액 |
| isRecurring | Boolean | 매월 반복 여부 |
| isActive | Boolean | 활성 여부 |
| startMonth / endMonth | String | 적용 기간 (YYYY-MM), endMonth null이면 무제한 |
| notes | String | 메모 |
| createdAt / updatedAt | Date | timestamps |

---

## 7. Notification (알림)

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | ObjectId | 수신자 User 참조 |
| **createdBy** | ObjectId | 발신자 User 참조 (점주→근로자 알림 시 점주, 근로자 피드백 시 근로자) |
| title / message | String | 제목·내용 |
| type | String | **schedule_approved** \| **schedule_rejected** \| **salary_confirmed** \| **owner_message** \| **employee_feedback** |
| **relatedId** / **relatedType** | ObjectId, String | 연관 문서 (WorkSchedule, MonthlySalary 등) |
| isRead | Boolean | 읽음 여부 (근로자가 읽으면 true, 점주가 보낸 알림 읽음 확인에 사용) |
| createdAt / updatedAt | Date | timestamps |

---

## 컬렉션 요약

| 컬렉션 | 용도 |
|--------|------|
| **users** | 로그인·권한·직원/점주 정보, 시급·세금·근로계약 |
| **stores** | 점포 정보 (점주별) |
| **workschedules** | 일별 근무 일정·승인·근무시간·급여 계산 |
| **monthlysalaries** | 월별 급여·주휴수당·세금·주차별 상세 |
| **expenses** | 점포별 월별 수입·지출·순이익 |
| **fixedexpenses** | 점주별 반복 고정 지출 |
| **notifications** | 사용자별 알림 (근무 승인/거절, 급여 확정, 점주→근로자 메시지, 근로자 피드백 등 / createdBy로 발신자·읽음 확인) |

모든 모델에 `timestamps: true`가 설정되어 있어 **createdAt**, **updatedAt**이 자동으로 저장됩니다.
