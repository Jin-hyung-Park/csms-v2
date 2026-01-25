# Phase 2 완료 보고

> 데이터 모델 확장 및 관계 개선 완료

---

## ✅ Phase 2 완료 항목

### 1. Store 모델 확장 ✅

#### 추가된 필드
- ✅ `isActive`: Boolean (기본값: true) - 점포 활성 상태
- ✅ `description`: String (최대 500자) - 점포 설명
- ✅ `ownerId`: required: true - 점주 필수 (여러 점포 소유 가능)

#### 개선된 기능
- ✅ 필드 검증: trim, maxlength 추가
- ✅ 복합 인덱스: `{ ownerId: 1, name: 1 }` (unique) - 점주별 점포명 중복 방지
- ✅ 복합 인덱스: `{ ownerId: 1, isActive: 1 }` - 점주별 활성 점포 조회 최적화
- ✅ 가상 필드: `employeeCount` - 점포별 직원 수 (populate로 사용 가능)

### 2. User 모델 개선 ✅

#### 추가된 필드
- ✅ `isActive`: Boolean (기본값: true) - 사용자 활성 상태

#### 개선된 검증
- ✅ 필드 검증: trim, maxlength, lowercase 추가
- ✅ 근로자 검증: 근로자는 `storeId` 필수 (업데이트 시에만 엄격하게 검증)
  - 새로 생성되는 경우(회원가입)에는 `storeId` 없어도 됨
  - 업데이트 시 `storeId` 제거 불가
- ✅ 점주 검증: 점주는 여러 점포 소유 가능하므로 `storeId` 없음이 정상

#### 개선된 인덱스
- ✅ 복합 인덱스: `{ role: 1, isActive: 1 }` - 역할별 활성 사용자 조회
- ✅ 복합 인덱스: `{ storeId: 1, isActive: 1 }` - 점포별 활성 직원 조회

### 3. WorkSchedule 모델 확장 ✅

#### 추가된 필드
- ✅ `approvedBy`: ObjectId (ref: User) - 승인자 (점주)
- ✅ `approvedAt`: Date - 승인 일시
- ✅ `rejectionReason`: String (최대 500자) - 거절 사유

#### 개선된 검증
- ✅ `userId`, `storeId`, `workDate`: required 및 index 추가
- ✅ `startTime`, `endTime`: HH:MM 형식 검증 (정규식)
- ✅ `totalHours`: min: 0 추가
- ✅ `notes`: maxlength 1000자로 증가

#### 개선된 인덱스
- ✅ 복합 인덱스: `{ userId: 1, workDate: 1 }` - 사용자별 날짜별 조회
- ✅ 복합 인덱스: `{ storeId: 1, workDate: 1 }` - 점포별 날짜별 조회
- ✅ 복합 인덱스: `{ userId: 1, status: 1 }` - 사용자별 상태별 조회
- ✅ 복합 인덱스: `{ storeId: 1, status: 1 }` - 점포별 상태별 조회

#### 자동화 기능
- ✅ 승인 시 자동으로 `approvedAt` 설정 (pre-save hook)

---

## 📊 테스트 결과

### 모든 테스트 통과 ✅

- ✅ **auth.test.js**: 17 passed
- ✅ **workSchedule.test.js**: 12 passed
- ✅ **workSchedule-auth.test.js**: 5 passed
- ✅ **health.test.js**: 1 passed

**총 35개 테스트 모두 통과** ✅

---

## 🔍 주요 변경 사항

### Store 모델

```javascript
// Phase 2 확장 후
{
  name: String (required, maxlength: 100),
  address: String (required, maxlength: 200),
  phone: String (maxlength: 20),
  ownerId: ObjectId (required, ref: User),  // 점주 필수
  businessNumber: String (maxlength: 20),
  isActive: Boolean (default: true),        // 새로 추가
  description: String (maxlength: 500),     // 새로 추가
  createdAt: Date,
  updatedAt: Date
}
```

### User 모델

```javascript
// Phase 2 개선 후
{
  name: String (required, maxlength: 50),
  email: String (required, unique, lowercase),
  password: String (required, select: false),
  phone: String (maxlength: 20),
  role: String (required, enum: ['owner', 'employee']),
  storeId: ObjectId (ref: Store),  // 근로자는 필수, 점주는 null
  isActive: Boolean (default: true),  // 새로 추가
  createdAt: Date,
  updatedAt: Date
}
```

### WorkSchedule 모델

```javascript
// Phase 2 확장 후
{
  userId: ObjectId (required, ref: User),
  storeId: ObjectId (required, ref: Store),
  workDate: Date (required),
  startTime: String (required, match: HH:MM),
  endTime: String (required, match: HH:MM),
  totalHours: Number (min: 0),
  status: String (enum: ['pending', 'approved', 'rejected']),
  approvedBy: ObjectId (ref: User),    // 새로 추가
  approvedAt: Date,                    // 새로 추가
  rejectionReason: String (maxlength: 500),  // 새로 추가
  notes: String (maxlength: 1000),
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🔗 관계 개선

### User ↔ Store 관계

- **점주 (Owner)**: 여러 점포 소유 가능 (`storeId` 없음)
- **근로자 (Employee)**: 단일 점포에 소속 (`storeId` 필수)
- **검증**: 근로자는 회원가입 시 `storeId` 없어도 되지만, 이후 근무 배정 시 필수

### User ↔ WorkSchedule 관계

- **근로자**: 자신의 근무일정만 조회/생성/수정 가능
- **점주**: 모든 근무일정 조회 및 승인/거절 가능
- **승인**: `approvedBy` 필드로 승인자 추적

### Store ↔ WorkSchedule 관계

- **점포**: 여러 근무일정 포함
- **근무일정**: 단일 점포에 속함 (`storeId` 필수)

---

## ✅ Phase 2 완료 확인

### 구현 완료 ✅

1. ✅ **Store 모델 확장** - 점포 정보 상세화, 점포 설정 추가
2. ✅ **User-Store 관계 완성** - 점주는 여러 점포, 근로자는 단일 점포
3. ✅ **WorkSchedule 참조 관계 확장** - 승인 관련 필드 추가, 인덱스 최적화

### 테스트 완료 ✅

- ✅ 모든 기존 테스트 통과
- ✅ 테스트 데이터 구조 개선 (점주 → 점포 → 근로자 순서로 생성)

---

## 📝 다음 단계

### Phase 3: Employee API 실제 연동

1. Mock 데이터 제거
2. 실제 DB 조회로 변경
3. Employee API 완성

### Phase 4: 점주 기능

1. 점주 대시보드
2. 근무일정 승인/거절 API
3. 직원 관리 API

---

**Phase 2 완료를 축하합니다! 🎉**

데이터 모델이 확장되었고, 관계가 개선되었습니다. 이제 더 복잡한 비즈니스 로직을 구현할 준비가 되었습니다.


