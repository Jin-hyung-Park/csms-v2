const mongoose = require('mongoose');

/**
 * MonthlySalary 모델
 * 월별 급여 정보 및 주차별 상세 데이터
 */
const MonthlySalarySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: [2000, '연도는 2000 이상이어야 합니다'],
      max: [2100, '연도는 2100 이하여야 합니다'],
    },
    month: {
      type: Number,
      required: true,
      min: [1, '월은 1 이상이어야 합니다'],
      max: [12, '월은 12 이하여야 합니다'],
    },
    // 근로자 기본 정보 (스냅샷)
    employeeName: {
      type: String,
      required: true,
      trim: true,
    },
    employeeEmail: {
      type: String,
      required: true,
      trim: true,
    },
    hourlyWage: {
      type: Number,
      required: true,
      min: [0, '시급은 0 이상이어야 합니다'],
    },
    taxType: {
      type: String,
      enum: ['none', 'under-15-hours', 'business-income', 'labor-income', 'four-insurance'],
      required: true,
    },
    // 근로 통계 정보
    totalWorkHours: {
      type: Number,
      required: true,
      default: 0,
      min: [0, '근무시간은 0 이상이어야 합니다'],
    },
    totalWorkDays: {
      type: Number,
      required: true,
      default: 0,
      min: [0, '근무일수는 0 이상이어야 합니다'],
    },
    totalBasePay: {
      type: Number,
      required: true,
      default: 0,
      min: [0, '기본급은 0 이상이어야 합니다'],
    },
    totalHolidayPay: {
      type: Number,
      required: true,
      default: 0,
      min: [0, '주휴수당은 0 이상이어야 합니다'],
    },
    totalGrossPay: {
      type: Number,
      required: true,
      default: 0,
      min: [0, '총 지급액은 0 이상이어야 합니다'],
    },
    // 복지포인트: 전주 실 근로시간 기반 차주 지급. trunc(실 근로시간/4, 0) × 1,700원, 주차별 합산
    totalWelfarePoints: {
      type: Number,
      default: 0,
      min: [0, '복지포인트는 0 이상이어야 합니다'],
    },
    // 세금 정보 (four-insurance 시 4대보험 항목 추가)
    taxInfo: {
      incomeTax: {
        type: Number,
        default: 0,
        min: [0, '소득세는 0 이상이어야 합니다'],
      },
      localTax: {
        type: Number,
        default: 0,
        min: [0, '지방세는 0 이상이어야 합니다'],
      },
      totalTax: {
        type: Number,
        default: 0,
        min: [0, '총 세금은 0 이상이어야 합니다'],
      },
      netPay: {
        type: Number,
        default: 0,
        min: [0, '실수령액은 0 이상이어야 합니다'],
      },
      // 4대 보험 대상 시 상세 (선택)
      nationalPension: { type: Number, default: 0 },
      healthInsurance: { type: Number, default: 0 },
      longTermCare: { type: Number, default: 0 },
      employmentInsurance: { type: Number, default: 0 },
    },
    // 주차별 상세 정보
    weeklyDetails: [
      {
        weekNumber: {
          type: Number,
          required: true,
          min: [1, '주차 번호는 1 이상이어야 합니다'],
        },
        startDate: {
          type: String,
          required: true,
          match: [/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다'],
        },
        endDate: {
          type: String,
          required: true,
          match: [/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다'],
        },
        workHours: {
          type: Number,
          required: true,
          default: 0,
          min: [0, '근무시간은 0 이상이어야 합니다'],
        },
        workDays: {
          type: Number,
          required: true,
          default: 0,
          min: [0, '근무일수는 0 이상이어야 합니다'],
        },
        basePay: {
          type: Number,
          required: true,
          default: 0,
          min: [0, '기본급은 0 이상이어야 합니다'],
        },
        holidayPay: {
          type: Number,
          required: true,
          default: 0,
          min: [0, '주휴수당은 0 이상이어야 합니다'],
        },
        weeklyTotal: {
          type: Number,
          required: true,
          default: 0,
          min: [0, '주간 총액은 0 이상이어야 합니다'],
        },
        holidayPayStatus: {
          type: String,
          enum: ['pending', 'calculated', 'adjusted', 'confirmed', 'not_eligible', 'pending_next_month'],
          default: 'pending',
          // pending: 미계산, calculated: 자동계산됨, adjusted: 수정됨, confirmed: 확정
          // not_eligible: 지급대상아님, pending_next_month: 익월 산정 예정
        },
        holidayPayCalculation: {
          calculated: {
            totalHours: {
              type: Number,
              default: 0,
            },
            isEligible: {
              type: Boolean,
              default: false,
            },
            amount: {
              type: Number,
              default: 0,
            },
          },
          adjusted: {
            amount: {
              type: Number,
              default: null,
            },
            reason: {
              type: String,
              default: '',
              maxlength: 500,
            },
            notes: {
              type: String,
              default: '',
              maxlength: 1000,
            },
            adjustedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: 'User',
              default: null,
            },
            adjustedAt: {
              type: Date,
              default: null,
            },
          },
        },
      },
    ],
    // 상태 (3단계 프로세스)
    status: {
      type: String,
      enum: ['draft', 'calculated', 'adjusted', 'confirmed'],
      default: 'draft',
      index: true,
    },
    // 근로자 확인 (산정 내용 확인 완료, 분쟁 방지용)
    employeeConfirmed: {
      type: Boolean,
      default: false,
      index: true,
    },
    employeeConfirmedAt: {
      type: Date,
      default: null,
    },
    // 근로자 피드백 (이상 시 점주에게 전달, 분쟁 방지용 보관)
    employeeFeedbackMessage: {
      type: String,
      default: '',
      maxlength: 2000,
    },
    employeeFeedbackAt: {
      type: Date,
      default: null,
    },
    // 확정 정보
    confirmedAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // 메모
    notes: {
      type: String,
      default: '',
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

// 복합 인덱스: 사용자별 연월별 중복 방지
MonthlySalarySchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

// 조회용 인덱스
MonthlySalarySchema.index({ storeId: 1, year: 1, month: 1 });
MonthlySalarySchema.index({ userId: 1, status: 1 });
MonthlySalarySchema.index({ storeId: 1, status: 1 });

// 가상 필드: 확정 여부
MonthlySalarySchema.virtual('isConfirmed').get(function () {
  return this.status === 'confirmed';
});

// 확정 후 수정 불가 검증 (save 시)
MonthlySalarySchema.pre('save', function (next) {
  if (this.status !== 'confirmed' || !this.isModified()) return next();
  // 확정 시 허용되는 경로: status, confirmedAt, confirmedBy, weeklyDetails(및 하위), updatedAt
  const allowedPaths = ['status', 'confirmedAt', 'confirmedBy', 'updatedAt', 'weeklyDetails'];
  const modifiedPaths = this.modifiedPaths();
  const hasDisallowed = modifiedPaths.some(
    (p) => !allowedPaths.includes(p) && !p.startsWith('weeklyDetails.')
  );
  if (hasDisallowed) {
    return next(new Error('확정된 급여는 수정할 수 없습니다.'));
  }
  next();
});

// 확정 후 수정 불가 검증 (update 시에만)
MonthlySalarySchema.pre(['updateOne', 'findOneAndUpdate'], function (next) {
  const update = this.getUpdate();
  
  // status가 confirmed인 경우 수정 불가
  if (update && update.$set && update.$set.status === 'confirmed') {
    // 확정 작업은 허용
    return next();
  }
  
  // 이미 confirmed 상태인 경우 수정 불가
  // 이 검증은 API 레벨에서 처리
  next();
});

// 주차별 주휴수당 계산 메서드 (추후 구현)
MonthlySalarySchema.methods.calculateHolidayPayForWeek = function (weekIndex) {
  const week = this.weeklyDetails[weekIndex];
  if (!week) return null;

  // TODO: 주휴수당 계산 로직 구현
  // - 주 15시간 이상 근무 시
  // - 개근 여부 확인
  // - 산식: (1주 근로계약상 근로시간의합 / 40) × 8 × 시급

  return {
    totalHours: week.workHours,
    isEligible: week.workHours >= 15,
    amount: 0, // TODO: 계산 로직 구현
  };
};

// 주휴수당 수정 메서드
MonthlySalarySchema.methods.adjustHolidayPay = function (
  weekIndex,
  adjustedAmount,
  reason,
  notes,
  adjustedBy
) {
  if (this.status === 'confirmed') {
    throw new Error('확정된 급여는 수정할 수 없습니다.');
  }

  const week = this.weeklyDetails[weekIndex];
  if (!week) {
    throw new Error('해당 주차를 찾을 수 없습니다.');
  }

  week.holidayPayCalculation.adjusted = {
    amount: adjustedAmount,
    reason: reason || '',
    notes: notes || '',
    adjustedBy: adjustedBy,
    adjustedAt: new Date(),
  };

  week.holidayPayStatus = 'adjusted';
  week.holidayPay = adjustedAmount;

  // 상태 업데이트
  if (this.status === 'draft' || this.status === 'calculated') {
    this.status = 'adjusted';
  }

  return week;
};

// 급여 확정 메서드
MonthlySalarySchema.methods.confirm = function (confirmedBy) {
  if (this.status === 'confirmed') {
    throw new Error('이미 확정된 급여입니다.');
  }

  // status를 먼저 변경하지 않고 직접 할당
  this.set('status', 'confirmed');
  this.set('confirmedAt', new Date());
  this.set('confirmedBy', confirmedBy);

  // 모든 주차의 주휴수당 상태를 confirmed로 변경
  if (this.weeklyDetails && Array.isArray(this.weeklyDetails)) {
    this.weeklyDetails.forEach((week) => {
      if (week.holidayPayStatus && week.holidayPayStatus !== 'pending') {
        week.holidayPayStatus = 'confirmed';
      }
    });
  }

  return this;
};

// 총액 재계산 메서드
MonthlySalarySchema.methods.recalculateTotals = function () {
  // 주차별 합계 계산
  this.totalWorkHours = this.weeklyDetails.reduce(
    (sum, week) => sum + (week.workHours || 0),
    0
  );
  this.totalWorkDays = this.weeklyDetails.reduce(
    (sum, week) => sum + (week.workDays || 0),
    0
  );
  this.totalBasePay = this.weeklyDetails.reduce(
    (sum, week) => sum + (week.basePay || 0),
    0
  );
  this.totalHolidayPay = this.weeklyDetails.reduce(
    (sum, week) => sum + (week.holidayPay || 0),
    0
  );
  this.totalGrossPay = this.totalBasePay + this.totalHolidayPay;

  // 복지포인트: trunc(실 근로시간/4, 0) × 1,700원, 주차별 합산
  const WELFARE_POINT_UNIT = 1700;
  this.totalWelfarePoints = this.weeklyDetails.reduce(
    (sum, week) => sum + Math.floor((week.workHours || 0) / 4) * WELFARE_POINT_UNIT,
    0
  );

  // 세금 계산 (간단한 계산, 추후 정확한 로직으로 대체)
  if (this.taxType === 'business-income') {
    this.taxInfo.totalTax = Math.round(this.totalGrossPay * 0.033);
    this.taxInfo.incomeTax = Math.round(this.taxInfo.totalTax * 0.9);
    this.taxInfo.localTax = Math.round(this.taxInfo.totalTax * 0.1);
  } else {
    this.taxInfo.totalTax = 0;
    this.taxInfo.incomeTax = 0;
    this.taxInfo.localTax = 0;
  }

  this.taxInfo.netPay = this.totalGrossPay - this.taxInfo.totalTax;

  return this;
};

module.exports = mongoose.model('MonthlySalary', MonthlySalarySchema);
