const XLSX = require('xlsx');
const { calculateWeeklyHours, formatTaxType } = require('./userHelpers');

/**
 * 숫자를 원화 문자열로 (예: 1500000 -> "1,500,000")
 */
function formatKRW(num) {
  if (num == null || Number.isNaN(num)) return '0';
  return Number(num).toLocaleString('ko-KR');
}

/**
 * 점주용: 매장별·근로자별 급여내역 Excel
 * 컬럼: 매장(점포명), 이름, 주민번호, 입사일, 근로계약상 주단위 근로시간, 세금유형, 해당월 근무시간, 총급여, 실지급액, 4대보험료
 * @param {Array} salaries - MonthlySalary 문서 배열 (populate: userId(ssn, hiredAt, workSchedule), storeId(name))
 * @param {number} year
 * @param {number} month
 * @returns {Buffer}
 */
function buildPayrollListExcel(salaries, year, month) {
  const headers = [
    '매장(점포명)',
    '이름',
    '주민번호',
    '입사일',
    '근로계약상 주단위 근로시간',
    '세금유형',
    '해당월 근무시간',
    '총급여',
    '실지급액',
    '4대보험료',
  ];
  const rows = [
    ['매장별 근로자별 급여내역', `${year}년 ${month}월`],
    [],
    headers,
  ];

  for (const s of salaries) {
    const storeName = (s.storeId && (s.storeId.name || s.storeId)) || '-';
    const userName = s.employeeName || s.userId?.name || '-';
    const ssn = (s.userId && s.userId.ssn) ? String(s.userId.ssn) : '';
    const hiredAt =
      s.userId && s.userId.hiredAt
        ? (s.userId.hiredAt instanceof Date
            ? s.userId.hiredAt
            : new Date(s.userId.hiredAt)
          ).toISOString().slice(0, 10)
        : '';
    const contractedWeeklyHours = (s.userId && s.userId.workSchedule)
      ? calculateWeeklyHours(s.userId.workSchedule)
      : 0;
    const taxTypeLabel = formatTaxType(s.taxType || 'none');
    const monthlyHours = s.totalWorkHours ?? 0;
    const totalGrossPay = s.totalGrossPay ?? 0;
    const netPay = (s.taxInfo && s.taxInfo.netPay) ?? 0;
    const fourInsurance =
      (s.taxInfo && s.taxInfo.nationalPension != null
        ? (s.taxInfo.nationalPension || 0) +
          (s.taxInfo.healthInsurance || 0) +
          (s.taxInfo.longTermCare || 0) +
          (s.taxInfo.employmentInsurance || 0)
        : 0);

    rows.push([
      storeName,
      userName,
      ssn,
      hiredAt,
      contractedWeeklyHours,
      taxTypeLabel,
      monthlyHours,
      totalGrossPay,
      netPay,
      fourInsurance,
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const colWidths = [
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 12 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `급여목록_${year}${String(month).padStart(2, '0')}`);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 급여 명세서 Excel (1인 상세, 주차별 포함)
 * @param {Object} salary - MonthlySalary 문서 (populate 없어도 됨)
 * @returns {Buffer}
 */
function buildPayrollDetailExcel(salary) {
  const { year, month, employeeName, employeeEmail, hourlyWage, taxType } = salary;
  const taxInfo = salary.taxInfo || {};
  const weeklyDetails = salary.weeklyDetails || [];

  const rows = [
    ['급여 명세서'],
    ['대상', `${year}년 ${month}월`],
    [],
    ['구분', '내용'],
    ['성명', employeeName || '-'],
    ['이메일', employeeEmail || '-'],
    ['시급', formatKRW(hourlyWage)],
    ['세금 유형', taxType || '-'],
    [],
    ['항목', '금액(원)'],
    ['총 근로시간', (salary.totalWorkHours ?? 0) + '시간'],
    ['근무일수', (salary.totalWorkDays ?? 0) + '일'],
    ['기본급', formatKRW(salary.totalBasePay)],
    ['주휴수당', formatKRW(salary.totalHolidayPay)],
    ['총 지급액', formatKRW(salary.totalGrossPay)],
    ['복지포인트', formatKRW(salary.totalWelfarePoints ?? 0)],
    ['소득세', formatKRW(taxInfo.incomeTax)],
    ['지방세', formatKRW(taxInfo.localTax)],
    ['공제합계', formatKRW(taxInfo.totalTax)],
    ['실수령액', formatKRW(taxInfo.netPay)],
    [],
    ['주차별 상세'],
    ['주차', '기간', '근로시간', '기본급', '주휴수당', '비고'],
  ];

  for (const w of weeklyDetails) {
    rows.push([
      w.weekNumber ?? '-',
      (w.startDate && w.endDate) ? `${w.startDate} ~ ${w.endDate}` : '-',
      w.workHours ?? 0,
      w.basePay ?? 0,
      w.holidayPay ?? 0,
      w.holidayPayStatus || '-',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 10 }, { wch: 28 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  const safeName = (employeeName || '급여').replace(/[/\\*?\[\]:]/g, '_').slice(0, 25);
  XLSX.utils.book_append_sheet(wb, ws, `${year}${String(month).padStart(2, '0')}_${safeName}`);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 근무일정 Excel (점주용: 월별 일정 목록)
 * @param {Array} schedules - WorkSchedule 문서 배열 (populate: userId, storeId)
 * @param {number} year
 * @param {number} month
 * @returns {Buffer}
 */
function buildSchedulesExcel(schedules, year, month) {
  const rows = [
    ['근무일정 목록', `${year}년 ${month}월`],
    [],
    ['날짜', '요일', '직원명', '점포', '시작', '종료', '근무시간', '상태'],
  ];

  for (const s of schedules) {
    const workDate = s.workDate instanceof Date
      ? s.workDate.toISOString().slice(0, 10)
      : (s.workDate && s.workDate.slice(0, 10)) || '-';
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = s.workDate instanceof Date
      ? dayNames[s.workDate.getDay()]
      : '-';
    const userName = (s.userId && (s.userId.name || s.userId)) || '-';
    const storeName = (s.storeId && (s.storeId.name || s.storeId)) || '-';
    rows.push([
      workDate,
      dayOfWeek,
      userName,
      storeName,
      s.startTime || '-',
      s.endTime || '-',
      s.totalHours ?? 0,
      s.status || '-',
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 14 }, { wch: 6 }, { wch: 6 }, { wch: 10 }, { wch: 10 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `근무일정_${year}${String(month).padStart(2, '0')}`);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  buildPayrollListExcel,
  buildPayrollDetailExcel,
  buildSchedulesExcel,
  formatKRW,
};
