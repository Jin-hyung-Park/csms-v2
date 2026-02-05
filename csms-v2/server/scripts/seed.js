#!/usr/bin/env node

/**
 * Phase 0: 초기 테스트 데이터 시딩 스크립트
 * 
 * 사용법:
 *   node scripts/seed.js
 *   node scripts/seed.js --clear  (기존 데이터 삭제 후 시딩)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../src/lib/mongo');

const User = require('../src/models/User');
const Store = require('../src/models/Store');
const WorkSchedule = require('../src/models/WorkSchedule');
const Notification = require('../src/models/Notification');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message) {
  console.log(`${colors.green}[시딩]${colors.reset} ${message}`);
}

function error(message) {
  console.error(`${colors.red}[에러]${colors.reset} ${message}`);
}

function warn(message) {
  console.warn(`${colors.yellow}[경고]${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}[정보]${colors.reset} ${message}`);
}

async function clearDatabase() {
  log('기존 데이터 삭제 중...');
  await Notification.deleteMany({});
  await WorkSchedule.deleteMany({});
  await User.deleteMany({});
  await Store.deleteMany({});
  log('기존 데이터 삭제 완료');
}

async function seedOwner() {
  log('점주 생성 중...');
  const owner = await User.create({
    name: '이영희',
    email: 'owner@test.com',
    password: 'password123',
    phone: '010-3456-7890',
    role: 'owner',
  });
  log('점주 생성 완료');
  return owner;
}

async function seedEmployees(stores) {
  log('직원 데이터 생성 중...');

  const store1 = stores[0];
  const store2 = stores[1];

  const employeeData = [
    {
      name: '홍길동',
      email: 'employee1@test.com',
      password: 'password123', // pre-save hook에서 자동 해싱
      phone: '010-1234-5678',
      role: 'employee',
      storeId: store1._id,
      approvalStatus: 'approved',
      hourlyWage: 10320,
      taxType: 'business-income',
      position: '파트타이머',
      workSchedule: {
        monday: { enabled: true, startTime: '18:00', endTime: '23:00' },
        tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        wednesday: { enabled: true, startTime: '18:00', endTime: '23:00' },
        thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        friday: { enabled: true, startTime: '18:00', endTime: '23:00' },
        saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      },
    },
    {
      name: '김철수',
      email: 'employee2@test.com',
      password: 'password123',
      phone: '010-2345-6789',
      role: 'employee',
      storeId: store2._id,
      approvalStatus: 'approved',
      hourlyWage: 11000,
      taxType: 'business-income',
      position: '파트타이머',
      workSchedule: {
        monday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        tuesday: { enabled: true, startTime: '09:00', endTime: '18:00' },
        wednesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        thursday: { enabled: true, startTime: '09:00', endTime: '18:00' },
        friday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        saturday: { enabled: true, startTime: '09:00', endTime: '18:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      },
    },
    {
      name: '승인대기',
      email: 'pending@test.com',
      password: 'password123',
      phone: '010-9999-9999',
      role: 'employee',
      storeId: store1._id,
      approvalStatus: 'pending',
      hourlyWage: 10320,
      taxType: 'none',
      position: '파트타이머',
    },
  ];

  const createdEmployees = [];
  for (const userInfo of employeeData) {
    const user = await User.create(userInfo);
    createdEmployees.push(user);
  }

  log(`${createdEmployees.length}명의 직원 생성 완료`);
  info('테스트 계정 비밀번호: password123');
  info('매장코드: PG001(판교역점), SJ002(수지구청점) / 승인대기 계정: pending@test.com');
  return createdEmployees;
}

async function seedStores(owner) {
  log('점포 데이터 생성 중...');

  const stores = [
    {
      storeCode: 'PG001',
      name: 'CSMS 판교역점',
      address: '경기도 성남시 분당구 판교역로 10',
      phone: '031-1234-5678',
      ownerId: owner._id,
      businessNumber: '123-45-67890',
    },
    {
      storeCode: 'SJ002',
      name: 'CSMS 수지구청점',
      address: '경기도 용인시 기흥구 죽전로 123',
      phone: '031-2345-6789',
      ownerId: owner._id,
      businessNumber: '234-56-78901',
    },
  ];

  const createdStores = await Store.insertMany(stores);
  log(`${createdStores.length}개의 점포 생성 완료`);
  return createdStores;
}

async function seedWorkSchedules(users, stores) {
  log('근무일정 데이터 생성 중...');

  const employee1 = users.find((u) => u.email === 'employee1@test.com');
  const employee2 = users.find((u) => u.email === 'employee2@test.com');
  const store1 = stores[0];
  const store2 = stores[1];

  // 오늘부터 2주치 근무일정 생성
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const schedules = [];

  // 근로자1: 이번 주 + 다음 주
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // 월, 수, 금만
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      schedules.push({
        userId: employee1._id,
        storeId: store1._id,
        workDate: date,
        startTime: '18:00',
        endTime: '23:00',
        status: i < 3 ? 'approved' : 'pending', // 처음 3개는 승인, 나머지는 대기
        notes: i < 3 ? '승인 완료된 근무' : '',
      });
    }
  }

  // 근로자2: 화, 목, 토
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6) {
      schedules.push({
        userId: employee2._id,
        storeId: store2._id,
        workDate: date,
        startTime: '09:00',
        endTime: '18:00',
        status: i < 2 ? 'approved' : 'pending',
        notes: i < 2 ? '승인 완료' : '',
      });
    }
  }

  // 과거 데이터도 몇 개 추가
  for (let i = 1; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      schedules.push({
        userId: employee1._id,
        storeId: store1._id,
        workDate: date,
        startTime: '18:00',
        endTime: '23:00',
        status: 'approved',
        notes: '과거 근무 데이터',
      });
    }
  }

  const createdSchedules = await WorkSchedule.insertMany(schedules);
  log(`${createdSchedules.length}개의 근무일정 생성 완료`);

  return createdSchedules;
}

async function seedNotifications(users) {
  log('알림 샘플 데이터 생성 중...');

  const employee1 = users.find((u) => u.email === 'employee1@test.com');
  if (!employee1) return [];

  const today = new Date();
  const notifications = [
    {
      userId: employee1._id,
      type: 'schedule_approved',
      title: '근무일정이 승인되었습니다.',
      message: `${today.toLocaleDateString('ko-KR')} CU 죽전점 근무일정이 승인되었습니다.`,
      isRead: false,
    },
    {
      userId: employee1._id,
      type: 'salary_confirmed',
      title: '급여가 확정되었습니다.',
      message: `${today.getFullYear()}년 ${today.getMonth()}월 급여가 확정되었습니다.`,
      isRead: true,
    },
  ];

  const created = await Notification.insertMany(notifications);
  log(`${created.length}개의 알림 생성 완료`);
  return created;
}


async function main() {
  try {
    const clearFlag = process.argv.includes('--clear') || process.argv.includes('-c');

    log('데이터베이스 시딩 시작...');
    info(`MongoDB URI: ${process.env.MONGODB_URI ? '설정됨' : '설정 안 됨'}`);

    // MongoDB 연결
    await connectDB();
    log('MongoDB 연결 성공');

    // 기존 데이터 삭제 (옵션)
    if (clearFlag) {
      await clearDatabase();
    }

    // 데이터 생성: 점주 → 점포 → 직원(storeId 포함)
    const owner = await seedOwner();
    const stores = await seedStores(owner);
    const employees = await seedEmployees(stores);
    const users = [owner, ...employees];

    const schedules = await seedWorkSchedules(users, stores);
    const notifications = await seedNotifications(users);

    // 결과 요약
    log('\n✅ 시딩 완료!');
    info(`생성된 데이터:`);
    info(`  - 사용자: ${users.length}명 (점주 1, 직원 ${employees.length})`);
    info(`  - 점포: ${stores.length}개`);
    info(`  - 근무일정: ${schedules.length}개`);
    info(`  - 알림: ${notifications.length}개`);
    info(`\n테스트 계정:`);
    info(`  - 점주: ${owner.email}`);
    info(`  - 근로자1: employee1@test.com / 근로자2: employee2@test.com`);
    info(`  - 승인대기: pending@test.com (직원 → 점주 승인 후 이용)`);

    process.exit(0);
  } catch (error) {
    error(`시딩 실패: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('데이터베이스 연결 종료');
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  main();
}

module.exports = { main };

