/**
 * WorkSchedule API 인증 통합 테스트
 * 인증이 적용된 후의 WorkSchedule API 테스트
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../lib/mongo');
const app = require('../app');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
const { generateToken } = require('../utils/jwt');

describe('WorkSchedule API 인증 테스트', () => {
  let employeeUser;
  let ownerUser;
  let employeeToken;
  let ownerToken;
  let testStoreId;

  beforeAll(async () => {
    await connectDB();
    
    // 기존 테스트 데이터 정리
    await WorkSchedule.deleteMany({});
    await User.deleteMany({ email: /@test\.com$/ });
    await Store.deleteMany({ name: /테스트/ });

    // 테스트용 사용자 생성 (점주를 먼저 생성해야 Store의 ownerId에 사용 가능)
    ownerUser = await User.create({
      name: '테스트 점주',
      email: 'test-owner@test.com',
      password: 'password123',
      role: 'owner',
    });

    // 테스트용 점포 생성 (ownerId 필수)
    const testStore = await Store.create({
      name: '테스트 점포',
      address: '테스트 주소',
      phone: '031-0000-0000',
      ownerId: ownerUser._id,
    });
    testStoreId = testStore._id;

    // 테스트용 근로자 생성
    employeeUser = await User.create({
      name: '테스트 근로자',
      email: 'test-employee@test.com',
      password: 'password123',
      role: 'employee',
      storeId: testStoreId, // 근로자는 storeId 필요
    });

    // 토큰 생성
    employeeToken = generateToken({
      userId: employeeUser._id.toString(),
      email: employeeUser.email,
      role: employeeUser.role,
    });

    ownerToken = generateToken({
      userId: ownerUser._id.toString(),
      email: ownerUser.email,
      role: ownerUser.role,
    });
  });

  afterAll(async () => {
    await WorkSchedule.deleteMany({});
    await User.deleteMany({ email: /@test\.com$/ });
    await Store.deleteMany({ name: /테스트/ });
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('인증 필수 확인', () => {
    it('토큰 없이 근무일정 조회 시 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/work-schedule')
        .expect(401);

      expect(response.body.message).toContain('인증 토큰');
    });

    it('토큰 없이 근무일정 생성 시 401 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/work-schedule')
        .send({
          workDate: '2025-11-20',
          startTime: '09:00',
          endTime: '18:00',
        })
        .expect(401);

      expect(response.body.message).toContain('인증 토큰');
    });
  });

  describe('근로자 권한 테스트', () => {
    it('근로자는 자신의 근무일정만 조회할 수 있어야 함', async () => {
      // 근로자의 근무일정 생성
      const schedule = await WorkSchedule.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        workDate: new Date('2025-11-20'),
        startTime: '09:00',
        endTime: '18:00',
        status: 'pending',
      });

      const response = await request(app)
        .get('/api/work-schedule')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      // 모든 항목이 해당 근로자의 것인지 확인
      response.body.items.forEach((item) => {
        expect(item.userId.toString()).toBe(employeeUser._id.toString());
      });

      await WorkSchedule.findByIdAndDelete(schedule._id);
    });

    it('근로자는 자신의 근무일정만 생성할 수 있어야 함', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const workDate = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .post('/api/work-schedule')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          workDate,
          startTime: '09:00',
          endTime: '18:00',
          storeId: testStoreId, // storeId 명시적 제공
        })
        .expect(201);

      expect(response.body.schedule.userId.toString()).toBe(employeeUser._id.toString());
      
      // 정리
      await WorkSchedule.findByIdAndDelete(response.body.schedule._id);
    });
  });

  describe('점주 권한 테스트', () => {
    let ownerTestScheduleId;

    it('점주는 모든 근무일정을 조회할 수 있어야 함', async () => {
      // 여러 사용자의 근무일정 생성
      const schedule = await WorkSchedule.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        workDate: new Date('2025-11-21'),
        startTime: '09:00',
        endTime: '18:00',
        status: 'pending',
      });
      ownerTestScheduleId = schedule._id;

      const response = await request(app)
        .get('/api/work-schedule')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);
      
      // 정리
      await WorkSchedule.findByIdAndDelete(ownerTestScheduleId);
    });
  });
});

