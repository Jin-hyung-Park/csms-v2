// Jest 테스트 환경 설정

// 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.PORT = '5002'; // 테스트용 포트 (기본 포트와 분리)
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csms_ver2_test';

// dotenv 로드 (테스트용 .env.test가 있으면 우선)
require('dotenv').config({ path: '.env.test' });

// Jest 비동기 처리 개선
jest.setTimeout(30000); // 30초 타임아웃

// 테스트 전후 로깅
beforeAll(() => {
  console.log('🧪 테스트 시작...');
});

afterAll(() => {
  console.log('✅ 테스트 완료');
});

