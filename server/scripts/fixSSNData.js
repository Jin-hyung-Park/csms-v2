const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// 데이터베이스 연결
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/convenience_store', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fixSSNData = async () => {
  try {
    console.log('주민번호 데이터 복원을 시작합니다...');
    
    // 마스킹된 주민번호를 가진 사용자들을 찾습니다
    const usersWithMaskedSSN = await User.find({
      ssn: { $regex: /\*\*\*-\*\*\*\*\*\*\*/ }
    });
    
    console.log(`마스킹된 주민번호를 가진 사용자 수: ${usersWithMaskedSSN.length}`);
    
    if (usersWithMaskedSSN.length === 0) {
      console.log('복원할 주민번호 데이터가 없습니다.');
      return;
    }
    
    // 각 사용자에 대해 주민번호를 '정보 없음'으로 설정
    for (const user of usersWithMaskedSSN) {
      console.log(`사용자 ${user.username}의 주민번호를 '정보 없음'으로 설정합니다.`);
      user.ssn = '정보 없음';
      await user.save();
    }
    
    console.log('주민번호 데이터 복원이 완료되었습니다.');
    
  } catch (error) {
    console.error('주민번호 데이터 복원 중 오류 발생:', error);
  } finally {
    mongoose.connection.close();
  }
};

// 스크립트 실행
fixSSNData(); 