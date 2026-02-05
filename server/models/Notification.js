const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, '알림 제목을 입력해주세요'],
    maxlength: [100, '알림 제목은 100자를 초과할 수 없습니다']
  },
  message: {
    type: String,
    required: [true, '알림 메시지를 입력해주세요'],
    maxlength: [500, '알림 메시지는 500자를 초과할 수 없습니다']
  },
  type: {
    type: String,
    enum: ['work_approval', 'work_rejection', 'work_modification', 'work_approval_request', 'system', 'reminder'],
    default: 'system'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  relatedScheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkSchedule'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  actionUrl: {
    type: String,
    maxlength: [200, '액션 URL은 200자를 초과할 수 없습니다']
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 });

// Auto-delete expired notifications
notificationSchema.pre('find', function() {
  this.where({ 
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: { $gt: new Date() } }
    ]
  });
});

module.exports = mongoose.model('Notification', notificationSchema); 