/**
 * 날짜 및 시간 관련 유틸리티 함수
 */

/**
 * 로컬 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatLocalDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 날짜의 요일을 한글로 반환
 */
function getDayOfWeek(date) {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(date).getDay()];
}

/**
 * 월의 첫 번째 날짜 반환
 */
function getStartOfMonth(year, month) {
  return new Date(year, month - 1, 1);
}

/**
 * 월의 마지막 날짜 반환
 */
function getEndOfMonth(year, month) {
  return new Date(year, month, 0);
}

/**
 * 주의 시작일 (월요일) 반환
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 월요일을 시작으로
  return new Date(d.setDate(diff));
}

/**
 * 주의 종료일 (일요일) 반환
 */
function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  return weekEnd;
}

/**
 * 날짜가 속한 주차 번호 계산 (월 기준, 월요일 시작)
 */
function getWeekNumber(date, monthStart) {
  const d = new Date(date);
  const monthStartDate = new Date(monthStart);
  const firstMonday = getWeekStart(monthStartDate);
  
  const diffTime = d - firstMonday;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.floor(diffDays / 7) + 1;
}

/**
 * 월의 주차별 날짜 범위 계산
 */
function getWeekDateRange(monthStart, weekNumber) {
  const monthStartDate = new Date(monthStart);
  const firstMonday = getWeekStart(monthStartDate);
  
  const startDate = new Date(firstMonday);
  startDate.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  return { startDate, endDate };
}

/**
 * 월에 포함된 주차 수 계산
 */
function getWeeksInMonth(year, month) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const firstMonday = getWeekStart(monthStart);
  const lastSunday = getWeekEnd(monthEnd);
  
  const diffTime = lastSunday - firstMonday;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.floor(diffDays / 7) + 1;
}

/**
 * 날짜 범위를 문자열로 포맷팅 (예: "11/10(월) ~ 11/16(일)")
 */
function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startStr = `${start.getMonth() + 1}/${start.getDate()}(${getDayOfWeek(start)})`;
  const endStr = `${end.getMonth() + 1}/${end.getDate()}(${getDayOfWeek(end)})`;
  
  return `${startStr} ~ ${endStr}`;
}

/**
 * 주차 레이블 생성 (예: "3주차 (11/11 ~ 11/17)")
 */
function formatWeekLabel(weekNumber, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startStr = `${start.getMonth() + 1}/${start.getDate()}`;
  const endStr = `${end.getMonth() + 1}/${end.getDate()}`;
  
  return `${weekNumber}주차 (${startStr} ~ ${endStr})`;
}

/**
 * 년월 레이블 생성 (예: "2025년 11월")
 */
function formatMonthLabel(year, month) {
  return `${year}년 ${month}월`;
}

/**
 * 월별 주차 정보 조회 (주휴수당 산정용, 월 경계 처리 포함)
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
        startDate: formatLocalDate(monday),
        endDate: formatLocalDate(sunday),
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

module.exports = {
  formatLocalDate,
  getDayOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  getWeekStart,
  getWeekEnd,
  getWeekNumber,
  getWeekDateRange,
  getWeeksInMonth,
  formatDateRange,
  formatWeekLabel,
  formatMonthLabel,
  getMonthlyWeeksForHolidayPay,
};


