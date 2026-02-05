const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MonthlySalary = require('../models/MonthlySalary');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB 연결 완료');
    
    const monthlySalary = await MonthlySalary.findOne({
      userId: '68b41109cf2fd2b5e10e2195',
      year: 2025,
      month: 9
    });
    
    if (!monthlySalary) {
      console.log('급여 정보를 찾을 수 없습니다.');
      process.exit(0);
    }
    
    console.log('=== 알리사님 2025년 9월 급여 정보 ===');
    console.log('직원명:', monthlySalary.employeeName);
    console.log('총 주휴수당:', monthlySalary.totalHolidayPay?.toLocaleString(), '원');
    console.log('총 급여:', monthlySalary.totalGrossPay?.toLocaleString(), '원');
    console.log('');
    console.log('주차별 주휴수당:');
    monthlySalary.weeklyDetails.forEach(week => {
      console.log(`  ${week.weekNumber}주차 (${week.startDate}):`);
      console.log(`    - 근무시간: ${week.workHours}시간`);
      console.log(`    - 근무일수: ${week.workDays}일`);
      console.log(`    - 주휴수당: ${week.holidayPay?.toLocaleString()}원`);
      console.log(`    - 상태: ${week.holidayPayStatus}`);
      if (week.holidayPayCalculation) {
        console.log(`    - 계산 정보:`, JSON.stringify(week.holidayPayCalculation, null, 2));
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
})();

