const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB 연결 완료');
    console.log('');
    
    // 김석원님의 userId 찾기
    const user = await User.findOne({ username: '김석원' });
    if (!user) {
      console.log('김석원님을 찾을 수 없습니다.');
      process.exit(0);
    }
    
    console.log('=== 김석원님 정보 ===');
    console.log('User ID:', user._id.toString());
    console.log('이름:', user.username);
    console.log('');
    
    // 9월 1주차 (9월 1일 ~ 9월 7일) 근무 일정 조회
    const weekStart = new Date(2025, 8, 1); // 9월 1일
    const weekEnd = new Date(2025, 8, 7, 23, 59, 59, 999); // 9월 7일
    
    console.log('=== 9월 1주차 (9/1 ~ 9/7) 근무 일정 ===');
    console.log('조회 기간:', weekStart.toISOString().split('T')[0], '~', weekEnd.toISOString().split('T')[0]);
    console.log('');
    
    const schedules = await WorkSchedule.find({
      userId: user._id,
      workDate: {
        $gte: weekStart,
        $lte: weekEnd
      }
    }).sort({ workDate: 1 });
    
    console.log('총 근무 일정 수:', schedules.length);
    console.log('');
    
    schedules.forEach((schedule, index) => {
      const workDate = new Date(schedule.workDate);
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][workDate.getDay()];
      
      console.log(`${index + 1}. ${workDate.toISOString().split('T')[0]} (${dayOfWeek})`);
      console.log(`   시작: ${schedule.startTime}`);
      console.log(`   종료: ${schedule.endTime}`);
      console.log(`   상태: ${schedule.status}`);
      console.log(`   근무시간: ${schedule.totalHours || 'N/A'}`);
      console.log('');
    });
    
    // 승인된 일정만 필터링
    const approvedSchedules = schedules.filter(s => s.status === 'approved');
    console.log('승인된 일정 수:', approvedSchedules.length);
    
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
})();

