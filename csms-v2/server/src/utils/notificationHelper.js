const Notification = require('../models/Notification');

/**
 * 알림 생성 (비동기, 에러 시 로그만 하고 무시 - 메인 플로우 방해하지 않음)
 * @param {Object} options
 * @param {string} options.userId - 수신자 ObjectId
 * @param {string} options.type - schedule_approved | schedule_rejected | salary_confirmed | owner_message | employee_feedback
 * @param {string} options.title - 알림 제목
 * @param {string} options.message - 알림 본문
 * @param {string} [options.relatedId] - 연관 문서 ObjectId
 * @param {string} [options.relatedType] - WorkSchedule | MonthlySalary
 * @param {string} [options.createdBy] - 발신자 ObjectId (점주→근로자 알림 등)
 */
async function createNotification(options) {
  const { userId, type, title, message, relatedId = null, relatedType = '', createdBy = null } = options;
  if (!userId || !type || !title || !message) return;

  try {
    await Notification.create({
      userId,
      type,
      title,
      message,
      relatedId: relatedId || undefined,
      relatedType: relatedType || undefined,
      createdBy: createdBy || undefined,
    });
  } catch (err) {
    console.error('알림 생성 실패:', err.message);
  }
}

/**
 * 근무일정 승인 알림
 */
async function notifyScheduleApproved(userId, workDate, storeName, scheduleId) {
  const dateStr = workDate ? new Date(workDate).toLocaleDateString('ko-KR') : '';
  await createNotification({
    userId,
    type: 'schedule_approved',
    title: '근무일정이 승인되었습니다.',
    message: storeName ? `${dateStr} ${storeName} 근무일정이 승인되었습니다.` : `${dateStr} 근무일정이 승인되었습니다.`,
    relatedId: scheduleId,
    relatedType: 'WorkSchedule',
  });
}

/**
 * 근무일정 거절 알림
 */
async function notifyScheduleRejected(userId, workDate, storeName, rejectionReason, scheduleId) {
  const dateStr = workDate ? new Date(workDate).toLocaleDateString('ko-KR') : '';
  const reason = rejectionReason ? ` (사유: ${rejectionReason})` : '';
  await createNotification({
    userId,
    type: 'schedule_rejected',
    title: '근무일정이 거절되었습니다.',
    message: storeName ? `${dateStr} ${storeName} 근무일정이 거절되었습니다.${reason}` : `${dateStr} 근무일정이 거절되었습니다.${reason}`,
    relatedId: scheduleId,
    relatedType: 'WorkSchedule',
  });
}

/**
 * 급여 확정 알림
 */
async function notifySalaryConfirmed(userId, year, month, netPay, salaryId) {
  const amountStr = netPay != null ? ` 실수령액: ${Number(netPay).toLocaleString()}원` : '';
  await createNotification({
    userId,
    type: 'salary_confirmed',
    title: '급여가 확정되었습니다.',
    message: `${year}년 ${month}월 급여가 확정되었습니다.${amountStr}`,
    relatedId: salaryId,
    relatedType: 'MonthlySalary',
  });
}

module.exports = {
  createNotification,
  notifyScheduleApproved,
  notifyScheduleRejected,
  notifySalaryConfirmed,
};
