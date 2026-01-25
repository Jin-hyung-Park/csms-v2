const { Router } = require('express');
const { authenticate, requireUser } = require('../middleware/auth');
const MonthlySalary = require('../models/MonthlySalary');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const {
  getStartOfMonth,
  getEndOfMonth,
  getWeekDateRange,
  getWeeksInMonth,
  formatDateRange,
} = require('../utils/dateHelpers');

const router = Router();

// 모든 MonthlySalary 라우트에 인증 적용
router.use(authenticate);
router.use(requireUser);

/**
 * GET /api/monthly-salary
 * 월별 급여 목록 조회
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const { year, month, storeId } = req.query;

    const filter = {};

    // 권한에 따라 필터링
    if (user.role === 'employee') {
      // 근로자는 자신의 급여만 조회
      filter.userId = user._id;
    } else if (user.role === 'owner') {
      // 점주는 점포별 조회 가능
      if (storeId) {
        filter.storeId = storeId;
      }
    }

    // 연월 필터
    if (year) {
      filter.year = parseInt(year, 10);
    }
    if (month) {
      filter.month = parseInt(month, 10);
    }

    const salaries = await MonthlySalary.find(filter)
      .populate('userId', 'name email')
      .populate('storeId', 'name')
      .sort({ year: -1, month: -1 })
      .lean();

    res.json({
      items: salaries,
    });
  } catch (error) {
    console.error('월별 급여 목록 조회 오류:', error);
    res.status(500).json({
      message: '월별 급여 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/monthly-salary/:userId/:year/:month
 * 특정 사용자의 월별 급여 상세 조회
 */
