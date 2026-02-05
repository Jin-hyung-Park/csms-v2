const mongoose = require('mongoose');
const User = require('../models/User');
const WorkSchedule = require('../models/WorkSchedule');
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

// 매장명 마이그레이션 함수
const migrateStoreNames = async () => {
  try {
    logger.info('매장명 마이그레이션 시작...');

    // 1. User 모델의 workLocation 필드 업데이트
    const userUpdateResult = await User.updateMany(
      { workLocation: '대치메가점' },
      { $set: { workLocation: 'CU 대치메가점' } }
    );
    logger.info(`User 모델 업데이트: ${userUpdateResult.modifiedCount}건`);

    const userUpdateResult2 = await User.updateMany(
      { workLocation: '삼성메가점' },
      { $set: { workLocation: 'CU 삼성메가점' } }
    );
    logger.info(`User 모델 업데이트: ${userUpdateResult2.modifiedCount}건`);

    // 2. WorkSchedule 모델의 workLocation 필드 업데이트
    const scheduleUpdateResult = await WorkSchedule.updateMany(
      { workLocation: '대치메가점' },
      { $set: { workLocation: 'CU 대치메가점' } }
    );
    logger.info(`WorkSchedule 모델 업데이트: ${scheduleUpdateResult.modifiedCount}건`);

    const scheduleUpdateResult2 = await WorkSchedule.updateMany(
      { workLocation: '삼성메가점' },
      { $set: { workLocation: 'CU 삼성메가점' } }
    );
    logger.info(`WorkSchedule 모델 업데이트: ${scheduleUpdateResult2.modifiedCount}건`);

    // 3. Store 모델의 name 필드 업데이트
    const storeUpdateResult = await Store.updateMany(
      { name: '대치메가점' },
      { $set: { name: 'CU 대치메가점' } }
    );
    logger.info(`Store 모델 업데이트: ${storeUpdateResult.modifiedCount}건`);

    const storeUpdateResult2 = await Store.updateMany(
      { name: '삼성메가점' },
      { $set: { name: 'CU 삼성메가점' } }
    );
    logger.info(`Store 모델 업데이트: ${storeUpdateResult2.modifiedCount}건`);

    logger.info('매장명 마이그레이션 완료!');

    // 마이그레이션 결과 확인
    const userCount = await User.countDocuments({ workLocation: { $in: ['CU 대치메가점', 'CU 삼성메가점'] } });
    const scheduleCount = await WorkSchedule.countDocuments({ workLocation: { $in: ['CU 대치메가점', 'CU 삼성메가점'] } });
    const storeCount = await Store.countDocuments({ name: { $in: ['CU 대치메가점', 'CU 삼성메가점'] } });

    logger.info(`마이그레이션 결과 확인:`);
    logger.info(`- User: ${userCount}건`);
    logger.info(`- WorkSchedule: ${scheduleCount}건`);
    logger.info(`- Store: ${storeCount}건`);

  } catch (error) {
    logger.error('매장명 마이그레이션 실패:', error);
    throw error;
  }
};

// 스크립트 실행
const runMigration = async () => {
  try {
    await connectDB();
    await migrateStoreNames();
    logger.info('모든 마이그레이션이 성공적으로 완료되었습니다.');
    process.exit(0);
  } catch (error) {
    logger.error('마이그레이션 실행 실패:', error);
    process.exit(1);
  }
};

// 스크립트가 직접 실행될 때만 실행
if (require.main === module) {
  runMigration();
}

module.exports = { migrateStoreNames }; 