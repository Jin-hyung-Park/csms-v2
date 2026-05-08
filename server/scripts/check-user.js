#!/usr/bin/env node

/**
 * 특정 이메일 계정 존재 여부 확인
 *
 * 사용법 (로컬):
 *   node scripts/check-user.js
 *   node scripts/check-user.js yhs3571@naver.com
 *
 * 사용법 (AWS 등 원격 DB):
 *   MONGODB_URI="mongodb+srv://..." node scripts/check-user.js yhs3571@naver.com
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../src/lib/mongo');
const User = require('../src/models/User');

const email = process.argv[2] || 'yhs3571@naver.com';

async function main() {
  try {
    await connectDB();
    console.log(`\n🔍 조회 이메일: ${email}\n`);

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('-password')
      .populate('storeId', 'name storeCode');

    if (!user) {
      console.log('❌ 해당 이메일로 등록된 계정이 없습니다.');
      process.exit(1);
    }

    console.log('✅ 계정이 존재합니다.\n');
    console.log('  이름:', user.name);
    console.log('  이메일:', user.email);
    console.log('  역할:', user.role === 'owner' ? '점주' : '근로자');
    console.log('  활성:', user.isActive ? '예' : '아니오');
    if (user.storeId) {
      console.log('  소속 점포:', user.storeId.name, `(${user.storeId.storeCode})`);
    }
    console.log('  비밀번호: [해시 저장됨 - 원본 확인 불가]\n');
  } catch (err) {
    console.error('에러:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
