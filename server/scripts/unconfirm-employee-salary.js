#!/usr/bin/env node

/**
 * 특정 근로자의 특정 월 급여 "근로자 확인 완료" 상태만 취소 (DB 직접 수정)
 *
 * 사용법:
 *   node scripts/unconfirm-employee-salary.js
 *   node scripts/unconfirm-employee-salary.js 이수미 2026 2
 *
 * AWS EC2에서 (프로덕션 DB):
 *   cd /var/www/convenience-store && node scripts/unconfirm-employee-salary.js 이수미 2026 2
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const MonthlySalary = require('../src/models/MonthlySalary');

const employeeName = process.argv[2] || '이수미';
const year = parseInt(process.argv[3], 10) || 2026;
const month = parseInt(process.argv[4], 10) || 2;

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI가 설정되지 않았습니다.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`\n🔍 조회: 근로자 "${employeeName}", ${year}년 ${month}월\n`);

    const salary = await MonthlySalary.findOne({
      employeeName: { $regex: employeeName, $options: 'i' },
      year,
      month,
    });

    if (!salary) {
      console.log('❌ 해당 조건의 급여 데이터를 찾을 수 없습니다.');
      await mongoose.connection.close();
      process.exit(1);
    }

    if (!salary.employeeConfirmed) {
      console.log('ℹ️ 이미 "근로자 확인 완료" 상태가 아닙니다. 변경 없음.');
      await mongoose.connection.close();
      process.exit(0);
    }

    salary.employeeConfirmed = false;
    salary.employeeConfirmedAt = null;
    await salary.save();

    console.log('✅ 근로자 확인 완료가 취소되었습니다.');
    console.log(`   문서 ID: ${salary._id}`);
    console.log(`   ${salary.employeeName} ${year}년 ${month}월 → employeeConfirmed: false`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  }
}

main();
