const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    logger.warn('Continuing without database connection...');
    // process.exit(1); // 데이터베이스 연결 실패 시에도 서버가 계속 실행되도록 주석 처리
  }
};

module.exports = connectDB; 