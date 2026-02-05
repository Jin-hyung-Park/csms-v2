const express = require('express');
const { body, validationResult } = require('express-validator');
const WorkSchedule = require('../models/WorkSchedule');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { updateTaxTypeIfNeeded } = require('../utils/taxCalculator');

const router = express.Router();

// @desc    Create work schedule
// @route   POST /api/work-schedule
// @access  Private (Employee)
router.post('/', protect, authorize('employee', 'manager'), [
  body('workDate').isISO8601().withMessage('올바른 날짜 형식을 입력해주세요'),
  body('endDate').optional().isISO8601().withMessage('올바른 종료일 형식을 입력해주세요'),
  body('storeId').isMongoId().withMessage('올바른 점포를 선택해주세요'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('올바른 시작 시간 형식을 입력해주세요 (HH:MM)'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('올바른 종료 시간 형식을 입력해주세요 (HH:MM)'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('메모는 1000자를 초과할 수 없습니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { workDate, endDate, storeId, startTime, endTime, notes, breakTime } = req.body;

    // Check if schedule already exists for this date
    const existingSchedule = await WorkSchedule.findOne({
      userId: req.user._id,
      workDate: new Date(workDate)
    });

    if (existingSchedule) {
      return res.status(400).json({ message: '해당 날짜에 이미 근무 기록이 있습니다' });
    }

    // Validate time logic
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    
    let actualEndDate = new Date(workDate);
    if (end <= start) {
      // 야간근무인 경우 종료일을 다음날로 설정
      actualEndDate.setDate(actualEndDate.getDate() + 1);
    }

    logger.info('Creating work schedule', {
      userId: req.user._id,
      workDate: new Date(workDate),
      endDate: actualEndDate,
      storeId,
      startTime,
      endTime,
      notes,
      breakTime: breakTime || 0
    });

    // 사용자의 기본 시급 가져오기
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const defaultHourlyWage = user.hourlyWage || 0;

    const workSchedule = await WorkSchedule.create({
      userId: req.user._id,
      storeId,
      workDate: new Date(workDate),
      endDate: endDate ? new Date(endDate) : actualEndDate,
      startTime,
      endTime,
      notes,
      breakTime: breakTime || 0,
      hourlyWage: defaultHourlyWage,
      totalPay: 0 // pre-save 훅에서 자동 계산됨
    });

    logger.info('Work schedule created successfully', { workScheduleId: workSchedule._id });
    res.status(201).json(workSchedule);
  } catch (error) {
    logger.error('Create work schedule error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get all work schedules with filters (Owner only)
// @route   GET /api/work-schedule/all
// @access  Private (Owner)
router.get('/all', protect, authorize('owner'), async (req, res) => {
  try {
    const { page = 1, limit = 10, storeId, employeeId, status } = req.query;

    const query = {};
    
    // 점포별 필터링
    if (storeId && storeId !== 'all') {
      query.storeId = storeId;
    }
    
    // 근로자별 필터링
    if (employeeId && employeeId !== 'all') {
      query.userId = employeeId;
    }
    
    // 상태별 필터링
    if (status && status !== 'all') {
      query.status = status;
    }

    const schedules = await WorkSchedule.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
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
    logger.error('Get all schedules error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get pending work schedules (Owner only)
// @route   GET /api/work-schedule/pending
// @access  Private (Owner)
router.get('/pending', protect, authorize('owner'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const schedules = await WorkSchedule.find({ status: 'pending' })
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await WorkSchedule.countDocuments({ status: 'pending' });

    res.json({
      schedules,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    logger.error('Get pending schedules error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get user's work schedules (or all schedules for owner)
// @route   GET /api/work-schedule
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, month, storeId, employeeName } = req.query;
    
    console.log('=== WorkSchedule GET 요청 ===');
    console.log('사용자 정보:', {
      userId: req.user._id,
      role: req.user.role,
      email: req.user.email
    });
    console.log('쿼리 파라미터:', req.query);
    
    // 점주인 경우 모든 직원의 근무 일정을 조회, 직원인 경우 자신의 일정만 조회
    const query = req.user.role === 'owner' ? {} : { userId: req.user._id };
    
    if (status) query.status = status;
    if (storeId) query.storeId = storeId;
    
    // workLocation 필터링 추가 (직원용)
    if (req.user.role === 'employee' && req.query.workLocation) {
      query.workLocation = req.query.workLocation;
    }
    if (startDate && endDate) {
      query.workDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // 월별 필터링 추가
    if (month) {
      const [year, monthNum] = month.split('-');
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      // 근무 시작일(workDate)이 해당 월에 속하는 근무만 포함
      query.workDate = { $gte: startOfMonth, $lte: endOfMonth };
    }

    let schedules;
    
    // 근로자 이름으로 필터링하는 경우
    if (employeeName && req.user.role === 'owner') {
      // 먼저 해당 이름의 사용자를 찾기
      const User = require('../models/User');
      const users = await User.find({ 
        username: { $regex: employeeName, $options: 'i' },
        role: 'employee'
      });
      
      if (users.length > 0) {
        const userIds = users.map(user => user._id);
        query.userId = { $in: userIds };
      } else {
        // 해당 이름의 사용자가 없으면 빈 결과 반환
        return res.json({
          schedules: [],
          totalPages: 0,
          currentPage: page,
          totalCount: 0
        });
      }
    }

    console.log('최종 쿼리:', JSON.stringify(query, null, 2));
    
    schedules = await WorkSchedule.find(query)
      .populate('userId', 'username email') // 직원 정보 포함
      .populate('storeId', 'name') // 점포 정보 포함
      .sort({ workDate: -1, endDate: -1, createdAt: -1 }) // 최신 날짜순, 같은 날짜면 최신 생성순
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await WorkSchedule.countDocuments(query);
    
    console.log('조회 결과:', {
      schedulesCount: schedules.length,
      totalCount: count,
      page: page,
      limit: limit
    });

    res.json({
      schedules,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    logger.error('Get work schedules error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get work schedule statistics (Owner only)
// @route   GET /api/work-schedule/statistics
// @access  Private (Owner)
router.get('/statistics', protect, authorize('owner'), async (req, res) => {
  try {
    const { storeId, month } = req.query;
    
    // 기본값: 현재 월
    let targetMonth = month;
    if (!targetMonth) {
      const now = new Date();
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const [year, monthNum] = targetMonth.split('-');
    const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    // 해당 월의 모든 근무 일정 조회 (근무 시작일 또는 종료일이 해당 월에 속하는 경우)
    const query = {
      $or: [
        { workDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ]
    };
    
    if (storeId) {
      query.storeId = storeId;
    }
    
    const schedules = await WorkSchedule.find({
      ...query,
      status: 'approved' // 승인된 일정만 통계에 포함
    })
    .populate('userId', 'username email')
    .sort({ workDate: 1, startTime: 1 });

    // 일별 통계 데이터 구성
    const dailyStats = {};
    const employeeStats = {};
    let totalMonthlyHours = 0;
    let totalMonthlyPay = 0;

    // 실제 근무시간 계산 함수
    const calculateWorkHours = (schedule) => {
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
      return Math.max(0, totalHours - breakTime);
    };

    schedules.forEach(schedule => {
      const employeeName = schedule.userId.username;
      
      // 실제 근무시간 계산
      const workHours = calculateWorkHours(schedule);
      const hourlyWage = schedule.hourlyWage || schedule.userId.hourlyWage || 0;
      const pay = workHours * hourlyWage;
      
      // 근무 시작일과 종료일 계산
      const workStartDate = new Date(schedule.workDate);
      const workEndDate = schedule.endDate ? new Date(schedule.endDate) : new Date(schedule.workDate);
      
      // 야간근무인 경우 종료일을 다음날로 설정
      const startTime = new Date(`2000-01-01T${schedule.startTime}:00`);
      const endTime = new Date(`2000-01-01T${schedule.endTime}:00`);
      if (endTime <= startTime) {
        workEndDate.setDate(workEndDate.getDate() + 1);
      }
      
      console.log('Schedule processing:', {
        workStartDate: workStartDate.toISOString().split('T')[0],
        workEndDate: workEndDate.toISOString().split('T')[0],
        employee: employeeName,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        workHours,
        hourlyWage,
        pay
      });
      
      // 근무 시작일 기준으로 통계 추가
      const dateKey = workStartDate.toISOString().split('T')[0];
      
      // 해당 월에 속하는 날짜만 처리
      if (workStartDate >= startOfMonth && workStartDate <= endOfMonth) {
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = {
            date: dateKey,
            dayOfWeek: workStartDate.toLocaleDateString('ko-KR', { weekday: 'long' }),
            employees: [],
            totalHours: 0,
            totalPay: 0
          };
        }
        
        dailyStats[dateKey].employees.push({
          name: employeeName,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          workHours: workHours,
          pay: pay,
          notes: schedule.notes || ''
        });
        
        dailyStats[dateKey].totalHours += workHours;
        dailyStats[dateKey].totalPay += pay;
      }
      
      // 직원별 통계 (실제 근무한 날짜 기준)
      if (!employeeStats[employeeName]) {
        employeeStats[employeeName] = {
          name: employeeName,
          totalHours: 0,
          totalPay: 0,
          workDays: new Set() // 중복 제거를 위해 Set 사용
        };
      }
      
      // 근무 시작일만 Set에 추가
      if (workStartDate >= startOfMonth && workStartDate <= endOfMonth) {
        const dateKeyForStats = workStartDate.toISOString().split('T')[0];
        employeeStats[employeeName].workDays.add(dateKeyForStats);
      }
      
      // 월별 총계 (근무 시간과 급여는 한 번만 추가)
      totalMonthlyHours += workHours;
      totalMonthlyPay += pay;
    });

    // 일별 통계를 날짜순으로 정렬
    const sortedDailyStats = Object.values(dailyStats).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 직원별 통계를 근무시간순으로 정렬 (Set을 배열로 변환)
    const sortedEmployeeStats = Object.values(employeeStats).map(stat => ({
      ...stat,
      workDays: stat.workDays.size // Set의 크기를 사용
    })).sort((a, b) => b.totalHours - a.totalHours);

    res.json({
      workLocation,
      month: targetMonth,
      dailyStats: sortedDailyStats,
      employeeStats: sortedEmployeeStats,
      monthlyTotal: {
        totalHours: totalMonthlyHours,
        totalPay: totalMonthlyPay,
        totalWorkDays: Object.keys(dailyStats).length
      }
    });
  } catch (error) {
    logger.error('Get statistics error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get weekly employee statistics (Owner only)
// @route   GET /api/work-schedule/weekly-stats
// @access  Private (Owner)
router.get('/weekly-stats', protect, authorize('owner'), async (req, res) => {
  try {
    console.log('Weekly stats API called with query:', req.query);
    const { storeId, month } = req.query;
    
    // 기본값: 현재 월
    let targetMonth = month;
    if (!targetMonth) {
      const now = new Date();
      targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    
    console.log('Processing weekly stats for:', { storeId, targetMonth });

    const [year, monthNum] = targetMonth.split('-');
    // 월의 시작은 00:00:00으로 설정하여 해당 월의 모든 일정 포함
    const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    // 이전 월의 마지막 주차 정보 조회 (1주차 주휴수당 계산용)
    const prevMonth = new Date(startOfMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const prevMonthStart = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1, 0, 0, 0, 0);
    const prevMonthEnd = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);

    // storeId가 점포명인지 ObjectId인지 확인하고 처리
    let storeQuery = {};
    if (storeId) {
      // MongoDB ObjectId 형식인지 확인
      const ObjectId = require('mongoose').Types.ObjectId;
      if (ObjectId.isValid(storeId)) {
        // ObjectId인 경우
        storeQuery.storeId = storeId;
      } else {
        // 점포명인 경우, Store 모델에서 해당 점포의 ObjectId를 찾아서 사용
        const Store = require('../models/Store');
        
        // 점포명 매핑
        let storeName = storeId;
        if (storeId === '대치메가점') {
          storeName = 'CU 대치메가점';
        } else if (storeId === '삼성메가점') {
          storeName = 'CU 삼성메가점';
        }
        
        const store = await Store.findOne({ 
          name: storeName, 
          ownerId: req.user._id,
          isActive: true 
        });
        
        if (!store) {
          console.log(`점포를 찾을 수 없습니다: ${storeName}`);
          console.log('사용 가능한 점포들:', await Store.find({ ownerId: req.user._id, isActive: true }).select('name'));
          return res.status(404).json({ message: '점포를 찾을 수 없습니다' });
        }
        
        storeQuery.storeId = store._id;
      }
    }

    // 해당 월의 모든 승인된 근무 일정 조회 (근무 시작일 또는 종료일이 해당 월에 속하는 경우)
    const query = {
      $or: [
        { workDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ],
      status: 'approved',
      ...storeQuery
    };
    
    const schedules = await WorkSchedule.find(query)
    .populate('userId', 'username email hourlyWage workSchedule')
    .sort({ workDate: 1, startTime: 1 });
    
    console.log(`Found ${schedules.length} approved schedules for weekly stats`);

    // 직원별로 데이터 그룹화
    const employeeSchedules = {};
    schedules.forEach(schedule => {
      const employeeName = schedule.userId.username;
      if (!employeeSchedules[employeeName]) {
        employeeSchedules[employeeName] = [];
      }
      employeeSchedules[employeeName].push(schedule);
    });

    // 직원별 주차별 데이터 구성
    const employeeWeeklyStats = {};

    Object.keys(employeeSchedules).forEach(employeeName => {
      const employeeScheds = employeeSchedules[employeeName];
      const employee = employeeScheds[0].userId; // 첫 번째 스케줄에서 직원 정보 가져오기
      
      // 이전 월의 마지막 주차 정보 조회 (1주차 주휴수당 계산용)
      const prevMonthSchedules = employeeScheds.filter(schedule => {
        const scheduleDate = new Date(schedule.workDate);
        return scheduleDate >= prevMonthStart && scheduleDate <= prevMonthEnd;
      });

      // 월별 주차 생성 (실제 주차 수만큼)
      const weeklyStats = {};
      const weeksInMonth = getWeeksInMonth(startOfMonth);
      
      console.log(`=== ${employeeName} 주차 생성 시작 ===`);
      console.log(`요청된 월: ${targetMonth}`);
      console.log(`startOfMonth: ${startOfMonth.toISOString().split('T')[0]}`);
      console.log(`총 주차 수: ${weeksInMonth}`);
      
      // 각 주차별로 초기 데이터 생성
      for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
        console.log(`\n--- ${employeeName} ${weekNum}주차 계산 시작 ---`);
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
          hourlyWage: employee.hourlyWage || 0,
          schedules: []
        };
      }
      
      // 근무 일정을 주차별로 분류하고 근로 정보 계산
      Object.keys(weeklyStats).forEach(weekKey => {
        const weekData = weeklyStats[weekKey];
        const weekInfo = calculateWeeklyWorkInfo(employeeScheds, weekData.startDate, weekData.endDate, employee.hourlyWage || 0);
        
        weekData.totalHours = weekInfo.totalHours;
        weekData.workDays = weekInfo.workDays;
        weekData.totalPay = weekInfo.totalPay;
        weekData.schedules = weekInfo.schedules;
      });

      // 주별 총액 계산 (주휴수당 제거)
      Object.keys(weeklyStats).forEach(weekKey => {
        const weekData = weeklyStats[weekKey];
        
        // 주휴수당을 0으로 설정
        weekData.holidayPay = 0;
        
        // 주별 총액은 기본급만 포함
        weekData.weeklyTotal = weekData.totalPay;
      });

      employeeWeeklyStats[employeeName] = weeklyStats;
    });

    // 월별 총계 및 세금 계산
    const monthlyTotals = {};
    Object.keys(employeeWeeklyStats).forEach(employeeName => {
      const employeeWeeks = employeeWeeklyStats[employeeName];
      const firstSchedule = schedules.find(s => s.userId.username === employeeName);
      const hourlyWage = firstSchedule ? firstSchedule.userId.hourlyWage : 0;
      
      const monthlyTotal = {
        totalHours: Object.values(employeeWeeks).reduce((sum, week) => sum + week.totalHours, 0),
        totalPay: Object.values(employeeWeeks).reduce((sum, week) => sum + week.totalPay, 0),
        totalHolidayPay: 0, // 주휴수당 제거
        totalGrossPay: Object.values(employeeWeeks).reduce((sum, week) => sum + week.totalPay, 0), // 기본급만 포함
        workDays: Object.values(employeeWeeks).reduce((sum, week) => sum + week.workDays, 0),
        taxAmount: 0,
        netPay: 0
      };
      
      // 세금 계산 (3.3%)
      monthlyTotal.taxAmount = Math.round(monthlyTotal.totalGrossPay * 0.033);
      monthlyTotal.netPay = monthlyTotal.totalGrossPay - monthlyTotal.taxAmount;
      
      monthlyTotals[employeeName] = monthlyTotal;
    });

    // 캐시 비활성화
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.json({
      employeeWeeklyStats,
      monthlyTotals
    });
  } catch (error) {
    logger.error('Get weekly stats error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// 주차 수 계산 함수
function getWeeksInMonth(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  // 1주차: 1일부터 해당 주의 일요일까지
  const firstDayOfWeek = firstDay.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일
  const daysToSunday = firstDayOfWeek === 0 ? 0 : 7 - firstDayOfWeek;
  const firstWeekEnd = new Date(firstDay);
  firstWeekEnd.setDate(firstDay.getDate() + daysToSunday);
  
  // 첫 번째 주차의 일수
  const firstWeekDays = firstWeekEnd.getDate() - firstDay.getDate() + 1;
  
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
    // 1주차: 해당 월의 1일부터 해당 주의 일요일까지
    const firstDay = new Date(monthStart);
    const firstDayOfWeek = firstDay.getDay();
    const daysToSunday = firstDayOfWeek === 0 ? 0 : 7 - firstDayOfWeek;
    const weekEnd = new Date(firstDay);
    weekEnd.setDate(firstDay.getDate() + daysToSunday);
    
    return {
      startDate: new Date(firstDay),
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

// 주휴수당 관련 함수 제거됨

// 주차별 근로 정보 계산 함수 (주휴수당 제거)
function calculateWeeklyWorkInfo(schedules, weekStartDate, weekEndDate, hourlyWage) {
  let totalHours = 0;
  let workDays = 0;
  
  console.log('주차별 근로 정보 계산:', {
    weekStartDate: weekStartDate.toISOString().split('T')[0],
    weekEndDate: weekEndDate.toISOString().split('T')[0],
    schedulesCount: schedules.length
  });
  
  const weekScheduleDetails = [];
  
  // 해당 주의 실제 근무 시간과 일수 계산 (근로계약상 근로시간 기준)
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
      // 근로계약상 근로시간 계산 (초과근무 제외)
      const workHours = calculateContractWorkHours(schedule);
      totalHours += workHours;
      workDays += 1;
      
      weekScheduleDetails.push({
        date: schedule.workDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        hours: workHours,
        pay: workHours * hourlyWage
      });
      
      console.log('근무 일정 포함:', {
        workDate: workDateStr,
        workHours,
        dayOfWeek: workDate.getDay(),
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        isIncluded: workDateStr >= weekStartStr && workDateStr <= weekEndStr
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
  
  const totalPay = totalHours * hourlyWage;
  
  console.log('주차별 근로 정보 결과:', {
    totalHours,
    workDays,
    totalPay
  });
  
  return {
    totalHours,
    workDays,
    totalPay,
    schedules: weekScheduleDetails
  };
}

// 주휴수당 관련 함수들 제거됨

// 주휴수당 관련 함수들 제거됨

// @desc    Get specific work schedule
// @route   GET /api/work-schedule/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const schedule = await WorkSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '근무 일정을 찾을 수 없습니다' });
    }

    // Check if user has permission to view this schedule
    if (schedule.userId.toString() !== req.user._id.toString() && req.user.role !== 'owner') {
      return res.status(403).json({ message: '권한이 없습니다' });
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Get work schedule error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Update work schedule
// @route   PUT /api/work-schedule/:id
// @access  Private
router.put('/:id', protect, [
  body('workDate').optional().isISO8601().withMessage('올바른 시작일 형식을 입력해주세요'),
  body('endDate').optional().isISO8601().withMessage('올바른 종료일 형식을 입력해주세요'),
  body('storeId').optional().isMongoId().withMessage('올바른 점포를 선택해주세요'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('올바른 시작 시간 형식을 입력해주세요 (HH:MM)'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('올바른 종료 시간 형식을 입력해주세요 (HH:MM)'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('메모는 1000자를 초과할 수 없습니다'),
  body('hourlyWage').optional().isFloat({ min: 0 }).withMessage('시급은 0 이상의 숫자여야 합니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const schedule = await WorkSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '근무 일정을 찾을 수 없습니다' });
    }

    // Only allow updates if status is pending or if user is owner
    if (schedule.status === 'pending' && req.user.role !== 'owner') {
      return res.status(400).json({ message: '승인 진행중인 일정은 수정할 수 없습니다' });
    }
    if (schedule.status === 'approved' && req.user.role !== 'owner') {
      return res.status(400).json({ message: '승인된 일정은 수정할 수 없습니다' });
    }

    const { workDate, endDate, storeId, startTime, endTime, notes, breakTime, hourlyWage } = req.body;

    // 점주가 수정하는 경우 상태 변경 및 알림 생성
    const isOwnerModification = req.user.role === 'owner' && (
      storeId !== schedule.storeId?.toString() ||
      startTime !== schedule.startTime ||
      endTime !== schedule.endTime ||
      hourlyWage !== schedule.hourlyWage ||
      notes !== schedule.notes
    );

    // 야간근무 여부 확인 및 endDate 자동 설정
    let actualEndDate = endDate ? new Date(endDate) : schedule.endDate;
    if (startTime && endTime) {
      const start = new Date(`2000-01-01T${startTime}:00`);
      const end = new Date(`2000-01-01T${endTime}:00`);
      
      if (end <= start) {
        // 야간근무인 경우 종료일을 다음날로 설정
        const workDateToUse = workDate ? new Date(workDate) : schedule.workDate;
        actualEndDate = new Date(workDateToUse);
        actualEndDate.setDate(actualEndDate.getDate() + 1);
      }
    }

    if (workDate) schedule.workDate = new Date(workDate);
    schedule.endDate = actualEndDate;
    if (storeId) schedule.storeId = storeId;
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;
    if (notes !== undefined) schedule.notes = notes;
    if (breakTime !== undefined) schedule.breakTime = breakTime;
    if (hourlyWage !== undefined) {
      schedule.hourlyWage = hourlyWage;
      // 시급이 변경되면 총 급여도 재계산
      if (schedule.totalHours) {
        schedule.totalPay = schedule.totalHours * hourlyWage;
      }
    }

    // 점주가 수정한 경우 상태를 modified_by_owner로 변경
    if (isOwnerModification) {
      schedule.status = 'modified_by_owner';
      schedule.modificationReason = req.body.modificationReason || '점주에 의해 수정됨';
    }

    const updatedSchedule = await schedule.save();

    // 점주가 수정한 경우 근로자에게 알림 생성
    if (isOwnerModification) {
      const modificationDetails = [];
      if (storeId !== schedule.storeId?.toString()) {
      // 점포 이름을 가져와서 표시
      const Store = require('../models/Store');
      const oldStore = await Store.findById(schedule.storeId);
      const newStore = await Store.findById(storeId);
      modificationDetails.push(`근무점포: ${oldStore?.name || '알 수 없음'} → ${newStore?.name || '알 수 없음'}`);
    }
      if (startTime !== schedule.startTime) modificationDetails.push(`시작시간: ${schedule.startTime} → ${startTime}`);
      if (endTime !== schedule.endTime) modificationDetails.push(`종료시간: ${schedule.endTime} → ${endTime}`);
      if (hourlyWage !== schedule.hourlyWage) modificationDetails.push(`시급: ${schedule.hourlyWage}원 → ${hourlyWage}원`);

      const modificationReason = req.body.modificationReason || '';
      const reasonText = modificationReason ? ` 사유: ${modificationReason}` : '';

      const notification = new Notification({
        userId: schedule.userId,
        title: '근무 일정이 수정되었습니다',
        message: `점주에 의해 근무 일정이 수정되었습니다. 수정된 내용: ${modificationDetails.join(', ')}.${reasonText} 승인을 기다려주세요.`,
        type: 'work_modification',
        priority: 'high',
        relatedScheduleId: schedule._id,
        actionUrl: `/employee/work-schedule`
      });

      await notification.save();
    }

    res.json(updatedSchedule);
  } catch (error) {
    logger.error('Update work schedule error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Delete work schedule
// @route   DELETE /api/work-schedule/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const schedule = await WorkSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '근무 일정을 찾을 수 없습니다' });
    }

    // Only allow deletion if status is pending or if user is owner
    if (schedule.status === 'pending' && req.user.role !== 'owner') {
      return res.status(400).json({ message: '승인 진행중인 일정은 삭제할 수 없습니다' });
    }
    if (schedule.status === 'approved' && req.user.role !== 'owner') {
      return res.status(400).json({ message: '승인된 일정은 삭제할 수 없습니다' });
    }

    await schedule.remove();

    res.json({ message: '근무 일정이 삭제되었습니다' });
  } catch (error) {
    logger.error('Delete work schedule error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});



// @desc    Request approval for work schedule (Employee only)
// @route   PUT /api/work-schedule/:id/request-approval
// @access  Private (Employee)
router.put('/:id/request-approval', protect, authorize('employee', 'manager'), async (req, res) => {
  try {
    const schedule = await WorkSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '근무 일정을 찾을 수 없습니다' });
    }

    // 본인이 작성한 일정인지 확인
    if (schedule.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '본인이 작성한 일정만 요청할 수 있습니다' });
    }

    // 이미 승인된 일정은 요청할 수 없음
    if (schedule.status === 'approved') {
      return res.status(400).json({ message: '이미 승인된 일정입니다' });
    }

    // 상태를 pending으로 변경 (이미 pending이어도 업데이트 시간 갱신)
    schedule.status = 'pending';
    schedule.updatedAt = new Date();
    await schedule.save();

    // 점주에게 알림 생성
    const owners = await require('../models/User').find({ role: 'owner', isActive: true });
    
    for (const owner of owners) {
      await Notification.create({
        userId: owner._id,
        title: '근무 시간 승인 요청',
        message: `${req.user.username}님이 ${schedule.workDate.toLocaleDateString()} 근무 시간 승인을 요청했습니다.`,
        type: 'work_approval_request',
        relatedScheduleId: schedule._id,
        priority: 'high'
      });
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Request approval error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Approve/Reject/Modify work schedule (Owner only)
// @route   PUT /api/work-schedule/:id/approve
// @access  Private (Owner)
router.put('/:id/approve', protect, authorize('owner'), [
  body('action').isIn(['approve', 'reject', 'modify']).withMessage('올바른 액션을 선택해주세요'),
  body('rejectionReason').optional().isLength({ max: 500 }).withMessage('거절 사유는 500자를 초과할 수 없습니다'),
  body('modificationReason').optional().isLength({ max: 500 }).withMessage('수정 사유는 500자를 초과할 수 없습니다'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('올바른 시작 시간 형식을 입력해주세요 (HH:MM)'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('올바른 종료 시간 형식을 입력해주세요 (HH:MM)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { action, rejectionReason, modificationReason, startTime, endTime } = req.body;

    const schedule = await WorkSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '근무 일정을 찾을 수 없습니다' });
    }

    if (schedule.status !== 'pending') {
      return res.status(400).json({ message: '승인 대기 중인 일정만 처리할 수 있습니다' });
    }

    let notificationTitle = '';
    let notificationMessage = '';

    switch (action) {
      case 'approve':
        schedule.status = 'approved';
        schedule.approvedBy = req.user._id;
        schedule.approvedAt = new Date();
        notificationTitle = '근무 시간 승인';
        notificationMessage = `${schedule.workDate.toLocaleDateString()} 근무 시간이 승인되었습니다.`;
        break;

      case 'reject':
        schedule.status = 'rejected';
        schedule.rejectionReason = rejectionReason || '';
        notificationTitle = '근무 시간 거절';
        notificationMessage = `${schedule.workDate.toLocaleDateString()} 근무 시간이 거절되었습니다.${rejectionReason ? ` 사유: ${rejectionReason}` : ''}`;
        break;

      case 'modify':
        if (!startTime || !endTime) {
          return res.status(400).json({ message: '수정 시에는 시작 시간과 종료 시간을 모두 입력해주세요' });
        }
        schedule.status = 'modified';
        schedule.startTime = startTime;
        schedule.endTime = endTime;
        schedule.modificationReason = modificationReason || '';
        notificationTitle = '근무 시간 수정';
        notificationMessage = `${schedule.workDate.toLocaleDateString()} 근무 시간이 수정되었습니다.${modificationReason ? ` 사유: ${modificationReason}` : ''}`;
        break;
    }

    // 승인 처리 시 storeId가 없으면 사용자의 점포 정보를 가져와서 설정
    if (!schedule.storeId) {
      const user = await require('../models/User').findById(schedule.userId);
      if (user && user.storeId) {
        schedule.storeId = user.storeId;
      }
    }
    
    await schedule.save();

    // Create notification
    await Notification.create({
      userId: schedule.userId,
      title: notificationTitle,
      message: notificationMessage,
      type: action === 'approve' ? 'work_approval' : action === 'reject' ? 'work_rejection' : 'work_modification',
      relatedScheduleId: schedule._id,
      priority: 'high'
    });

    // 승인된 경우 세금 신고 유형 자동 업데이트
    if (action === 'approve') {
      await updateTaxTypeIfNeeded(schedule.userId, schedule.workDate);
    }

    res.json(schedule);
  } catch (error) {
    logger.error('Approve work schedule error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Approve modified work schedule by owner (Owner only)
// @route   PUT /api/work-schedule/:id/approve-modification
// @access  Private (Owner)
router.put('/:id/approve-modification', protect, authorize('owner'), async (req, res) => {
  try {
    const schedule = await WorkSchedule.findById(req.params.id);
    
    if (!schedule) {
      return res.status(404).json({ message: '근무 일정을 찾을 수 없습니다' });
    }

    if (schedule.status !== 'modified_by_owner') {
      return res.status(400).json({ message: '점주가 수정한 일정만 승인할 수 있습니다' });
    }

    // 상태를 approved로 변경
    schedule.status = 'approved';
    schedule.approvedBy = req.user._id;
    schedule.approvedAt = new Date();

    await schedule.save();

    // 근로자에게 승인 알림 생성
    await Notification.create({
      userId: schedule.userId,
      title: '수정된 근무 일정 승인',
      message: `점주가 수정한 ${schedule.workDate.toLocaleDateString()} 근무 일정이 승인되었습니다.`,
      type: 'work_approval',
      relatedScheduleId: schedule._id,
      priority: 'high'
    });

    // 승인된 경우 세금 신고 유형 자동 업데이트
    await updateTaxTypeIfNeeded(schedule.userId, schedule.workDate);

    res.json(schedule);
  } catch (error) {
    logger.error('Approve modification error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Bulk approve work schedules (Owner only)
// @route   POST /api/work-schedule/bulk-approve
// @access  Private (Owner)
router.post('/bulk-approve', protect, authorize('owner'), [
  body('scheduleIds').isArray({ min: 1 }).withMessage('승인할 일정 ID 목록을 입력해주세요'),
  body('scheduleIds.*').isMongoId().withMessage('올바른 일정 ID 형식이 아닙니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { scheduleIds, storeId, month } = req.body;
    const userId = req.user._id;

    logger.info('Bulk approve request', {
      userId,
      scheduleIds: scheduleIds.length,
      storeId,
      month
    });

    // 승인할 일정들을 조회
    const schedules = await WorkSchedule.find({
      _id: { $in: scheduleIds },
      status: 'pending'
    }).populate('userId', 'name email');

    if (schedules.length === 0) {
      return res.status(404).json({ message: '승인할 수 있는 일정이 없습니다' });
    }

    // 일괄 승인 처리
    const updatePromises = schedules.map(schedule => {
      schedule.status = 'approved';
      schedule.approvedBy = userId;
      schedule.approvedAt = new Date();
      return schedule.save();
    });

    await Promise.all(updatePromises);

    // 알림 생성
    const notificationPromises = schedules.map(async (schedule) => {
      const notification = new Notification({
        userId: schedule.userId._id,
        type: 'work_approval',
        title: '근무 일정이 승인되었습니다',
        message: `${schedule.workDate.toLocaleDateString('ko-KR')} 근무 일정이 승인되었습니다.`,
        data: {
          scheduleId: schedule._id,
          workDate: schedule.workDate,
          status: 'approved'
        }
      });
      return notification.save();
    });

    await Promise.all(notificationPromises);

    logger.info('Bulk approve completed', {
      userId,
      approvedCount: schedules.length,
      scheduleIds
    });

    res.json({
      message: `${schedules.length}개의 일정이 승인되었습니다`,
      approvedCount: schedules.length,
      schedules: schedules.map(schedule => ({
        id: schedule._id,
        workDate: schedule.workDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        employeeName: schedule.userId.name
      }))
    });

  } catch (error) {
    logger.error('Bulk approve error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 