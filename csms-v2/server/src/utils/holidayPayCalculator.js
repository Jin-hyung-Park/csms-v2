/**
 * 주휴수당 계산 유틸리티
 * 
 * 핵심 원칙:
 * 1. 한 주는 월요일 ~ 일요일 (고정)
 * 2. 월 경계 주차는 익월에 주휴수당 산정
 * 3. 개근 확인은 전체 주(월~일) 기준
 * 4. 전월 마지막 주차 = 당월 1주차
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * 근로계약상 주당 근로시간 계산
 * @param {Object} workSchedule - 근무 스케줄 (User.workSchedule)
 * @returns {Number} 주당 계약 근로시간
 */
function calculateWeeklyContractHours(workSchedule) {
  if (!workSchedule) return 0;
  
  let totalHours = 0;
  
  for (const day of DAY_NAMES) {
    const daySchedule = workSchedule[day];
    if (daySchedule && daySchedule.enabled) {
      const startTime = daySchedule.startTime || '09:00';
      const endTime = daySchedule.endTime || '18:00';
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      
      let hours = endHour - startHour + (endMin - startMin) / 60;
      
      // 자정을 넘어가는 경우 처리 (예: 22:00 ~ 06:00)
      if (hours < 0) {
        hours += 24;
      }
      
      totalHours += hours;
    }
  }
  
  return totalHours;
}

/**
 * 근로계약상 근무 요일 목록 조회
 * @param {Object} workSchedule - 근무 스케줄 (User.workSchedule)
 * @returns {Array<String>} 근무 요일 목록 (예: ['monday', 'wednesday', 'friday'])
 */
function getContractDays(workSchedule) {
  if (!workSchedule) return [];
  
  const contractDays = [];
  
  for (const day of DAY_NAMES) {
    const daySchedule = workSchedule[day];
    if (daySchedule && daySchedule.enabled) {
      contractDays.push(day);
    }
  }
  
  return contractDays;
}

/**
 * 날짜의 요일명 반환
 * @param {Date|String} date - 날짜
 * @returns {String} 요일명 (예: 'monday')
 */
function getDayName(date) {
  const d = new Date(date);
  return DAY_NAMES[d.getDay()];
}

/**
 * 주휴수당 지급 조건 확인
 * @param {Object} employee - 근로자 정보 (workSchedule 포함)
 * @param {Array} weekSchedules - 해당 주의 실제 근무 기록 배열
 * @returns {Object} { isEligible, reason }
 */
function checkHolidayPayEligibility(employee, weekSchedules) {
  const workSchedule = employee.workSchedule;
  
  // 1. 근로계약상 주당 근로시간 확인
  const weeklyContractHours = calculateWeeklyContractHours(workSchedule);
  
  if (weeklyContractHours < 15) {
    return {
      isEligible: false,
      reason: '근로계약상 주 15시간 미만',
      weeklyContractHours,
    };
  }
  
  // 2. 근로계약상 요일에 모두 출근했는지 확인 (소정근로일 개근)
  const contractDays = getContractDays(workSchedule);
  
  if (contractDays.length === 0) {
    return {
      isEligible: false,
      reason: '근로계약상 근무일 없음',
      weeklyContractHours,
    };
  }
  
  // 실제 근무한 요일 목록 (승인된 근무만)
  const workedDays = weekSchedules
    .filter(s => s.status === 'approved')
    .map(s => getDayName(s.workDate));
  
  // 계약 요일 중 근무하지 않은 요일 확인
  const missingDays = contractDays.filter(day => !workedDays.includes(day));
  
  if (missingDays.length > 0) {
    const missingDaysKorean = missingDays.map(day => {
      const dayMap = {
        sunday: '일요일',
        monday: '월요일',
        tuesday: '화요일',
        wednesday: '수요일',
        thursday: '목요일',
        friday: '금요일',
        saturday: '토요일',
      };
      return dayMap[day];
    });
    
    return {
      isEligible: false,
      reason: `소정근로일 개근 미충족 (결근: ${missingDaysKorean.join(', ')})`,
      weeklyContractHours,
      contractDays,
      workedDays,
      missingDays,
    };
  }
  
  return {
    isEligible: true,
    reason: '지급 조건 충족',
    weeklyContractHours,
    contractDays,
    workedDays,
  };
}

/**
 * 주휴수당 계산
 * 
 * 공식: (주간 근로계약 시간 / 40) × 8 × 시급
 * 
 * @param {Object} employee - 근로자 정보 (workSchedule, hourlyWage 포함)
 * @param {Array} weekSchedules - 해당 주의 실제 근무 기록 배열 (WorkSchedule 문서들)
 * @returns {Object} 계산 결과
 *   - amount: 주휴수당 금액
 *   - isEligible: 지급 대상 여부
 *   - reason: 사유
 *   - calculation: 계산 상세 정보
 */
