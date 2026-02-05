const mongoose = require('mongoose');
const MonthlySalary = require('../models/MonthlySalary');
require('dotenv').config();

// 주차 시작일을 월요일 기준으로 수정하는 함수
const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekDateRange = (monthStart, weekNumber) => {
  if (weekNumber === 1) {
    const firstDay = new Date(monthStart);
    const firstDayOfWeek = firstDay.getDay();
    const daysToMonday = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
    const weekStart = new Date(firstDay);
    weekStart.setDate(firstDay.getDate() + daysToMonday);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    return {
      startDate: formatLocalDate(weekStart),
      endDate: formatLocalDate(weekEnd)
    };
  }
  return null;
};

async function fixWeeklyStartDates() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/convenience_store');
    console.log('MongoDB 연결 완료');

    // 2025년 9월 데이터만 삭제하고 재생성하도록 안내
    const monthlySalaries = await MonthlySalary.find({
      year: 2025,
      month: 9
    });

    console.log(`총 ${monthlySalaries.length}개의 레코드를 삭제합니다.`);
    console.log('※ 주의: 기존 레코드를 삭제하면 주휴수당 계산 시 새로 생성됩니다.');

    for (const monthlySalary of monthlySalaries) {
      if (monthlySalary.weeklyDetails.length > 0) {
        const firstWeek = monthlySalary.weeklyDetails[0];
        
        if (firstWeek.startDate === '2025-08-31' || firstWeek.startDate === '2025-09-01') {
          console.log(`삭제: ${monthlySalary.employeeName} (${monthlySalary.year}-${monthlySalary.month})`);
          console.log(`  주차 시작일: ${firstWeek.startDate}`);
          
          await MonthlySalary.deleteOne({ _id: monthlySalary._id });
          console.log(`  삭제 완료!`);
        }
      }
    }

    console.log('\n모든 레코드 삭제 완료!');
    console.log('이제 주휴수당 계산 API를 호출하면 올바른 주차 데이터로 새로 생성됩니다.');
    process.exit(0);
  } catch (error) {
    console.error('오류 발생:', error);
    process.exit(1);
  }
}

fixWeeklyStartDates();

