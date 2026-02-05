const mongoose = require('mongoose');

const workScheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, '근무점포를 선택해주세요']
  },
  workLocation: {
    type: String,
    required: false
  },
  workDate: {
    type: Date,
    required: [true, '근무 날짜를 입력해주세요'],
    validate: {
      validator: function(value) {
        // 날짜만 비교 (시간은 무시)
        const today = new Date();
        today.setHours(23, 59, 59, 999); // 오늘 23:59:59까지 허용
        return value <= today;
      },
      message: '근무 날짜는 오늘까지만 입력 가능합니다'
    }
  },
  endDate: {
    type: Date,
    required: false,
    validate: {
      validator: function(value) {
        if (value) {
          // 날짜만 비교 (시간은 무시)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(23, 59, 59, 999); // 내일 23:59:59까지 허용 (야간근무 고려)
          return value <= tomorrow;
        }
        return true;
      },
      message: '근무 종료일은 내일까지만 입력 가능합니다 (야간근무 고려)'
    }
  },
  startTime: {
    type: String,
    required: [true, '시작 시간을 입력해주세요'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '올바른 시간 형식을 입력해주세요 (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, '종료 시간을 입력해주세요'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, '올바른 시간 형식을 입력해주세요 (HH:MM)']
  },
  totalHours: {
    type: Number,
    required: false, // pre-save 훅에서 자동 계산되므로 required를 false로 변경
    default: 0,
    validate: {
      validator: function(value) {
        // null 또는 undefined인 경우도 허용
        if (value == null) return true;
        return value >= 0 && value <= 24;
      },
      message: '총 근무 시간은 0에서 24시간 사이여야 합니다'
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'modified', 'modified_by_owner', null],
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    maxlength: [500, '거절 사유는 500자를 초과할 수 없습니다']
  },
  modificationReason: {
    type: String,
    maxlength: [500, '수정 사유는 500자를 초과할 수 없습니다']
  },
  notes: {
    type: String,
    maxlength: [1000, '메모는 1000자를 초과할 수 없습니다']
  },
  breakTime: {
    type: Number,
    default: 0,
    min: [0, '휴식 시간은 0 이상이어야 합니다']
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: [0, '초과 근무 시간은 0 이상이어야 합니다']
  },
  hourlyWage: {
    type: Number,
    default: 0,
    min: [0, '시급은 0 이상이어야 합니다']
  },
  totalPay: {
    type: Number,
    default: 0,
    min: [0, '총 급여는 0 이상이어야 합니다']
  }
}, {
  timestamps: true
});

// Calculate total hours before saving
workScheduleSchema.pre('save', function(next) {
  console.log('Pre-save hook triggered with:', {
    startTime: this.startTime,
    endTime: this.endTime,
    breakTime: this.breakTime,
    workDate: this.workDate,
    endDate: this.endDate
  });
  
  if (this.startTime && this.endTime) {
    const start = new Date(`2000-01-01T${this.startTime}:00`);
    const end = new Date(`2000-01-01T${this.endTime}:00`);
    
    // 야간근무인 경우 endDate를 자동으로 설정
    if (end <= start) {
      if (this.workDate && !this.endDate) {
        this.endDate = new Date(this.workDate);
        this.endDate.setDate(this.endDate.getDate() + 1);
      }
      end.setDate(end.getDate() + 1); // Next day if end time is before start time
    }
    
    const diffMs = end - start;
    const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; // Round to 2 decimal places
    
    // Subtract break time
    const breakTime = this.breakTime || 0;
    this.totalHours = Math.max(0, totalHours - breakTime);
    
    // Calculate overtime (over 8 hours)
    if (this.totalHours > 8) {
      this.overtimeHours = Math.round((this.totalHours - 8) * 100) / 100;
    } else {
      this.overtimeHours = 0;
    }
    
    // Calculate total pay
    if (this.hourlyWage && this.totalHours) {
      this.totalPay = Math.floor(this.totalHours * this.hourlyWage);
    }
    
    console.log('Calculated values:', {
      totalHours: this.totalHours,
      overtimeHours: this.overtimeHours,
      hourlyWage: this.hourlyWage,
      totalPay: this.totalPay,
      endDate: this.endDate
    });
  } else {
    console.log('Missing startTime or endTime, cannot calculate totalHours');
  }
  next();
});

// Index for efficient queries
workScheduleSchema.index({ userId: 1, workDate: 1 });
workScheduleSchema.index({ status: 1 });
workScheduleSchema.index({ createdAt: -1 });

module.exports = mongoose.model('WorkSchedule', workScheduleSchema); 