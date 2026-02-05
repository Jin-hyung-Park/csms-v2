const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const logger = require('../utils/logger');

// 데이터베이스 연결
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/csms');
    logger.info('MongoDB 연결 성공');
  } catch (error) {
    logger.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
};

// WorkSchedule에 workLocation 필드 추가
const addWorkLocationToSchedules = async () => {
  try {
    logger.info('WorkSchedule에 workLocation 필드 추가 시작...');

    // 모든 근무 일정 조회
    const schedules = await WorkSchedule.find().populate('userId', 'workLocation');
    
    let updatedCount = 0;
    
    for (const schedule of schedules) {
      if (!schedule.workLocation && schedule.userId?.workLocation) {
        schedule.workLocation = schedule.userId.workLocation;
        await schedule.save();
        updatedCount++;
        logger.info(`근무 일정 ${schedule._id} 업데이트: ${schedule.workLocation}`);
      }
    }

    logger.info(`총 ${updatedCount}건의 근무 일정이 업데이트되었습니다.`);

    // 업데이트 결과 확인
    const totalSchedules = await WorkSchedule.countDocuments();
    const schedulesWithLocation = await WorkSchedule.countDocuments({ workLocation: { $exists: true, $ne: null } });
    
    logger.info(`전체 근무 일정: ${totalSchedules}건`);
    logger.info(`workLocation이 있는 근무 일정: ${schedulesWithLocation}건`);

    // 점포별 근무 일정 수 확인
    const storeCounts = await WorkSchedule.aggregate([
      { $group: { _id: '$workLocation', count: { $sum: 1 } } }
    ]);
    logger.info('점포별 근무 일정 수:', storeCounts);

  } catch (error) {
    logger.error('WorkLocation 추가 실패:', error);
    throw error;
  }
};

// 스크립트 실행
const runScript = async () => {
  try {
    await connectDB();
    await addWorkLocationToSchedules();
    logger.info('모든 작업이 성공적으로 완료되었습니다.');
    process.exit(0);
  } catch (error) {
    logger.error('스크립트 실행 실패:', error);
    process.exit(1);
  }
};

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  runScript();
}

module.exports = { addWorkLocationToSchedules }; 