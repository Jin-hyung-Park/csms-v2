#!/usr/bin/env node

/**
 * 특정 이메일 계정의 비밀번호 재설정
 * (비밀번호는 bcrypt 해시로 저장되므로 원본 조회는 불가, 새 비밀번호로만 변경 가능)
 *
 * 사용법 (로컬):
 *   node scripts/reset-password.js yhs3571@naver.com 새비밀번호
 *
 * 사용법 (AWS 등 원격 DB):
 *   MONGODB_URI="mongodb+srv://..." node scripts/reset-password.js yhs3571@naver.com 새비밀번호
 *
 * 비밀번호는 6자 이상이어야 합니다.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB } = require('../src/lib/mongo');
const User = require('../src/models/User');

const email = process.argv[2];
const newPassword = process.argv[3];

const MIN_PASSWORD_LENGTH = 6;

async function main() {
  if (!email || !newPassword) {
    console.error('사용법: node scripts/reset-password.js <이메일> <새비밀번호>');
    console.error('예: node scripts/reset-password.js yhs3571@naver.com myNewPass123');
    process.exit(1);
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    console.error(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
    process.exit(1);
  }

  try {
    await connectDB();
    console.log(`\n🔐 비밀번호 재설정: ${email}\n`);

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!user) {
      console.log('❌ 해당 이메일로 등록된 계정이 없습니다.');
      process.exit(1);
    }

    user.password = newPassword;
    await user.save(); // pre-save 훅에서 자동 해싱됨

    console.log('✅ 비밀번호가 변경되었습니다.');
    console.log('   이메일:', user.email);
    console.log('   새 비밀번호로 로그인해 보세요.\n');
  } catch (err) {
    console.error('에러:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

main();