function calculateHolidayPay(employee, weekSchedules) {
  // 지급 조건 확인
  const eligibility = checkHolidayPayEligibility(employee, weekSchedules);
  
  if (!eligibility.isEligible) {
    return {
      amount: 0,
      isEligible: false,
      reason: eligibility.reason,
      calculation: {
        weeklyContractHours: eligibility.weeklyContractHours || 0,
        formula: null,
        result: 0,
      },
      details: eligibility,
    };
  }
  
  // 주휴수당 계산
  const weeklyContractHours = eligibility.weeklyContractHours;
  const hourlyWage = employee.hourlyWage || 10320; // 2026년 최저시급
  
  // 공식: (주간 근로계약 시간 / 40) × 8 × 시급
  const holidayPay = Math.floor((weeklyContractHours / 40) * 8 * hourlyWage);
  
  return {
    amount: holidayPay,
    isEligible: true,
    reason: eligibility.reason,
    calculation: {
      weeklyContractHours,
      hourlyWage,
      formula: `(${weeklyContractHours} / 40) × 8 × ${hourlyWage}`,
      result: holidayPay,
    },
    details: eligibility,
  };
}

/**
 * 월별 주차 정보 조회 (월 경계 처리 포함)
 * 
 * 규칙:
 * - 한 주는 월요일 ~ 일요일
 * - 해당 월에 속한 날짜가 있는 모든 주를 포함
 * - 월 경계 주차(주 중에 월이 바뀌는 경우)는 익월에 주휴수당 산정
 * 
 * @param {Number} year - 연도
 * @param {Number} month - 월 (1-12)
 * @returns {Array} 주차 정보 배열
 */
function getMonthlyWeeksForHolidayPay(year, month) {
  const weeks = [];
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  
  // 1일이 포함된 주의 월요일 찾기
  let currentMonday = new Date(firstDay);
  const firstDayOfWeek = firstDay.getDay(); // 0: 일, 1: 월, ...
  const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
  currentMonday.setDate(firstDay.getDate() + daysToMonday);
  
  let weekNumber = 1;
  
  while (currentMonday <= lastDay) {
    const monday = new Date(currentMonday);
    const sunday = new Date(currentMonday);
    sunday.setDate(currentMonday.getDate() + 6);
    
    // 해당 주가 당월에 포함되는지 확인
    const hasCurrentMonthDays = (
      (monday.getMonth() === month - 1) ||
      (sunday.getMonth() === month - 1) ||
      (monday < firstDay && sunday > lastDay)
    );
    
    if (hasCurrentMonthDays) {
      // 월 경계 확인
      const startsInPrevMonth = monday < firstDay;
      const endsInNextMonth = sunday > lastDay;
      const crossesMonthBoundary = startsInPrevMonth || endsInNextMonth;
      
      // 주휴수당 산정 월 결정
      // - 주의 끝(일요일)이 익월에 속하면 → 익월에 산정
      // - 그 외에는 당월에 산정
      let holidayPayMonth;
      let holidayPayNote;
      
      if (endsInNextMonth) {
        // 일요일이 다음 달에 속함 → 다음 달에 산정
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        holidayPayMonth = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
        holidayPayNote = '월 경계 주차 - 익월에 주휴수당 산정';
      } else {
        // 당월에 산정
        holidayPayMonth = `${year}-${String(month).padStart(2, '0')}`;
        holidayPayNote = startsInPrevMonth 
          ? '전월에서 이어진 주차 - 당월에 주휴수당 산정'
          : '당월 주차';
      }
      
      weeks.push({
        weekNumber,
        startDate: formatDate(monday),
        endDate: formatDate(sunday),
        crossesMonthBoundary,
        startsInPrevMonth,
        endsInNextMonth,
        holidayPayMonth,
        note: holidayPayNote,
        // 이 주차의 주휴수당을 현재 산정 월에 계산해야 하는지
        shouldCalculateInThisMonth: holidayPayMonth === `${year}-${String(month).padStart(2, '0')}`,
      });
      
      weekNumber++;
    }
    
    // 다음 주 월요일로 이동
    currentMonday.setDate(currentMonday.getDate() + 7);
  }
  
  return weeks;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷팅
 * @param {Date} date
 * @returns {String}
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 특정 주차가 현재 월에 주휴수당을 산정해야 하는지 확인
 * @param {Object} weekInfo - 주차 정보 (getMonthlyWeeksForHolidayPay 결과)
 * @param {Number} year - 산정 대상 연도
 * @param {Number} month - 산정 대상 월
 * @returns {Boolean}
 */
function shouldCalculateHolidayPayInMonth(weekInfo, year, month) {
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  return weekInfo.holidayPayMonth === targetMonth;
}

module.exports = {
  calculateWeeklyContractHours,
  getContractDays,
  getDayName,
  checkHolidayPayEligibility,
  calculateHolidayPay,
  getMonthlyWeeksForHolidayPay,
  shouldCalculateHolidayPayInMonth,
  formatDate,
  DAY_NAMES,
};
