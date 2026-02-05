const User = require('../models/User');
const { calculateMonthlyTax } = require('./taxCalculator');

// 주휴수당 계산 함수
const calculateHolidayPay = (workHours, workedDays, contractedDays, hourlyWage, contractedHours) => {
  console.log('=== calculateHolidayPay 함수 호출 ===');
  console.log('입력 파라미터:', {
    workHours,
    workedDays,
    contractedDays,
    hourlyWage,
    contractedHours
  });
  console.log('타입 확인:', {
    workHoursType: typeof workHours,
    workedDaysType: typeof workedDays,
    contractedDaysType: typeof contractedDays,
    hourlyWageType: typeof hourlyWage,
    contractedHoursType: typeof contractedHours
  });
  
  // 주휴수당 지급 조건: 15시간 이상 + 계약된 모든 날 출근
  const condition1 = workHours >= 15;
  const condition2 = workedDays >= contractedDays;
  const isEligible = condition1 && condition2;
  
  console.log('지급 조건 검사:');
  console.log('  - 15시간 이상 근무:', workHours, '>= 15:', condition1);
  console.log('  - 계약일수 모두 출근:', workedDays, '>=', contractedDays, ':', condition2);
  console.log('  - 지급 가능:', isEligible);
  
  if (!isEligible) {
    const reason = workedDays < contractedDays ? '계약일수 미달' : '근무시간 부족';
    console.log('주휴수당 지급 불가:', reason);
    return {
      isEligible: false,
      amount: 0,
      reason: reason
    };
  }
  
  // 주휴수당 = (1주 근로계약상 근로시간의합 / 40) × 8 × 시급
  const calculation = (contractedHours / 40) * 8 * hourlyWage;
  const amount = Math.round(calculation);
  
  console.log('주휴수당 계산:');
  console.log('  - 공식: (' + contractedHours + ' / 40) × 8 × ' + hourlyWage);
  console.log('  - 중간 계산:', calculation);
  console.log('  - 최종 금액:', amount);
  
  return {
    isEligible: true,
    amount: amount,
    reason: '정상 지급'
  };
};

// 직원의 계약된 근무일수 조회
const getContractedDays = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.workSchedule) {
      console.log('getContractedDays: 사용자 또는 workSchedule 없음, 기본값 5일 반환');
      return 5; // 기본값: 월-금
    }
    
    const workSchedule = user.workSchedule;
    
    // workSchedule이 배열인 경우 처리 (예외 케이스)
    if (Array.isArray(workSchedule)) {
      console.warn('getContractedDays: workSchedule이 배열입니다. 기본값 5일 반환');
      return 5;
    }
    
    // workSchedule이 객체인 경우 정상 처리
    if (typeof workSchedule !== 'object') {
      console.warn('getContractedDays: workSchedule 형식이 올바르지 않습니다. 기본값 5일 반환');
      return 5;
    }
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    let count = 0;
    days.forEach(day => {
      if (workSchedule[day] && workSchedule[day].enabled) {
        count++;
      }
    });
    
    const result = count > 0 ? count : 5;
    console.log(`getContractedDays: ${userId} -> ${result}일`);
    return result;
  } catch (error) {
    console.error('계약된 근무일수 조회 오류:', error.message, error.stack);
    return 5; // 기본값
  }
};

// 직원의 1주 계약 근무시간 조회
const getContractedHours = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.workSchedule) {
      console.log('사용자 또는 workSchedule이 없음, 기본값 40시간 반환');
      return 40; // 기본값: 40시간
    }
    
    const workSchedule = user.workSchedule;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    console.log('계약 근무시간 계산 시작:', { userId, workSchedule });
    
    let totalHours = 0;
    days.forEach(day => {
      if (workSchedule[day] && workSchedule[day].enabled) {
        // startTime과 endTime을 이용해 근무시간 계산
        const startTime = workSchedule[day].startTime;
        const endTime = workSchedule[day].endTime;
        
        console.log(`${day}: enabled=${workSchedule[day].enabled}, startTime=${startTime}, endTime=${endTime}`);
        
        if (startTime && endTime) {
          const start = new Date(`2000-01-01 ${startTime}`);
          const end = new Date(`2000-01-01 ${endTime}`);
          
          // 시간 차이 계산 (밀리초를 시간으로 변환)
          const diffMs = end - start;
          const diffHours = diffMs / (1000 * 60 * 60);
          
          console.log(`${day}: ${startTime} - ${endTime} = ${diffHours}시간`);
          totalHours += diffHours;
        }
      }
    });
    
    console.log('총 계약 근무시간:', totalHours, '시간');
    return totalHours > 0 ? totalHours : 40; // 기본값: 40시간
  } catch (error) {
    console.error('계약된 근무시간 조회 오류:', error);
    return 40; // 기본값
  }
};

