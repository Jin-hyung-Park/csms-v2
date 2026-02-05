const { Router } = require('express');
const { authenticate, requireUser } = require('../middleware/auth');
const MonthlySalary = require('../models/MonthlySalary');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const {
  getStartOfMonth,
  getEndOfMonth,
  getMonthlyWeeksForHolidayPay,
} = require('../utils/dateHelpers');
const {
  calculateHolidayPay,
} = require('../utils/holidayPayCalculator');
const { calculateMonthlyTax } = require('../utils/taxCalculator');

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
 * 월별 급여 산정 (자동 계산) - 주휴수당 자동 계산 포함
 * 점주만 가능
 * 
 * 주휴수당 산정 규칙:
 * 1. 한 주는 월요일 ~ 일요일 (고정)
 * 2. 월 경계 주차(일요일이 다음 달에 속함)는 익월에 주휴수당 산정
 * 3. 근로계약상 주 15시간 이상 & 소정근로일 개근 시 지급
 * 4. 공식: (주간 근로계약 시간 / 40) × 8 × 시급
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

    // 사용자 정보 조회 (storeId에 minimumWage 포함 - 시급 기본값용)
    const employee = await User.findById(userId).populate('storeId', 'ownerId minimumWage');

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

    // 주휴수당 산정을 위한 주차별 정보 조회
    const monthlyWeeks = getMonthlyWeeksForHolidayPay(yearNum, monthNum);
    const weeklyDetails = [];

    // 월 경계 처리를 위해 전월 마지막 날과 익월 첫째 주까지 포함하여 근무일정 조회
    const monthStart = getStartOfMonth(yearNum, monthNum);
    const monthEnd = getEndOfMonth(yearNum, monthNum);
    
    // 첫 번째 주의 시작일과 마지막 주의 종료일 계산
    const firstWeekStart = monthlyWeeks.length > 0 ? new Date(monthlyWeeks[0].startDate) : monthStart;
    const lastWeekEnd = monthlyWeeks.length > 0 ? new Date(monthlyWeeks[monthlyWeeks.length - 1].endDate) : monthEnd;

    // 확장된 범위의 근무일정 조회 (월 경계 주차의 주휴수당 계산을 위해)
    const schedules = await WorkSchedule.find({
      userId: employee._id,
      workDate: {
        $gte: firstWeekStart,
        $lte: lastWeekEnd,
      },
      status: 'approved',
    }).sort({ workDate: 1 });

    // 주차별 데이터 계산
    for (const weekInfo of monthlyWeeks) {
      const weekStartDate = new Date(weekInfo.startDate);
      const weekEndDate = new Date(weekInfo.endDate);
      
      // 해당 주의 근무 기록 필터링
      const weekSchedules = schedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= weekStartDate && scheduleDate <= weekEndDate;
      });

      // 해당 월 내의 근무만 집계 (기본급 계산용)
      const monthSchedules = weekSchedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= monthStart && scheduleDate <= monthEnd;
      });

      const weekHours = monthSchedules.reduce((sum, s) => sum + (s.totalHours || 0), 0);
      const weekDays = monthSchedules.length;
      const weekBasePay = Math.round(weekHours * (employee.hourlyWage ?? employee.storeId?.minimumWage ?? 10320));
      
      // 주휴수당 계산 (이 주차를 현재 월에 산정해야 하는 경우에만)
      let weekHolidayPay = 0;
      let holidayPayResult = {
        amount: 0,
        isEligible: false,
        reason: weekInfo.shouldCalculateInThisMonth ? '' : '익월에 산정 예정',
        calculation: null,
      };

      if (weekInfo.shouldCalculateInThisMonth) {
        // 전체 주의 근무 기록으로 주휴수당 계산 (월 경계 포함)
        holidayPayResult = calculateHolidayPay(employee, weekSchedules);
        weekHolidayPay = holidayPayResult.amount;
      }
      
      const weekTotal = weekBasePay + weekHolidayPay;

      weeklyDetails.push({
        weekNumber: weekInfo.weekNumber,
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        workHours: Math.round(weekHours * 100) / 100,
        workDays: weekDays,
        basePay: weekBasePay,
        holidayPay: weekHolidayPay,
        weeklyTotal: weekTotal,
        holidayPayStatus: weekInfo.shouldCalculateInThisMonth 
          ? (holidayPayResult.isEligible ? 'calculated' : 'not_eligible')
          : 'pending_next_month',
        holidayPayCalculation: {
          calculated: {
            totalHours: holidayPayResult.calculation?.weeklyContractHours || 0,
            isEligible: holidayPayResult.isEligible,
            amount: holidayPayResult.amount,
            reason: holidayPayResult.reason,
            formula: holidayPayResult.calculation?.formula || null,
          },
          adjusted: {
            amount: null,
            reason: '',
            notes: '',
            adjustedBy: null,
            adjustedAt: null,
          },
        },
        // 월 경계 정보
        crossesMonthBoundary: weekInfo.crossesMonthBoundary,
        holidayPayMonth: weekInfo.holidayPayMonth,
        note: weekInfo.note,
      });
    }

    // 총계 계산
    const totalWorkHours = weeklyDetails.reduce((sum, w) => sum + w.workHours, 0);
    const totalWorkDays = weeklyDetails.reduce((sum, w) => sum + w.workDays, 0);
    const totalBasePay = weeklyDetails.reduce((sum, w) => sum + w.basePay, 0);
    const totalHolidayPay = weeklyDetails.reduce((sum, w) => sum + w.holidayPay, 0);
    const totalGrossPay = totalBasePay + totalHolidayPay;

    // 복지포인트: trunc(실 근로시간/4, 0) × 1,700원, 주차별 합산
    const WELFARE_POINT_UNIT = 1700;
    const totalWelfarePoints = weeklyDetails.reduce(
      (sum, w) => sum + Math.floor((w.workHours || 0) / 4) * WELFARE_POINT_UNIT,
      0
    );

    // 세금 계산 (taxType별: none/under-15-hours/business-income/labor-income/four-insurance)
    const taxResult = calculateMonthlyTax(
      employee.taxType || 'none',
      totalGrossPay
    );
    const taxInfo = {
      incomeTax: taxResult.incomeTax,
      localTax: taxResult.localTax,
      totalTax: taxResult.totalTax,
      netPay: taxResult.netPay,
    };
    if (taxResult.nationalPension !== undefined) {
      taxInfo.nationalPension = taxResult.nationalPension;
      taxInfo.healthInsurance = taxResult.healthInsurance;
      taxInfo.longTermCare = taxResult.longTermCare;
      taxInfo.employmentInsurance = taxResult.employmentInsurance;
    }

    // MonthlySalary 생성
    const monthlySalary = await MonthlySalary.create({
      userId: employee._id,
      storeId: employee.storeId._id,
      year: yearNum,
      month: monthNum,
      employeeName: employee.name,
      employeeEmail: employee.email,
      hourlyWage: employee.hourlyWage ?? employee.storeId?.minimumWage ?? 10320,
      taxType: employee.taxType || 'none',
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      totalWorkDays,
      totalBasePay,
      totalHolidayPay,
      totalGrossPay,
      totalWelfarePoints,
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

    if (!salary.employeeConfirmed) {
      return res.status(400).json({
        message: '근로자가 급여 내용을 확인한 후에만 확정할 수 있습니다. 근로자에게 급여 확인을 요청해 주세요.',
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

    const { notifySalaryConfirmed } = require('../utils/notificationHelper');
    await notifySalaryConfirmed(
      salary.userId,
      salary.year,
      salary.month,
      salary.taxInfo?.netPay,
      salary._id
    );

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

/**
 * DELETE /api/monthly-salary/:id
 * 산정 취소 (점주만) - 확정되지 않은 급여만 삭제 가능. 취소 후 재산정 가능
 */
router.delete('/:id', async (req, res) => {
  try {
    const owner = req.user;

    if (owner.role !== 'owner') {
      return res.status(403).json({
        message: '점주만 급여 산정을 취소할 수 있습니다.',
      });
    }

    const { id } = req.params;

    const salary = await MonthlySalary.findById(id);

    if (!salary) {
      return res.status(404).json({
        message: '급여 정보를 찾을 수 없습니다.',
      });
    }

    if (salary.status === 'confirmed') {
      return res.status(400).json({
        message: '확정된 급여는 산정 취소할 수 없습니다.',
      });
    }

    // 권한 확인
    const employee = await User.findById(salary.userId).populate({
      path: 'storeId',
      select: 'ownerId',
    });

    if (!employee || !employee.storeId || employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 급여를 취소할 권한이 없습니다.',
      });
    }

    await MonthlySalary.findByIdAndDelete(id);

    res.json({
      message: '급여 산정이 취소되었습니다. 다시 산정할 수 있습니다.',
    });
  } catch (error) {
    console.error('산정 취소 오류:', error);
    res.status(500).json({
      message: '산정 취소 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;
