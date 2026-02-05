const mongoose = require('mongoose');
const Store = require('../models/Store');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const createTestStores = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공');

    // 테스트용 점주 사용자 생성 (이미 존재하는 경우 사용)
    let owner = await User.findOne({ role: 'owner' });
    
    if (!owner) {
      owner = await User.create({
        username: '테스트점주',
        email: 'owner@test.com',
        password: '123456',
        role: 'owner'
      });
      console.log('테스트 점주 생성:', owner.username);
    } else {
      console.log('기존 점주 사용:', owner.username);
    }

    // 기존 테스트 점포 삭제
    await Store.deleteMany({ ownerId: owner._id });
    console.log('기존 테스트 점포 삭제 완료');

    // 테스트 점포 생성
    const testStores = [
      {
        ownerId: owner._id,
        name: '대치메가점',
        address: '서울특별시 강남구 대치동 123-45',
        ownerName: '김점주',
        businessNumber: '123-45-67890',
        description: '대치동 편의점'
      },
      {
        ownerId: owner._id,
        name: '삼성메가점',
        address: '서울특별시 강남구 삼성동 456-78',
        ownerName: '김점주',
        businessNumber: '123-45-67891',
        description: '삼성동 편의점'
      },
      {
        ownerId: owner._id,
        name: '역삼메가점',
        address: '서울특별시 강남구 역삼동 789-12',
        ownerName: '김점주',
        businessNumber: '123-45-67892',
        description: '역삼동 편의점'
      }
    ];

    const createdStores = await Store.insertMany(testStores);
    console.log('테스트 점포 생성 완료:', createdStores.map(store => store.name));

    console.log('모든 테스트 데이터 생성 완료!');
    process.exit(0);
  } catch (error) {
    console.error('테스트 데이터 생성 실패:', error);
    process.exit(1);
  }
};

createTestStores(); 