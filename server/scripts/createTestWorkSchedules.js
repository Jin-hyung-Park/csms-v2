const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const Store = require('../models/Store');

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/convenience_store_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function createTestWorkSchedules() {
  try {
    console.log('테스트 근무 일정 데이터 생성 시작...');

    // 사용자와 점포 정보 가져오기
    const user = await User.findOne({ email: 'employee@test.com' });
    const store = await Store.findOne({ name: 'CU 대치메가점' });

    if (!user) {
      console.log('사용자를 찾을 수 없습니다. 먼저 사용자를 생성해주세요.');
      return;
    }

    if (!store) {
      console.log('점포를 찾을 수 없습니다. 먼저 점포를 생성해주세요.');
      return;
    }

    console.log('사용자:', user._id);
    console.log('점포:', store._id);

    // 2025년 8월 근무 일정 데이터 생성
    const workSchedules = [];
    
    for (let day = 1; day <= 31; day++) {
      const workDate = new Date(2025, 7, day); // 8월 (0-based index)
      
      // 주말 제외 (토요일=6, 일요일=0)
      if (workDate.getDay() !== 0 && workDate.getDay() !== 6) {
        workSchedules.push({
          userId: user._id,
          storeId: store._id,
          workLocation: store.name,
          workDate: workDate,
          startTime: '09:00',
          endTime: '18:00',
          totalHours: 8,
          status: 'approved',
          breakTime: 1,
          overtimeHours: 0,
          hourlyWage: 10000,
          totalPay: 80000,
          notes: `2025년 8월 ${day}일 근무`
        });
      }
    }

    // 데이터베이스에 삽입
    const result = await WorkSchedule.insertMany(workSchedules);
    console.log(`${result.length}개의 근무 일정이 생성되었습니다.`);

    // 생성된 데이터 확인
    const count = await WorkSchedule.countDocuments({ storeId: store._id });
    console.log(`점포 ${store.name}의 총 근무 일정 수: ${count}`);

    mongoose.connection.close();
    console.log('테스트 데이터 생성 완료!');

  } catch (error) {
    console.error('오류 발생:', error);
    mongoose.connection.close();
  }
}

createTestWorkSchedules(); 