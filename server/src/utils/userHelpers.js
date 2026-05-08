/**
 * User 모델 관련 유틸리티 함수
 */

/**
 * workSchedule에서 근무 요일 목록을 문자열로 변환
 * @param {Object} workSchedule - User의 workSchedule 객체
 * @returns {String} - 예: "월, 수, 금"
 */
function getWorkDaysString(workSchedule) {
  if (!workSchedule) return '미설정';

  const dayNames = {
    monday: '월',
    tuesday: '화',
    wednesday: '수',
    thursday: '목',
    friday: '금',
    saturday: '토',
    sunday: '일',
  };

  const enabledDays = [];
  for (const [dayKey, dayValue] of Object.entries(workSchedule)) {
    if (dayValue && dayValue.enabled) {
      enabledDays.push(dayNames[dayKey] || dayKey);
    }
  }

  return enabledDays.length > 0 ? enabledDays.join(', ') : '미설정';
}

/**
 * workSchedule에서 근무 시간 범위를 문자열로 변환
 * @param {Object} workSchedule - User의 workSchedule 객체
 * @returns {String} - 예: "18:00 - 23:00"
 */
function getWorkTimeString(workSchedule) {
  if (!workSchedule) return '미설정';

  // 첫 번째 enabled된 요일의 시간 사용
  for (const dayValue of Object.values(workSchedule)) {
    if (dayValue && dayValue.enabled && dayValue.startTime && dayValue.endTime) {
      return `${dayValue.startTime} - ${dayValue.endTime}`;
    }
  }

  return '미설정';
}

/**
 * workSchedule에서 주당 근무 시간 계산
 * @param {Object} workSchedule - User의 workSchedule 객체
 * @returns {Number} - 주당 근무 시간 (시간 단위)
 */
function calculateWeeklyHours(workSchedule) {
  if (!workSchedule) return 0;

  let totalHours = 0;

  for (const dayValue of Object.values(workSchedule)) {
    if (dayValue && dayValue.enabled && dayValue.startTime && dayValue.endTime) {
      const [startHour, startMin] = dayValue.startTime.split(':').map(Number);
      const [endHour, endMin] = dayValue.endTime.split(':').map(Number);

      let startMinutes = startHour * 60 + startMin;
      let endMinutes = endHour * 60 + endMin;

      // 야간 근무 처리 (다음날까지)
      if (endMinutes <= startMinutes) {
        endMinutes += 24 * 60;
      }

      const dayHours = (endMinutes - startMinutes) / 60;
      totalHours += dayHours;
    }
  }

  return Math.round(totalHours * 100) / 100;
}

/**
 * taxType을 읽기 쉬운 문자열로 변환
 * @param {String} taxType - User의 taxType
 * @returns {String} - 예: "사업자소득 (3.3%)"
 */
function formatTaxType(taxType) {
  const taxTypeMap = {
    none: '미신고 (세금 면제)',
    'under-15-hours': '주 15시간 미만 (세금 면제)',
    'business-income': '사업자소득 (3.3%)',
    'labor-income': '근로소득',
  };

  return taxTypeMap[taxType] || '미설정';
}

/**
 * workSchedule에서 기본 근무 시간 가져오기 (근무일정 등록 시 사용)
 * @param {Object} workSchedule - User의 workSchedule 객체
 * @param {Number} dayOfWeek - 요일 (0: 일요일, 1: 월요일, ...)
 * @returns {Object} - { startTime, endTime } 또는 null
 */
function getDefaultWorkTime(workSchedule, dayOfWeek) {
  if (!workSchedule) return null;

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayKeys[dayOfWeek];

  if (!dayKey || !workSchedule[dayKey]) return null;

  const daySchedule = workSchedule[dayKey];
  if (!daySchedule.enabled) return null;

  return {
    startTime: daySchedule.startTime || '09:00',
    endTime: daySchedule.endTime || '18:00',
  };
}

module.exports = {
  getWorkDaysString,
  getWorkTimeString,
  calculateWeeklyHours,
  formatTaxType,
  getDefaultWorkTime,
};
