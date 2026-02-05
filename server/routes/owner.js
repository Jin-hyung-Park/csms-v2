const express = require('express');
const { body, validationResult } = require('express-validator');
const { format } = require('date-fns');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const { calculateWorkHours, calculateOvertimeHours, calculateSalary, calculateWelfarePoints } = require('../utils/workHoursCalculator');

const router = express.Router();

// @desc    Get owner dashboard data
// @route   GET /api/owner/dashboard
// @access  Private (Owner)
router.get('/dashboard', protect, authorize('owner'), async (req, res) => {
  try {
    const { storeId } = req.query;
    
    // Build query based on storeId
    const employeeQuery = { role: 'employee', isActive: true };
    const scheduleQuery = {};
    
    if (storeId) {
      employeeQuery.storeId = storeId;
      scheduleQuery.storeId = storeId;
    }
    
    // Get total employees count
    const totalEmployees = await User.countDocuments(employeeQuery);

    // Get new employees this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newEmployeesQuery = {
      role: 'employee',
      isActive: true,
      createdAt: { $gte: startOfMonth }
    };
    
    if (storeId) {
      newEmployeesQuery.storeId = storeId;
    }

    const newEmployeesThisMonth = await User.countDocuments(newEmployeesQuery);

    // Get this month's total work hours
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const monthlySchedulesQuery = {
      $or: [
        { workDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ],
      status: 'approved'
    };
    
    if (storeId) {
      monthlySchedulesQuery.storeId = storeId;
    }

    const monthlySchedules = await WorkSchedule.find(monthlySchedulesQuery);

    const totalWorkHours = monthlySchedules.reduce((sum, schedule) => sum + schedule.totalHours, 0);

    // Get recent activities
    const recentActivitiesQuery = {};
    if (storeId) {
      recentActivitiesQuery.storeId = storeId;
    }
    
    const recentActivities = await WorkSchedule.find(recentActivitiesQuery)
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .limit(5)
      .then(schedules => schedules.map(schedule => ({
        title: `${schedule.userId.username}의 근무 시간 ${getStatusLabel(schedule.status)}`,
        description: `${format(new Date(schedule.workDate), 'MM월 dd일')} ${schedule.startTime}-${schedule.endTime} (${schedule.totalHours}시간)`,
        timestamp: schedule.createdAt
      })));

    const response = {
      totalEmployees,
      newEmployeesThisMonth,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      recentActivities
    };

    res.json(response);
  } catch (error) {
    logger.error('Get owner dashboard error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// Helper function for status labels
const getStatusLabel = (status) => {
  switch (status) {
    case 'approved':
      return '승인됨';
    case 'pending':
      return '승인 대기';
    case 'rejected':
      return '거절됨';
    case 'modified':
      return '수정됨';
    default:
      return '알 수 없음';
  }
};

// Helper function to calculate weekly work hours from workSchedule
const calculateWeeklyWorkHours = (workSchedule) => {
  if (!workSchedule) return 0;
  
  let totalHours = 0;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  days.forEach(day => {
    if (workSchedule[day] && workSchedule[day].enabled) {
      const startTime = workSchedule[day].startTime;
      const endTime = workSchedule[day].endTime;
      
      if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        // 야간 근무 처리 (종료시간이 시작시간보다 작은 경우)
        if (end < start) {
          end.setDate(end.getDate() + 1);
        }
        
        const hours = (end - start) / (1000 * 60 * 60);
        totalHours += hours;
      }
    }
  });
  
  return totalHours;
};

// Helper function to determine tax type based on weekly work hours
const determineTaxType = (weeklyHours) => {
  if (weeklyHours < 15) {
    return '주15시간미만';
  } else {
    return '사업자소득(3.3%)';
  }
};

// @desc    Get all employees
// @route   GET /api/owner/employees
// @access  Private (Owner)
router.get('/employees', protect, authorize('owner'), async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive, storeId } = req.query;
    
    const query = { role: 'employee' };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (storeId) {
      query.storeId = storeId;
    }

    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(query);

    res.json({
      employees,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalCount: count
    });
  } catch (error) {
    logger.error('Get employees error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employees for filter (simplified list)
// @route   GET /api/owner/employees/filter
// @access  Private (Owner)
router.get('/employees/filter', protect, authorize('owner'), async (req, res) => {
  try {
    const { storeId } = req.query;
    
    const query = { role: 'employee', isActive: true };
    if (storeId) {
      query.storeId = storeId;
    }

    const employees = await User.find(query)
      .select('_id username email')
      .sort({ username: 1 })
      .exec();

    res.json(employees);
  } catch (error) {
    logger.error('Get employees for filter error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employee details
// @route   GET /api/owner/employees/:id
// @access  Private (Owner)
router.get('/employees/:id', protect, authorize('owner'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id).select('-password');
    
    if (!employee) {
      return res.status(404).json({ message: '근로자를 찾을 수 없습니다' });
    }

    if (employee.role !== 'employee') {
      return res.status(400).json({ message: '근로자가 아닙니다' });
    }

    // Get employee's work schedules
    const schedules = await WorkSchedule.find({ userId: employee._id })
      .sort({ workDate: -1 })
      .limit(20);

    // Get employee's notifications
    const notifications = await Notification.find({ userId: employee._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      employee,
      schedules,
      notifications
    });
  } catch (error) {
    logger.error('Get employee details error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Update employee information
// @route   PUT /api/owner/employees/:id
// @access  Private (Owner)
router.put('/employees/:id', protect, authorize('owner'), [
  body('hourlyWage').optional().isFloat({ min: 0 }).withMessage('시급은 0 이상이어야 합니다'),
  body('taxType').optional().isIn(['미신고', '주15시간미만', '사업자소득(3.3%)']).withMessage('올바른 세금 신고 유형을 선택해주세요'),
  body('isActive').optional().isBoolean().withMessage('활성화 상태는 boolean 값이어야 합니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { hourlyWage, taxType, isActive } = req.body;

    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: '근로자를 찾을 수 없습니다' });
    }

    if (employee.role !== 'employee') {
      return res.status(400).json({ message: '근로자가 아닙니다' });
    }

    // Update fields
    if (hourlyWage !== undefined) employee.hourlyWage = hourlyWage;
    if (taxType) employee.taxType = taxType;
    if (isActive !== undefined) employee.isActive = isActive;

    const updatedEmployee = await employee.save();

    res.json({
      _id: updatedEmployee._id,
      username: updatedEmployee.username,
      email: updatedEmployee.email,
      role: updatedEmployee.role,
      hourlyWage: updatedEmployee.hourlyWage,
      taxType: updatedEmployee.taxType,
      isActive: updatedEmployee.isActive,
      profileImage: updatedEmployee.profileImage,
      phoneNumber: updatedEmployee.phoneNumber,
      address: updatedEmployee.address,
      emergencyContact: updatedEmployee.emergencyContact
    });
  } catch (error) {
    logger.error('Update employee error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employee work statistics
// @route   GET /api/owner/employees/:id/statistics
// @access  Private (Owner)
router.get('/employees/:id/statistics', protect, authorize('owner'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const employee = await User.findById(req.params.id);
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ message: '근로자를 찾을 수 없습니다' });
    }

    const query = { userId: employee._id };
    
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
      averageHoursPerDay: 0,
      estimatedPay: 0,
      regularPay: 0,
      overtimePay: 0,
      weeklyAllowance: 0,
      welfarePoints: 0
    };

    // 승인된 일정만 급여 계산에 사용
    const approvedSchedules = schedules.filter(schedule => schedule.status === 'approved');
    
    schedules.forEach(schedule => {
      // 공통 함수를 사용한 근무시간 계산
      const workHours = calculateWorkHours(schedule);
      const overtimeHours = calculateOvertimeHours(workHours);
      
      stats.totalHours += workHours;
      stats.totalOvertime += overtimeHours;
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

    // 승인된 일정의 총 근무시간으로 주휴수당 계산
    const approvedTotalHours = approvedSchedules.reduce((sum, schedule) => {
      return sum + calculateWorkHours(schedule);
    }, 0);
    
    const approvedTotalOvertime = approvedSchedules.reduce((sum, schedule) => {
      const workHours = calculateWorkHours(schedule);
      return sum + calculateOvertimeHours(workHours);
    }, 0);

    // 주휴수당 계산 (주 15시간 이상 근무시)
    const weeklyAllowance = approvedTotalHours >= 15 ? 8 * employee.hourlyWage : 0;
    
    // 급여 상세 계산 (승인된 일정만)
    const salaryDetails = calculateSalary(approvedTotalHours, approvedTotalOvertime, weeklyAllowance, employee.hourlyWage);
    
    // 복지포인트 계산
    const welfarePoints = calculateWelfarePoints(approvedTotalHours);

    if (stats.totalDays > 0) {
      stats.averageHoursPerDay = Math.round((stats.totalHours / stats.totalDays) * 100) / 100;
    }

    // 최종 통계 (소수점 2자리)
    stats.totalHours = Math.round(stats.totalHours * 100) / 100;
    stats.totalOvertime = Math.round(stats.totalOvertime * 100) / 100;
    stats.estimatedPay = salaryDetails.totalPay;
    stats.regularPay = salaryDetails.regularPay;
    stats.overtimePay = salaryDetails.overtimePay;
    stats.weeklyAllowance = salaryDetails.weeklyAllowance;
    stats.welfarePoints = welfarePoints;

    res.json(stats);
  } catch (error) {
    logger.error('Get employee statistics error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get all work schedules (Owner view)
// @route   GET /api/owner/schedules
// @access  Private (Owner)
router.get('/schedules', protect, authorize('owner'), async (req, res) => {
  try {
    const { page = 1, limit = 10, status, employeeId, startDate, endDate, storeId, month, workLocation } = req.query;
    
    console.log('=== Owner Schedules API 호출 ===');
    console.log('사용자 정보:', {
      userId: req.user._id,
      role: req.user.role,
      email: req.user.email
    });
    console.log('쿼리 파라미터:', req.query);
    
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (employeeId) query.userId = employeeId;
    if (storeId) query.storeId = new mongoose.Types.ObjectId(storeId);
    if (workLocation && workLocation !== 'all') query.workLocation = workLocation;
    
    // 월별 필터링
    if (month) {
      const [year, monthNum] = month.split('-');
      // 월의 시작은 00:00:00으로 설정하여 해당 월의 모든 일정 포함
      const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
      const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      query.$or = [
        { workDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { endDate: { $gte: startOfMonth, $lte: endOfMonth } }
      ];
    } else if (startDate && endDate) {
      query.workDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    console.log('최종 쿼리:', JSON.stringify(query, null, 2));
    console.log('storeId 타입 확인:', typeof query.storeId, query.storeId);
    console.log('실제 MongoDB 쿼리 테스트:');
    console.log('- storeId만으로 조회:', await WorkSchedule.countDocuments({ storeId: query.storeId }));
    console.log('- 전체 조건으로 조회:', await WorkSchedule.countDocuments(query));
    
    // 데이터베이스의 실제 데이터 확인
    const allSchedules = await WorkSchedule.find({}).limit(3);
    console.log('데이터베이스의 모든 근무 일정 (최대 3개):');
    allSchedules.forEach((schedule, index) => {
      console.log(`${index + 1}. ID: ${schedule._id}, storeId: ${schedule.storeId}, workDate: ${schedule.workDate}`);
    });
    
    // ObjectId 비교 테스트
    const testStoreId = new mongoose.Types.ObjectId('68a07f118e5774892af51d10');
    console.log('ObjectId 비교 테스트:');
    console.log('- 서버에서 생성한 ObjectId:', testStoreId);
    console.log('- 첫 번째 스케줄의 storeId:', allSchedules[0]?.storeId);
    console.log('- 두 ObjectId가 같은지:', testStoreId.equals(allSchedules[0]?.storeId));
    
    const schedules = await WorkSchedule.find(query)
      .populate('userId', 'username email hourlyWage workLocation')
      .populate('approvedBy', 'username')
      .populate('storeId', 'name')
      .sort({ workDate: -1 })
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
      currentPage: parseInt(page),
      totalCount: count
    });
  } catch (error) {
    logger.error('Get owner schedules error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get overall statistics
// @route   GET /api/owner/statistics
// @access  Private (Owner)
router.get('/statistics', protect, authorize('owner'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.workDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const schedules = await WorkSchedule.find(query).populate('userId', 'hourlyWage');
    
    const stats = {
      totalHours: 0,
      totalOvertime: 0,
      totalDays: 0,
      totalPay: 0,
      approvedDays: 0,
      pendingDays: 0,
      rejectedDays: 0,
      employeeStats: {}
    };

    schedules.forEach(schedule => {
      stats.totalHours += schedule.totalHours;
      stats.totalOvertime += schedule.overtimeHours || 0;
      stats.totalDays++;
      
      // Calculate pay for approved schedules
      if (schedule.status === 'approved' && schedule.userId.hourlyWage) {
        stats.totalPay += schedule.totalHours * schedule.userId.hourlyWage;
      }
      
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

      // Employee specific stats
      const employeeId = schedule.userId._id.toString();
      if (!stats.employeeStats[employeeId]) {
        stats.employeeStats[employeeId] = {
          totalHours: 0,
          totalDays: 0,
          totalPay: 0
        };
      }
      stats.employeeStats[employeeId].totalHours += schedule.totalHours;
      stats.employeeStats[employeeId].totalDays++;
      if (schedule.status === 'approved' && schedule.userId.hourlyWage) {
        stats.employeeStats[employeeId].totalPay += schedule.totalHours * schedule.userId.hourlyWage;
      }
    });

    stats.totalHours = Math.round(stats.totalHours * 100) / 100;
    stats.totalOvertime = Math.round(stats.totalOvertime * 100) / 100;
    stats.totalPay = Math.round(stats.totalPay);

    res.json(stats);
  } catch (error) {
    logger.error('Get owner statistics error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get all employees with contract information
// @route   GET /api/owner/employee-contracts
// @access  Private (Owner)
router.get('/employee-contracts', protect, authorize('owner'), async (req, res) => {
  try {
    const { storeId } = req.query;
    
    const query = { role: { $in: ['employee', 'manager'] } };
    if (storeId) {
      query.storeId = storeId;
    }

    const employees = await User.find(query)
      .populate('storeId', 'name address')
      .select('username role storeId hourlyWage hireDate taxType ssn isActive workSchedule')
      .sort({ username: 1 });

    // Get work schedule information for each employee
    const employeesWithSchedules = await Promise.all(
      employees.map(async (employee) => {
        const schedules = await WorkSchedule.find({ userId: employee._id })
          .sort({ workDate: 1 })
          .limit(30); // 최근 30일간의 스케줄

        // 회원가입 시 작성된 근무요일 및 시간 정보 추출
        const workSchedule = employee.workSchedule || {};
        const enabledDays = [];
        const dayLabels = {
          monday: '월',
          tuesday: '화', 
          wednesday: '수',
          thursday: '목',
          friday: '금',
          saturday: '토',
          sunday: '일'
        };

        // 활성화된 요일들 추출
        Object.keys(workSchedule).forEach(day => {
          if (workSchedule[day] && workSchedule[day].enabled) {
            enabledDays.push(dayLabels[day]);
          }
        });

        // 주간 근무시간 계산
        const weeklyWorkHours = calculateWeeklyWorkHours(workSchedule);
        
        // 세금 신고유형 자동 결정 (기존 값이 '미신고'가 아닌 경우에만)
        let taxType = employee.taxType;
        if (employee.taxType === '미신고' && weeklyWorkHours > 0) {
          taxType = determineTaxType(weeklyWorkHours);
        }

        // 근무시간 정보 추출 (첫 번째 활성화된 요일 기준)
        let workTimeInfo = '정보 없음';
        const firstEnabledDay = Object.keys(workSchedule).find(day => 
          workSchedule[day] && workSchedule[day].enabled
        );
        
        if (firstEnabledDay && workSchedule[firstEnabledDay]) {
          const schedule = workSchedule[firstEnabledDay];
          workTimeInfo = `${schedule.startTime}-${schedule.endTime}`;
        }

        return {
          _id: employee._id,
          username: employee.username,
          role: employee.role,
          storeId: employee.storeId,
          storeName: employee.storeId?.name || '점포 미지정',
          hourlyWage: employee.hourlyWage,
          hireDate: employee.hireDate,
          taxType: taxType,
          ssn: employee.ssn,
          weeklyWorkHours: weeklyWorkHours,
          isActive: employee.isActive,
          workSchedule: employee.workSchedule,
          workDays: enabledDays.join(', ') || '정보 없음',
          avgWorkTime: workTimeInfo
        };
      })
    );

    res.json(employeesWithSchedules);
  } catch (error) {
    logger.error('Get employee contracts error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Update employee contract information
// @route   PUT /api/owner/employee-contracts/:id
// @access  Private (Owner)
router.put('/employee-contracts/:id', protect, authorize('owner'), [
  body('role').optional().isIn(['employee', 'manager', 'owner']).withMessage('올바른 역할을 선택해주세요'),
  body('hourlyWage').optional().isFloat({ min: 0 }).withMessage('시급은 0 이상이어야 합니다'),
  body('taxType').optional().isIn(['미신고', '주15시간미만', '사업자소득(3.3%)']).withMessage('올바른 세금 신고 유형을 선택해주세요'),
  body('storeId').optional().isMongoId().withMessage('올바른 점포를 선택해주세요'),
  body('ssn').optional().matches(/^\d{6}-\d{7}$|^$|^정보 없음$/).withMessage('올바른 주민번호 형식을 입력해주세요 (000000-0000000)'),
  body('workSchedule').optional().isObject().withMessage('근로일 설정이 올바르지 않습니다'),
  body('hireDate').optional().isISO8601().withMessage('올바른 입사일을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role, hourlyWage, taxType, storeId, ssn, workSchedule, hireDate } = req.body;

    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: '근로자를 찾을 수 없습니다' });
    }

    // 역할 업데이트 (점주만 가능)
    if (role && req.user.role === 'owner') {
      employee.role = role;
    }

    // Update fields
    if (hourlyWage !== undefined) employee.hourlyWage = hourlyWage;
    if (storeId) employee.storeId = storeId;
    if (ssn !== undefined) employee.ssn = ssn;
    if (workSchedule) employee.workSchedule = workSchedule;
    if (hireDate) employee.hireDate = new Date(hireDate);
    
    // 세금 신고유형 처리
    if (taxType) {
      // 점주가 직접 수정한 경우
      employee.taxType = taxType;
    } else if (workSchedule) {
      // workSchedule이 변경된 경우 자동으로 세금 신고유형 재계산
      const weeklyWorkHours = calculateWeeklyWorkHours(workSchedule);
      if (weeklyWorkHours > 0) {
        employee.taxType = determineTaxType(weeklyWorkHours);
      }
    }

    const updatedEmployee = await employee.save();

    res.json({
      _id: updatedEmployee._id,
      username: updatedEmployee.username,
      role: updatedEmployee.role,
              storeId: updatedEmployee.storeId,
        storeName: updatedEmployee.storeId ? '점포 정보' : '점포 미지정',
      hourlyWage: updatedEmployee.hourlyWage,
      taxType: updatedEmployee.taxType,
      ssn: updatedEmployee.ssn,
      workSchedule: updatedEmployee.workSchedule,
      hireDate: updatedEmployee.hireDate,
      isActive: updatedEmployee.isActive
    });
  } catch (error) {
    logger.error('Update employee contract error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Terminate employee (set termination date)
// @route   PUT /api/owner/employee-contracts/:id/terminate
// @access  Private (Owner)
router.put('/employee-contracts/:id/terminate', protect, authorize('owner'), [
  body('terminationDate').isISO8601().withMessage('올바른 퇴사일을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { terminationDate } = req.body;

    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: '근로자를 찾을 수 없습니다' });
    }

    if (employee.role !== 'employee') {
      return res.status(400).json({ message: '근로자가 아닙니다' });
    }

    employee.terminationDate = new Date(terminationDate);
    employee.isActive = false;

    const updatedEmployee = await employee.save();

    res.json({
      _id: updatedEmployee._id,
      username: updatedEmployee.username,
      terminationDate: updatedEmployee.terminationDate,
      isActive: updatedEmployee.isActive
    });
  } catch (error) {
    logger.error('Terminate employee error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Delete employee and all related data
// @route   DELETE /api/owner/employee-contracts/:id
// @access  Private (Owner)
router.delete('/employee-contracts/:id', protect, authorize('owner'), async (req, res) => {
  try {
    const employee = await User.findById(req.params.id);
    
    if (!employee) {
      return res.status(404).json({ message: '근로자를 찾을 수 없습니다' });
    }

    if (employee.role === 'owner') {
      return res.status(400).json({ message: '점주는 삭제할 수 없습니다' });
    }

    // 관련된 모든 데이터 삭제
    const employeeId = employee._id;
    
    // 1. 근무 일정 삭제
    await WorkSchedule.deleteMany({ userId: employeeId });
    
    // 2. 알림 삭제
    await Notification.deleteMany({ userId: employeeId });
    
    // 3. 사용자 삭제
    await User.findByIdAndDelete(employeeId);

    logger.info(`Employee ${employee.username} (${employeeId}) and all related data deleted by owner ${req.user.username}`);

    res.json({ 
      message: '근로자와 관련된 모든 데이터가 삭제되었습니다',
      deletedEmployee: {
        _id: employee._id,
        username: employee.username,
        role: employee.role
      }
    });
  } catch (error) {
    logger.error('Delete employee error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Download monthly salary report as Excel
// @route   GET /api/owner/salary-report/excel
// @access  Private (Owner)
router.get('/salary-report/excel', protect, authorize('owner'), async (req, res) => {
  try {
    const { year, month } = req.query;
    
    if (!year || !month) {
      return res.status(400).json({ message: '년도와 월을 지정해주세요' });
    }

    // 해당 월의 시작일과 종료일 계산
    // 월의 시작은 00:00:00으로 설정하여 해당 월의 모든 일정 포함
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    // 모든 근로자 조회 (점포별로 그룹화)
    const employees = await User.find({ 
      role: { $in: ['employee', 'manager'] }, 
      isActive: true 
    }).populate('storeId', 'name address')
      .select('username storeId hourlyWage taxType workSchedule ssn');

    // 점포별로 근로자 그룹화
    const employeesByLocation = {};
    employees.forEach(employee => {
      const storeName = employee.storeId?.name || '점포 미지정';
      if (!employeesByLocation[storeName]) {
        employeesByLocation[storeName] = [];
      }
      employeesByLocation[storeName].push(employee);
    });

    // 엑셀 워크북 생성
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CSMS';
    workbook.lastModifiedBy = '점주';
    workbook.created = new Date();
    workbook.modified = new Date();

    // 각 점포별로 시트 생성
    for (const [location, locationEmployees] of Object.entries(employeesByLocation)) {
      const worksheet = workbook.addWorksheet(location);
      
      // 헤더 설정 (초과근무수당 제거)
      worksheet.columns = [
        { header: '근로자명', key: 'name', width: 15 },
        { header: '주민번호', key: 'ssn', width: 20 },
        { header: '총 근무시간', key: 'totalHours', width: 15 },
        { header: '근무일수', key: 'workDays', width: 15 },
        { header: '시급', key: 'hourlyWage', width: 15 },
        { header: '세금 신고 유형', key: 'taxType', width: 20 },
        { header: '기본급', key: 'regularPay', width: 15 },
        { header: '주휴수당', key: 'weeklyAllowance', width: 15 },
        { header: '총 지급액', key: 'totalGrossPay', width: 15 },
        { header: '세금 (3.3%)', key: 'taxAmount', width: 15 },
        { header: '실제 수령액', key: 'netPay', width: 15 }
      ];

      // 헤더 스타일 설정
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

          // 각 근로자별 데이터 추가 (통합된 API와 동일한 로직 사용)
    for (const employee of locationEmployees) {
      try {
        // 근로자 API에서 개별 직원 통계 조회
        const employeeAPI = axios.create({
          baseURL: process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}/api`,
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });

        const response = await employeeAPI.get(`/employee/weekly-stats?month=${year}-${month.padStart(2, '0')}&employeeId=${employee._id}`);
        const employeeStats = response.data;

        if (!employeeStats || !employeeStats.monthlyTotal) {
          // 데이터가 없는 경우 기본값 사용
          worksheet.addRow({
            name: employee.username,
            ssn: employee.ssn || '정보 없음',
            totalHours: 0,
            workDays: 0,
            hourlyWage: employee.hourlyWage || 0,
            taxType: employee.taxType || '미신고',
            regularPay: 0,
            weeklyAllowance: 0,
            totalGrossPay: 0,
            taxAmount: 0,
            netPay: 0
          });
          continue;
        }

        const monthlyTotal = employeeStats.monthlyTotal;
        const taxInfo = monthlyTotal.taxInfo || {};

        // 주민번호 사용
        const employeeSSN = employee.ssn || '정보 없음';

        worksheet.addRow({
          name: employee.username,
          ssn: employeeSSN,
          totalHours: Math.round(monthlyTotal.totalHours * 100) / 100,
          workDays: monthlyTotal.workDays,
          hourlyWage: employee.hourlyWage,
          taxType: employee.taxType,
          regularPay: monthlyTotal.totalPay,
          weeklyAllowance: monthlyTotal.totalHolidayPay,
          totalGrossPay: monthlyTotal.totalGrossPay,
          taxAmount: taxInfo.taxAmount || 0,
          netPay: taxInfo.netPay || monthlyTotal.totalGrossPay
        });
      } catch (apiError) {
        logger.error(`Error fetching stats for employee ${employee.username}:`, apiError);
        // API 호출 실패 시 기본값 사용
        worksheet.addRow({
          name: employee.username,
          ssn: employee.ssn || '정보 없음',
          totalHours: 0,
          workDays: 0,
          hourlyWage: employee.hourlyWage || 0,
          taxType: employee.taxType || '미신고',
          regularPay: 0,
          weeklyAllowance: 0,
          totalGrossPay: 0,
          taxAmount: 0,
          netPay: 0
        });
      }
    }

      // 숫자 컬럼 포맷팅 (소수점 제거)
      worksheet.getColumn('totalHours').numFmt = '0.00';
      worksheet.getColumn('hourlyWage').numFmt = '#,##0';
      worksheet.getColumn('regularPay').numFmt = '#,##0';
      worksheet.getColumn('weeklyAllowance').numFmt = '#,##0';
      worksheet.getColumn('totalGrossPay').numFmt = '#,##0';
      worksheet.getColumn('taxAmount').numFmt = '#,##0';
      worksheet.getColumn('netPay').numFmt = '#,##0';

      // 테두리 설정
      worksheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    }

    // 파일명 설정
    const fileName = `임금신고_${year}년${month}월_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;

    // 응답 헤더 설정
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    // 엑셀 파일 스트림으로 전송
    await workbook.xlsx.write(res);
    res.end();

    logger.info(`Salary report Excel file generated for ${year}년 ${month}월 by owner ${req.user.username}`);

  } catch (error) {
    logger.error('Generate salary report Excel error:', error);
    res.status(500).json({ message: '엑셀 파일 생성 중 오류가 발생했습니다' });
  }
});

// @desc    Get employees payslip consent status
// @route   GET /api/owner/employees/payslip-consent
// @access  Private (Owner)
router.get('/employees/payslip-consent', protect, authorize('owner'), async (req, res) => {
  try {
    const { storeId } = req.query;
    
    const query = { role: 'employee', isActive: true };
    if (storeId) {
      query.storeId = storeId;
    }

    const employees = await User.find(query)
      .select('username email phoneNumber storeId payslipAlternativeConsent payslipAlternativeConsentDate payslipDeliveryMethod')
      .populate('storeId', 'name')
      .sort({ username: 1 })
      .exec();

    const consentStats = {
      total: employees.length,
      consented: employees.filter(emp => emp.payslipAlternativeConsent).length,
      notConsented: employees.filter(emp => !emp.payslipAlternativeConsent).length,
      deliveryMethods: {
        email: employees.filter(emp => emp.payslipDeliveryMethod === 'email').length,
        sms: employees.filter(emp => emp.payslipDeliveryMethod === 'sms').length,
        app: employees.filter(emp => emp.payslipDeliveryMethod === 'app').length,
        paper: employees.filter(emp => emp.payslipDeliveryMethod === 'paper').length
      }
    };

    const employeeList = employees.map(emp => ({
      _id: emp._id,
      username: emp.username,
      email: emp.email,
      phoneNumber: emp.phoneNumber,
      storeName: emp.storeId?.name || '점포 미지정',
      payslipConsent: emp.payslipAlternativeConsent,
      payslipConsentDate: emp.payslipAlternativeConsentDate,
      payslipDeliveryMethod: emp.payslipDeliveryMethod
    }));

    res.json({
      stats: consentStats,
      employees: employeeList
    });
  } catch (error) {
    logger.error('Get employees payslip consent error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    Get employees welfare points summary
// @route   GET /api/owner/welfare-points
// @access  Private (Owner)
router.get('/welfare-points', protect, authorize('owner'), async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    
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

    // 근로자 조회
    const employeeQuery = { role: 'employee', isActive: true };
    if (storeId) {
      employeeQuery.storeId = storeId;
    }

    const employees = await User.find(employeeQuery)
      .select('username storeId workSchedule')
      .populate('storeId', 'name')
      .sort({ username: 1 });

    const employeeWelfareData = [];
    let totalCompanyPoints = 0;

    for (const employee of employees) {
      // 해당 기간의 승인된 근무 일정 조회
      const schedules = await WorkSchedule.find({
        userId: employee._id,
        workDate: { $gte: queryStartDate, $lte: queryEndDate },
        status: 'approved'
      });

      // 총 근무시간 계산
      const totalHours = schedules.reduce((sum, schedule) => {
        return sum + calculateWorkHours(schedule);
      }, 0);

      // 복지포인트 계산
      let welfarePoints = calculateWelfarePoints(totalHours, queryStartDate);
      
      // 첫 주 계약서 기준 포인트 (9월 15일 첫 주만)
      const firstWeekEndDate = new Date('2025-09-21');
      let firstWeekPoints = 0;
      
      if (queryStartDate <= firstWeekEndDate) {
        const contractWeeklyHours = Object.values(employee.workSchedule || {})
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

      const totalPoints = welfarePoints + firstWeekPoints;
      totalCompanyPoints += totalPoints;

      employeeWelfareData.push({
        employeeId: employee._id,
        employeeName: employee.username,
        storeName: employee.storeId?.name || '점포 미지정',
        totalHours: Math.round(totalHours * 100) / 100,
        welfarePoints: totalPoints,
        firstWeekPoints: firstWeekPoints,
        actualWorkPoints: welfarePoints,
        scheduleCount: schedules.length
      });
    }

    // 통계 계산
    const stats = {
      totalEmployees: employees.length,
      totalCompanyPoints: totalCompanyPoints,
      averagePointsPerEmployee: employees.length > 0 ? Math.round(totalCompanyPoints / employees.length) : 0,
      totalHours: employeeWelfareData.reduce((sum, emp) => sum + emp.totalHours, 0),
      pointDistribution: {
        zeroPoints: employeeWelfareData.filter(emp => emp.welfarePoints === 0).length,
        lowPoints: employeeWelfareData.filter(emp => emp.welfarePoints > 0 && emp.welfarePoints <= 10000).length,
        mediumPoints: employeeWelfareData.filter(emp => emp.welfarePoints > 10000 && emp.welfarePoints <= 50000).length,
        highPoints: employeeWelfareData.filter(emp => emp.welfarePoints > 50000).length
      }
    };

    res.json({
      period: {
        startDate: queryStartDate,
        endDate: queryEndDate
      },
      stats,
      employees: employeeWelfareData.sort((a, b) => b.welfarePoints - a.welfarePoints),
      welfareInfo: {
        pointsPerFourHours: 1700,
        startDate: welfareStartDate,
        description: '4시간 단위로 1700원씩 지급되며, 4시간 이하는 절사됩니다'
      }
    });
  } catch (error) {
    logger.error('Get welfare points summary error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

module.exports = router; 