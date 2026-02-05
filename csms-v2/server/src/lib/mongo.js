const mongoose = require('mongoose');

let cachedConnection;

async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI is not defined. .env 파일을 확인해주세요.');
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  mongoose.set('strictQuery', true);

  try {
    cachedConnection = await mongoose.connect(uri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 10000, // 10초로 증가
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB 연결 완료');
      console.log(`   데이터베이스: ${mongoose.connection.name}`);
      console.log(`   호스트: ${mongoose.connection.host}`);
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ MongoDB 연결 에러:', error.message);
    });

    mongoose.connection.on('disconnected', () => {
      // 테스트 환경에서는 경고 숨김 (정상적인 동작)
      if (process.env.NODE_ENV !== 'test') {
        console.warn('⚠️  MongoDB 연결 끊김');
      }
    });

    return cachedConnection;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error.message);
    throw error;
  }
}

module.exports = { connectDB };

