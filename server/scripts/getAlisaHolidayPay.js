const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MonthlySalary = require('../models/MonthlySalary');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB 연결 완료');
    console.log('');
    
    const monthlySalary = await MonthlySalary.findOne({
      userId: '68b41109cf2fd2b5e10e2195',
      year: 2025,
      month: 9
    }).populate('userId', 'username email');
    
    if (!monthlySalary) {
      console.log('급여 정보를 찾을 수 없습니다.');
      process.exit(0);
    }
    
    console.log('=== 알리사님 2025년 9월 급여 정보 ===');
    console.log('직원명:', monthlySalary.employeeName);
    console.log('시급:', monthlySalary.hourlyWage?.toLocaleString(), '원');
    console.log('총 근무시간:', monthlySalary.totalWorkHours, '시간');
    console.log('총 근무일수:', monthlySalary.totalWorkDays, '일');
    console.log('총 기본급:', monthlySalary.totalBasePay?.toLocaleString(), '원');
    console.log('총 주휴수당:', monthlySalary.totalHolidayPay?.toLocaleString(), '원');
    console.log('총 급여:', monthlySalary.totalGrossPay?.toLocaleString(), '원');
    console.log('');
    
    // 1주차 정보
    const week1 = monthlySalary.weeklyDetails.find(w => w.weekNumber === 1);
    
    if (week1) {
      console.log('=== 1주차 상세 정보 ===');
      console.log('주차:', week1.weekNumber, '주차');
      console.log('시작일:', week1.startDate);
      console.log('종료일:', week1.endDate);
      console.log('근무시간:', week1.workHours, '시간');
      console.log('근무일수:', week1.workDays, '일');
      console.log('기본급:', week1.basePay?.toLocaleString(), '원');
      console.log('주휴수당:', week1.holidayPay?.toLocaleString(), '원');
      console.log('주별 총액:', week1.weeklyTotal?.toLocaleString(), '원');
      console.log('주휴수당 상태:', week1.holidayPayStatus);
      console.log('');
      
      if (week1.holidayPayCalculation) {
        console.log('=== 주휴수당 계산 정보 ===');
        if (week1.holidayPayCalculation.calculated) {
          const calc = week1.holidayPayCalculation.calculated;
          console.log('계산된 주휴수당:');
          console.log('  - 총 근무시간:', calc.totalHours, '시간');
          console.log('  - 실제 근무일수:', calc.workedDays, '일');
          console.log('  - 계약 근무일수:', calc.contractedDays, '일');
          console.log('  - 계약 근무시간:', calc.contractedHours, '시간');
          console.log('  - 지급 가능 여부:', calc.isEligible ? '가능' : '불가능');
          console.log('  - 비율:', calc.rate, '(계약시간/40 × 8)');
          console.log('  - 계산 금액:', calc.amount?.toLocaleString(), '원');
          console.log('  - 계산식:', `(${calc.contractedHours} / 40) × 8 × ${monthlySalary.hourlyWage}`);
        }
        
        if (week1.holidayPayCalculation.adjusted) {
          const adj = week1.holidayPayCalculation.adjusted;
          console.log('');
          console.log('수정된 주휴수당:');
          console.log('  - 수정 금액:', adj.amount?.toLocaleString(), '원');
          console.log('  - 수정 사유:', adj.reason);
          console.log('  - 수정 메모:', adj.notes);
          console.log('  - 수정일:', adj.adjustedAt);
          console.log('  - 수정자:', adj.adjustedBy);
        }
      }
      
      if (week1.holidayPaySettings) {
        console.log('');
        console.log('=== 주휴수당 설정 ===');
        console.log('확정일:', week1.holidayPaySettings.confirmedAt);
        console.log('확정자:', week1.holidayPaySettings.confirmedBy);
      }
    } else {
      console.log('1주차 정보를 찾을 수 없습니다.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
})();