// 주차별 주휴수당 일괄 계산
const calculateWeeklyHolidayPays = async (monthlySalary) => {
  try {
    const contractedDays = await getContractedDays(monthlySalary.userId);
    const contractedHours = await getContractedHours(monthlySalary.userId);
    
    for (let i = 0; i < monthlySalary.weeklyDetails.length; i++) {
      const week = monthlySalary.weeklyDetails[i];
      const calculation = calculateHolidayPay(
        week.workHours,
        week.workDays,
        contractedDays,
        monthlySalary.hourlyWage,
        contractedHours
      );
      
      // 계산된 값 저장
      week.holidayPayCalculation = {
        calculated: {
          totalHours: week.workHours,
          workedDays: week.workDays,
          contractedDays: contractedDays,
          contractedHours: contractedHours,
          isEligible: calculation.isEligible,
          rate: (contractedHours / 40) * 8,
          amount: calculation.amount
        }
      };
      
      // 주휴수당 금액 업데이트 (기존에 수정된 값이 없으면 계산된 값 사용)
      if (week.holidayPayStatus === 'not_calculated' || week.holidayPayStatus === 'calculated') {
        week.holidayPay = calculation.amount;
        week.weeklyTotal = week.basePay + calculation.amount;
        week.holidayPayStatus = 'calculated';
      }
    }
    
    // 월별 총 주휴수당 재계산
    monthlySalary.totalHolidayPay = monthlySalary.weeklyDetails.reduce(
      (sum, week) => sum + week.holidayPay, 0
    );
    monthlySalary.totalGrossPay = monthlySalary.totalBasePay + monthlySalary.totalHolidayPay;
    
    // 주휴수당 설정 업데이트
    monthlySalary.holidayPaySettings.calculatedAt = new Date();
    monthlySalary.holidayPaySettings.enabled = true;
    
    return true;
  } catch (error) {
    console.error('주차별 주휴수당 계산 오류:', error);
    throw error;
  }
};

// 특정 주차의 주휴수당만 계산
const calculateSingleWeekHolidayPay = async (monthlySalary, weekIndex) => {
  try {
    console.log('=== calculateSingleWeekHolidayPay 함수 시작 ===');
    console.log('입력 정보:', {
      userId: monthlySalary.userId,
      weekIndex,
      hourlyWage: monthlySalary.hourlyWage
    });
    
    const contractedDays = await getContractedDays(monthlySalary.userId);
    console.log('계약 근무일수:', contractedDays);
    
    const contractedHours = await getContractedHours(monthlySalary.userId);
    console.log('계약 근무시간:', contractedHours);
    
    const week = monthlySalary.weeklyDetails[weekIndex];
    
    if (!week) {
      console.error('해당 주차를 찾을 수 없음:', weekIndex);
      throw new Error('해당 주차를 찾을 수 없습니다');
    }
    
    console.log('주차 정보:', {
      startDate: week.startDate,
      workHours: week.workHours,
      workDays: week.workDays,
      basePay: week.basePay,
      holidayPay: week.holidayPay,
      holidayPayStatus: week.holidayPayStatus
    });
    
    console.log('calculateHolidayPay 호출 전 데이터 검증:');
    console.log('  - week.workHours:', week.workHours, '(타입:', typeof week.workHours, ')');
    console.log('  - week.workDays:', week.workDays, '(타입:', typeof week.workDays, ')');
    console.log('  - contractedDays:', contractedDays, '(타입:', typeof contractedDays, ')');
    console.log('  - monthlySalary.hourlyWage:', monthlySalary.hourlyWage, '(타입:', typeof monthlySalary.hourlyWage, ')');
    console.log('  - contractedHours:', contractedHours, '(타입:', typeof contractedHours, ')');
    
    const calculation = calculateHolidayPay(
      week.workHours,
      week.workDays,
      contractedDays,
      monthlySalary.hourlyWage,
      contractedHours
    );
    
    console.log('calculateHolidayPay 결과:', calculation);
    
    // 계산된 값 저장
    week.holidayPayCalculation = {
      calculated: {
        totalHours: week.workHours,
        workedDays: week.workDays,
        contractedDays: contractedDays,
        contractedHours: contractedHours,
        isEligible: calculation.isEligible,
        rate: (contractedHours / 40) * 8,
        amount: calculation.amount
      }
    };
    
    // 주휴수당 금액 업데이트
    week.holidayPay = calculation.amount;
    week.weeklyTotal = week.basePay + calculation.amount;
    week.holidayPayStatus = 'calculated';
    
    // 월별 총 주휴수당 재계산
    monthlySalary.totalHolidayPay = monthlySalary.weeklyDetails.reduce(
      (sum, week) => sum + week.holidayPay, 0
    );
    monthlySalary.totalGrossPay = monthlySalary.totalBasePay + monthlySalary.totalHolidayPay;
    
    return calculation;
  } catch (error) {
    console.error('단일 주차 주휴수당 계산 오류:', error);
    throw error;
  }
};

// 주휴수당 수정 후 재계산
const recalculateAfterAdjustment = (monthlySalary) => {
  // 월별 총 주휴수당 재계산
  monthlySalary.totalHolidayPay = monthlySalary.weeklyDetails.reduce(
    (sum, week) => sum + week.holidayPay, 0
  );
  monthlySalary.totalGrossPay = monthlySalary.totalBasePay + monthlySalary.totalHolidayPay;
  
  // 세금 재계산 (taxType에 따라 적절한 세금 계산)
  const taxInfo = calculateMonthlyTax(
    monthlySalary.taxType || '미신고',
    monthlySalary.totalGrossPay,
    monthlySalary.totalWorkHours
  );
  monthlySalary.taxInfo = {
    incomeTax: taxInfo.incomeTax || 0,
    localTax: taxInfo.localTax || 0,
    totalTax: taxInfo.totalTax || 0,
    netPay: taxInfo.netPay || monthlySalary.totalGrossPay
  };
  
  return monthlySalary;
};

module.exports = {
  calculateHolidayPay,
  getContractedDays,
  getContractedHours,
  calculateWeeklyHolidayPays,
  calculateSingleWeekHolidayPay,
  recalculateAfterAdjustment
};
