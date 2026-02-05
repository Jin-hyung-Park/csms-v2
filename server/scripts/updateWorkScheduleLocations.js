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

// WorkSchedule의 workLocation 업데이트
const updateWorkScheduleLocations = async () => {
  try {
    logger.info('WorkSchedule workLocation 업데이트 시작...');

    // 1. 대치메가점을 CU 대치메가점으로 업데이트
    const daejiUpdateResult = await WorkSchedule.updateMany(
      { workLocation: '대치메가점' },
      { $set: { workLocation: 'CU 대치메가점' } }
    );
    logger.info(`대치메가점 업데이트: ${daejiUpdateResult.modifiedCount}건`);

    // 2. 삼성메가점을 CU 삼성메가점으로 업데이트
    const samsungUpdateResult = await WorkSchedule.updateMany(
      { workLocation: '삼성메가점' },
      { $set: { workLocation: 'CU 삼성메가점' } }
    );
    logger.info(`삼성메가점 업데이트: ${samsungUpdateResult.modifiedCount}건`);

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

    // 최근 근무 일정 5건 확인
    const recentSchedules = await WorkSchedule.find()
      .populate('userId', 'username')
      .sort({ workDate: -1 })
      .limit(5);
    logger.info('최근 근무 일정 5건:', recentSchedules.map(s => ({
      id: s._id,
      username: s.userId?.username,
      workDate: s.workDate,
      status: s.status,
      workLocation: s.workLocation
    })));

  } catch (error) {
    logger.error('WorkLocation 업데이트 실패:', error);
    throw error;
  }
};

// 스크립트 실행
const runScript = async () => {
  try {
    await connectDB();
    await updateWorkScheduleLocations();
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

module.exports = { updateWorkScheduleLocations }; 