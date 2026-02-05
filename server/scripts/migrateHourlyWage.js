const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

// MongoDB 연결
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/convenience_store';
console.log('MongoDB URI:', mongoUri);

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateHourlyWage = async () => {
  try {
    console.log('시급 정보 마이그레이션을 시작합니다...');

    // 시급이 설정되지 않은 근무 일정 조회
    const schedulesWithoutWage = await WorkSchedule.find({
      $or: [
        { hourlyWage: { $exists: false } },
        { hourlyWage: 0 },
        { hourlyWage: null }
      ]
    });

    console.log(`시급 정보가 없는 근무 일정: ${schedulesWithoutWage.length}건`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const schedule of schedulesWithoutWage) {
      try {
        // 해당 사용자의 기본 시급 조회
        const user = await User.findById(schedule.userId);
        
        if (!user) {
          console.log(`사용자를 찾을 수 없음: ${schedule.userId}`);
          errorCount++;
          continue;
        }

        const defaultHourlyWage = user.hourlyWage || 0;
        
        // 시급과 총 급여 업데이트
        schedule.hourlyWage = defaultHourlyWage;
        if (schedule.totalHours) {
          schedule.totalPay = Math.round(schedule.totalHours * defaultHourlyWage);
        }
        
        await schedule.save();
        updatedCount++;
        
        console.log(`업데이트 완료: ${schedule._id} - 시급: ${defaultHourlyWage}원`);
        
      } catch (error) {
        console.error(`업데이트 실패: ${schedule._id}`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== 마이그레이션 완료 ===');
    console.log(`성공: ${updatedCount}건`);
    console.log(`실패: ${errorCount}건`);
    console.log(`총 처리: ${schedulesWithoutWage.length}건`);

    // 전체 통계
    const totalSchedules = await WorkSchedule.countDocuments();
    const schedulesWithWage = await WorkSchedule.countDocuments({ hourlyWage: { $gt: 0 } });
    
    console.log('\n=== 전체 통계 ===');
    console.log(`전체 근무 일정: ${totalSchedules}건`);
    console.log(`시급 설정된 일정: ${schedulesWithWage}건`);
    console.log(`시급 미설정 일정: ${totalSchedules - schedulesWithWage}건`);

  } catch (error) {
    console.error('마이그레이션 중 오류 발생:', error);
  } finally {
    mongoose.connection.close();
    console.log('데이터베이스 연결을 종료합니다.');
  }
};

// 스크립트 실행
migrateHourlyWage(); 