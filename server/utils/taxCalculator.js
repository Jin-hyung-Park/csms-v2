const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const logger = require('./logger');

/**
 * 주 15시간 이상 근무 시 세금 신고 유형을 자동으로 설정
 * @param {string} userId - 사용자 ID
 * @param {Date} workDate - 근무 날짜
 * @returns {Promise<void>}
 */
const updateTaxTypeIfNeeded = async (userId, workDate) => {
  try {
    // 해당 주의 시작일과 종료일 계산
    const workDateObj = new Date(workDate);
    const dayOfWeek = workDateObj.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
    
    const weekStart = new Date(workDateObj);
    weekStart.setDate(workDateObj.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // 해당 주의 총 근무 시간 계산
    const weeklySchedules = await WorkSchedule.find({
      userId,
      workDate: { $gte: weekStart, $lte: weekEnd },
      status: 'approved'
    });

    const totalWeeklyHours = weeklySchedules.reduce((sum, schedule) => {
      return sum + schedule.totalHours;
    }, 0);

    // 사용자 정보 가져오기
    const user = await User.findById(userId);
    if (!user) {
      logger.error(`User not found: ${userId}`);
      return;
    }

    // 주 15시간 이상 근무 시 세금 신고 유형 자동 설정
    if (totalWeeklyHours >= 15) {
      if (user.taxType === '미신고') {
        user.taxType = '주15시간미만';
        await user.save();
        logger.info(`Tax type updated for user ${userId}: 미신고 → 주15시간미만`);
      }
    } else {
      // 주 15시간 미만이면 미신고로 되돌리기 (점주가 수동으로 변경한 경우 제외)
      if (user.taxType === '주15시간미만') {
        user.taxType = '미신고';
        await user.save();
        logger.info(`Tax type updated for user ${userId}: 주15시간미만 → 미신고`);
      }
    }

  } catch (error) {
    logger.error('Error updating tax type:', error);
  }
};

/**
 * 특정 기간의 총 근무 시간 계산
 * @param {string} userId - 사용자 ID
 * @param {Date} startDate - 시작 날짜
 * @param {Date} endDate - 종료 날짜
 * @returns {Promise<number>} - 총 근무 시간
 */
const calculateTotalHours = async (userId, startDate, endDate) => {
  try {
    const schedules = await WorkSchedule.find({
      userId,
      workDate: { $gte: startDate, $lte: endDate },
      status: 'approved'
    });

    return schedules.reduce((sum, schedule) => sum + schedule.totalHours, 0);
  } catch (error) {
    logger.error('Error calculating total hours:', error);
    return 0;
  }
};

/**
 * 월별 근무 시간 계산
 * @param {string} userId - 사용자 ID
 * @param {Date} date - 해당 월의 임의 날짜
 * @returns {Promise<number>} - 월 총 근무 시간
 */
const calculateMonthlyHours = async (userId, date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
  
  return await calculateTotalHours(userId, startOfMonth, endOfMonth);
};

/**
 * 세금 계산 유틸리티
 */

/**
 * 사업자 소득세 계산 (3.3%)
 * @param {number} grossPay - 총 급여 (세전)
 * @returns {object} 세금 정보
 */
function calculateBusinessIncomeTax(grossPay) {
  const taxRate = 0.033; // 3.3%
  const taxAmount = Math.round(grossPay * taxRate);
  const netPay = grossPay - taxAmount;
  
  return {
    taxType: '사업자소득(3.3%)',
    taxRate: taxRate,
    taxAmount: taxAmount,
    netPay: netPay,
    grossPay: grossPay
  };
}

/**
 * 실제 근무시간 기반 세금 계산
 * @param {string} taxType - 세금 유형
 * @param {number} grossPay - 총 급여 (세전)
 * @param {number} weeklyHours - 주당 평균 근무시간 (선택사항)
 * @returns {object} 세금 정보
 */
function calculateTax(taxType, grossPay, weeklyHours = null) {
  // 사업자소득(3.3%)은 근무시간과 관계없이 모든 주차에 세금 부과
  if (taxType === '사업자소득(3.3%)') {
    const taxAmount = Math.round(grossPay * 0.033);
    const incomeTax = Math.round(taxAmount * 0.9); // 소득세 90%
    const localTax = taxAmount - incomeTax; // 지방세 10%
    
    return {
      taxType: '사업자소득(3.3%)',
      taxRate: 0.033,
      taxAmount: taxAmount,
      incomeTax: incomeTax,
      localTax: localTax,
      totalTax: taxAmount,
      netPay: grossPay - taxAmount,
      grossPay: grossPay
    };
  }

  // 주 15시간 미만 근무자는 세금 면제 (사업자소득 제외)
  if (weeklyHours !== null && weeklyHours < 15) {
    return {
      taxType: '주15시간미만',
      taxRate: 0,
      taxAmount: 0,
      incomeTax: 0,
      localTax: 0,
      totalTax: 0,
      netPay: grossPay,
      grossPay: grossPay
    };
  }

  switch (taxType) {
    case '주15시간미만':
    case '미신고':
    default:
      // 세금 면제 또는 미신고
      return {
        taxType: taxType,
        taxRate: 0,
        taxAmount: 0,
        incomeTax: 0,
        localTax: 0,
        totalTax: 0,
        netPay: grossPay,
        grossPay: grossPay
      };
  }
}

/**
 * 월별 세금 계산
 * @param {string} taxType - 세금 유형
 * @param {number} monthlyGrossPay - 월 총 급여 (세전)
 * @param {number} monthlyHours - 월 총 근무시간 (선택사항)
 * @returns {object} 월별 세금 정보
 */
function calculateMonthlyTax(taxType, monthlyGrossPay, monthlyHours = null) {
  // 월 근무시간을 주당 평균으로 변환 (4.33주 기준)
  const weeklyHours = monthlyHours ? monthlyHours / 4.33 : null;
  return calculateTax(taxType, monthlyGrossPay, weeklyHours);
}

/**
 * 주차별 세금 계산
 * @param {string} taxType - 세금 유형
 * @param {number} weeklyGrossPay - 주차 총 급여 (세전)
 * @param {number} weeklyHours - 주 근무시간 (선택사항)
 * @returns {object} 주차별 세금 정보
 */
function calculateWeeklyTax(taxType, weeklyGrossPay, weeklyHours = null) {
  return calculateTax(taxType, weeklyGrossPay, weeklyHours);
}

module.exports = {
  updateTaxTypeIfNeeded,
  calculateTotalHours,
  calculateMonthlyHours,
  calculateTax,
  calculateMonthlyTax,
  calculateWeeklyTax,
  calculateBusinessIncomeTax
}; 