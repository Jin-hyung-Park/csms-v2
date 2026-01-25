/**
 * 인증 API 통합 테스트
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../lib/mongo');
const app = require('../app');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

describe('인증 API 통합 테스트', () => {
  let testUser;
  let testToken;

  beforeAll(async () => {
    await connectDB();
    // 기존 테스트 데이터 정리
    await User.deleteMany({ email: /@test\.com$/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test\.com$/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/auth/register', () => {
    it('회원가입을 할 수 있어야 함', async () => {
      const payload = {
        name: '테스트 사용자',
        email: 'test-register@test.com',
        password: 'password123',
        phone: '010-1234-5678',
        role: 'employee',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(payload.email);
      expect(response.body.user.name).toBe(payload.name);
      expect(response.body.user).not.toHaveProperty('password');

      testUser = response.body.user;
      testToken = response.body.token;
    });

    it('필수 항목이 누락되면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: '테스트',
          // email, password 누락
        })
        .expect(400);

      expect(response.body.message).toContain('필수');
    });

    it('비밀번호가 6자 미만이면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: '테스트',
          email: 'test-short-password@test.com',
          password: '12345', // 5자
        })
        .expect(400);

      expect(response.body.message).toContain('6자');
    });

    it('이미 존재하는 이메일이면 409 에러를 반환해야 함', async () => {
      const payload = {
        name: '테스트',
        email: 'test-register@test.com', // 이미 존재
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(payload)
        .expect(409);

      expect(response.body.message).toContain('이미 사용 중');
    });

    it('올바르지 않은 이메일 형식이면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: '테스트',
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.message).toContain('이메일');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // 기존 테스트 로그인 사용자 삭제 후 생성
      await User.deleteOne({ email: 'test-login@test.com' });
      
      // 테스트용 사용자 생성
      testUser = await User.create({
        name: '테스트 로그인',
        email: 'test-login@test.com',
        password: 'password123',
        role: 'employee',
      });
    });

    it('올바른 이메일과 비밀번호로 로그인할 수 있어야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-login@test.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('test-login@test.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('잘못된 이메일이면 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@test.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.message).toContain('이메일 또는 비밀번호');
    });

    it('잘못된 비밀번호이면 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-login@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toContain('이메일 또는 비밀번호');
    });

    it('이메일과 비밀번호가 누락되면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('이메일과 비밀번호');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;
    let testMeUser;

    beforeEach(async () => {
      // 기존 테스트 Me 사용자 삭제 후 생성
      await User.deleteOne({ email: 'test-me@test.com' });
      
      // 테스트용 사용자와 토큰 생성
      testMeUser = await User.create({
        name: '테스트 Me',
        email: 'test-me@test.com',
        password: 'password123',
        role: 'employee',
      });

      authToken = generateToken({
        userId: testMeUser._id.toString(),
        email: testMeUser.email,
        role: testMeUser.role,
      });
    });

    it('유효한 토큰으로 사용자 정보를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test-me@test.com');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('토큰이 없으면 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.message).toContain('인증 토큰');
    });

    it('유효하지 않은 토큰이면 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toContain('유효하지 않은');
    });
  });
});

