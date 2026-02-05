const mongoose = require('mongoose');
const Expense = require('../models/Expense');
require('dotenv').config();

const migratePaymentMethod = async () => {
  try {
    // MongoDB 연결
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB 연결 성공');

    // paymentMethod가 없는 지출 항목들을 찾아서 업데이트
    const expenses = await Expense.find({
      'expenses.paymentMethod': { $exists: false }
    });

    console.log(`업데이트할 지출 데이터 수: ${expenses.length}`);

    let updatedCount = 0;
    for (const expense of expenses) {
      let hasChanges = false;
      
      if (expense.expenses && expense.expenses.length > 0) {
        for (const expenseItem of expense.expenses) {
          if (!expenseItem.paymentMethod) {
            expenseItem.paymentMethod = '카드'; // 기본값으로 카드 설정
            hasChanges = true;
          }
        }
      }
      
      if (hasChanges) {
        await expense.save();
        updatedCount++;
        console.log(`업데이트 완료: ${expense._id}`);
      }
    }

    console.log(`총 ${updatedCount}개의 지출 데이터가 업데이트되었습니다.`);
    
  } catch (error) {
    console.error('마이그레이션 오류:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB 연결 종료');
  }
};

// 스크립트 실행
if (require.main === module) {
  migratePaymentMethod();
}

module.exports = migratePaymentMethod; 