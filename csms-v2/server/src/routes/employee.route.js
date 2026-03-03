const { Router } = require('express');
const { authenticate, requireEmployee } = require('../middleware/auth');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
const Notification = require('../models/Notification');
const MonthlySalary = require('../models/MonthlySalary');
const {
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
} = require('../utils/dateHelpers');
const {
  getWorkDaysString,
  getWorkTimeString,
  calculateWeeklyHours,
  formatTaxType,
  getDefaultWorkTime,
} = require('../utils/userHelpers');
const { buildPayrollDetailExcel } = require('../utils/excelExporter');

const router = Router();

// 모든 Employee 라우트에 인증 적용
router.use(authenticate);
router.use(requireEmployee);

router.get('/dashboard', async (req, res) => {
  try {
    const user = req.user;
    
    // 점포 정보 조회
    let store = null;
    if (user.storeId) {
      store = await Store.findById(user.storeId);
    }
    
    // 현재 날짜 및 이번 주 정보
    const now = new Date();
    const currentWeekStart = getWeekStart(now);
    const currentWeekEnd = getWeekEnd(now);
    
    // 이번 주 근무일정 조회
    const thisWeekSchedules = await WorkSchedule.find({
      userId: user._id,
      workDate: {
        $gte: currentWeekStart,
        $lte: currentWeekEnd,
      },
    }).sort({ workDate: 1, startTime: 1 });
    
    // 이번 주 통계 계산
    const thisWeekTotalHours = thisWeekSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const thisWeekWorkDays = thisWeekSchedules.length;
    const thisWeekPendingCount = thisWeekSchedules.filter((s) => s.status === 'pending').length;
    const thisWeekApprovedCount = thisWeekSchedules.filter((s) => s.status === 'approved').length;
    
    // 지난 달 정보 (현재 월의 이전 달)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthYear = lastMonth.getFullYear();
    const lastMonthMonth = lastMonth.getMonth() + 1;
    const lastMonthStart = getStartOfMonth(lastMonthYear, lastMonthMonth);
    const lastMonthEnd = getEndOfMonth(lastMonthYear, lastMonthMonth);
    
    // 지난 달 근무일정 조회
    const lastMonthSchedules = await WorkSchedule.find({
      userId: user._id,
      workDate: {
        $gte: lastMonthStart,
        $lte: lastMonthEnd,
      },
      status: 'approved', // 승인된 근무만 급여 계산
    }).sort({ workDate: 1 });
    
    // 지난 달 급여 통계 (간단한 계산, 추후 MonthlySalary 모델과 연동)
    const lastMonthTotalHours = lastMonthSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const hourlyWage = user.hourlyWage || 10320; // User 모델에서 시급 가져오기 (2026년 최저시급)
    const lastMonthBasePay = Math.round(lastMonthTotalHours * hourlyWage);
    
    // TODO: 주휴수당 및 세금 계산은 추후 MonthlySalary 모델과 연동
    
    // User 모델에서 근무 스케줄 정보 가져오기
    const workDays = getWorkDaysString(user.workSchedule);
    const workTime = getWorkTimeString(user.workSchedule);
    const weeklyHours = calculateWeeklyHours(user.workSchedule);
    const taxType = formatTaxType(user.taxType);
    
    res.json({
      workInfo: {
        storeId: store?._id?.toString() || null,
        storeName: store?.name || '점포 미할당',
        storeAddress: store?.address || '',
        storeCode: store?.storeCode || '',
        contractInfo: {
          workDays,
          workTime,
          weeklyHours,
          hourlyWage,
          taxType,
        },
        link: '/employee/profile',
      },
      thisWeekWork: {
        weekNumber: getWeekNumber(now, getStartOfMonth(now.getFullYear(), now.getMonth() + 1)),
        weekRange: formatDateRange(currentWeekStart, currentWeekEnd),
        totalHours: Math.round(thisWeekTotalHours * 100) / 100,
        workDays: thisWeekWorkDays,
        estimatedPay: Math.round(thisWeekTotalHours * hourlyWage),
        pendingCount: thisWeekPendingCount,
        approvedCount: thisWeekApprovedCount,
        link: '/employee/schedule',
      },
      lastMonthSalary: {
        year: lastMonthYear,
        month: lastMonthMonth,
        monthLabel: formatMonthLabel(lastMonthYear, lastMonthMonth),
        totalHours: Math.round(lastMonthTotalHours * 100) / 100,
        basePay: lastMonthBasePay,
        holidayPay: 0, // TODO: 주휴수당 계산
        grossPay: lastMonthBasePay,
        taxInfo: {
          taxAmount: 0, // TODO: 세금 계산
          netPay: lastMonthBasePay,
        },
        isConfirmed: false, // TODO: MonthlySalary 모델에서 확인
        link: '/employee/salary',
      },
      unreadNotifications: await Notification.countDocuments({ userId: user._id, isRead: false }),
    });
  } catch (error) {
    console.error('대시보드 조회 오류:', error);
    res.status(500).json({
      message: '대시보드 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.get('/work-schedule/defaults', async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const isoDate = formatLocalDate(now);

    // 사용자의 점포 정보
    let primaryStore = null;
    if (user.storeId) {
      primaryStore = await Store.findById(user.storeId);
    }

    // 다가오는 근무일정 조회 (다음 7일)
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingSchedules = await WorkSchedule.find({
      userId: user._id,
      workDate: {
        $gte: now,
        $lte: nextWeek,
      },
    })
      .populate('storeId', 'name')
      .sort({ workDate: 1, startTime: 1 })
      .limit(5);

    const upcomingShifts = upcomingSchedules.map((schedule) => ({
      id: schedule._id.toString(),
      label: `${new Date(schedule.workDate).getMonth() + 1}/${new Date(schedule.workDate).getDate()} (${getDayOfWeek(schedule.workDate)})`,
      time: `${schedule.startTime} - ${schedule.endTime}`,
      status: schedule.status === 'approved' ? '확정' : schedule.status === 'pending' ? '대기' : '거절',
    }));

    // 기본값 설정 (User 모델의 workSchedule에서 가져오기)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const defaultWorkTime = getDefaultWorkTime(user.workSchedule, dayOfWeek);
    
    const smartDefaults = {
      workDate: isoDate,
      startTime: defaultWorkTime?.startTime || '09:00',
      endTime: defaultWorkTime?.endTime || '18:00',
      storeId: primaryStore?._id?.toString() || null,
    };

    res.json({
      smartDefaults,
      contractSummary: {
        workDays: getWorkDaysString(user.workSchedule),
        workTime: getWorkTimeString(user.workSchedule),
        weeklyHours: calculateWeeklyHours(user.workSchedule),
        primaryStore: primaryStore ? {
          id: primaryStore._id.toString(),
          name: primaryStore.name,
        } : null,
      },
      storeOptions: primaryStore ? [{
        id: primaryStore._id.toString(),
        name: primaryStore.name,
      }] : [],
      upcomingShifts,
    });
  } catch (error) {
    console.error('근무일정 기본값 조회 오류:', error);
    res.status(500).json({
      message: '근무일정 기본값 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.get('/salary/summary', async (req, res) => {
  try {
    const user = req.user;
    let { month } = req.query; // 'YYYY-MM' 또는 'YYYY-M' 형식
    // 1월 등 한 자리 월 정규화: "2026-1" -> "2026-01" (선택 시 매칭 실패 방지)
    if (month && typeof month === 'string' && /^\d{4}-\d{1,2}$/.test(month)) {
      const [y, m] = month.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(y) && !Number.isNaN(m) && m >= 1 && m <= 12) {
        month = `${y}-${String(m).padStart(2, '0')}`;
      }
    }

    // 근무 데이터가 존재하는 (승인된 일정이 있는) 월 + 점주가 산정한 급여(MonthlySalary)가 있는 월 모두 조회
    const monthsFromSchedules = await WorkSchedule.aggregate([
      { $match: { userId: user._id, status: 'approved' } },
      {
        $group: {
          _id: {
            year: { $year: '$workDate' },
            month: { $month: '$workDate' },
          },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 24 },
    ]);

    const monthsFromSalary = await MonthlySalary.find(
      { userId: user._id },
      { year: 1, month: 1 }
    )
      .sort({ year: -1, month: -1 })
      .limit(24)
      .lean();

    const monthKeySet = new Set();
    const monthList = [];
    for (const item of monthsFromSchedules) {
      const k = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      if (!monthKeySet.has(k)) {
        monthKeySet.add(k);
        monthList.push({ year: item._id.year, month: item._id.month });
      }
    }
    for (const s of monthsFromSalary) {
      const k = `${s.year}-${String(s.month).padStart(2, '0')}`;
      if (!monthKeySet.has(k)) {
        monthKeySet.add(k);
        monthList.push({ year: s.year, month: s.month });
      }
    }
    monthList.sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));

    const months = [];
    const hourlyWage = user.hourlyWage || 10320;

    for (const { year: targetYear, month: targetMonth } of monthList) {
      const monthStart = getStartOfMonth(targetYear, targetMonth);
      const monthEnd = getEndOfMonth(targetYear, targetMonth);

      // 점주가 산정한 급여가 있으면 해당 데이터를 그대로 사용 (주휴수당·복지포인트 등 동일 노출)
      const existingSalary = await MonthlySalary.findOne({
        userId: user._id,
        year: targetYear,
        month: targetMonth,
      }).lean();

      if (existingSalary) {
        const taxInfo = existingSalary.taxInfo || {};
        const netPay = taxInfo.netPay ?? existingSalary.totalGrossPay ?? 0;
        const weeks = (existingSalary.weeklyDetails || []).map((w) => ({
          weekNumber: w.weekNumber,
          range: w.startDate && w.endDate ? `${w.startDate} ~ ${w.endDate}` : '',
          totalHours: w.workHours ?? 0,
          basePay: w.basePay ?? 0,
          holidayPay: w.holidayPay ?? 0,
          welfarePoints: Math.floor((w.workHours || 0) / 4) * 1700,
        }));
        months.push({
          id: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
          year: targetYear,
          month: targetMonth,
          monthLabel: formatMonthLabel(targetYear, targetMonth),
          basePay: existingSalary.totalBasePay ?? 0,
          holidayPay: existingSalary.totalHolidayPay ?? 0,
          netPay,
          welfarePoints: existingSalary.totalWelfarePoints ?? 0,
          weeks,
          fromMonthlySalary: true,
          employeeConfirmed: existingSalary.employeeConfirmed ?? false,
          isConfirmed: existingSalary.status === 'confirmed',
        });
        continue;
      }

      const schedules = await WorkSchedule.find({
        userId: user._id,
        workDate: { $gte: monthStart, $lte: monthEnd },
        status: 'approved',
      }).sort({ workDate: 1 });

      const totalHours = schedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const basePay = Math.round(totalHours * hourlyWage);
      const weeksInMonth = getWeeksInMonth(targetYear, targetMonth);
      const weeks = [];

      for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
        const { startDate, endDate } = getWeekDateRange(monthStart, weekNum);
        const weekSchedules = schedules.filter((schedule) => {
          const scheduleDate = new Date(schedule.workDate);
          return scheduleDate >= startDate && scheduleDate <= endDate;
        });
        const weekHours = weekSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
        const weekBasePay = Math.round(weekHours * hourlyWage);
        const weekWelfarePoints = Math.floor(weekHours / 4) * 1700;
        weeks.push({
          weekNumber: weekNum,
          range: formatDateRange(startDate, endDate),
          totalHours: Math.round(weekHours * 100) / 100,
          basePay: weekBasePay,
          holidayPay: 0,
          welfarePoints: weekWelfarePoints,
        });
      }

      const welfarePoints = weeks.reduce((sum, w) => sum + (w.welfarePoints || 0), 0);
      months.push({
        id: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
        year: targetYear,
        month: targetMonth,
        monthLabel: formatMonthLabel(targetYear, targetMonth),
        basePay,
        holidayPay: 0,
        netPay: basePay,
        welfarePoints,
        weeks,
        fromMonthlySalary: false,
        employeeConfirmed: false,
        isConfirmed: false,
      });
    }

    const selectedMonth = month
      ? months.find((m) => m.id === month) || months[0] || null
      : months[0] || null;

    res.json({
      months: months.map(({ id, monthLabel }) => ({ id, monthLabel })),
      current: selectedMonth,
    });
  } catch (error) {
    console.error('급여 요약 조회 오류:', error);
    res.status(500).json({
      message: '급여 요약 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.get('/profile', async (req, res) => {
  try {
    const user = req.user;
    
    // 점포 정보 조회
    let store = null;
    if (user.storeId) {
      store = await Store.findById(user.storeId);
    }
    
    // 이름의 첫 글자 (초성)
    const initials = user.name.length > 0 ? user.name.substring(0, 2) : '';
    
    // User 모델에서 정보 가져오기
    const hourlyWage = user.hourlyWage || 10320;
    const position = user.position || '파트타이머';
    const workDays = getWorkDaysString(user.workSchedule);
    const workTime = getWorkTimeString(user.workSchedule);
    const weeklyHours = calculateWeeklyHours(user.workSchedule);
    const taxType = formatTaxType(user.taxType);
    
    res.json({
      name: user.name,
      initials,
      position,
      email: user.email,
      phone: user.phone || '',
      store: {
        name: store?.name || '점포 미할당',
        address: store?.address || '',
      },
      contract: {
        workDays,
        workTime,
        weeklyHours,
        hourlyWage,
        taxType,
        status: user.isActive ? '계약 중' : '계약 종료',
      },
      notifications: [
        {
          id: 'approval',
          label: '승인 결과 알림',
          description: '근무 일정 승인 및 반려 결과',
          enabled: true,
        },
        {
          id: 'salary',
          label: '급여 확정 알림',
          description: '월급 확정/지급 알림',
          enabled: true,
        },
      ],
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({
      message: '프로필 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.get('/work-schedule', async (req, res) => {
  try {
    const user = req.user;
    const { month } = req.query; // 'YYYY-MM' 형식 (있으면 해당 월만, 없으면 근무 데이터 있는 모든 월)

    if (month) {
      // 특정 월만 조회
      const [year, monthNum] = month.split('-').map((n) => parseInt(n, 10));
      const monthStart = getStartOfMonth(year, monthNum);
      const monthEnd = getEndOfMonth(year, monthNum);
      const schedules = await WorkSchedule.find({
        userId: user._id,
        workDate: { $gte: monthStart, $lte: monthEnd },
      })
        .populate('storeId', 'name')
        .sort({ workDate: 1, startTime: 1 });
      const monthData = buildMonthScheduleData(year, monthNum, schedules);
      return res.json({ months: [monthData] });
    }

    // 근무 데이터가 존재하는 월만 조회
    const monthsWithData = await WorkSchedule.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: {
            year: { $year: '$workDate' },
            month: { $month: '$workDate' },
          },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 24 },
    ]);

    const months = [];
    for (const item of monthsWithData) {
      const year = item._id.year;
      const monthNum = item._id.month;
      const monthStart = getStartOfMonth(year, monthNum);
      const monthEnd = getEndOfMonth(year, monthNum);
      const schedules = await WorkSchedule.find({
        userId: user._id,
        workDate: { $gte: monthStart, $lte: monthEnd },
      })
        .populate('storeId', 'name')
        .sort({ workDate: 1, startTime: 1 });
      months.push(buildMonthScheduleData(year, monthNum, schedules));
    }

    res.json({ months });
  } catch (error) {
    console.error('근무일정 조회 오류:', error);
    res.status(500).json({
      message: '근무일정 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

function buildMonthScheduleData(year, monthNum, schedules) {
  const monthStart = getStartOfMonth(year, monthNum);
  const weeksInMonth = getWeeksInMonth(year, monthNum);
  const monthData = {
    id: `${year}-${String(monthNum).padStart(2, '0')}`,
    label: formatMonthLabel(year, monthNum),
    weeks: [],
  };
  for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
    const { startDate, endDate } = getWeekDateRange(monthStart, weekNum);
    const weekSchedules = schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.workDate);
      return scheduleDate >= startDate && scheduleDate <= endDate;
    });
    monthData.weeks.push({
      weekNumber: weekNum,
      label: formatWeekLabel(weekNum, startDate, endDate),
      range: formatDateRange(startDate, endDate),
      items: weekSchedules.map((schedule) => ({
        id: schedule._id.toString(),
        date: formatLocalDate(schedule.workDate),
        dayOfWeek: getDayOfWeek(schedule.workDate),
        storeName: schedule.storeId?.name || '점포 정보 없음',
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        hours: schedule.totalHours || 0,
        status: schedule.status,
      })),
    });
  }
  return monthData;
}

router.get('/salary/:year/:month', async (req, res) => {
  try {
    const user = req.user;
    const { year, month } = req.params;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: '유효하지 않은 연도 또는 월입니다.',
      });
    }

    // 확정/산정된 MonthlySalary가 있으면 우선 사용 (복지포인트 등 포함)
    const existingSalary = await MonthlySalary.findOne({
      userId: user._id,
      year: yearNum,
      month: monthNum,
    }).lean();

    if (existingSalary) {
      const taxInfo = existingSalary.taxInfo || {};
      const monthStart = getStartOfMonth(yearNum, monthNum);
      const monthEnd = getEndOfMonth(yearNum, monthNum);
      const allSchedules = await WorkSchedule.find({
        userId: user._id,
        workDate: { $gte: monthStart, $lte: monthEnd },
      })
        .populate('storeId', 'name')
        .sort({ workDate: 1, startTime: 1 })
        .lean();

      const weeklyData = (existingSalary.weeklyDetails || []).map((w) => {
        const wStart = w.startDate ? new Date(w.startDate) : null;
        const wEnd = w.endDate ? new Date(w.endDate) : null;
        const dayList = !wStart || !wEnd
          ? []
          : allSchedules.filter((s) => {
              const d = new Date(s.workDate);
              return d >= wStart && d <= wEnd;
            });
        return {
          weekNumber: w.weekNumber,
          range: w.startDate && w.endDate ? `${w.startDate} ~ ${w.endDate}` : '',
          totalHours: w.workHours ?? 0,
          workDays: w.workDays ?? 0,
          basePay: w.basePay ?? 0,
          holidayPay: w.holidayPay ?? 0,
          weeklyTotal: w.weeklyTotal ?? 0,
          welfarePoints: Math.floor((w.workHours || 0) / 4) * 1700,
          holidayPayStatus: w.holidayPayStatus || 'pending',
          dailySchedules: dayList.map((schedule) => ({
            id: schedule._id.toString(),
            date: formatLocalDate(schedule.workDate),
            dayOfWeek: getDayOfWeek(schedule.workDate),
            storeName: schedule.storeId?.name || '점포 정보 없음',
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            hours: schedule.totalHours || 0,
            status: schedule.status || 'pending',
          })),
        };
      });

      return res.json({
        year: yearNum,
        month: monthNum,
        monthLabel: formatMonthLabel(yearNum, monthNum),
        isConfirmed: existingSalary.status === 'confirmed',
        confirmedAt: existingSalary.confirmedAt || null,
        monthlySalaryId: existingSalary._id.toString(),
        taxType: existingSalary.taxType || null,
        employeeConfirmed: existingSalary.employeeConfirmed ?? false,
        employeeConfirmedAt: existingSalary.employeeConfirmedAt || null,
        employeeFeedbackMessage: existingSalary.employeeFeedbackMessage || null,
        employeeFeedbackAt: existingSalary.employeeFeedbackAt || null,
        monthlyTotal: {
          totalHours: existingSalary.totalWorkHours ?? 0,
          totalBasePay: existingSalary.totalBasePay ?? 0,
          totalHolidayPay: existingSalary.totalHolidayPay ?? 0,
          totalGrossPay: existingSalary.totalGrossPay ?? 0,
          welfarePoints: existingSalary.totalWelfarePoints ?? 0,
          taxInfo: {
            totalTax: taxInfo.totalTax ?? 0,
            taxAmount: taxInfo.totalTax ?? 0,
            incomeTax: taxInfo.incomeTax ?? 0,
            localTax: taxInfo.localTax ?? 0,
            netPay: taxInfo.netPay ?? existingSalary.totalGrossPay ?? 0,
            nationalPension: taxInfo.nationalPension,
            healthInsurance: taxInfo.healthInsurance,
            longTermCare: taxInfo.longTermCare,
            employmentInsurance: taxInfo.employmentInsurance,
          },
        },
        weeklyData,
      });
    }

    // 해당 월의 시작일과 종료일
    const monthStart = getStartOfMonth(yearNum, monthNum);
    const monthEnd = getEndOfMonth(yearNum, monthNum);

    // 해당 월 전체 근무일정 조회 (승인/미승인/거절 모두 - 일별 목록 및 상태 노출용)
    const allSchedulesInMonth = await WorkSchedule.find({
      userId: user._id,
      workDate: { $gte: monthStart, $lte: monthEnd },
    })
      .populate('storeId', 'name')
      .sort({ workDate: 1, startTime: 1 })
      .lean();

    const approvedSchedules = allSchedulesInMonth.filter((s) => s.status === 'approved');
    const unapprovedSchedules = allSchedulesInMonth.filter((s) => s.status !== 'approved');
    const unapprovedWorkDays = unapprovedSchedules.length;
    const unapprovedWorkHours = unapprovedSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);

    // 월별 통계는 승인된 근무만
    const totalHours = approvedSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const hourlyWage = user.hourlyWage || 10320;
    const totalBasePay = Math.round(totalHours * hourlyWage);
    const totalHolidayPay = 0;
    const totalGrossPay = totalBasePay + totalHolidayPay;

    // 주차별: 합계는 승인만, 일별 목록은 전체(승인/미승인/거절 상태 포함)
    const weeksInMonth = getWeeksInMonth(yearNum, monthNum);
    const weeklyData = [];

    for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
      const { startDate, endDate } = getWeekDateRange(monthStart, weekNum);

      const weekAll = allSchedulesInMonth.filter((schedule) => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      const weekApproved = weekAll.filter((s) => s.status === 'approved');

      const weekHours = weekApproved.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const weekBasePay = Math.round(weekHours * hourlyWage);
      const weekHolidayPay = 0;
      const weekTotal = weekBasePay + weekHolidayPay;
      const weekWelfarePoints = Math.floor(weekHours / 4) * 1700;

      weeklyData.push({
        weekNumber: weekNum,
        range: formatDateRange(startDate, endDate),
        totalHours: Math.round(weekHours * 100) / 100,
        workDays: weekApproved.length,
        basePay: weekBasePay,
        holidayPay: weekHolidayPay,
        weeklyTotal: weekTotal,
        welfarePoints: weekWelfarePoints,
        holidayPayStatus: 'pending',
        dailySchedules: weekAll.map((schedule) => ({
          id: schedule._id.toString(),
          date: formatLocalDate(schedule.workDate),
          dayOfWeek: getDayOfWeek(schedule.workDate),
          storeName: schedule.storeId?.name || '점포 정보 없음',
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          hours: schedule.totalHours || 0,
          status: schedule.status || 'pending',
        })),
      });
    }

    const welfarePoints = weeklyData.reduce((sum, w) => sum + (w.welfarePoints || 0), 0);

    res.json({
      year: yearNum,
      month: monthNum,
      monthLabel: formatMonthLabel(yearNum, monthNum),
      isConfirmed: false,
      confirmedAt: null,
      monthlySalaryId: null,
      employeeConfirmed: false,
      employeeConfirmedAt: null,
      employeeFeedbackMessage: null,
      employeeFeedbackAt: null,
      monthlyTotal: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalBasePay,
        totalHolidayPay,
        totalGrossPay,
        welfarePoints,
        unapprovedWorkDays,
        unapprovedWorkHours: Math.round(unapprovedWorkHours * 100) / 100,
        taxInfo: null,
      },
      weeklyData,
    });
  } catch (error) {
    console.error('월별 급여 조회 오류:', error);
    res.status(500).json({
      message: '월별 급여 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/employee/salary/confirm/:year/:month
 * 근로자가 급여 산정 내용을 확인함 (이상 없음). 분쟁 방지용으로 보관.
 */
router.put('/salary/confirm/:year/:month', async (req, res) => {
  try {
    const user = req.user;
    const { year, month } = req.params;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: '유효하지 않은 연도 또는 월입니다.',
      });
    }

    const salary = await MonthlySalary.findOne({
      userId: user._id,
      year: yearNum,
      month: monthNum,
    });

    if (!salary) {
      return res.status(404).json({
        message: '해당 월의 급여 산정 정보를 찾을 수 없습니다.',
      });
    }

    if (salary.status === 'confirmed') {
      return res.status(400).json({
        message: '이미 확정된 급여입니다.',
      });
    }

    salary.employeeConfirmed = true;
    salary.employeeConfirmedAt = new Date();
    await salary.save();

    res.json({
      message: '급여 내용을 확인했습니다. (분쟁 방지용으로 보관됩니다.)',
      employeeConfirmed: true,
      employeeConfirmedAt: salary.employeeConfirmedAt,
    });
  } catch (error) {
    console.error('급여 확인 오류:', error);
    res.status(500).json({
      message: error.message || '급여 확인 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * POST /api/employee/salary/feedback/:year/:month
 * 근로자가 급여 이상 시 점주에게 피드백 전달. 분쟁 방지용으로 보관.
 */
router.post('/salary/feedback/:year/:month', async (req, res) => {
  try {
    const user = req.user;
    const { year, month } = req.params;
    const { message } = req.body || {};
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: '유효하지 않은 연도 또는 월입니다.',
      });
    }

    const salary = await MonthlySalary.findOne({
      userId: user._id,
      year: yearNum,
      month: monthNum,
    }).populate({ path: 'storeId', select: 'ownerId' });

    if (!salary) {
      return res.status(404).json({
        message: '해당 월의 급여 산정 정보를 찾을 수 없습니다.',
      });
    }

    if (salary.status === 'confirmed') {
      return res.status(400).json({
        message: '이미 확정된 급여에는 피드백을 등록할 수 없습니다.',
      });
    }

    const feedbackText = typeof message === 'string' ? message.trim().slice(0, 2000) : '';
    salary.employeeFeedbackMessage = feedbackText;
    salary.employeeFeedbackAt = new Date();
    await salary.save();

    // 점주에게 알림 (선택)
    if (feedbackText && salary.storeId?.ownerId) {
      const { createNotification } = require('../utils/notificationHelper');
      await createNotification({
        userId: salary.storeId.ownerId,
        type: 'employee_feedback',
        title: '급여 피드백',
        message: `[${user.name}] ${yearNum}년 ${monthNum}월 급여 관련 피드백: ${feedbackText.slice(0, 200)}`,
        createdBy: user._id,
        relatedId: salary._id,
        relatedType: 'MonthlySalary',
      });
    }

    res.json({
      message: '피드백이 전달되었으며, 분쟁 방지용으로 보관됩니다.',
      employeeFeedbackAt: salary.employeeFeedbackAt,
    });
  } catch (error) {
    console.error('급여 피드백 오류:', error);
    res.status(500).json({
      message: error.message || '피드백 전송 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.get('/notifications', async (req, res) => {
  try {
    const user = req.user;

    const list = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const items = list.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      type: n.type,
    }));
    const unreadCount = items.filter((n) => !n.isRead).length;

    res.json({
      unreadCount,
      items,
    });
  } catch (error) {
    console.error('알림 조회 오류:', error);
    res.status(500).json({
      message: '알림 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: '알림을 찾을 수 없습니다.',
      });
    }

    res.json({ message: '알림을 읽음 처리했습니다.' });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({
      message: '알림 읽음 처리 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/employee/export/payroll/:year/:month
 * 본인 급여 명세서 Excel 다운로드 (직원)
 */
router.get('/export/payroll/:year/:month', async (req, res) => {
  try {
    const user = req.user;
    const { year, month } = req.params;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      return res.status(400).json({ message: '연도와 월이 올바르지 않습니다.' });
    }

    const salary = await MonthlySalary.findOne({
      userId: user._id,
      year: yearNum,
      month: monthNum,
    }).lean();

    if (!salary) {
      return res.status(404).json({
        message: '해당 월의 급여 데이터가 없습니다. 급여가 산정된 후 다운로드할 수 있습니다.',
      });
    }

    const buffer = buildPayrollDetailExcel(salary);
    const filename = `급여명세서_${yearNum}${String(monthNum).padStart(2, '0')}_${(salary.employeeName || '급여').replace(/[/\\*?\[\]:]/g, '_')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    console.error('급여 명세서 Excel 내보내기 오류:', error);
    res.status(500).json({
      message: '급여 명세서 Excel 내보내기 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;

