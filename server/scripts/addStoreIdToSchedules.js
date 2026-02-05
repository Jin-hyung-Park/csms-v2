const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const Store = require('../models/Store');
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

// WorkSchedule에 storeId 추가
const addStoreIdToSchedules = async () => {
  try {
    logger.info('WorkSchedule에 storeId 추가 시작...');

    // 점포 정보 가져오기
    const stores = await Store.find();
    const storeMap = {};
    stores.forEach(store => {
      if (store.name === 'CU 대치메가점') {
        storeMap['CU 대치메가점'] = store._id;
      } else if (store.name === 'CU 삼성메가점') {
        storeMap['CU 삼성메가점'] = store._id;
      }
    });

    logger.info('점포 매핑:', storeMap);

    // 모든 근무 일정 조회
    const schedules = await WorkSchedule.find({ storeId: { $exists: false } });
    
    let updatedCount = 0;
    
    for (const schedule of schedules) {
      if (schedule.workLocation && storeMap[schedule.workLocation]) {
        schedule.storeId = storeMap[schedule.workLocation];
        await schedule.save();
        updatedCount++;
        logger.info(`근무 일정 ${schedule._id} 업데이트: ${schedule.workLocation} -> ${schedule.storeId}`);
      }
    }

    logger.info(`총 ${updatedCount}건의 근무 일정이 업데이트되었습니다.`);

    // 업데이트 결과 확인
    const totalSchedules = await WorkSchedule.countDocuments();
    const schedulesWithStoreId = await WorkSchedule.countDocuments({ storeId: { $exists: true, $ne: null } });
    
    logger.info(`전체 근무 일정: ${totalSchedules}건`);
    logger.info(`storeId가 있는 근무 일정: ${schedulesWithStoreId}건`);

    // 점포별 근무 일정 수 확인
    const storeCounts = await WorkSchedule.aggregate([
      { $group: { _id: '$workLocation', count: { $sum: 1 } } }
    ]);
    logger.info('점포별 근무 일정 수:', storeCounts);

    // 최근 근무 일정 3건 확인
    const recentSchedules = await WorkSchedule.find()
      .populate('userId', 'username')
      .populate('storeId', 'name')
      .sort({ workDate: -1 })
      .limit(3);
    logger.info('최근 근무 일정 3건:', recentSchedules.map(s => ({
      id: s._id,
      username: s.userId?.username,
      workDate: s.workDate,
      status: s.status,
      workLocation: s.workLocation,
      storeId: s.storeId,
      storeName: s.storeId?.name
    })));

  } catch (error) {
    logger.error('StoreId 추가 실패:', error);
    throw error;
  }
};

// 스크립트 실행
const runScript = async () => {
  try {
    await connectDB();
    await addStoreIdToSchedules();
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

module.exports = { addStoreIdToSchedules }; 