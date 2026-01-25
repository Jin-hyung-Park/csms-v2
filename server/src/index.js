require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./lib/mongo');

const PORT = process.env.PORT || 5001;

async function bootstrap() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`CSMS ver2 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
  } catch (error) {
    console.error('서버 부팅 실패:', error.message);
    process.exit(1);
  }
}

bootstrap();

