const mongoose = require('mongoose');
const MonthlySalary = require('../models/MonthlySalary');
require('dotenv').config();

// MongoDB 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/convenience_store', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB 연결 성공');
  regenerateMonthlySalary();
}).catch(err => {
  console.error('MongoDB 연결 실패:', err);
  process.exit(1);
});

async function regenerateMonthlySalary() {
  try {
    const { userId, year, month } = process.argv.slice(2);
    
    if (!userId || !year || !month) {
      console.log('사용법: node regenerateMonthlySalary.js <userId> <year> <month>');
      console.log('예: node regenerateMonthlySalary.js 507f1f77bcf86cd799439011 2025 9');
      process.exit(1);
    }
    
    console.log(`김석원님의 ${year}년 ${month}월 MonthlySalary 데이터 삭제 중...`);
    
    const result = await MonthlySalary.deleteMany({
      userId: new mongoose.Types.ObjectId(userId),
      year: parseInt(year),
      month: parseInt(month)
    });
    
    console.log(`${result.deletedCount}개의 레코드가 삭제되었습니다.`);
    console.log('이제 산출 버튼을 누르면 올바르게 계산된 데이터로 새로 생성됩니다.');
    
    process.exit(0);
  } catch (error) {
    console.error('오류:', error);
    process.exit(1);
  }
}

