const mongoose = require('mongoose');
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

// 점포 매핑 정보 (기존 workLocation -> 새 점포명)
const storeMapping = {
  '대치메가점': '대치메가점',
  '삼성메가점': '삼성메가점'
};

const migrateWorkLocationToStore = async () => {
  try {
    logger.info('근로자 점포 정보 마이그레이션 시작...');

    // 1. 기존 점포 정보 확인
    const existingStores = await Store.find({});
    logger.info(`기존 점포 수: ${existingStores.length}`);

    // 2. 점포 매핑 생성
    const storeMap = {};
    for (const store of existingStores) {
      storeMap[store.name] = store._id;
    }

    // 3. workLocation이 있는 사용자들 조회
    const usersWithWorkLocation = await User.find({
      workLocation: { $exists: true, $ne: null }
    });

    logger.info(`마이그레이션 대상 사용자 수: ${usersWithWorkLocation.length}`);

    let successCount = 0;
    let errorCount = 0;

    // 4. 각 사용자의 workLocation을 storeId로 변경
    for (const user of usersWithWorkLocation) {
      try {
        const oldWorkLocation = user.workLocation;
        
        // 점포 ID 찾기
        const storeId = storeMap[oldWorkLocation];
        
        if (!storeId) {
          logger.warn(`점포를 찾을 수 없음: ${oldWorkLocation}, 사용자: ${user.username}`);
          errorCount++;
          continue;
        }

        // workLocation을 storeId로 변경
        user.storeId = storeId;
        user.workLocation = undefined; // 기존 필드 제거
        
        await user.save();
        
        logger.info(`사용자 ${user.username}의 점포 정보 마이그레이션 완료: ${oldWorkLocation} -> ${storeId}`);
        successCount++;
        
      } catch (error) {
        logger.error(`사용자 ${user.username} 마이그레이션 실패:`, error);
        errorCount++;
      }
    }

    // 5. workLocation 필드가 남아있는 사용자들 확인
    const remainingUsers = await User.find({
      workLocation: { $exists: true, $ne: null }
    });

    logger.info('=== 마이그레이션 결과 ===');
    logger.info(`성공: ${successCount}건`);
    logger.info(`실패: ${errorCount}건`);
    logger.info(`남은 workLocation 필드: ${remainingUsers.length}건`);

    if (remainingUsers.length > 0) {
      logger.warn('마이그레이션되지 않은 사용자들:');
      remainingUsers.forEach(user => {
        logger.warn(`- ${user.username}: ${user.workLocation}`);
      });
    }

    // 6. 스키마 검증
    const invalidUsers = await User.find({
      $or: [
        { role: 'employee', storeId: { $exists: false } },
        { role: 'manager', storeId: { $exists: false } }
      ],
      isActive: true
    });

    if (invalidUsers.length > 0) {
      logger.warn('점포 정보가 없는 활성 사용자들:');
      invalidUsers.forEach(user => {
        logger.warn(`- ${user.username} (${user.role})`);
      });
    }

    logger.info('마이그레이션 완료!');

  } catch (error) {
    logger.error('마이그레이션 중 오류 발생:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('데이터베이스 연결 종료');
  }
};

// 스크립트 실행
if (require.main === module) {
  connectDB().then(() => {
    migrateWorkLocationToStore();
  });
}

module.exports = { migrateWorkLocationToStore }; 