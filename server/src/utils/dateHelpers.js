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
};


