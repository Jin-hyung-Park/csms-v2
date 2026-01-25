const { Router } = require('express');
const { authenticate, requireEmployee } = require('../middleware/auth');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
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
    const hourlyWage = user.hourlyWage || 10030; // User 모델에서 시급 가져오기
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
      unreadNotifications: 0, // TODO: Notification 모델과 연동
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
    const { month } = req.query; // 'YYYY-MM' 형식
    
    // 최근 2개월 데이터 조회
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    
    const months = [];
    
    // 현재 월과 이전 월
    for (let i = 0; i < 2; i++) {
      const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
      const targetYear = targetDate.getFullYear();
      const targetMonth = targetDate.getMonth() + 1;
      
      const monthStart = getStartOfMonth(targetYear, targetMonth);
      const monthEnd = getEndOfMonth(targetYear, targetMonth);
      
      // 해당 월의 승인된 근무일정 조회
      const schedules = await WorkSchedule.find({
        userId: user._id,
        workDate: {
          $gte: monthStart,
          $lte: monthEnd,
        },
        status: 'approved', // 승인된 근무만 급여 계산
      }).sort({ workDate: 1 });
      
      // 월별 통계 계산
      const totalHours = schedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const hourlyWage = user.hourlyWage || 10030; // User 모델에서 시급 가져오기
      const basePay = Math.round(totalHours * hourlyWage);
      
      // 주차별 데이터 계산
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
        
        weeks.push({
          weekNumber: weekNum,
          range: formatDateRange(startDate, endDate),
          totalHours: Math.round(weekHours * 100) / 100,
          basePay: weekBasePay,
          holidayPay: 0, // TODO: 주휴수당 계산
        });
      }
      
      months.push({
        id: `${targetYear}-${String(targetMonth).padStart(2, '0')}`,
        year: targetYear,
        month: targetMonth,
        monthLabel: formatMonthLabel(targetYear, targetMonth),
        basePay,
        holidayPay: 0, // TODO: 주휴수당 계산
        netPay: basePay, // TODO: 세금 계산
        weeks,
      });
    }
    
    const selectedMonth = month
      ? months.find((m) => m.id === month) || months[0]
      : months[0];
    
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
    const hourlyWage = user.hourlyWage || 10030;
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
    const { month } = req.query; // 'YYYY-MM' 형식
    
    // 월 파싱
    let year, monthNum;
    if (month) {
      [year, monthNum] = month.split('-').map((n) => parseInt(n, 10));
    } else {
      const now = new Date();
      year = now.getFullYear();
      monthNum = now.getMonth() + 1;
    }
    
    // 해당 월의 시작일과 종료일
    const monthStart = getStartOfMonth(year, monthNum);
    const monthEnd = getEndOfMonth(year, monthNum);
    
    // 해당 월의 근무일정 조회
    const schedules = await WorkSchedule.find({
      userId: user._id,
      workDate: {
        $gte: monthStart,
        $lte: monthEnd,
      },
    })
      .populate('storeId', 'name')
      .sort({ workDate: 1, startTime: 1 });
    
    // 주차별로 그룹화
    const weeksInMonth = getWeeksInMonth(year, monthNum);
    const monthData = {
      id: `${year}-${String(monthNum).padStart(2, '0')}`,
      label: formatMonthLabel(year, monthNum),
      weeks: [],
    };
    
    // 각 주차별로 데이터 생성
    for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
      const { startDate, endDate } = getWeekDateRange(monthStart, weekNum);
      
      // 해당 주차의 근무일정 필터링
      const weekSchedules = schedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      
      const weekData = {
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
      };
      
      monthData.weeks.push(weekData);
    }
    
    res.json({
      months: [monthData],
    });
  } catch (error) {
    console.error('근무일정 조회 오류:', error);
    res.status(500).json({
      message: '근무일정 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

router.get('/salary/:year/:month', async (req, res) => {
  try {
    const user = req.user;
    const { year, month } = req.params;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    
    // 해당 월의 시작일과 종료일
    const monthStart = getStartOfMonth(yearNum, monthNum);
    const monthEnd = getEndOfMonth(yearNum, monthNum);
    
    // 해당 월의 승인된 근무일정 조회
    const schedules = await WorkSchedule.find({
      userId: user._id,
      workDate: {
        $gte: monthStart,
        $lte: monthEnd,
      },
      status: 'approved', // 승인된 근무만 급여 계산
    })
      .populate('storeId', 'name')
      .sort({ workDate: 1, startTime: 1 });
    
    // 월별 통계 계산
    const totalHours = schedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
    const hourlyWage = user.hourlyWage || 10030; // User 모델에서 시급 가져오기
    const totalBasePay = Math.round(totalHours * hourlyWage);
    const totalHolidayPay = 0; // TODO: 주휴수당 계산
    const totalGrossPay = totalBasePay + totalHolidayPay;
    
    // 세금 계산 (간단한 계산, 추후 정확한 세금 계산 로직 추가 필요)
    const taxAmount = Math.round(totalGrossPay * 0.033); // 3.3% 사업자소득세
    const netPay = totalGrossPay - taxAmount;
    
    // 주차별 데이터 계산
    const weeksInMonth = getWeeksInMonth(yearNum, monthNum);
    const weeklyData = [];
    
    for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
      const { startDate, endDate } = getWeekDateRange(monthStart, weekNum);
      
      const weekSchedules = schedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });
      
      const weekHours = weekSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const weekBasePay = Math.round(weekHours * hourlyWage);
      const weekHolidayPay = 0; // TODO: 주휴수당 계산
      const weekTotal = weekBasePay + weekHolidayPay;
      
      weeklyData.push({
        weekNumber: weekNum,
        range: formatDateRange(startDate, endDate),
        totalHours: Math.round(weekHours * 100) / 100,
        workDays: weekSchedules.length,
        basePay: weekBasePay,
        holidayPay: weekHolidayPay,
        weeklyTotal: weekTotal,
        holidayPayStatus: 'pending', // TODO: 주휴수당 상태 확인
        dailySchedules: weekSchedules.map((schedule) => ({
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
    
    res.json({
      year: yearNum,
      month: monthNum,
      monthLabel: formatMonthLabel(yearNum, monthNum),
      isConfirmed: false, // TODO: MonthlySalary 모델에서 확인
      confirmedAt: null, // TODO: MonthlySalary 모델에서 가져올 예정
      monthlyTotal: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalBasePay,
        totalHolidayPay,
        totalGrossPay,
        taxInfo: {
          taxAmount,
          incomeTax: Math.round(taxAmount * 0.9), // 간단한 계산
          localTax: Math.round(taxAmount * 0.1), // 간단한 계산
          netPay,
        },
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

router.get('/notifications', async (req, res) => {
  try {
    const user = req.user;
    
    // TODO: Notification 모델 생성 후 실제 데이터 조회
    // 현재는 빈 배열 반환
    const notifications = [];
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    
    res.json({
      unreadCount,
      items: notifications,
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
    
    // TODO: Notification 모델 생성 후 실제 업데이트
    // const notification = await Notification.findOneAndUpdate(
    //   { _id: id, userId: user._id },
    //   { isRead: true },
    //   { new: true }
    // );
    
    res.json({ message: '알림을 읽음 처리했습니다.' });
  } catch (error) {
    console.error('알림 읽음 처리 오류:', error);
    res.status(500).json({
      message: '알림 읽음 처리 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;

