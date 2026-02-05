/**
 * 점주 API 통합 테스트
 * 
 * 실행 방법:
 *   npm test                    # 모든 테스트
 *   npm test -- owner           # 이 파일만
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../lib/mongo');
const app = require('../app');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
const { generateToken } = require('../utils/jwt');

describe('점주 API 통합 테스트', () => {
  let ownerUser;
  let employeeUser;
  let ownerToken;
  let employeeToken;
  let testStoreId;
  let testScheduleId;

  // 테스트 전: DB 연결 및 테스트 데이터 생성
  beforeAll(async () => {
    try {
      await connectDB();
      
      // 기존 테스트 데이터 정리
      await WorkSchedule.deleteMany({});
      await User.deleteMany({ email: /@owner-test\.com$/ });
      await Store.deleteMany({ name: /점주테스트/ });

      // 테스트용 점주 생성
      ownerUser = await User.create({
        name: '점주테스트 점주',
        email: 'owner-test@owner-test.com',
        password: 'password123',
        role: 'owner',
      });

      // 테스트용 점포 생성
      const testStore = await Store.create({
        name: '점주테스트 점포',
        address: '점주테스트 주소',
        phone: '031-0000-0000',
        ownerId: ownerUser._id,
      });
      testStoreId = testStore._id;

      // 테스트용 근로자 생성
      employeeUser = await User.create({
        name: '점주테스트 근로자',
        email: 'employee-test@owner-test.com',
        password: 'password123',
        role: 'employee',
        storeId: testStoreId,
      });

      // 테스트용 근무일정 생성 (승인 대기)
      const testSchedule = await WorkSchedule.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        workDate: new Date(),
        startTime: '09:00',
        endTime: '18:00',
        status: 'pending',
      });
      testScheduleId = testSchedule._id;

      // 토큰 생성
      ownerToken = generateToken({
        userId: ownerUser._id.toString(),
        email: ownerUser.email,
        role: ownerUser.role,
      });

      employeeToken = generateToken({
        userId: employeeUser._id.toString(),
        email: employeeUser.email,
        role: employeeUser.role,
      });
    } catch (error) {
      console.error('테스트 데이터 생성 오류:', error);
    }
  });

  // 테스트 후: 정리
  afterAll(async () => {
    await WorkSchedule.deleteMany({});
    await User.deleteMany({ email: /@owner-test\.com$/ });
    await Store.deleteMany({ name: /점주테스트/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('GET /api/owner/dashboard', () => {
    it('점주는 대시보드를 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/dashboard')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('stores');
      expect(response.body).toHaveProperty('actions');
      expect(response.body.summary).toHaveProperty('stores');
      expect(response.body.summary).toHaveProperty('employees');
      expect(response.body.summary).toHaveProperty('pendingRequests');
    });

    it('근로자는 점주 대시보드에 접근할 수 없어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/dashboard')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.message).toContain('접근 권한');
    });

    it('인증 없이는 접근할 수 없어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/dashboard')
        .expect(401);

      expect(response.body.message).toContain('인증 토큰');
    });
  });

  describe('GET /api/owner/schedules', () => {
    it('점주는 근무일정 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/schedules')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('summary');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.summary).toHaveProperty('pending');
      expect(response.body.summary).toHaveProperty('approved');
      expect(response.body.summary).toHaveProperty('rejected');
    });

    it('상태 필터로 근무일정을 필터링할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/schedules?status=pending')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body.items.every((item) => item.status === 'pending')).toBe(true);
    });
  });

  describe('PUT /api/owner/schedules/:id/approve', () => {
    it('점주는 근무일정을 승인할 수 있어야 함', async () => {
      // 새로운 승인 대기 근무일정 생성
      const newSchedule = await WorkSchedule.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        workDate: new Date(),
        startTime: '10:00',
        endTime: '19:00',
        status: 'pending',
      });

      const response = await request(app)
        .put(`/api/owner/schedules/${newSchedule._id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('schedule');
      expect(response.body.schedule.status).toBe('approved');
      expect(response.body.schedule.approvedBy.toString()).toBe(ownerUser._id.toString());

      // 정리
      await WorkSchedule.findByIdAndDelete(newSchedule._id);
    });

    it('이미 승인된 근무일정은 다시 승인할 수 없어야 함', async () => {
      const approvedSchedule = await WorkSchedule.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        workDate: new Date(),
        startTime: '11:00',
        endTime: '20:00',
        status: 'approved',
        approvedBy: ownerUser._id,
      });

      const response = await request(app)
        .put(`/api/owner/schedules/${approvedSchedule._id}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(409);

      expect(response.body.message).toContain('이미 승인');

      // 정리
      await WorkSchedule.findByIdAndDelete(approvedSchedule._id);
    });
  });

  describe('PUT /api/owner/schedules/:id/reject', () => {
    it('점주는 근무일정을 거절할 수 있어야 함', async () => {
      // 새로운 승인 대기 근무일정 생성
      const newSchedule = await WorkSchedule.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        workDate: new Date(),
        startTime: '12:00',
        endTime: '21:00',
        status: 'pending',
      });

      const response = await request(app)
        .put(`/api/owner/schedules/${newSchedule._id}/reject`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ rejectionReason: '테스트 거절 사유' })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('schedule');
      expect(response.body.schedule.status).toBe('rejected');
      expect(response.body.schedule.rejectionReason).toBe('테스트 거절 사유');

      // 정리
      await WorkSchedule.findByIdAndDelete(newSchedule._id);
    });
  });

  describe('GET /api/owner/employees', () => {
    it('점주는 직원 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/employees')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      if (response.body.items.length > 0) {
        expect(response.body.items[0]).toHaveProperty('stats');
        expect(response.body.items[0].stats).toHaveProperty('totalHours');
        expect(response.body.items[0].stats).toHaveProperty('pendingCount');
        expect(response.body.items[0].stats).toHaveProperty('approvedCount');
      }
    });
  });

  describe('GET /api/owner/stores', () => {
    it('점주는 점포 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/owner/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      if (response.body.items.length > 0) {
        expect(response.body.items[0]).toHaveProperty('employeeCount');
      }
    });
  });

  describe('POST /api/owner/stores', () => {
    it('점주는 점포를 생성할 수 있어야 함', async () => {
      const newStore = {
        name: '점주테스트 새 점포',
        address: '점주테스트 새 주소',
        phone: '031-1111-1111',
      };

      const response = await request(app)
        .post('/api/owner/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(newStore)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('store');
      expect(response.body.store.name).toBe(newStore.name);
      expect(response.body.store.address).toBe(newStore.address);
      expect(response.body.store.ownerId.toString()).toBe(ownerUser._id.toString());

      // 정리
      await Store.findByIdAndDelete(response.body.store._id);
    });

    it('필수 항목이 누락되면 400 에러를 반환해야 함', async () => {
      const response = await request(app)
        .post('/api/owner/stores')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: '점포명만' })
        .expect(400);

      expect(response.body.message).toContain('필수 항목');
    });
  });

  describe('PUT /api/owner/stores/:id', () => {
    it('점주는 자신의 점포 정보를 수정할 수 있어야 함', async () => {
      const testStore = await Store.create({
        name: '점주테스트 수정용 점포',
        address: '점주테스트 수정용 주소',
        ownerId: ownerUser._id,
      });

      const response = await request(app)
        .put(`/api/owner/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: '수정된 점포명',
          address: '수정된 주소',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.store.name).toBe('수정된 점포명');
      expect(response.body.store.address).toBe('수정된 주소');

      // 정리
      await Store.findByIdAndDelete(testStore._id);
    });
  });

  describe('DELETE /api/owner/stores/:id', () => {
    it('점주는 자신의 점포를 비활성화할 수 있어야 함', async () => {
      const testStore = await Store.create({
        name: '점주테스트 삭제용 점포',
        address: '점주테스트 삭제용 주소',
        ownerId: ownerUser._id,
      });

      const response = await request(app)
        .delete(`/api/owner/stores/${testStore._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.store.isActive).toBe(false);

      // 정리
      await Store.findByIdAndDelete(testStore._id);
    });
  });
});

