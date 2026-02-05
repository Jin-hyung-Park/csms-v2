const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const Store = require('../models/Store');
const User = require('../models/User');

// MongoDB 연결
mongoose.connect('mongodb://localhost:27017/convenience_store', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixWorkScheduleStoreId() {
  try {
    console.log('근무 일정 storeId 수정 시작...');

    // 점포 정보 가져오기
    const stores = await Store.find();
    console.log('점포 목록:', stores.map(s => ({ id: s._id, name: s.name })));

    if (stores.length === 0) {
      console.log('점포가 없습니다. 먼저 점포를 생성해주세요.');
      return;
    }

    // 사용자 정보 가져오기
    const users = await User.find({ role: { $in: ['employee', 'manager'] } });
    console.log('근로자 목록:', users.map(u => ({ id: u._id, name: u.username, storeId: u.storeId })));

    // storeId가 없는 근무 일정들 찾기
    const schedulesWithoutStoreId = await WorkSchedule.find({ storeId: { $exists: false } });
    console.log(`storeId가 없는 근무 일정 수: ${schedulesWithoutStoreId.length}`);

    // 각 근무 일정에 대해 storeId 설정
    let updatedCount = 0;
    for (const schedule of schedulesWithoutStoreId) {
      // 해당 사용자의 storeId 찾기
      const user = users.find(u => u._id.toString() === schedule.userId.toString());
      
      if (user && user.storeId) {
        // 사용자의 storeId로 업데이트
        await WorkSchedule.updateOne(
          { _id: schedule._id },
          { storeId: user.storeId }
        );
        console.log(`근무 일정 ${schedule._id} 업데이트: ${user.storeId}`);
        updatedCount++;
      } else if (stores.length > 0) {
        // 사용자의 storeId가 없으면 첫 번째 점포로 설정
        await WorkSchedule.updateOne(
          { _id: schedule._id },
          { storeId: stores[0]._id }
        );
        console.log(`근무 일정 ${schedule._id} 업데이트: ${stores[0]._id} (기본값)`);
        updatedCount++;
      }
    }

    // storeId가 null인 근무 일정들도 업데이트
    const schedulesWithNullStoreId = await WorkSchedule.find({ storeId: null });
    console.log(`storeId가 null인 근무 일정 수: ${schedulesWithNullStoreId.length}`);

    for (const schedule of schedulesWithNullStoreId) {
      const user = users.find(u => u._id.toString() === schedule.userId.toString());
      
      if (user && user.storeId) {
        await WorkSchedule.updateOne(
          { _id: schedule._id },
          { storeId: user.storeId }
        );
        console.log(`근무 일정 ${schedule._id} 업데이트: ${user.storeId}`);
        updatedCount++;
      } else if (stores.length > 0) {
        await WorkSchedule.updateOne(
          { _id: schedule._id },
          { storeId: stores[0]._id }
        );
        console.log(`근무 일정 ${schedule._id} 업데이트: ${stores[0]._id} (기본값)`);
        updatedCount++;
      }
    }

    console.log(`총 ${updatedCount}개의 근무 일정이 업데이트되었습니다.`);

    // 업데이트 후 확인
    const allSchedules = await WorkSchedule.find().limit(5);
    console.log('업데이트 후 근무 일정 샘플:');
    allSchedules.forEach(schedule => {
      console.log(`- ID: ${schedule._id}, storeId: ${schedule.storeId}`);
    });

    mongoose.connection.close();
    console.log('근무 일정 storeId 수정 완료!');

  } catch (error) {
    console.error('오류 발생:', error);
    mongoose.connection.close();
  }
}

fixWorkScheduleStoreId(); 