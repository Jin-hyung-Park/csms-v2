// MongoDB 연결 테스트 스크립트
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  MongoDB 연결 테스트');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const MONGODB_URI = process.env.MONGODB_URI;
console.log('📍 연결 URI:', MONGODB_URI);
console.log('');

async function testConnection() {
  try {
    console.log('🔄 MongoDB 연결 시도 중...');
    
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ MongoDB 연결 성공!');
    console.log('');
    console.log('📊 연결 정보:');
    console.log('  - Host:', conn.connection.host);
    console.log('  - Port:', conn.connection.port);
    console.log('  - Database:', conn.connection.name);
    console.log('  - Ready State:', conn.connection.readyState === 1 ? '연결됨' : '연결 안됨');
    console.log('');

    // 데이터베이스 컬렉션 목록 확인
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📁 데이터베이스 컬렉션:', collections.length, '개');
    collections.forEach(col => {
      console.log('  -', col.name);
    });

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 모든 테스트 통과!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ MongoDB 연결 실패!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('오류 메시지:', error.message);
    console.log('');
    console.log('해결 방법:');
    console.log('  1. MongoDB가 실행 중인지 확인:');
    console.log('     brew services list | grep mongodb');
    console.log('');
    console.log('  2. MongoDB 시작:');
    console.log('     brew services start mongodb-community');
    console.log('');
    console.log('  3. 연결 문자열 확인:');
    console.log('     cat .env | grep MONGODB_URI');
    console.log('');
    
    process.exit(1);
  }
}

testConnection();

