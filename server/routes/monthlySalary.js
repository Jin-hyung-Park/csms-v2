const express = require('express');
const { body, validationResult, query } = require('express-validator');
const MonthlySalary = require('../models/MonthlySalary');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
const { protect, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');
const { 
  calculateHolidayPay, 
  getContractedDays, 
  calculateWeeklyHolidayPays, 
  calculateSingleWeekHolidayPay,
  recalculateAfterAdjustment 
} = require('../utils/holidayPayCalculator');
const { calculateWorkHours } = require('../utils/workHoursCalculator');

// 주차 계산 함수들 (employee.js에서 가져옴)
function getWeeksInMonth(monthStart) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = monthStart.getDay(); // 0=일요일, 1=월요일, ..., 6=토요일
  // 월요일 기준으로 조정: 일요일(0)을 7로 변경하여 월요일(1)이 1이 되도록
  const adjustedFirstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
  const weeksInMonth = Math.ceil((lastDay + adjustedFirstDayOfWeek - 1) / 7);
  return weeksInMonth;
}

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

const router = express.Router();

// @desc    월별 급여 확정
// @route   POST /api/monthly-salary/confirm
// @access  Private (Owner)
router.post('/confirm', protect, authorize('owner', 'manager'), [
  body('storeId').isMongoId().withMessage('올바른 매장 ID를 입력해주세요'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요'),
  body('employeeData').isArray().withMessage('직원 데이터는 배열이어야 합니다')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { storeId, year, month, employeeData } = req.body;
    const confirmedBy = req.user.id;

    logger.info(`월별 급여 확정 시작: ${year}년 ${month}월, 매장: ${storeId}`);

    const savedSalaries = [];
    const saveErrors = [];

    for (const employee of employeeData) {
      try {
        // 기존 확정 데이터가 있는지 확인
        const existingSalary = await MonthlySalary.findOne({
          userId: employee.userId,
          storeId,
          year,
          month
        });

        if (existingSalary) {
          // 기존 데이터 업데이트
          existingSalary.employeeName = employee.employeeName;
          existingSalary.employeeEmail = employee.employeeEmail;
          existingSalary.hourlyWage = employee.hourlyWage;
          existingSalary.taxType = employee.taxType;
          existingSalary.totalWorkHours = employee.totalWorkHours;
          existingSalary.totalWorkDays = employee.totalWorkDays;
          existingSalary.totalBasePay = employee.totalBasePay;
          existingSalary.totalHolidayPay = employee.totalHolidayPay;
          existingSalary.totalGrossPay = employee.totalGrossPay;
          existingSalary.taxInfo = employee.taxInfo;
          existingSalary.weeklyDetails = employee.weeklyDetails;
          existingSalary.confirmedAt = new Date();
          existingSalary.confirmedBy = confirmedBy;
          existingSalary.status = 'confirmed';

          await existingSalary.save();
          savedSalaries.push(existingSalary);
        } else {
          // 새로운 데이터 생성
          const newSalary = new MonthlySalary({
            userId: employee.userId,
            storeId,
            year,
            month,
            employeeName: employee.employeeName,
            employeeEmail: employee.employeeEmail,
            hourlyWage: employee.hourlyWage,
            taxType: employee.taxType,
            totalWorkHours: employee.totalWorkHours,
            totalWorkDays: employee.totalWorkDays,
            totalBasePay: employee.totalBasePay,
            totalHolidayPay: employee.totalHolidayPay,
            totalGrossPay: employee.totalGrossPay,
            taxInfo: employee.taxInfo,
            weeklyDetails: employee.weeklyDetails,
            confirmedBy
          });

          await newSalary.save();
          savedSalaries.push(newSalary);
        }
      } catch (error) {
        logger.error(`직원 ${employee.employeeName} 급여 확정 실패:`, error);
        saveErrors.push({
          employeeName: employee.employeeName,
          error: error.message
        });
      }
    }

    logger.info(`월별 급여 확정 완료: ${savedSalaries.length}명 성공, ${saveErrors.length}명 실패`);

    res.json({
      message: '월별 급여가 확정되었습니다',
      savedCount: savedSalaries.length,
      errorCount: saveErrors.length,
      errors: saveErrors.length > 0 ? saveErrors : undefined
    });

  } catch (error) {
    logger.error('월별 급여 확정 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    확정된 월별 급여 목록 조회
// @route   GET /api/monthly-salary
// @access  Private (Owner)
router.get('/', protect, authorize('owner', 'manager'), [
  query('storeId').isMongoId().withMessage('올바른 매장 ID를 입력해주세요'),
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { storeId, year, month } = req.query;

    const salaries = await MonthlySalary.find({
      storeId,
      year: parseInt(year),
      month: parseInt(month),
      status: 'confirmed'
    })
    .populate('userId', 'username email')
    .populate('confirmedBy', 'username')
    .sort({ employeeName: 1 });

    res.json({
      salaries,
      totalCount: salaries.length,
      totalGrossPay: salaries.reduce((sum, s) => sum + s.totalGrossPay, 0),
      totalNetPay: salaries.reduce((sum, s) => sum + s.taxInfo.netPay, 0)
    });

  } catch (error) {
    logger.error('확정된 월별 급여 조회 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    월별 급여 엑셀 다운로드
// @route   GET /api/monthly-salary/excel
// @access  Private (Owner)
router.get('/excel', protect, authorize('owner', 'manager'), [
  query('storeId').isMongoId().withMessage('올바른 매장 ID를 입력해주세요'),
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { storeId, year, month } = req.query;

    // 확정된 급여 데이터 조회
    const salaries = await MonthlySalary.find({
      storeId,
      year: parseInt(year),
      month: parseInt(month),
      status: 'confirmed'
    }).sort({ employeeName: 1 });

    if (salaries.length === 0) {
      return res.status(404).json({ message: '확정된 급여 데이터가 없습니다' });
    }

    // 엑셀 워크북 생성
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`${year}년 ${month}월 급여명세서`);

    // 헤더 설정
    const headers = [
      '근로자명', '이메일', '시급', '세무구분',
      '총 근로시간', '총 근무일수', '기본급', '주휴수당', 
      '총 지급액', '소득세', '지방세', '총 세금', '실수령액'
    ];

    // 헤더 스타일 설정
    worksheet.getRow(1).values = headers;
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // 데이터 추가
    salaries.forEach((salary, index) => {
      const row = worksheet.getRow(index + 2);
      row.values = [
        salary.employeeName,
        salary.employeeEmail,
        salary.hourlyWage,
        salary.taxType,
        salary.totalWorkHours,
        salary.totalWorkDays,
        salary.totalBasePay,
        salary.totalHolidayPay,
        salary.totalGrossPay,
        salary.taxInfo.incomeTax,
        salary.taxInfo.localTax,
        salary.taxInfo.totalTax,
        salary.taxInfo.netPay
      ];

      // 숫자 포맷 설정
      row.getCell(3).numFmt = '#,##0'; // 시급
      row.getCell(5).numFmt = '#,##0.0'; // 근로시간
      row.getCell(7).numFmt = '#,##0'; // 기본급
      row.getCell(8).numFmt = '#,##0'; // 주휴수당
      row.getCell(9).numFmt = '#,##0'; // 총 지급액
      row.getCell(10).numFmt = '#,##0'; // 소득세
      row.getCell(11).numFmt = '#,##0'; // 지방세
      row.getCell(12).numFmt = '#,##0'; // 총 세금
      row.getCell(13).numFmt = '#,##0'; // 실수령액
    });

    // 합계 행 추가
    const totalRow = worksheet.getRow(salaries.length + 2);
    totalRow.values = [
      '합계', '', '', '',
      salaries.reduce((sum, s) => sum + s.totalWorkHours, 0),
      salaries.reduce((sum, s) => sum + s.totalWorkDays, 0),
      salaries.reduce((sum, s) => sum + s.totalBasePay, 0),
      salaries.reduce((sum, s) => sum + s.totalHolidayPay, 0),
      salaries.reduce((sum, s) => sum + s.totalGrossPay, 0),
      salaries.reduce((sum, s) => sum + s.taxInfo.incomeTax, 0),
      salaries.reduce((sum, s) => sum + s.taxInfo.localTax, 0),
      salaries.reduce((sum, s) => sum + s.taxInfo.totalTax, 0),
      salaries.reduce((sum, s) => sum + s.taxInfo.netPay, 0)
    ];
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F0F0' }
    };

    // 컬럼 너비 자동 조정
    worksheet.columns.forEach(column => {
      column.width = Math.max(column.width || 10, 15);
    });

    // 응답 헤더 설정
    const filename = `급여명세서_${year}년${month}월_${new Date().getTime()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    // 엑셀 파일 전송
    await workbook.xlsx.write(res);
    res.end();

    logger.info(`월별 급여 엑셀 다운로드: ${year}년 ${month}월, ${salaries.length}명`);

  } catch (error) {
    logger.error('월별 급여 엑셀 다운로드 오류:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
});

// @desc    주휴수당 산출
// @route   POST /api/monthly-salary/calculate-holiday-pay
// @access  Private (Owner)
router.post('/calculate-holiday-pay', protect, authorize('owner'), [
  body('employeeId').isMongoId().withMessage('올바른 직원 ID를 입력해주세요'),
  body('weekKey').notEmpty().withMessage('주차 키가 필요합니다'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { employeeId, weekKey, year, month } = req.body;
    
    let monthlySalary = await MonthlySalary.findOne({
      userId: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    // MonthlySalary가 없거나, 있더라도 주차별 데이터를 최신 WorkSchedule 기준으로 재계산
    const needsRecalculation = !monthlySalary || true; // 항상 재계산하여 최신 데이터 보장
    
    if (needsRecalculation) {
      // 직원 정보 조회
      const employee = await User.findById(employeeId);
      if (!employee) {
        return res.status(404).json({ message: '직원 정보를 찾을 수 없습니다' });
      }
      
      // 주차별 통계 데이터 조회
      const [yearNum, monthNum] = [parseInt(year), parseInt(month)];
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
      
      const schedules = await WorkSchedule.find({
        userId: employeeId,
        workDate: { $gte: startOfMonth, $lte: endOfMonth },
        status: 'approved'
      }).sort({ workDate: 1 });
      
      // 주차별 데이터 생성 (기존 로직과 동일하게)
      const weeklyDetails = [];
      const weeksInMonth = getWeeksInMonth(startOfMonth);
      
      // 각 주차별로 초기 데이터 생성
      for (let weekNum = 1; weekNum <= weeksInMonth; weekNum++) {
        const weekRange = getWeekDateRange(startOfMonth, weekNum);
        
        // 로컬 날짜로 YYYY-MM-DD 형식 변환 (UTC 변환 방지)
        const formatLocalDate = (date) => {
          const d = new Date(date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };
        
        // 해당 주차의 근무 일정 필터링 (로컬 날짜로 비교)
        const weekStartStr = formatLocalDate(weekRange.startDate);
        const weekEndStr = formatLocalDate(weekRange.endDate);
        
        const weekSchedules = schedules.filter(schedule => {
          const workDate = new Date(schedule.workDate);
          const workDateStr = formatLocalDate(workDate);
          const isIncluded = workDateStr >= weekStartStr && workDateStr <= weekEndStr;
          
          if (!isIncluded) {
            logger.info(`근무 일정 제외 [${employee.username} ${weekNum}주차]:`, {
              workDate: workDateStr,
              scheduleWorkDate: schedule.workDate,
              weekStart: weekStartStr,
              weekEnd: weekEndStr,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            });
          } else {
            logger.info(`근무 일정 포함 [${employee.username} ${weekNum}주차]:`, {
              workDate: workDateStr,
              weekStart: weekStartStr,
              weekEnd: weekEndStr,
              startTime: schedule.startTime,
              endTime: schedule.endTime
            });
          }
          
          return isIncluded;
        });
        
        // 주차별 근무 정보 계산 (calculateWorkHours 함수 사용)
        let totalHours = 0;
        weekSchedules.forEach(schedule => {
          const workHours = calculateWorkHours(schedule);
          totalHours += workHours;
          logger.info(`근무시간 계산 [${employee.username} ${weekNum}주차]:`, {
            workDate: formatLocalDate(schedule.workDate),
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            calculatedHours: workHours,
            scheduleTotalHours: schedule.totalHours
          });
        });
        const workDays = weekSchedules.length;
        const basePay = totalHours * (employee.hourlyWage || 0);
        
        logger.info(`주차별 데이터 계산 결과 [${employee.username} ${weekNum}주차]:`, {
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          schedulesCount: weekSchedules.length,
          totalHours: totalHours,
          workDays: workDays,
          basePay: basePay,
          hourlyWage: employee.hourlyWage,
          scheduleDates: weekSchedules.map(s => formatLocalDate(s.workDate))
        });
        
        weeklyDetails.push({
          weekNumber: weekNum,
          startDate: formatLocalDate(weekRange.startDate),
          endDate: formatLocalDate(weekRange.endDate),
          workHours: totalHours,
          workDays: workDays,
          basePay: basePay,
          holidayPay: 0,
          weeklyTotal: basePay,
          holidayPayStatus: 'not_calculated',
          holidayPayCalculation: {
            calculated: {
              totalHours: totalHours,
              workedDays: workDays,
              contractedDays: 0,
              isEligible: false,
              rate: 0.1,
              amount: 0
            }
          }
        });
      }
      
      if (monthlySalary) {
        // 기존 MonthlySalary가 있으면 주차별 데이터 업데이트
        // 기존 주차별 주휴수당 정보는 유지하되, 근무시간/일수/기본급은 재계산
        const existingWeeklyDetails = monthlySalary.weeklyDetails || [];
        
        weeklyDetails.forEach((newWeek, index) => {
          const existingWeek = existingWeeklyDetails.find(w => w.weekNumber === newWeek.weekNumber || w.startDate === newWeek.startDate);
          if (existingWeek && existingWeek.holidayPayStatus !== 'not_calculated' && existingWeek.holidayPay > 0) {
            // 이미 계산된 주휴수당이 있으면 유지하되, 근무시간 등은 업데이트
            newWeek.holidayPay = existingWeek.holidayPay;
            newWeek.holidayPayStatus = existingWeek.holidayPayStatus;
            newWeek.holidayPayCalculation = existingWeek.holidayPayCalculation;
            newWeek.weeklyTotal = newWeek.basePay + newWeek.holidayPay;
            
            logger.info(`주차 ${newWeek.weekNumber} 기존 주휴수당 유지: ${newWeek.holidayPay}원`);
          } else {
            // 주휴수당이 없거나 0이면 재계산 준비
            newWeek.holidayPay = 0;
            newWeek.holidayPayStatus = 'not_calculated';
            newWeek.weeklyTotal = newWeek.basePay;
          }
        });
        
        monthlySalary.weeklyDetails = weeklyDetails;
        monthlySalary.totalWorkHours = weeklyDetails.reduce((sum, week) => sum + week.workHours, 0);
        monthlySalary.totalWorkDays = weeklyDetails.reduce((sum, week) => sum + week.workDays, 0);
        monthlySalary.totalBasePay = weeklyDetails.reduce((sum, week) => sum + week.basePay, 0);
        monthlySalary.totalHolidayPay = weeklyDetails.reduce((sum, week) => sum + week.holidayPay, 0);
        monthlySalary.totalGrossPay = monthlySalary.totalBasePay + monthlySalary.totalHolidayPay;
        
        logger.info(`월별 급여 데이터 재계산: ${employee.username}, ${year}년 ${month}월`, {
          totalWorkHours: monthlySalary.totalWorkHours,
          totalWorkDays: monthlySalary.totalWorkDays,
          totalBasePay: monthlySalary.totalBasePay,
          totalHolidayPay: monthlySalary.totalHolidayPay
        });
      } else {
        // 새로운 MonthlySalary 생성
        monthlySalary = new MonthlySalary({
          userId: employeeId,
          storeId: employee.storeId,
          year: yearNum,
          month: monthNum,
          employeeName: employee.username,
          employeeEmail: employee.email,
          hourlyWage: employee.hourlyWage || 0,
          taxType: employee.taxType || '미신고',
          totalWorkHours: weeklyDetails.reduce((sum, week) => sum + week.workHours, 0),
          totalWorkDays: weeklyDetails.reduce((sum, week) => sum + week.workDays, 0),
          totalBasePay: weeklyDetails.reduce((sum, week) => sum + week.basePay, 0),
          totalHolidayPay: 0,
          totalGrossPay: weeklyDetails.reduce((sum, week) => sum + week.basePay, 0),
          weeklyDetails: weeklyDetails,
          confirmedBy: req.user._id,
          holidayPaySettings: {
            enabled: false,
            calculatedBy: null,
            calculatedAt: null,
            lastModifiedBy: null,
            lastModifiedAt: null
          }
        });
        
        logger.info(`새로운 월별 급여 데이터 생성: ${employee.username}, ${year}년 ${month}월`);
      }
      
      await monthlySalary.save();
      
      // 주차별 데이터 재계산 결과 로그
      logger.info(`주차별 데이터 재계산 완료:`, {
        employeeName: employee.username,
        year, month,
        weeklyDetails: weeklyDetails.map(w => ({
          weekNumber: w.weekNumber,
          startDate: w.startDate,
          workHours: w.workHours,
          workDays: w.workDays,
          basePay: w.basePay
        }))
      });
    }
    
    // weekKey를 YYYY-MM-DD 형식으로 변환 (날짜 부분만 추출, UTC 변환 방지)
    let weekKeyStr;
    if (typeof weekKey === 'string' && weekKey.includes('T')) {
      // ISO 문자열인 경우 날짜 부분만 추출
      weekKeyStr = weekKey.split('T')[0];
    } else {
      // Date 객체인 경우 로컬 날짜로 변환
      const weekKeyDate = new Date(weekKey);
      const year = weekKeyDate.getFullYear();
      const month = String(weekKeyDate.getMonth() + 1).padStart(2, '0');
      const day = String(weekKeyDate.getDate()).padStart(2, '0');
      weekKeyStr = `${year}-${month}-${day}`;
    }
    
    logger.info(`주차 찾기: weekKey=${weekKey}, converted=${weekKeyStr}, available weeks:`, monthlySalary.weeklyDetails.map(w => w.startDate));
    
    const weekIndex = monthlySalary.weeklyDetails.findIndex(
      week => week.startDate === weekKeyStr
    );
    
    if (weekIndex === -1) {
      return res.status(404).json({ 
        message: '해당 주차를 찾을 수 없습니다',
        weekKey: weekKey,
        availableWeeks: monthlySalary.weeklyDetails.map(w => ({ weekNumber: w.weekNumber, startDate: w.startDate }))
      });
    }
    
    // 주차 정보 로그
    const weekBeforeCalculation = monthlySalary.weeklyDetails[weekIndex];
    logger.info(`주차별 주휴수당 계산 시작:`, {
      employeeId,
      year,
      month,
      weekKey: weekKeyStr,
      weekIndex,
      weekNumber: weekBeforeCalculation.weekNumber,
      startDate: weekBeforeCalculation.startDate,
      workHours: weekBeforeCalculation.workHours,
      workDays: weekBeforeCalculation.workDays,
      basePay: weekBeforeCalculation.basePay,
      hourlyWage: monthlySalary.hourlyWage
    });
    
    // 주차별 주휴수당 계산
    const calculationResult = await calculateSingleWeekHolidayPay(monthlySalary, weekIndex);
    
    // 주휴수당 설정 업데이트
    monthlySalary.holidayPaySettings.calculatedBy = req.user._id;
    monthlySalary.holidayPaySettings.calculatedAt = new Date();
    monthlySalary.holidayPaySettings.enabled = true;
    
    await monthlySalary.save();
    
    const weekAfterCalculation = monthlySalary.weeklyDetails[weekIndex];
    logger.info(`주휴수당 산출 완료:`, {
      employeeId,
      year,
      month,
      weekKey: weekKeyStr,
      holidayPay: weekAfterCalculation.holidayPay,
      status: weekAfterCalculation.holidayPayStatus,
      calculationResult: calculationResult
    });
    
    res.json({ 
      message: '주휴수당이 산출되었습니다',
      holidayPay: weekAfterCalculation.holidayPay,
      status: weekAfterCalculation.holidayPayStatus,
      details: {
        workHours: weekAfterCalculation.workHours,
        workDays: weekAfterCalculation.workDays,
        basePay: weekAfterCalculation.basePay,
        calculation: weekAfterCalculation.holidayPayCalculation
      }
    });
    
  } catch (error) {
    logger.error('주휴수당 산출 오류:', error);
    res.status(500).json({ message: '주휴수당 산출 중 오류가 발생했습니다' });
  }
});

// @desc    주휴수당 수정
// @route   PUT /api/monthly-salary/adjust-holiday-pay
// @access  Private (Owner)
router.put('/adjust-holiday-pay', protect, authorize('owner'), [
  body('employeeId').isMongoId().withMessage('올바른 직원 ID를 입력해주세요'),
  body('weekKey').notEmpty().withMessage('주차 키가 필요합니다'),
  body('adjustedAmount').isInt({ min: 0 }).withMessage('주휴수당은 0 이상이어야 합니다'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { employeeId, weekKey, adjustedAmount, reason, notes, year, month } = req.body;
    
    const monthlySalary = await MonthlySalary.findOne({
      userId: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!monthlySalary) {
      return res.status(404).json({ message: '해당 월의 급여 정보를 찾을 수 없습니다' });
    }
    
    // weekKey를 YYYY-MM-DD 형식으로 변환 (날짜 부분만 추출, UTC 변환 방지)
    let weekKeyStr;
    if (typeof weekKey === 'string' && weekKey.includes('T')) {
      weekKeyStr = weekKey.split('T')[0];
    } else {
      const weekKeyDate = new Date(weekKey);
      const dateYear = weekKeyDate.getFullYear();
      const dateMonth = String(weekKeyDate.getMonth() + 1).padStart(2, '0');
      const dateDay = String(weekKeyDate.getDate()).padStart(2, '0');
      weekKeyStr = `${dateYear}-${dateMonth}-${dateDay}`;
    }
    
    // 해당 주차 찾기
    const weekIndex = monthlySalary.weeklyDetails.findIndex(
      week => week.startDate === weekKeyStr
    );
    
    if (weekIndex === -1) {
      return res.status(404).json({ message: '해당 주차를 찾을 수 없습니다' });
    }
    
    // 주휴수당 수정
    monthlySalary.adjustHolidayPay(
      weekIndex, 
      adjustedAmount, 
      reason || '', 
      notes || '', 
      req.user._id
    );
    
    // 주차별 총액 재계산
    const week = monthlySalary.weeklyDetails[weekIndex];
    week.holidayPay = adjustedAmount;
    week.weeklyTotal = week.basePay + adjustedAmount;
    
    // 월별 총액 재계산
    recalculateAfterAdjustment(monthlySalary);
    
    await monthlySalary.save();
    
    logger.info(`주휴수당 수정 완료: 직원 ${employeeId}, ${year}년 ${month}월 ${weekKey}, 금액: ${adjustedAmount}`);
    
    res.json({ 
      message: '주휴수당이 수정되었습니다',
      holidayPay: adjustedAmount,
      status: 'adjusted'
    });
    
  } catch (error) {
    logger.error('주휴수당 수정 오류:', error);
    res.status(500).json({ message: '주휴수당 수정 중 오류가 발생했습니다' });
  }
});

// @desc    주휴수당 확정
// @route   POST /api/monthly-salary/confirm-holiday-pay
// @access  Private (Owner)
router.post('/confirm-holiday-pay', protect, authorize('owner'), [
  body('employeeId').isMongoId().withMessage('올바른 직원 ID를 입력해주세요'),
  body('weekKey').notEmpty().withMessage('주차 키가 필요합니다'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  body('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { employeeId, weekKey, year, month } = req.body;
    
    const monthlySalary = await MonthlySalary.findOne({
      userId: employeeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!monthlySalary) {
      return res.status(404).json({ message: '해당 월의 급여 정보를 찾을 수 없습니다' });
    }
    
    // weekKey를 YYYY-MM-DD 형식으로 변환 (날짜 부분만 추출, UTC 변환 방지)
    let weekKeyStr;
    if (typeof weekKey === 'string' && weekKey.includes('T')) {
      weekKeyStr = weekKey.split('T')[0];
    } else {
      const weekKeyDate = new Date(weekKey);
      const dateYear = weekKeyDate.getFullYear();
      const dateMonth = String(weekKeyDate.getMonth() + 1).padStart(2, '0');
      const dateDay = String(weekKeyDate.getDate()).padStart(2, '0');
      weekKeyStr = `${dateYear}-${dateMonth}-${dateDay}`;
    }
    
    // 해당 주차 찾기
    const weekIndex = monthlySalary.weeklyDetails.findIndex(
      week => week.startDate === weekKeyStr
    );
    
    if (weekIndex === -1) {
      return res.status(404).json({ message: '해당 주차를 찾을 수 없습니다' });
    }
    
    // 주휴수당 확정
    monthlySalary.confirmHolidayPay(weekIndex, req.user._id);
    await monthlySalary.save();
    
    logger.info(`주휴수당 확정 완료: 직원 ${employeeId}, ${year}년 ${month}월 ${weekKey}`);
    
    res.json({ 
      message: '주휴수당이 확정되었습니다',
      status: 'confirmed'
    });
    
  } catch (error) {
    logger.error('주휴수당 확정 오류:', error);
    res.status(500).json({ message: '주휴수당 확정 중 오류가 발생했습니다' });
  }
});

// @desc    직원 주휴수당 조회
// @route   GET /api/monthly-salary/holiday-pay
// @access  Private (Employee)
router.get('/holiday-pay', protect, authorize('employee'), [
  query('year').isInt({ min: 2020, max: 2030 }).withMessage('올바른 연도를 입력해주세요'),
  query('month').isInt({ min: 1, max: 12 }).withMessage('올바른 월을 입력해주세요')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: '입력 데이터를 확인해주세요',
        errors: errors.array()
      });
    }

    const { year, month } = req.query;
    
    const monthlySalary = await MonthlySalary.findOne({
      userId: req.user._id,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!monthlySalary) {
      return res.status(404).json({ message: '해당 월의 급여 정보를 찾을 수 없습니다' });
    }
    
    // 주차별 주휴수당 정보 정리
    const weeklyStats = {};
    let monthlyTotal = {
      totalHours: 0,
      totalPay: 0,
      totalHolidayPay: 0,
      totalGrossPay: 0,
      totalTax: 0,
      totalNetPay: 0
    };
    
    monthlySalary.weeklyDetails.forEach(week => {
      const weekKey = week.startDate;
      const adjustedHolidayPay = week.holidayPayCalculation?.adjusted?.amount !== undefined 
        ? week.holidayPayCalculation.adjusted.amount 
        : week.holidayPay;
      
      weeklyStats[weekKey] = {
        weekNumber: week.weekNumber,
        weekStart: week.startDate,
        weekEnd: week.endDate,
        totalHours: week.workHours,
        workedDays: week.workDays,
        hourlyWage: monthlySalary.hourlyWage,
        basePay: week.basePay,
        holidayPay: adjustedHolidayPay,
        weeklyTotal: week.basePay + adjustedHolidayPay,
        tax: Math.round((week.basePay + adjustedHolidayPay) * 0.033),
        netPay: (week.basePay + adjustedHolidayPay) - Math.round((week.basePay + adjustedHolidayPay) * 0.033),
        holidayPayStatus: week.holidayPayStatus,
        notes: week.holidayPayCalculation?.adjusted?.notes || '',
        adjustmentReason: week.holidayPayCalculation?.adjusted?.reason || ''
      };
      
      // 월별 총계 누적
      monthlyTotal.totalHours += week.workHours;
      monthlyTotal.totalPay += week.basePay;
      monthlyTotal.totalHolidayPay += adjustedHolidayPay;
      monthlyTotal.totalGrossPay += (week.basePay + adjustedHolidayPay);
    });
    
    // 월별 총 세금 및 실수령액 계산
    monthlyTotal.totalTax = Math.round(monthlyTotal.totalGrossPay * 0.033);
    monthlyTotal.totalNetPay = monthlyTotal.totalGrossPay - monthlyTotal.totalTax;
    
    res.json({
      weeklyStats,
      monthlyTotal
    });
    
  } catch (error) {
    logger.error('직원 주휴수당 조회 오류:', error);
    res.status(500).json({ message: '주휴수당 조회 중 오류가 발생했습니다' });
  }
});

module.exports = router; 