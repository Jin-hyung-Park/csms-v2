const mongoose = require('mongoose');

/**
 * Notification 모델
 * 직원(employee)에게 전달되는 알림 (근무일정 승인/거절, 급여 확정 등)
 */
const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['schedule_approved', 'schedule_rejected', 'salary_confirmed', 'owner_message', 'employee_feedback'],
      required: true,
      index: true,
    },
    // 발신자 (점주가 근로자에게 보낸 알림 시)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    // 연관 데이터 (선택) - 클릭 시 상세 페이지로 이동용
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    relatedType: {
      type: String,
      enum: ['WorkSchedule', 'MonthlySalary', ''],
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