router.get('/:userId/:year/:month', async (req, res) => {
  try {
    const { userId, year, month } = req.params;
    const user = req.user;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    const userIdObj = userId;

    // 권한 확인
    if (user.role === 'employee' && user._id.toString() !== userIdObj) {
      return res.status(403).json({
        message: '본인의 급여 정보만 조회할 수 있습니다.',
      });
    }

    // 월별 급여 조회
    const salary = await MonthlySalary.findOne({
      userId: userIdObj,
      year: yearNum,
      month: monthNum,
    })
      .populate('userId', 'name email')
      .populate('storeId', 'name address')
      .populate('confirmedBy', 'name')
      .lean();

    if (!salary) {
      return res.status(404).json({
        message: '해당 월의 급여 정보를 찾을 수 없습니다.',
      });
    }

    // 점주인 경우 권한 확인
    if (user.role === 'owner') {
      const targetUser = await User.findById(userIdObj).populate('storeId', 'ownerId');
      if (!targetUser || !targetUser.storeId || targetUser.storeId.ownerId.toString() !== user._id.toString()) {
        return res.status(403).json({
          message: '이 직원의 급여 정보를 조회할 권한이 없습니다.',
        });
      }
    }

    res.json({
      salary,
    });
  } catch (error) {
    console.error('월별 급여 상세 조회 오류:', error);
    res.status(500).json({
      message: '월별 급여 상세 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * POST /api/monthly-salary/calculate
 * 월별 급여 산정 (자동 계산)
 * 점주만 가능
 */
router.post('/calculate', async (req, res) => {
  try {
    const owner = req.user;

    if (owner.role !== 'owner') {
      return res.status(403).json({
        message: '점주만 급여를 산정할 수 있습니다.',
      });
    }

    const { userId, year, month } = req.body;

    if (!userId || !year || !month) {
      return res.status(400).json({
        message: 'userId, year, month는 필수 항목입니다.',
      });
    }

    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    // 이미 존재하는지 확인
    const existing = await MonthlySalary.findOne({
      userId,
      year: yearNum,
      month: monthNum,
    });

    if (existing) {
      return res.status(409).json({
        message: '이미 산정된 급여가 있습니다.',
        salary: existing,
      });
    }

    // 사용자 정보 조회
    const employee = await User.findById(userId).populate('storeId', 'ownerId');

    if (!employee) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    if (!employee.storeId || employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 직원의 급여를 산정할 권한이 없습니다.',
      });
    }

    // 해당 월의 근무일정 조회
    const monthStart = getStartOfMonth(yearNum, monthNum);
    const monthEnd = getEndOfMonth(yearNum, monthNum);

    const schedules = await WorkSchedule.find({
      userId: employee._id,
      workDate: {
        $gte: monthStart,
        $lte: monthEnd,
      },
      status: 'approved',
    }).sort({ workDate: 1 });

    // 주차별 데이터 계산
    const weeksInMonth = getWeeksInMonth(yearNum, monthNum);
    const weeklyDetails = [];

    for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
      const { startDate, endDate } = getWeekDateRange(monthStart, weekNum);

      const weekSchedules = schedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      });

      const weekHours = weekSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const weekDays = weekSchedules.length;
      const weekBasePay = Math.round(weekHours * (employee.hourlyWage || 10030));
      const weekHolidayPay = 0; // TODO: 주휴수당 계산
      const weekTotal = weekBasePay + weekHolidayPay;

      weeklyDetails.push({
        weekNumber: weekNum,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        workHours: Math.round(weekHours * 100) / 100,
        workDays: weekDays,
        basePay: weekBasePay,
        holidayPay: weekHolidayPay,
        weeklyTotal: weekTotal,
        holidayPayStatus: 'pending',
        holidayPayCalculation: {
          calculated: {
            totalHours: weekHours,
            isEligible: false, // TODO: 주휴수당 계산 로직
            amount: 0,
          },
          adjusted: {
            amount: null,
            reason: '',
            notes: '',
            adjustedBy: null,
            adjustedAt: null,
          },
        },
      });
    }

    // 총계 계산
    const totalWorkHours = weeklyDetails.reduce((sum, w) => sum + w.workHours, 0);
    const totalWorkDays = weeklyDetails.reduce((sum, w) => sum + w.workDays, 0);
    const totalBasePay = weeklyDetails.reduce((sum, w) => sum + w.basePay, 0);
    const totalHolidayPay = weeklyDetails.reduce((sum, w) => sum + w.holidayPay, 0);
    const totalGrossPay = totalBasePay + totalHolidayPay;

    // 세금 계산 (간단한 계산)
    let taxInfo = {
      incomeTax: 0,
      localTax: 0,
      totalTax: 0,
      netPay: totalGrossPay,
    };

    if (employee.taxType === 'business-income') {
      taxInfo.totalTax = Math.round(totalGrossPay * 0.033);
      taxInfo.incomeTax = Math.round(taxInfo.totalTax * 0.9);
      taxInfo.localTax = Math.round(taxInfo.totalTax * 0.1);
      taxInfo.netPay = totalGrossPay - taxInfo.totalTax;
    }

    // MonthlySalary 생성
    const monthlySalary = await MonthlySalary.create({
      userId: employee._id,
      storeId: employee.storeId._id,
      year: yearNum,
      month: monthNum,
      employeeName: employee.name,
      employeeEmail: employee.email,
      hourlyWage: employee.hourlyWage || 10030,
      taxType: employee.taxType || 'none',
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalWorkDays,
      totalBasePay,
      totalHolidayPay,
      totalGrossPay,
      taxInfo,
      weeklyDetails,
      status: 'calculated',
    });

    res.status(201).json({
      message: '급여가 산정되었습니다.',
      salary: monthlySalary,
    });
  } catch (error) {
    console.error('급여 산정 오류:', error);
    res.status(500).json({
      message: '급여 산정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/monthly-salary/:id/adjust-holiday-pay
 * 주휴수당 수정 (점주만)
 */
router.put('/:id/adjust-holiday-pay', async (req, res) => {
  try {
    const owner = req.user;

    if (owner.role !== 'owner') {
      return res.status(403).json({
        message: '점주만 주휴수당을 수정할 수 있습니다.',
      });
    }

    const { id } = req.params;
    const { weekIndex, amount, reason, notes } = req.body;

    if (weekIndex === undefined || amount === undefined) {
      return res.status(400).json({
        message: 'weekIndex와 amount는 필수 항목입니다.',
      });
    }

    const salary = await MonthlySalary.findById(id);

    if (!salary) {
      return res.status(404).json({
        message: '급여 정보를 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    const employee = await User.findById(salary.userId).populate({
      path: 'storeId',
      select: 'ownerId',
    });
    
    if (!employee || !employee.storeId || employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 급여를 수정할 권한이 없습니다.',
      });
    }

    // 주휴수당 수정
    salary.adjustHolidayPay(weekIndex, amount, reason, notes, owner._id);

    // 총액 재계산
    salary.recalculateTotals();

    await salary.save();

    res.json({
      message: '주휴수당이 수정되었습니다.',
      salary,
    });
  } catch (error) {
    console.error('주휴수당 수정 오류:', error);
    res.status(500).json({
      message: error.message || '주휴수당 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/monthly-salary/:id/confirm
 * 급여 확정 (점주만)
 */
router.put('/:id/confirm', async (req, res) => {
  try {
    const owner = req.user;

    if (owner.role !== 'owner') {
      return res.status(403).json({
        message: '점주만 급여를 확정할 수 있습니다.',
      });
    }

    const { id } = req.params;

    const salary = await MonthlySalary.findById(id);

    if (!salary) {
      return res.status(404).json({
        message: '급여 정보를 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    const employee = await User.findById(salary.userId).populate({
      path: 'storeId',
      select: 'ownerId',
    });
    
    if (!employee || !employee.storeId || employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 급여를 확정할 권한이 없습니다.',
      });
    }

    // 급여 확정
    salary.confirm(owner._id);

    await salary.save();

    // 확정된 급여 정보 다시 조회 (populate 포함)
    const confirmedSalary = await MonthlySalary.findById(id)
      .populate('userId', 'name email')
      .populate('storeId', 'name address')
      .populate('confirmedBy', 'name')
      .lean();

    // TODO: 알림 생성 (Notification 모델 연동 필요)

    res.json({
      message: '급여가 확정되었습니다.',
      salary: confirmedSalary,
    });
  } catch (error) {
    console.error('급여 확정 오류:', error);
    res.status(500).json({
      message: error.message || '급여 확정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
