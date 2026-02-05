/**
 * 사용자 테스트용 계정 생성 (배포 후 1회 실행 권장)
 * - 점주: owner@test.com / 123456
 * - 직원: employee@test.com / 123456 (점주가 만든 점포 1곳에 소속)
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Store = require('../models/Store');

async function createUserTestAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/convenience_store');
    console.log('MongoDB 연결 성공');

    let owner = await User.findOne({ email: 'owner@test.com' });
    if (!owner) {
      owner = await User.create({
        username: '테스트점주',
        email: 'owner@test.com',
        password: '123456',
        role: 'owner'
      });
      console.log('테스트 점주 생성: owner@test.com');
    } else {
      console.log('기존 점주 사용: owner@test.com');
    }

    let store = await Store.findOne({ ownerId: owner._id });
    if (!store) {
      store = await Store.create({
        ownerId: owner._id,
        name: '테스트점',
        address: '서울특별시 강남구 테스트동 1',
        ownerName: owner.username,
        businessNumber: '000-00-00000'
      });
      console.log('테스트 점포 생성:', store.name);
    }

    let employee = await User.findOne({ email: 'employee@test.com' });
    if (!employee) {
      employee = await User.create({
        username: '테스트직원',
        email: 'employee@test.com',
        password: '123456',
        role: 'employee',
        storeId: store._id,
        hourlyWage: 10030,
        taxType: '미신고'
      });
      console.log('테스트 직원 생성: employee@test.com');
    } else {
      console.log('기존 직원 사용: employee@test.com');
    }

    console.log('사용자 테스트 계정 준비 완료.');
    console.log('  점주: owner@test.com / 123456');
    console.log('  직원: employee@test.com / 123456');
    process.exit(0);
  } catch (err) {
    console.error('테스트 계정 생성 실패:', err);
    process.exit(1);
  }
}

createUserTestAccounts();
