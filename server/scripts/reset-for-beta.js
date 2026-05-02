#!/usr/bin/env node

/**
 * 베타 테스트 준비: 기존 테스트 데이터 전부 삭제 후, 실사용을 위한 최소 데이터만 생성
 *
 * - 삭제: 알림, 근무일정, 월급, 사용자, 점포 (참조 순서 준수)
 * - 생성: 점주 1명, 매장코드 CU002 점포 1개 (삼성메가 베타용)
 * - 직원/근무일정/알림은 생성하지 않음 → 실 사용자가 회원가입 후 점주 승인으로 이용
 *
 * 사용법 (로컬):
 *   node scripts/reset-for-beta.js --confirm
 *
 * 사용법 (AWS 등 원격 DB):
 *   MONGODB_URI="mongodb+srv://..." node scripts/reset-for-beta.js --confirm
 *
 * ⚠️ --confirm 없이 실행하면 실제 삭제/생성 없이 예상 동작만 출력합니다.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../src/lib/mongo');

const User = require('../src/models/User');
const Store = require('../src/models/Store');
const WorkSchedule = require('../src/models/WorkSchedule');
const Notification = require('../src/models/Notification');
const MonthlySalary = require('../src/models/MonthlySalary');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function log(message) {
  console.log(`${colors.green}[베타준비]${colors.reset} ${message}`);
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

async function clearAllData() {
  log('기존 데이터 삭제 중 (참조 순서 준수)...');
  const [notif, schedule, salary, user, store] = await Promise.all([
    Notification.deleteMany({}),
    WorkSchedule.deleteMany({}),
    MonthlySalary.deleteMany({}),
    User.deleteMany({}),
    Store.deleteMany({}),
  ]);
  log(`삭제 완료: 알림 ${notif.deletedCount}, 근무일정 ${schedule.deletedCount}, 월급 ${salary.deletedCount}, 사용자 ${user.deletedCount}, 점포 ${store.deletedCount}`);
}

async function seedBetaMinimal() {
  log('베타용 최소 데이터 생성 중...');

  const owner = await User.create({
    name: '점주',
    email: process.env.BETA_OWNER_EMAIL || 'owner@cu002.local',
    password: process.env.BETA_OWNER_PASSWORD || 'change-me-after-first-login',
    phone: '',
    role: 'owner',
  });

  await Store.create({
    storeCode: 'CU002',
    name: 'CU 삼성메가점',
    address: '(베타) 주소는 점주가 수정 가능',
    phone: '',
    ownerId: owner._id,
    businessNumber: '',
    isActive: true,
    minimumWage: 10320,
  });

  log('점주 1명, 매장코드 CU002 점포 1개 생성 완료');
  return { owner };
}

async function main() {
  const confirm = process.argv.includes('--confirm') || process.argv.includes('-y');

  log('베타 테스트 준비 스크립트');
  info(`MONGODB_URI: ${process.env.MONGODB_URI ? '설정됨' : '설정 안 됨'}`);

  if (!confirm) {
    warn('실제 삭제/생성을 하려면 --confirm 또는 -y 옵션을 붙여 실행하세요.');
    info('예: node scripts/reset-for-beta.js --confirm');
    process.exit(0);
    return;
  }

  try {
    await connectDB();
    log('MongoDB 연결 성공');

    await clearAllData();
    const { owner } = await seedBetaMinimal();

    log('\n✅ 베타 준비 완료');
    info('생성된 데이터: 점주 1명, 점포 1개(매장코드 CU002)');
    info(`점주 로그인: ${owner.email} (첫 로그인 후 비밀번호 변경 권장)`);
    info('직원은 앱에서 회원가입 → 매장코드 CU002 검증 → 점주 승인 후 이용');

    process.exit(0);
  } catch (err) {
    error(`실패: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log('데이터베이스 연결 종료');
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, clearAllData, seedBetaMinimal };
