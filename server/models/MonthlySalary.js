const mongoose = require('mongoose');

const monthlySalarySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true
  },
  // 근로자 기본 정보
  employeeName: {
    type: String,
    required: true
  },
  employeeEmail: {
    type: String,
    required: true
  },
  hourlyWage: {
    type: Number,
    required: true
  },
  taxType: {
    type: String,
    required: true
  },
  // 근로 통계 정보
  totalWorkHours: {
    type: Number,
    required: true,
    default: 0
  },
  totalWorkDays: {
    type: Number,
    required: true,
    default: 0
  },
  totalBasePay: {
    type: Number,
    required: true,
    default: 0
  },
  totalHolidayPay: {
    type: Number,
    required: true,
    default: 0
  },
  totalGrossPay: {
    type: Number,
    required: true,
    default: 0
  },
  // 세금 정보
  taxInfo: {
    incomeTax: { type: Number, default: 0 },
    localTax: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 }
  },
  // 주차별 상세 정보
  weeklyDetails: [{
    weekNumber: Number,
    startDate: String,
    endDate: String,
    workHours: Number,
    workDays: Number,
    basePay: Number,
    holidayPay: Number,
    weeklyTotal: Number,
    // 주휴수당 관리 필드 추가
    holidayPayStatus: {
      type: String,
      enum: ['not_calculated', 'calculated', 'adjusted', 'confirmed'],
      default: 'not_calculated'
    },
    holidayPayCalculation: {
      // 자동 계산된 값
      calculated: {
        totalHours: Number,
        workedDays: Number,
        contractedDays: Number,
        isEligible: Boolean, // 15시간 이상 + 계약일수 모두 출근
        rate: Number, // 0.1 (10%)
        amount: Number
      },
      // 점주가 수정한 값
      adjusted: {
        amount: Number,
        reason: String,
        notes: String,
        adjustedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        adjustedAt: Date
      }
    }
  }],
  // 주휴수당 관리 설정
  holidayPaySettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    calculatedAt: {
      type: Date
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedAt: {
      type: Date
    }
  },
  // 확정 정보
  confirmedAt: {
    type: Date,
    default: Date.now
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 상태
  status: {
    type: String,
    enum: ['confirmed', 'cancelled'],
    default: 'confirmed'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 복합 인덱스 (중복 방지)
monthlySalarySchema.index({ userId: 1, storeId: 1, year: 1, month: 1 }, { unique: true });

// 조회용 인덱스
monthlySalarySchema.index({ storeId: 1, year: 1, month: 1 });
monthlySalarySchema.index({ userId: 1, year: 1, month: 1 });

// 주휴수당 계산 메서드
monthlySalarySchema.methods.calculateHolidayPay = function(weekIndex) {
  const week = this.weeklyDetails[weekIndex];
  if (!week) return null;
  
  const { workHours, workDays } = week;
  const contractedDays = this.getContractedDays(); // User 모델에서 가져오는 메서드
  
  // 주휴수당 지급 조건: 15시간 이상 + 계약된 모든 날 출근
  const isEligible = workHours >= 15 && workDays >= contractedDays;
  
  const calculatedAmount = isEligible ? Math.round(workHours * this.hourlyWage * 0.1) : 0;
  
  return {
    totalHours: workHours,
    workedDays: workDays,
    contractedDays: contractedDays,
    isEligible: isEligible,
    rate: 0.1,
    amount: calculatedAmount
  };
};

// 주휴수당 확정 메서드
monthlySalarySchema.methods.confirmHolidayPay = function(weekIndex, confirmedBy) {
  const week = this.weeklyDetails[weekIndex];
  if (!week) return false;
  
  week.holidayPayStatus = 'confirmed';
  this.holidayPaySettings.lastModifiedBy = confirmedBy;
  this.holidayPaySettings.lastModifiedAt = new Date();
  
  return true;
};

// 주휴수당 수정 메서드
monthlySalarySchema.methods.adjustHolidayPay = function(weekIndex, adjustedAmount, reason, notes, adjustedBy) {
  const week = this.weeklyDetails[weekIndex];
  if (!week) return false;
  
  week.holidayPayCalculation.adjusted = {
    amount: adjustedAmount,
    reason: reason,
    notes: notes,
    adjustedBy: adjustedBy,
    adjustedAt: new Date()
  };
  
  week.holidayPayStatus = 'adjusted';
  this.holidayPaySettings.lastModifiedBy = adjustedBy;
  this.holidayPaySettings.lastModifiedAt = new Date();
  
  return true;
};

module.exports = mongoose.model('MonthlySalary', monthlySalarySchema); 