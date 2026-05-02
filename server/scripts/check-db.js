#!/usr/bin/env node

/**
 * DB 연결 및 사용자/점포 상태 확인 (로그인 문제 진단용)
 *
 * 사용법: node scripts/check-db.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Store = require('../src/models/Store');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI가 설정되지 않았습니다.');
    process.exit(1);
  }

  console.log('\n=== DB 상태 확인 ===\n');
  console.log('MONGODB_URI:', uri.replace(/:[^:@]+@/, ':****@'));

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ MongoDB 연결 성공');
    console.log('   DB 이름:', mongoose.connection.name);
    console.log('   호스트:', mongoose.connection.host);

    const userCount = await User.countDocuments();
    console.log('\n--- 사용자 (User) ---');
    console.log('총 사용자 수:', userCount);

    const users = await User.find({}).select('name email role isActive').lean().limit(20);
    if (users.length) {
      console.log('목록 (최대 20명):');
      users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} | ${u.name} | ${u.role} | isActive: ${u.isActive}`);
      });
    }

    const storeCount = await Store.countDocuments();
    console.log('\n--- 점포 (Store) ---');
    console.log('총 점포 수:', storeCount);

    await mongoose.connection.close();
    console.log('\n✅ 확인 완료\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ DB 오류:', err.message);
    if (err.reason) console.error('   상세:', err.reason);
    process.exit(1);
  }
}

main();
