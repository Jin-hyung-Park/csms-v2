/**
 * 근로시간 계산 공통 유틸리티
 */

/**
 * 실제 근무 시간 계산 (휴식시간 포함)
 * @param {Object} schedule - 근무 일정 객체
 * @returns {number} 실제 근무시간 (소수점 2자리)
 */
const calculateWorkHours = (schedule) => {
  if (!schedule.startTime || !schedule.endTime) return 0;
  
  const startTime = new Date(`2000-01-01T${schedule.startTime}:00`);
  const endTime = new Date(`2000-01-01T${schedule.endTime}:00`);
  
  // 야간근무인 경우 (종료시간이 시작시간보다 이른 경우)
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  const diffMs = endTime - startTime;
  const totalHours = diffMs / (1000 * 60 * 60);
  
  // 휴식시간 차감
  const breakTime = schedule.breakTime || 0;
  const actualHours = Math.max(0, totalHours - breakTime);
  
  // 소수점 2자리까지 반올림
  return Math.round(actualHours * 100) / 100;
};

/**
 * 초과근무 시간 계산
 * @param {number} workHours - 실제 근무시간
 * @returns {number} 초과근무시간 (소수점 2자리)
 */
const calculateOvertimeHours = (workHours) => {
  const overtime = workHours > 8 ? workHours - 8 : 0;
  return Math.round(overtime * 100) / 100;
};

/**
 * 주휴수당 계산 (주 15시간 이상 근무시)
 * @param {number} weeklyHours - 주간 총 근무시간
 * @param {number} hourlyWage - 시급
 * @returns {number} 주휴수당 (소수점 2자리)
 */
const calculateWeeklyAllowance = (weeklyHours, hourlyWage) => {
  if (weeklyHours >= 15) {
    const allowance = 8 * hourlyWage; // 8시간분 주휴수당
    return Math.floor(allowance);
  }
  return 0;
};

/**
 * 급여 계산 (기본급 + 초과근무수당 + 주휴수당)
 * @param {number} totalHours - 총 근무시간
 * @param {number} overtimeHours - 초과근무시간
 * @param {number} weeklyAllowance - 주휴수당
 * @param {number} hourlyWage - 시급
 * @returns {Object} 급여 상세 정보
 */
const calculateSalary = (totalHours, overtimeHours, weeklyAllowance, hourlyWage) => {
  const regularHours = totalHours - overtimeHours;
  const regularPay = Math.floor(regularHours * hourlyWage);
  const overtimePay = Math.floor(overtimeHours * hourlyWage * 1.5); // 1.5배 수당
  const totalPay = regularPay + overtimePay + Math.floor(weeklyAllowance);

  return {
    regularPay,
    overtimePay,
    weeklyAllowance: Math.floor(weeklyAllowance),
    totalPay,
    totalHours: Math.round(totalHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100
  };
};

/**
 * 복지포인트 계산 (4시간 단위로 1700원)
 * @param {number} totalHours - 총 근무시간
 * @param {Date} startDate - 계산 시작일 (9월 15일부터 적용)
 * @returns {number} 복지포인트
 */
const calculateWelfarePoints = (totalHours, startDate = new Date()) => {
  const welfareStartDate = new Date('2025-09-15');
  
  if (startDate < welfareStartDate) {
    return 0;
  }
  
  // 4시간 단위로 절사 계산
  const fourHourUnits = Math.floor(totalHours / 4);
  return fourHourUnits * 1700;
};

module.exports = {
  calculateWorkHours,
  calculateOvertimeHours,
  calculateWeeklyAllowance,
  calculateSalary,
  calculateWelfarePoints
}; 