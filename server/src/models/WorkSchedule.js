const mongoose = require('mongoose');

const WorkScheduleSchema = new mongoose.Schema(
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
    workDate: { 
      type: Date, 
      required: true,
      index: true,
    },
    startTime: { 
      type: String, 
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM 형식 검증
    },
    endTime: { 
      type: String, 
      required: true,
      match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, // HH:MM 형식 검증
    },
    totalHours: { 
      type: Number, 
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // 승인자 (점주)
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
      maxlength: 500,
    },
    notes: { 
      type: String, 
      default: '',
      maxlength: 1000,
    },
  },
  { timestamps: true }
);

function computeHours(startTime, endTime) {
  // startTime/endTime: 'HH:MM'
  const [sh, sm] = startTime.split(':').map((n) => parseInt(n, 10));
  const [eh, em] = endTime.split(':').map((n) => parseInt(n, 10));
  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end <= start) end += 24 * 60; // overnight
  const minutes = end - start;
  return Math.round((minutes / 60) * 100) / 100; // keep 2 decimals
}

WorkScheduleSchema.pre('save', function (next) {
  if (this.startTime && this.endTime) {
    this.totalHours = computeHours(this.startTime, this.endTime);
  }
  next();
});

WorkScheduleSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate() || {};
  const startTime = update.startTime ?? this._update.startTime;
  const endTime = update.endTime ?? this._update.endTime;
  if (startTime && endTime) {
    const totalHours = computeHours(startTime, endTime);
    this.setUpdate({ ...update, totalHours });
  }
  next();
});

// 복합 인덱스: 사용자별 날짜별 조회, 점포별 날짜별 조회 최적화
WorkScheduleSchema.index({ userId: 1, workDate: 1 });
WorkScheduleSchema.index({ storeId: 1, workDate: 1 });
WorkScheduleSchema.index({ userId: 1, status: 1 }); // 사용자별 상태별 조회
WorkScheduleSchema.index({ storeId: 1, status: 1 }); // 점포별 상태별 조회

// 승인/거절 시 자동으로 approvedBy, approvedAt 설정
WorkScheduleSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'approved' && !this.approvedAt) {
      // 승인 시점을 현재 시간으로 설정 (approvedBy는 API에서 설정)
      this.approvedAt = new Date();
    } else if (this.status === 'rejected') {
      // 거절 시 approvedAt도 설정 (선택적)
      // this.approvedAt = new Date();
    }
  }
  next();
});

module.exports = mongoose.model('WorkSchedule', WorkScheduleSchema);

