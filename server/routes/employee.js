const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const Notification = require('../models/Notification');
const MonthlySalary = require('../models/MonthlySalary');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { calculateWeeklyTax, calculateMonthlyTax } = require('../utils/taxCalculator');
const { calculateWorkHours, calculateOvertimeHours, calculateSalary, calculateWelfarePoints } = require('../utils/workHoursCalculator');

const router = express.Router();

// @desc    Get employee dashboard data
// @route   GET /api/employee/dashboard
// @access  Private (Employee)
router.get('/dashboard', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const { month } = req.query;
    
    // Get recent work schedules
    const recentSchedules = await WorkSchedule.find({ userId: req.user._id })
      .sort({ workDate: -1 })
      .limit(5);

    // Get unread notifications count
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    // Get work schedules for selected month
    let schedulesQuery = { userId: req.user._id };
    
    if (month) {
      const [year, monthNum] = month.split('-');
      // 월의 시작은 00:00:00으로 설정하여 해당 월의 모든 일정 포함
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      // 근무 시작일(workDate)이 해당 월에 속하는 근무만 포함
      schedulesQuery.workDate = { $gte: startOfMonth, $lte: endOfMonth };
    }
    
    const allSchedules = await WorkSchedule.find(schedulesQuery).sort({ workDate: -1, endDate: -1 });

    // 승인된 일정만 필터링
    const approvedSchedules = allSchedules.filter(schedule => schedule.status === 'approved');
    
    // 총 근무시간 계산 (공통 함수 사용)
    const totalHours = approvedSchedules.reduce((sum, schedule) => {
      return sum + calculateWorkHours(schedule);
    }, 0);

    // 초과근무 시간 계산 (공통 함수 사용)
    const totalOvertime = approvedSchedules.reduce((sum, schedule) => {
      const workHours = calculateWorkHours(schedule);
      return sum + calculateOvertimeHours(workHours);
    }, 0);

    // 총 휴식시간 계산
    const totalBreakTime = approvedSchedules.reduce((sum, schedule) => sum + (schedule.breakTime || 0), 0);

    // 주휴수당 계산 (주 15시간 이상 근무시)
    const weeklyAllowance = totalHours >= 15 ? 8 * (req.user.hourlyWage || 0) : 0;
    
    // 급여 상세 계산 (소수점 2자리)
    const salaryDetails = calculateSalary(totalHours, totalOvertime, weeklyAllowance, req.user.hourlyWage || 0);
    
    // 복지포인트 계산
    const welfarePoints = calculateWelfarePoints(totalHours);

    // 상태별 통계
    const statusStats = {
      approved: 0,
      pending: 0,
      rejected: 0,
      total: allSchedules.length
    };

    allSchedules.forEach(schedule => {
      const status = schedule.status || 'pending';
      if (statusStats.hasOwnProperty(status)) {
        statusStats[status]++;
      }
    });

    res.json({
      recentSchedules,
      unreadCount,
      monthlyStats: {
        totalHours: salaryDetails.totalHours,
        totalOvertime: salaryDetails.overtimeHours,
        totalBreakTime: Math.round(totalBreakTime * 100) / 100,
        totalDays: approvedSchedules.length, // 승인된 일정만 카운트
        estimatedPay: salaryDetails.totalPay,
        regularPay: salaryDetails.regularPay,
        overtimePay: salaryDetails.overtimePay,
        weeklyAllowance: salaryDetails.weeklyAllowance,
        welfarePoints: welfarePoints,
        statusStats
      }
    });
  } catch (error) {
    logger.error('Get employee dashboard error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employee work statistics
// @route   GET /api/employee/statistics
// @access  Private (Employee)
router.get('/statistics', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { userId: req.user._id };
    
    if (startDate && endDate) {
      query.workDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const schedules = await WorkSchedule.find(query);
    
    const stats = {
      totalHours: 0,
      totalOvertime: 0,
      totalDays: 0,
      approvedDays: 0,
      pendingDays: 0,
      rejectedDays: 0,
      averageHoursPerDay: 0
    };

    schedules.forEach(schedule => {
      stats.totalHours += schedule.totalHours;
      stats.totalOvertime += schedule.overtimeHours || 0;
      stats.totalDays++;
      
      switch (schedule.status) {
        case 'approved':
          stats.approvedDays++;
          break;
        case 'pending':
          stats.pendingDays++;
          break;
        case 'rejected':
          stats.rejectedDays++;
          break;
      }
    });

    if (stats.totalDays > 0) {
      stats.averageHoursPerDay = Math.round((stats.totalHours / stats.totalDays) * 100) / 100;
    }

    stats.totalHours = Math.round(stats.totalHours * 100) / 100;
    stats.totalOvertime = Math.round(stats.totalOvertime * 100) / 100;

    res.json(stats);
  } catch (error) {
    logger.error('Get employee statistics error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Update employee profile
// @route   PUT /api/employee/profile
// @access  Private (Employee)
router.put('/profile', protect, authorize('employee', 'manager'), [
  body('username').optional().trim().isLength({ min: 2, max: 50 }).withMessage('사용자명은 2-50자 사이여야 합니다'),
  body('phoneNumber').optional().matches(/^[0-9-+()\s]+$/).withMessage('올바른 전화번호 형식을 입력해주세요'),
  body('address').optional().isLength({ max: 200 }).withMessage('주소는 200자를 초과할 수 없습니다'),
  body('emergencyContact').optional().isObject().withMessage('비상연락처 정보를 올바르게 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, phoneNumber, address, emergencyContact } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // Update fields
    if (username) user.username = username;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (address) user.address = address;
    if (emergencyContact) user.emergencyContact = emergencyContact;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      hourlyWage: updatedUser.hourlyWage,
      taxType: updatedUser.taxType,
      profileImage: updatedUser.profileImage,
      phoneNumber: updatedUser.phoneNumber,
      address: updatedUser.address,
      emergencyContact: updatedUser.emergencyContact
    });
  } catch (error) {
    logger.error('Update employee profile error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employee work schedule by date range
// @route   GET /api/employee/schedules
// @access  Private (Employee)
router.get('/schedules', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate, status, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user._id };
    
    if (startDate && endDate) {
      query.workDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (status) {
      query.status = status;
    }

    const schedules = await WorkSchedule.find(query)
      .sort({ workDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await WorkSchedule.countDocuments(query);

    res.json({
      schedules,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    logger.error('Get employee schedules error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employee weekly work statistics
// @route   GET /api/employee/weekly-stats
// @access  Private (Employee, Owner)
router.get('/weekly-stats', protect, authorize('employee', 'manager', 'owner'), async (req, res) => {
  try {
    const { month, employeeId } = req.query;
    
    if (!month) {
      return res.status(400).json({ message: '월 정보가 필요합니다' });
    }

    // 점주인 경우 특정 직원의 통계를 조회할 수 있음
    let targetUserId = req.user._id;
    let targetUser = req.user;
    
    if (req.user.role === 'owner' && employeeId) {
      // 점주가 특정 직원의 통계를 요청한 경우
      const employee = await User.findById(employeeId);
      if (!employee || employee.role !== 'employee') {
        return res.status(404).json({ message: '해당 직원을 찾을 수 없습니다' });
      }
      targetUserId = employeeId;
      targetUser = employee;
    }

    const [year, monthNum] = month.split('-');
    // 월의 시작은 00:00:00으로 설정하여 해당 월의 모든 일정 포함
    const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    // 이전 월의 마지막 주차 정보 조회 (1주차 주휴수당 계산용)
    const prevMonth = new Date(startOfMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1, 0, 0, 0, 0);
    const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const prevMonthSchedules = await WorkSchedule.find({
      userId: targetUserId,
      workDate: { $gte: prevMonthStart, $lte: prevMonthEnd }
    }).sort({ workDate: 1 });

    // 해당 월의 모든 근무 일정 조회 (승인 여부와 관계없이 모든 데이터)
    const schedules = await WorkSchedule.find({
      userId: targetUserId,
      workDate: { $gte: startOfMonth, $lte: endOfMonth }
    }).sort({ workDate: 1 });

    // 월별 주차 생성 (실제 주차 수만큼)
    const weeklyStats = {};
    const weeksInMonth = getWeeksInMonth(startOfMonth);
    
    console.log(`=== 주차 생성 시작 ===`);
    console.log(`요청된 월: ${month}`);
    console.log(`startOfMonth: ${startOfMonth.toISOString().split('T')[0]}`);
    console.log(`총 주차 수: ${weeksInMonth}`);
    
    // 각 주차별로 초기 데이터 생성
    for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
      console.log(`\n--- ${weekNum}주차 계산 시작 ---`);
      const weekRange = getWeekDateRange(startOfMonth, weekNum);
      
      console.log(`주차 ${weekNum} 생성:`, {
        startDate: weekRange.startDate.toISOString().split('T')[0],
        endDate: weekRange.endDate.toISOString().split('T')[0],
        isLastWeek: weekNum === weeksInMonth
      });
      
      weeklyStats[weekNum] = {
        weekNumber: weekNum,
        startDate: weekRange.startDate,
        endDate: weekRange.endDate,
        totalHours: 0,
        workDays: 0,
        totalPay: 0,
        holidayPay: 0,
        weeklyTotal: 0,
        contractWorkDays: 0, // 근로계약서상 근무일수
        absentDays: 0 // 결근일수
      };
    }
    
    // 근무 일정을 주차별로 분류하고 근로 정보 계산
    Object.keys(weeklyStats).forEach(weekKey => {
      const weekData = weeklyStats[weekKey];
      const weekInfo = calculateWeeklyWorkInfo(schedules, weekData.startDate, weekData.endDate, targetUser.hourlyWage || 0, targetUser.workSchedule);
      
      weekData.totalHours = weekInfo.totalHours;
      weekData.workDays = weekInfo.workDays;
      weekData.contractWorkDays = weekInfo.contractDays;
      weekData.absentDays = weekInfo.absentDays;
      weekData.totalPay = weekInfo.totalPay;
      weekData.hourlyWage = targetUser.hourlyWage || 0; // 시급 정보 추가
      
      // 실제 스케줄 데이터 추가 (달력보기용)
      weekData.schedules = schedules.filter(schedule => {
        const scheduleDate = new Date(schedule.workDate);
        const weekStart = new Date(weekData.startDate);
        const weekEnd = new Date(weekData.endDate);
        
        return scheduleDate >= weekStart && scheduleDate <= weekEnd;
      }).map(schedule => ({
        date: schedule.workDate,
        workDate: schedule.workDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        hours: calculateWorkHours(schedule),
        pay: calculateWorkHours(schedule) * (targetUser.hourlyWage || 0),
        status: schedule.status
      }));
    });

    // 주휴수당 계산 및 주별 총액 계산
    Object.keys(weeklyStats).forEach(weekKey => {
      const weekData = weeklyStats[weekKey];
      
      if (weekData.weekNumber === 1) {
        // 1주차: 지난 달의 마지막 주차와 현재 주차를 합쳐서 주휴수당 계산
        // 근로계약상 주당 근로시간 계산
        const weeklyContractHours = calculateWeeklyContractHours(targetUser.workSchedule);
        
        // 1주차: 지난 달의 마지막 주차와 현재 주차를 합쳐서 주휴수당 계산
        const prevLastWeekRange = getPreviousMonthLastWeekRange(prevMonthStart);
        const prevWeekInfo = calculateWeeklyWorkInfo(prevMonthSchedules, prevLastWeekRange.startDate, prevLastWeekRange.endDate, targetUser.hourlyWage || 0, targetUser.workSchedule);
        const currentWeekInfo = calculateWeeklyWorkInfo(schedules, weekData.startDate, weekData.endDate, targetUser.hourlyWage || 0, targetUser.workSchedule);
        
        weekData.holidayPay = calculateHolidayPay(targetUser, weekData, weekData.weekNumber, true, prevWeekInfo, currentWeekInfo);
              } else {
          // 2주차 이후: 실제 근무시간이 소정 근로시간을 충족해야 주휴수당 지급
          weekData.holidayPay = calculateHolidayPay(targetUser, weekData, weekData.weekNumber, false);
        }
      
      weekData.weeklyTotal = weekData.totalPay + weekData.holidayPay;
      
      // 주차별 세금 계산 (실제 근무시간 고려)
      const weeklyTaxInfo = calculateWeeklyTax(targetUser.taxType || '미신고', weekData.weeklyTotal, weekData.totalHours);
      weekData.taxInfo = weeklyTaxInfo;
    });

    // 월별 합계 계산
    const monthlyTotal = {
      totalHours: Object.values(weeklyStats).reduce((sum, week) => sum + week.totalHours, 0),
      totalPay: Object.values(weeklyStats).reduce((sum, week) => sum + week.totalPay, 0),
      totalHolidayPay: Object.values(weeklyStats).reduce((sum, week) => sum + week.holidayPay, 0),
      totalGrossPay: Object.values(weeklyStats).reduce((sum, week) => sum + week.weeklyTotal, 0),
      workDays: Object.values(weeklyStats).reduce((sum, week) => sum + week.workDays, 0)
    };

    // 월별 세금 계산 (실제 근무시간 고려)
    const monthlyTaxInfo = calculateMonthlyTax(targetUser.taxType || '미신고', monthlyTotal.totalGrossPay, monthlyTotal.totalHours);
    monthlyTotal.taxInfo = monthlyTaxInfo;

    res.json({
      weeklyStats: weeklyStats,
      monthlyTotal: monthlyTotal
    });
  } catch (error) {
    logger.error('Get employee weekly stats error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get all employees weekly statistics for owner
// @route   GET /api/employee/all-weekly-stats
// @access  Private (Owner)
router.get('/all-weekly-stats', protect, authorize('owner'), async (req, res) => {
  try {
    const { month, storeId } = req.query;
    
    if (!month) {
      return res.status(400).json({ message: '월 정보가 필요합니다' });
    }

    // 점포별 직원 조회
    const employeeQuery = { role: 'employee', isActive: true };
    if (storeId) {
      employeeQuery.storeId = storeId;
    }

    const employees = await User.find(employeeQuery)
      .select('_id username hourlyWage taxType workSchedule')
      .sort({ username: 1 });

    if (employees.length === 0) {
      return res.json({
        employeeWeeklyStats: {},
        monthlyTotals: {}
      });
    }

    const [year, monthNum] = month.split('-');
    // 월의 시작은 00:00:00으로 설정하여 해당 월의 모든 일정 포함
    const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    const employeeWeeklyStats = {};
    const monthlyTotals = {};

    // 로컬 날짜 포맷 함수 (상위 스코프에서 정의)
    const formatLocalDate = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // 각 직원별로 주차별 통계 계산
    for (const employee of employees) {
      // 이전 월 정보
      const prevMonth = new Date(startOfMonth);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1, 0, 0, 0, 0);
      const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);
      
      const prevMonthSchedules = await WorkSchedule.find({
        userId: employee._id,
        workDate: { $gte: prevMonthStart, $lte: prevMonthEnd }
      }).sort({ workDate: 1 });

      // 해당 월의 모든 근무 일정 조회
      const schedules = await WorkSchedule.find({
        userId: employee._id,
        workDate: { $gte: startOfMonth, $lte: endOfMonth }
      }).sort({ workDate: 1 });

      // 월별 주차 생성
      const weeklyStats = {};
      const weeksInMonth = getWeeksInMonth(startOfMonth);
      
      // 각 주차별로 초기 데이터 생성
      for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
        const weekRange = getWeekDateRange(startOfMonth, weekNum);
        
        weeklyStats[weekNum] = {
          weekNumber: weekNum,
          startDate: weekRange.startDate,
          endDate: weekRange.endDate,
          totalHours: 0,
          workDays: 0,
          totalPay: 0,
          holidayPay: 0,
          weeklyTotal: 0,
          contractWorkDays: 0,
          absentDays: 0
        };
      }
      
      // 근무 일정을 주차별로 분류하고 근로 정보 계산
      Object.keys(weeklyStats).forEach(weekKey => {
        const weekData = weeklyStats[weekKey];
        const weekInfo = calculateWeeklyWorkInfo(schedules, weekData.startDate, weekData.endDate, employee.hourlyWage || 0, employee.workSchedule);
        
        weekData.totalHours = weekInfo.totalHours;
        weekData.workDays = weekInfo.workDays;
        weekData.contractWorkDays = weekInfo.contractDays;
        weekData.absentDays = weekInfo.absentDays;
        weekData.totalPay = weekInfo.totalPay;
        weekData.hourlyWage = employee.hourlyWage || 0; // 시급 정보 추가
        
        // 실제 스케줄 데이터 추가 (달력보기용)
        // calculateWeeklyWorkInfo와 동일한 로컬 날짜 비교 로직 사용
        weekData.schedules = schedules.filter(schedule => {
          const scheduleDate = new Date(schedule.workDate);
          // 로컬 날짜로 변환하여 비교 (UTC 변환 방지)
          const scheduleDateStr = formatLocalDate(scheduleDate);
          const weekStartStr = formatLocalDate(weekData.startDate);
          const weekEndStr = formatLocalDate(weekData.endDate);
          
          const isIncluded = scheduleDateStr >= weekStartStr && scheduleDateStr <= weekEndStr;
          
          return isIncluded;
        }).map(schedule => ({
          date: schedule.workDate,
          workDate: schedule.workDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          hours: calculateWorkHours(schedule),
          pay: calculateWorkHours(schedule) * (employee.hourlyWage || 0),
          status: schedule.status
        }));
      });

      // MonthlySalary에서 주휴수당 정보 가져오기
      let monthlySalary;
      try {
        monthlySalary = await MonthlySalary.findOne({
          userId: employee._id,
          year: parseInt(year),
          month: parseInt(monthNum)
        });
      } catch (error) {
        logger.error(`MonthlySalary 조회 오류 [${employee.username}]:`, error);
        monthlySalary = null;
      }

      // 주휴수당 계산 및 주별 총액 계산
      Object.keys(weeklyStats).forEach(weekKey => {
        const weekData = weeklyStats[weekKey];
        
        // MonthlySalary에서 해당 주차의 주휴수당 정보 가져오기
        if (monthlySalary && monthlySalary.weeklyDetails && Array.isArray(monthlySalary.weeklyDetails)) {
          // weekData.startDate와 일치하는 주차 찾기
          const weekStartDateStr = formatLocalDate(weekData.startDate);
          const weekDetail = monthlySalary.weeklyDetails.find(week => {
            // weekData.startDate는 Date 객체, week.startDate는 YYYY-MM-DD 문자열
            // formatLocalDate 함수를 사용하여 로컬 날짜로 변환 (UTC 변환 방지)
            const detailStartDate = week.startDate;
            // 주차 번호 또는 시작일로 매칭
            const matchesByDate = weekStartDateStr === detailStartDate;
            const matchesByWeekNumber = week.weekNumber === parseInt(weekKey);
            
            if (matchesByDate || matchesByWeekNumber) {
              console.log(`[주휴수당 매칭] ${employee.username} ${weekKey}주차:`, {
                weekStartDateStr,
                detailStartDate,
                weekNumber: week.weekNumber,
                matchesByDate,
                matchesByWeekNumber,
                holidayPay: week.holidayPay,
                holidayPayStatus: week.holidayPayStatus
              });
            }
            
            return matchesByDate || matchesByWeekNumber;
          });
          
          if (weekDetail) {
            // 계산된 주휴수당이 있으면 표시 (상태와 관계없이)
            if (weekDetail.holidayPayStatus !== 'not_calculated' || weekDetail.holidayPay !== undefined) {
              const adjustedAmount = weekDetail.holidayPayCalculation?.adjusted?.amount;
              weekData.holidayPay = adjustedAmount !== undefined ? adjustedAmount : (weekDetail.holidayPay || 0);
              weekData.holidayPayStatus = weekDetail.holidayPayStatus || 'not_calculated';
              
              // 수정된 정보가 있으면 포함
              if (weekDetail.holidayPayCalculation?.adjusted) {
                weekData.holidayPayAdjustment = {
                  amount: weekDetail.holidayPayCalculation.adjusted.amount,
                  reason: weekDetail.holidayPayCalculation.adjusted.reason,
                  notes: weekDetail.holidayPayCalculation.adjusted.notes
                };
              }
              
              console.log(`[주휴수당 적용] ${employee.username} ${weekKey}주차: ${weekData.holidayPay}원 (상태: ${weekData.holidayPayStatus})`);
            } else {
              // 주차는 찾았지만 주휴수당 정보가 없음
              console.log(`[주휴수당 없음] ${employee.username} ${weekKey}주차: MonthlySalary에 주휴수당 정보 없음`);
            }
          } else {
            // MonthlySalary에 해당 주차 정보가 없음
            const weeklyDetailsList = monthlySalary.weeklyDetails && Array.isArray(monthlySalary.weeklyDetails) 
              ? monthlySalary.weeklyDetails.map(w => `${w.weekNumber}:${w.startDate}`).join(', ')
              : '주차 정보 없음';
            console.log(`[주차 미매칭] ${employee.username} ${weekKey}주차: startDate=${weekStartDateStr}, MonthlySalary의 주차들: ${weeklyDetailsList}`);
          }
          
          // MonthlySalary에 정보가 없거나 매칭되지 않은 경우 기존 로직 사용
          if (!weekDetail || (weekDetail.holidayPayStatus === 'not_calculated' && weekDetail.holidayPay === undefined)) {
            // MonthlySalary에 정보가 없으면 기존 로직 사용
            if (weekData.weekNumber === 1) {
              // 1주차 주휴수당 계산
              const prevLastWeekRange = getPreviousMonthLastWeekRange(prevMonthStart);
              const prevWeekInfo = calculateWeeklyWorkInfo(prevMonthSchedules, prevLastWeekRange.startDate, prevLastWeekRange.endDate, employee.hourlyWage || 0, employee.workSchedule);
              const currentWeekInfo = calculateWeeklyWorkInfo(schedules, weekData.startDate, weekData.endDate, employee.hourlyWage || 0, employee.workSchedule);
              
              weekData.holidayPay = calculateHolidayPay(employee, weekData, weekData.weekNumber, true, prevWeekInfo, currentWeekInfo);
              console.log(`[주휴수당 계산] ${employee.username} ${weekKey}주차 (기존 로직): ${weekData.holidayPay}원`);
            } else {
              // 2주차 이후 주휴수당 계산
              weekData.holidayPay = calculateHolidayPay(employee, weekData, weekData.weekNumber, false);
              console.log(`[주휴수당 계산] ${employee.username} ${weekKey}주차 (기존 로직): ${weekData.holidayPay}원`);
            }
            weekData.holidayPayStatus = 'not_calculated';
          }
        } else {
          // MonthlySalary가 없으면 기존 로직 사용
          console.log(`[MonthlySalary 없음] ${employee.username}: 기존 로직으로 주휴수당 계산`);
          // MonthlySalary가 없으면 기존 로직 사용
          if (weekData.weekNumber === 1) {
            // 1주차 주휴수당 계산
            const prevLastWeekRange = getPreviousMonthLastWeekRange(prevMonthStart);
            const prevWeekInfo = calculateWeeklyWorkInfo(prevMonthSchedules, prevLastWeekRange.startDate, prevLastWeekRange.endDate, employee.hourlyWage || 0, employee.workSchedule);
            const currentWeekInfo = calculateWeeklyWorkInfo(schedules, weekData.startDate, weekData.endDate, employee.hourlyWage || 0, employee.workSchedule);
            
            weekData.holidayPay = calculateHolidayPay(employee, weekData, weekData.weekNumber, true, prevWeekInfo, currentWeekInfo);
          } else {
            // 2주차 이후 주휴수당 계산
            weekData.holidayPay = calculateHolidayPay(employee, weekData, weekData.weekNumber, false);
          }
          weekData.holidayPayStatus = 'not_calculated';
        }
        
        weekData.weeklyTotal = weekData.totalPay + (weekData.holidayPay || 0);
        
        // 주차별 세금 계산 (실제 근무시간 고려)
        const weeklyTaxInfo = calculateWeeklyTax(employee.taxType || '미신고', weekData.weeklyTotal, weekData.totalHours);
        weekData.taxInfo = weeklyTaxInfo;
      });

      // 각 주차 데이터에 employeeId 추가
      Object.keys(weeklyStats).forEach(weekKey => {
        weeklyStats[weekKey].employeeId = employee._id.toString();
      });

      employeeWeeklyStats[employee.username] = weeklyStats;

      // 월별 합계 계산
      const monthlyTotal = {
        totalHours: Object.values(weeklyStats).reduce((sum, week) => sum + week.totalHours, 0),
        totalPay: Object.values(weeklyStats).reduce((sum, week) => sum + week.totalPay, 0),
        totalHolidayPay: Object.values(weeklyStats).reduce((sum, week) => sum + week.holidayPay, 0),
        totalGrossPay: Object.values(weeklyStats).reduce((sum, week) => sum + week.weeklyTotal, 0),
        workDays: Object.values(weeklyStats).reduce((sum, week) => sum + week.workDays, 0)
      };

      // 월별 세금 계산 (실제 근무시간 고려)
      const monthlyTaxInfo = calculateMonthlyTax(employee.taxType || '미신고', monthlyTotal.totalGrossPay, monthlyTotal.totalHours);
      monthlyTotal.taxInfo = monthlyTaxInfo;

      monthlyTotals[employee.username] = monthlyTotal;
    }

    res.json({
      weeklyStats: employeeWeeklyStats,
      employeeWeeklyStats,
      monthlyTotals
    });

  } catch (error) {
    logger.error('Get all employees weekly statistics error:', error);
    console.error('all-weekly-stats API 오류 상세:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      month: req.query.month,
      storeId: req.query.storeId
    });
    
    // 오류 발생 시 상세 정보를 로그에 기록
    if (error.stack) {
      console.error('오류 스택 트레이스:', error.stack);
    }
    
    res.status(500).json({ 
      message: '서버 오류가 발생했습니다',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Update payslip delivery consent
// @route   PUT /api/employee/payslip-consent
// @access  Private (Employee)
router.put('/payslip-consent', protect, authorize('employee', 'manager'), [
  body('consent')
    .isBoolean()
    .withMessage('동의 여부는 true 또는 false여야 합니다'),
  body('deliveryMethod')
    .optional()
    .isIn(['email', 'sms', 'app', 'paper'])
    .withMessage('발송 방법은 email, sms, app, paper 중 하나여야 합니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { consent, deliveryMethod } = req.body;
    
    const updateData = {
      payslipAlternativeConsent: consent,
      payslipAlternativeConsentDate: consent ? new Date() : null
    };
    
    if (deliveryMethod) {
      updateData.payslipDeliveryMethod = deliveryMethod;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    logger.info(`User ${user.username} updated payslip consent: ${consent}, method: ${deliveryMethod}`);

    res.json({
      message: '임금명세서 발송 설정이 업데이트되었습니다',
      payslipSettings: {
        consent: user.payslipAlternativeConsent,
        consentDate: user.payslipAlternativeConsentDate,
        deliveryMethod: user.payslipDeliveryMethod
      }
    });
  } catch (error) {
    logger.error('Update payslip consent error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get payslip delivery settings
// @route   GET /api/employee/payslip-consent
// @access  Private (Employee)
router.get('/payslip-consent', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('payslipAlternativeConsent payslipAlternativeConsentDate payslipDeliveryMethod');

    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    res.json({
      consent: user.payslipAlternativeConsent,
      consentDate: user.payslipAlternativeConsentDate,
      deliveryMethod: user.payslipDeliveryMethod
    });
  } catch (error) {
    logger.error('Get payslip consent error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get welfare points details
// @route   GET /api/employee/welfare-points
// @access  Private (Employee)
router.get('/welfare-points', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 기본값: 9월 15일부터 현재까지
    const welfareStartDate = new Date('2025-09-15');
    const defaultStartDate = welfareStartDate;
    const defaultEndDate = new Date();
    
    const queryStartDate = startDate ? new Date(startDate) : defaultStartDate;
    const queryEndDate = endDate ? new Date(endDate) : defaultEndDate;
    
    // 9월 15일 이전 조회 방지
    if (queryStartDate < welfareStartDate) {
      return res.status(400).json({ 
        message: '복지포인트는 2025년 9월 15일부터 적용됩니다' 
      });
    }

    // 해당 기간의 승인된 근무 일정 조회
    const schedules = await WorkSchedule.find({
      userId: req.user._id,
      workDate: { $gte: queryStartDate, $lte: queryEndDate },
      status: 'approved'
    }).sort({ workDate: 1 });

    // 월별 복지포인트 계산
    const monthlyPoints = {};
    let totalPoints = 0;
    let totalHours = 0;

    schedules.forEach(schedule => {
      const workHours = calculateWorkHours(schedule);
      const monthKey = schedule.workDate.toISOString().substring(0, 7); // YYYY-MM
      
      if (!monthlyPoints[monthKey]) {
        monthlyPoints[monthKey] = {
          month: monthKey,
          totalHours: 0,
          points: 0,
          scheduleCount: 0
        };
      }
      
      monthlyPoints[monthKey].totalHours += workHours;
      monthlyPoints[monthKey].scheduleCount++;
      totalHours += workHours;
    });

    // 각 월별 포인트 계산
    Object.keys(monthlyPoints).forEach(monthKey => {
      const monthData = monthlyPoints[monthKey];
      monthData.totalHours = Math.round(monthData.totalHours * 100) / 100;
      monthData.points = calculateWelfarePoints(monthData.totalHours, new Date(monthKey + '-01'));
      totalPoints += monthData.points;
    });

    // 최초 근로계약서상 근무시간 기준 (9월 15일 첫 주만)
    const firstWeekEndDate = new Date('2025-09-21'); // 9월 15일 첫 주 종료
    let firstWeekPoints = 0;
    
    if (queryStartDate <= firstWeekEndDate) {
      // 사용자의 주간 계약 시간 계산
      const user = await User.findById(req.user._id);
      const contractWeeklyHours = Object.values(user.workSchedule || {})
        .filter(day => day.enabled)
        .reduce((total, day) => {
          const startTime = new Date(`2000-01-01T${day.startTime}:00`);
          const endTime = new Date(`2000-01-01T${day.endTime}:00`);
          
          if (endTime <= startTime) {
            endTime.setDate(endTime.getDate() + 1);
          }
          
          const hours = (endTime - startTime) / (1000 * 60 * 60);
          return total + hours;
        }, 0);
      
      firstWeekPoints = calculateWelfarePoints(contractWeeklyHours, welfareStartDate);
    }

    const monthlyPointsArray = Object.values(monthlyPoints).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        totalPoints: totalPoints + firstWeekPoints,
        firstWeekPoints: firstWeekPoints, // 계약서 기준 첫 주 포인트
        actualWorkPoints: totalPoints // 실제 근무 기준 포인트
      },
      monthlyBreakdown: monthlyPointsArray,
      welfareInfo: {
        pointsPerFourHours: 1700,
        startDate: welfareStartDate,
        description: '4시간 단위로 1700원씩 지급되며, 4시간 이하는 절사됩니다'
      }
    });
  } catch (error) {
    logger.error('Get welfare points error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// 주차 계산을 위한 공통 함수들
function getWeeksInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 1주차: 1일이 속한 주의 월요일부터 일요일까지
  const firstDayOfWeek = firstDay.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  
  // 해당 주의 월요일 찾기
  const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek; // 일요일이면 -6, 월요일이면 0
  const firstWeekStart = new Date(firstDay);
  firstWeekStart.setDate(firstDay.getDate() + daysToMonday);
  
  // 해당 주의 일요일 찾기
  const firstWeekEnd = new Date(firstWeekStart);
  firstWeekEnd.setDate(firstWeekStart.getDate() + 6);
  
  // 첫 번째 주차의 일수
  const firstWeekDays = firstWeekEnd.getDate() - firstWeekStart.getDate() + 1;
  
  // 나머지 일수
  const remainingDays = lastDay.getDate() - firstWeekEnd.getDate();
  
  // 전체 주차 수 계산 (6주차까지 포함)
  const weeks = 1 + Math.ceil(remainingDays / 7);
  
  // 최대 6주차까지 허용
  return Math.min(weeks, 6);
}

// 특정 주차의 시작일과 종료일을 계산하는 공통 함수
function getWeekDateRange(monthStart, weekNumber) {
  if (weekNumber === 1) {
    // 1주차: 해당 월의 1일이 속한 주의 월요일부터 일요일까지
    const firstDay = new Date(monthStart);
    const firstDayOfWeek = firstDay.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
    
    // 해당 주의 월요일 찾기
    const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek; // 일요일이면 -6, 월요일이면 0
    const weekStart = new Date(firstDay);
    weekStart.setDate(firstDay.getDate() + daysToMonday);
    
    // 해당 주의 일요일 찾기
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd)
    };
  } else {
    // 2주차 이후: 이전 주차의 종료일 다음날부터 7일 후
    const prevWeekRange = getWeekDateRange(monthStart, weekNumber - 1);
    const weekStart = new Date(prevWeekRange.endDate);
    weekStart.setDate(prevWeekRange.endDate.getDate() + 1);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    // 마지막 주차인지 확인하고 월의 마지막 날까지만
    const lastDayOfMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12, 0, 0);
    const weeksInMonth = getWeeksInMonth(monthStart);
    
    if (weekNumber === weeksInMonth) {
      // 마지막 주차인 경우 해당월의 마지막날까지만 (실제 주의 나머지는 다음 월 1주차에서 처리)
      const lastWeekEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 12, 0, 0);
      console.log(`마지막 주차 ${weekNumber} 종료일 조정 (월말까지만):`, {
        originalEnd: weekEnd.toISOString().split('T')[0],
        lastDayOfMonth: lastDayOfMonth.toISOString().split('T')[0],
        adjustedEnd: lastWeekEnd.toISOString().split('T')[0],
        note: '실제 주의 나머지는 다음 월 1주차에서 처리'
      });
      return {
        startDate: new Date(weekStart),
        endDate: lastWeekEnd
      };
    } else if (weekEnd > lastDayOfMonth) {
      // 마지막 주차가 아닌데 월의 마지막 날을 넘는 경우 조정
      weekEnd.setDate(lastDayOfMonth.getDate());
    }
    
    return {
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd)
    };
  }
}

// 이전 월의 마지막 주차 계산 함수
function getPreviousMonthLastWeekRange(prevMonthStart) {
  // 시간대 문제를 해결하기 위해 정오 시간으로 설정
  const lastDayOfPrevMonth = new Date(prevMonthStart.getFullYear(), prevMonthStart.getMonth() + 1, 0, 12, 0, 0);
  const lastDayOfWeek = lastDayOfPrevMonth.getDay();
  
  console.log('이전 월 마지막 주차 계산 디버깅:', {
    lastDayOfPrevMonth: lastDayOfPrevMonth.toISOString().split('T')[0],
    lastDayOfWeek,
    isMonday: lastDayOfWeek === 1,
    month: prevMonthStart.getMonth() + 1,
    year: prevMonthStart.getFullYear()
  });
  
  if (lastDayOfWeek === 1) {
    // 마지막 날이 월요일인 경우: 해당 날짜만
    const result = {
      startDate: new Date(lastDayOfPrevMonth),
      endDate: new Date(lastDayOfPrevMonth)
    };
    console.log('마지막 날이 월요일:', {
      startDate: result.startDate.toISOString().split('T')[0],
      endDate: result.endDate.toISOString().split('T')[0]
    });
    return result;
  } else {
    // 마지막 날이 월요일이 아닌 경우: 마지막 월요일부터 마지막 날까지
    const daysToMonday = lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1;
    const weekStart = new Date(lastDayOfPrevMonth);
    weekStart.setDate(lastDayOfPrevMonth.getDate() - daysToMonday);
    
    const result = {
      startDate: new Date(weekStart),
      endDate: new Date(lastDayOfPrevMonth)
    };
    console.log('마지막 주차 계산:', {
      daysToMonday,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: lastDayOfPrevMonth.toISOString().split('T')[0],
      startDate: result.startDate.toISOString().split('T')[0],
      endDate: result.endDate.toISOString().split('T')[0]
    });
    return result;
  }
}

// 기존 주차 계산 함수들은 공통 함수로 대체됨

// 날짜가 해당 월의 몇 주차인지 계산 (공통 함수 사용)
function getWeekNumberInMonth(date, monthStart) {
  const targetDate = new Date(date);
  const targetDateStr = targetDate.toISOString().split('T')[0];
  const weeksInMonth = getWeeksInMonth(monthStart);
  
  // 각 주차의 범위를 확인하여 해당하는 주차 찾기
  for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
    const weekRange = getWeekDateRange(monthStart, weekNum);
    const weekStartStr = weekRange.startDate.toISOString().split('T')[0];
    const weekEndStr = weekRange.endDate.toISOString().split('T')[0];
    
    if (targetDateStr >= weekStartStr && targetDateStr <= weekEndStr) {
      return weekNum;
    }
  }
  
  // 기본값 (마지막 주차)
  return weeksInMonth;
}

// 1주차 주휴수당 계산 (지난 달의 마지막 주차와 현재 주차를 합쳐서 계산, 야간 근로자는 시작일 기준)
function calculateFirstWeekHolidayPay(prevMonthSchedules, currentMonthSchedules, prevMonthStart, currentMonthStart, weekData, hourlyWage, weeklyContractHours) {
  // 지난 달의 마지막 주차 계산 (공통 함수 사용)
  const prevLastWeekRange = getPreviousMonthLastWeekRange(prevMonthStart);
  const prevLastWeekStart = prevLastWeekRange.startDate;
  const prevLastWeekEnd = prevLastWeekRange.endDate;
  
  // 현재 주차의 시작일과 종료일
  const currentWeekStart = new Date(weekData.startDate);
  const currentWeekEnd = new Date(weekData.endDate);
  
  // 지난 달의 마지막 주차 근로 정보 계산 (공통 함수 사용)
  const prevWeekInfo = calculateWeeklyWorkInfo(prevMonthSchedules, prevLastWeekStart, prevLastWeekEnd, hourlyWage, workSchedule);
  
  console.log('지난 달 마지막 주차 계산:', {
    prevLastWeekStart: prevLastWeekStart.toISOString().split('T')[0],
    prevLastWeekEnd: prevLastWeekEnd.toISOString().split('T')[0],
    prevWeekContractDays: prevWeekInfo.contractDays,
    lastDayOfWeek: prevLastWeekEnd.getDay()
  });
  
  // 현재 주차의 근로 정보 계산 (공통 함수 사용)
  const currentWeekInfo = calculateWeeklyWorkInfo(currentMonthSchedules, currentWeekStart, currentWeekEnd, hourlyWage, workSchedule);
  
  // 합계 근무시간과 결근일수
  const totalHours = prevWeekInfo.totalHours + currentWeekInfo.totalHours;
  const totalAbsentDays = prevWeekInfo.absentDays + currentWeekInfo.absentDays;
  
  console.log('주휴수당 계산 상세:', {
    prevWeek: {
      contractDays: prevWeekInfo.contractDays,
      workDays: prevWeekInfo.workDays,
      absentDays: prevWeekInfo.absentDays,
      hours: prevWeekInfo.totalHours
    },
    currentWeek: {
      contractDays: currentWeekInfo.contractDays,
      workDays: currentWeekInfo.workDays,
      absentDays: currentWeekInfo.absentDays,
      hours: currentWeekInfo.totalHours
    },
    total: {
      hours: totalHours,
      absentDays: totalAbsentDays
    }
  });
  
  console.log('1주차 주휴수당 계산 디버깅:', {
    prevWeekHours: prevWeekInfo.totalHours,
    currentWeekHours: currentWeekInfo.totalHours,
    totalHours,
    prevWeekAbsentDays: prevWeekInfo.absentDays,
    currentWeekAbsentDays: currentWeekInfo.absentDays,
    totalAbsentDays,
    hourlyWage,
    prevLastWeekStart: prevLastWeekStart.toISOString().split('T')[0],
    prevLastWeekEnd: prevLastWeekEnd.toISOString().split('T')[0],
    currentWeekStart: currentWeekStart.toISOString().split('T')[0],
    currentWeekEnd: currentWeekEnd.toISOString().split('T')[0]
  });
  
  // 근로계약상 주당 근로시간이 15시간 이상인 경우에만 주휴수당 계산
  if (weeklyContractHours >= 15) {
    const holidayPay = Math.floor((weeklyContractHours / 40) * 8 * (hourlyWage || 0));
    console.log('주휴수당 계산 결과:', { 
      totalHours, 
      contractHours: weeklyContractHours,
      holidayPay 
    });
    return holidayPay;
  }
  
  console.log('주휴수당 미지급 사유:', { 
    totalHours, 
    contractHours: weeklyContractHours,
    reason: '근로계약상 주당 근로시간 15시간 미만'
  });
  return 0;
}

// 통합된 주휴수당 계산 함수
function calculateHolidayPay(employee, weekData, weekNumber, isFirstWeek = false, prevWeekInfo = null, currentWeekInfo = null) {
  // 근로계약상 주당 근로시간 계산
  const weeklyContractHours = calculateWeeklyContractHours(employee.workSchedule);
  
  // 근로계약 정보가 있고 15시간 이상인 경우 근로계약 기준, 그렇지 않으면 실제 근무시간 기준
  const hasValidContract = weeklyContractHours >= 15 && hasValidWorkSchedule(employee.workSchedule);
  
  // 근로계약상 주 15시간 미만 근로자는 주휴수당 미지급
  if (!hasValidContract) {
    console.log(`${weekNumber}주차 주휴수당 미지급:`, {
      reason: '근로계약상 주 15시간 미만 근로자',
      contractHours: weeklyContractHours
    });
    return 0;
  }
  
  if (isFirstWeek) {
    // 1주차: 지난 달의 마지막 주차와 현재 주차를 합쳐서 주휴수당 계산
    const totalHours = prevWeekInfo.totalHours + currentWeekInfo.totalHours;
    const totalAbsentDays = prevWeekInfo.absentDays + currentWeekInfo.absentDays;
    
    console.log('1주차 주휴수당 계산 디버깅:', {
      prevWeekHours: prevWeekInfo.totalHours,
      currentWeekHours: currentWeekInfo.totalHours,
      totalHours,
      totalAbsentDays,
      contractHours: weeklyContractHours,
      hasValidContract
    });
    
    // 근로계약상 요일에 실제로 근무했는지 확인
    // currentWeekInfo에는 schedules가 없으므로 weekData를 사용 (weekData에는 schedules가 있음)
    // 1주차의 경우 prevWeekInfo와 currentWeekInfo를 합쳐서 확인해야 하지만,
    // 현재는 currentWeek만 확인 (weekData의 schedules는 현재 주차만 포함)
    const contractedDaysWorked = checkContractedDaysWorked(weekData, employee.workSchedule);
    
    // 주휴수당 지급 조건: 근로계약상 주 15시간 이상 AND 소정근로일 개근
    const isEligibleForHolidayPay = hasValidContract && contractedDaysWorked.isFullAttendance;
    
    if (!isEligibleForHolidayPay) {
      const reason = !hasValidContract 
        ? '근로계약상 주 15시간 미만'
        : '소정근로일에 개근하지 않음 (결근 발생)';
      console.log('1주차 주휴수당 미지급 사유:', {
        isFullAttendance: contractedDaysWorked.isFullAttendance,
        totalHours,
        contractHours: weeklyContractHours,
        totalAbsentDays,
        hasValidContract,
        reason
      });
      return 0;
    }
    
    // 주휴수당 계산: (근로계약상 주당 근로시간 / 40) * 8 * 시급
    const hoursForCalculation = weeklyContractHours;
    const holidayPay = Math.floor((hoursForCalculation / 40) * 8 * (employee.hourlyWage || 0));
    
    console.log('1주차 주휴수당 계산 결과:', {
      totalHours,
      contractHours: weeklyContractHours,
      hoursForCalculation,
      holidayPay
    });
    return holidayPay;
  } else {
    // 2주차 이후: 근로계약상 요일에 만근했을 때만 주휴수당 지급
    console.log(`${weekNumber}주차 주휴수당 계산:`, {
      actualHours: weekData.totalHours,
      contractHours: weeklyContractHours,
      absentDays: weekData.absentDays,
      hasValidContract
    });
    
    // 근로계약상 요일에 실제로 근무했는지 확인
    const contractedDaysWorked = checkContractedDaysWorked(weekData, employee.workSchedule);
    
    // 주휴수당 지급 조건: 근로계약상 주 15시간 이상 AND 소정근로일 개근
    const isEligibleForHolidayPay = hasValidContract && contractedDaysWorked.isFullAttendance;
    
    if (!isEligibleForHolidayPay) {
      const reason = !hasValidContract 
        ? '근로계약상 주 15시간 미만'
        : '소정근로일에 개근하지 않음 (결근 발생)';
      console.log(`${weekNumber}주차 주휴수당 미지급:`, {
        isFullAttendance: contractedDaysWorked.isFullAttendance,
        actualHours: weekData.totalHours,
        contractHours: weeklyContractHours,
        absentDays: weekData.absentDays,
        hasValidContract,
        reason
      });
      return 0;
    }
    
    // 주휴수당 계산: (근로계약상 주당 근로시간 / 40) * 8 * 시급
    const hoursForCalculation = weeklyContractHours;
    const holidayPay = Math.floor((hoursForCalculation / 40) * 8 * (employee.hourlyWage || 0));
    
    console.log(`${weekNumber}주차 주휴수당 지급:`, {
      actualHours: weekData.totalHours,
      contractHours: weeklyContractHours,
      hoursForCalculation,
      holidayPay
    });
    return holidayPay;
  }
}

// 근로계약상 주당 근로시간 계산 함수
function calculateWeeklyContractHours(workSchedule) {
  if (!workSchedule) {
    console.log('workSchedule이 없음, 기본값 20시간 사용');
    return 20; // 기본값 20시간 (주 15시간 이상 조건 충족)
  }
  
  let totalHours = 0;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  console.log('근로계약 정보:', workSchedule);
  
  days.forEach(day => {
    const daySchedule = workSchedule[day];
    if (daySchedule && daySchedule.enabled) {
      const startTime = new Date(`2000-01-01T${daySchedule.startTime}:00`);
      const endTime = new Date(`2000-01-01T${daySchedule.endTime}:00`);
      
      // 야간근무인 경우 (종료시간이 시작시간보다 이른 경우)
      if (endTime <= startTime) {
        endTime.setDate(endTime.getDate() + 1);
      }
      
      const diffMs = endTime - startTime;
      const hours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      totalHours += hours;
      
      console.log(`${day}: ${daySchedule.startTime} - ${daySchedule.endTime} = ${hours}시간`);
    }
  });
  
  const result = Math.round(totalHours * 100) / 100;
  console.log('계산된 주당 근로시간:', result);
  return result;
}

// 근로계약상 요일 목록 가져오기
function getContractedDays(workSchedule) {
  if (!workSchedule) return [];
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.filter(day => workSchedule[day] && workSchedule[day].enabled);
}

// 근로계약상 요일에 실제로 근무했는지 확인
function checkContractedDaysWorked(weekData, workSchedule) {
  // workSchedules 또는 schedules 속성 모두 확인
  const schedules = weekData.workSchedules || weekData.schedules;
  
  if (!workSchedule || !schedules) {
    console.log('근로계약상 요일 근무 확인 실패:', {
      hasWorkSchedule: !!workSchedule,
      hasSchedules: !!schedules,
      weekDataKeys: Object.keys(weekData)
    });
    return { isFullAttendance: false, workedDays: 0, requiredDays: 0 };
  }
  
  const contractedDays = getContractedDays(workSchedule);
  const requiredDays = contractedDays.length;
  
  if (requiredDays === 0) {
    return { isFullAttendance: false, workedDays: 0, requiredDays: 0 };
  }
  
  let workedDays = 0;
  const dayMapping = {
    'monday': 1,
    'tuesday': 2, 
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 0
  };
  
  // 해당 주의 근무일정에서 근로계약상 요일에 근무한 날 수 계산
  schedules.forEach(schedule => {
    const workDate = new Date(schedule.workDate);
    const dayOfWeek = workDate.getDay();
    const dayName = Object.keys(dayMapping).find(day => dayMapping[day] === dayOfWeek);
    
    if (dayName && contractedDays.includes(dayName)) {
      workedDays++;
    }
  });
  
  const isFullAttendance = workedDays === requiredDays;
  
  console.log('근로계약상 요일 근무 확인:', {
    contractedDays,
    requiredDays,
    workedDays,
    isFullAttendance,
    schedulesCount: schedules?.length || 0,
    scheduleDates: schedules?.map(s => s.workDate) || []
  });
  
  return { isFullAttendance, workedDays, requiredDays };
}

// 근로계약 유효성 검사 함수
function hasValidWorkSchedule(workSchedule) {
  if (!workSchedule) return false;
  
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days.some(day => workSchedule[day] && workSchedule[day].enabled);
}

// 근로계약상 근로시간 계산 함수 (초과근무 제외)
function calculateContractWorkHours(schedule) {
  if (!schedule.startTime || !schedule.endTime) return 0;
  
  const startTime = new Date(`2000-01-01T${schedule.startTime}:00`);
  const endTime = new Date(`2000-01-01T${schedule.endTime}:00`);
  
  // 야간근무인 경우 (종료시간이 시작시간보다 이른 경우)
  if (endTime <= startTime) {
    endTime.setDate(endTime.getDate() + 1);
  }
  
  const diffMs = endTime - startTime;
  const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  
  // 휴식시간 차감
  const breakTime = schedule.breakTime || 0;
  const actualHours = Math.max(0, totalHours - breakTime);
  
  // 근로계약상 근로시간은 8시간을 초과하지 않음 (초과근무 제외)
  return Math.min(actualHours, 8);
}

// 주차별 근로 정보 계산 함수 (근로계약상 근로시간 기준)
function calculateWeeklyWorkInfo(schedules, weekStartDate, weekEndDate, hourlyWage, workSchedule) {
  let totalHours = 0;
  let workDays = 0;
  let contractDays = 0;
  
  console.log('주차별 근로 정보 계산:', {
    weekStartDate: weekStartDate.toISOString().split('T')[0],
    weekEndDate: weekEndDate.toISOString().split('T')[0],
    schedulesCount: schedules.length
  });
  
  // 해당 주의 근로계약서상 근무일수 계산 (사용자별 근무 스케줄 기준)
  for (let d = new Date(weekStartDate); d <= weekEndDate; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[dayOfWeek];
    
    // 사용자의 근무 스케줄에서 해당 요일이 활성화되어 있는지 확인
    if (workSchedule && workSchedule[dayName] && workSchedule[dayName].enabled) {
      contractDays++;
    }
  }
  
  // 해당 주의 실제 근무 시간과 일수 계산 (실제 근로시간 기준)
  // 로컬 날짜 형식으로 변환하는 헬퍼 함수
  const formatLocalDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const weekStartStr = formatLocalDate(weekStartDate);
  const weekEndStr = formatLocalDate(weekEndDate);
  
  schedules.forEach(schedule => {
    const workDate = new Date(schedule.workDate);
    // 로컬 날짜로 변환하여 비교 (UTC 변환 방지)
    const workDateStr = formatLocalDate(workDate);
    
    if (workDateStr >= weekStartStr && workDateStr <= weekEndStr) {
      // 실제 근로시간 계산 (초과근무 포함, 8시간 제한 없음)
      const workHours = calculateWorkHours(schedule);
      totalHours += workHours;
      workDays += 1;
      
      console.log('근무 일정 포함:', {
        workDate: workDateStr,
        workHours,
        dayOfWeek: workDate.getDay(),
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        scheduleId: schedule._id
      });
    } else {
      console.log('근무 일정 제외:', {
        workDate: workDateStr,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        isIncluded: workDateStr >= weekStartStr && workDateStr <= weekEndStr
      });
    }
  });
  
  const absentDays = Math.max(0, contractDays - workDays);
  const totalPay = totalHours * hourlyWage;
  
  console.log('주차별 근로 정보 결과:', {
    totalHours,
    workDays,
    contractDays,
    absentDays,
    totalPay
  });
  
  return {
    totalHours,
    workDays,
    contractDays,
    absentDays,
    totalPay
  };
}

// 다음 월 1주차 주휴수당 계산 (이전 월 마지막 주차 포함)
function calculateNextMonthFirstWeekHolidayPay(schedules, monthStart, hourlyWage) {
  // 이전 월의 마지막 주차 계산 (실제 주의 시작일부터)
  const prevMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1, 12, 0, 0);
  const prevLastWeekRange = getPreviousMonthLastWeekRange(prevMonthStart);
  const prevLastWeekStart = prevLastWeekRange.startDate;
  
  // 이전 월 마지막 주차의 실제 주 시작일 계산 (월요일)
  const prevLastWeekMonday = new Date(prevLastWeekStart);
  const daysToMonday = prevLastWeekStart.getDay() === 0 ? 6 : prevLastWeekStart.getDay() - 1;
  prevLastWeekMonday.setDate(prevLastWeekStart.getDate() - daysToMonday);
  
  // 현재 월의 1주차 계산
  const currentWeekRange = getWeekDateRange(monthStart, 1);
  const currentWeekStart = currentWeekRange.startDate;
  const currentWeekEnd = currentWeekRange.endDate;
  
  // 이전 주차 근무 정보 계산 (실제 주 전체)
  const prevWeekInfo = calculateWeeklyWorkInfo(schedules, prevLastWeekMonday, prevLastWeekStart, hourlyWage, workSchedule);
  
  // 현재 주차 근무 정보 계산
  const currentWeekInfo = calculateWeeklyWorkInfo(schedules, currentWeekStart, currentWeekEnd, hourlyWage, workSchedule);
  
  // 주휴수당 계산을 위한 총 근무시간과 결근일수
  const totalHours = prevWeekInfo.totalHours + currentWeekInfo.totalHours;
  const totalAbsentDays = prevWeekInfo.absentDays + currentWeekInfo.absentDays;
  
  console.log('다음 월 1주차 주휴수당 계산 상세:', {
    prevWeek: {
      contractDays: prevWeekInfo.contractDays,
      workDays: prevWeekInfo.workDays,
      absentDays: prevWeekInfo.absentDays,
      hours: prevWeekInfo.totalHours,
      startDate: prevLastWeekMonday.toISOString().split('T')[0],
      endDate: prevLastWeekStart.toISOString().split('T')[0]
    },
    currentWeek: {
      contractDays: currentWeekInfo.contractDays,
      workDays: currentWeekInfo.workDays,
      absentDays: currentWeekInfo.absentDays,
      hours: currentWeekInfo.totalHours,
      startDate: currentWeekStart.toISOString().split('T')[0],
      endDate: currentWeekEnd.toISOString().split('T')[0]
    },
    total: {
      hours: totalHours,
      absentDays: totalAbsentDays
    }
  });
  
  // 주휴수당 지급 조건 확인
  if (totalAbsentDays > 0) {
    console.log('다음 월 1주차 주휴수당 미지급 사유:', { totalHours, totalAbsentDays, reason: '결근일 존재' });
    return 0;
  }
  
  // 주휴수당 계산: (주간 근로계약상 근로시간 ÷ 40시간) × 8시간 × 시급
  const holidayPay = Math.floor((totalHours / 40) * 8 * hourlyWage);
  console.log('다음 월 1주차 주휴수당 계산 결과:', { totalHours, holidayPay });
  return holidayPay;
}

module.exports = router; 