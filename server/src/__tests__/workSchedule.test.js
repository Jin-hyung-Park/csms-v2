/**
 * WorkSchedule API 통합 테스트
 * 
 * 실행 방법:
 *   npm test                    # 모든 테스트
 *   npm test -- workSchedule    # 이 파일만
 *   npm run test:watch          # watch 모드
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../lib/mongo');
const app = require('../app');
const WorkSchedule = require('../models/WorkSchedule');
const User = require('../models/User');
const Store = require('../models/Store');
const { generateToken } = require('../utils/jwt');

describe('WorkSchedule API 통합 테스트', () => {
  let testUserId;
  let testStoreId;
  let createdScheduleId;
  let testToken;

  // 테스트 전: DB 연결 및 테스트 데이터 생성
  beforeAll(async () => {
    try {
      await connectDB();
      
      // 기존 테스트 데이터 정리
      await WorkSchedule.deleteMany({});
      await User.deleteMany({ email: /@test\.com$/ });
      await Store.deleteMany({ name: /테스트/ });

      // 테스트용 점주 생성 (Store의 ownerId 필수)
      const testOwner = await User.create({
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
        ownerId: testOwner._id,
      });
      testStoreId = testStore._id;

      // 테스트용 사용자 생성 (근로자, storeId 필요)
      const testUser = await User.create({
        name: '테스트 사용자',
        email: 'test-user@test.com',
        password: 'password123',
        phone: '010-0000-0000',
        role: 'employee',
        storeId: testStoreId,
      });
      testUserId = testUser._id;

      // 테스트 토큰 생성
      testToken = generateToken({
        userId: testUser._id.toString(),
        email: testUser.email,
        role: testUser.role,
      });
    } catch (error) {
      console.error('테스트 준비 실패:', error);
      throw error;
    }
  });

  // 각 테스트 후: 생성된 근무일정 정리
  afterEach(async () => {
    if (createdScheduleId) {
      try {
        await WorkSchedule.findByIdAndDelete(createdScheduleId);
      } catch (error) {
        // 무시 (이미 삭제되었을 수 있음)
      }
      createdScheduleId = null;
    }
  });

  // 모든 테스트 후: DB 연결 종료
  afterAll(async () => {
    // 테스트 데이터 정리
    await WorkSchedule.deleteMany({});
    await User.deleteMany({ email: /@test\.com$/ });
    await Store.deleteMany({ name: /테스트/ });
    
    // DB 연결 종료 (경고 없이)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('POST /api/work-schedule', () => {
    it('근무일정을 생성할 수 있어야 함', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const workDate = tomorrow.toISOString().split('T')[0];

      const payload = {
        storeId: testStoreId.toString(),
        workDate,
        startTime: '09:00',
        endTime: '18:00',
        notes: '테스트 근무일정',
      };

      const response = await request(app)
        .post('/api/work-schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('schedule');
      expect(response.body.schedule).toHaveProperty('_id');
      expect(response.body.schedule.workDate).toBeDefined();
      expect(response.body.schedule.startTime).toBe('09:00');
      expect(response.body.schedule.endTime).toBe('18:00');
      expect(response.body.schedule.status).toBe('pending');
      expect(response.body.schedule.totalHours).toBe(9); // 9시간

      createdScheduleId = response.body.schedule._id;
    });

    it('필수 항목이 누락되면 400 에러를 반환해야 함', async () => {
      const payload = {
        storeId: testStoreId.toString(),
        // workDate, startTime, endTime 누락
      };

      const response = await request(app)
        .post('/api/work-schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('필수');
    });

    it('시간이 자동으로 계산되어야 함', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const workDate = tomorrow.toISOString().split('T')[0];

      const payload = {
        storeId: testStoreId.toString(),
        workDate,
        startTime: '18:00',
        endTime: '23:00',
      };

      const response = await request(app)
        .post('/api/work-schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(201);

      expect(response.body.schedule.totalHours).toBe(5); // 5시간
    });
  });

  describe('GET /api/work-schedule', () => {
    beforeEach(async () => {
      // 테스트용 근무일정 생성
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const schedule = await WorkSchedule.create({
        userId: testUserId,
        storeId: testStoreId,
        workDate: tomorrow,
        startTime: '09:00',
        endTime: '18:00',
        status: 'pending',
      });
      createdScheduleId = schedule._id;
    });

    it('모든 근무일정을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/work-schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('월별로 필터링할 수 있어야 함', async () => {
      const today = new Date();
      const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      const response = await request(app)
        .get(`/api/work-schedule?month=${month}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      
      // 해당 월의 데이터만 포함되어야 함
      response.body.items.forEach((item) => {
        const itemDate = new Date(item.workDate);
        expect(itemDate.getFullYear()).toBe(today.getFullYear());
        expect(itemDate.getMonth()).toBe(today.getMonth());
      });
    });

    it('사용자별로 필터링할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/work-schedule')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      
      // 해당 사용자의 데이터만 포함되어야 함
      response.body.items.forEach((item) => {
        expect(item.userId.toString()).toBe(testUserId.toString());
      });
    });
  });

  describe('PUT /api/work-schedule/:id', () => {
    beforeEach(async () => {
      // 테스트용 근무일정 생성 (pending 상태)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const schedule = await WorkSchedule.create({
        userId: testUserId,
        storeId: testStoreId,
        workDate: tomorrow,
        startTime: '09:00',
        endTime: '18:00',
        status: 'pending',
      });
      createdScheduleId = schedule._id;
    });

    it('대기 중인 근무일정을 수정할 수 있어야 함', async () => {
      const payload = {
        startTime: '10:00',
        endTime: '19:00',
        notes: '수정된 메모',
      };

      const response = await request(app)
        .put(`/api/work-schedule/${createdScheduleId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('schedule');
      expect(response.body.schedule.startTime).toBe('10:00');
      expect(response.body.schedule.endTime).toBe('19:00');
      expect(response.body.schedule.notes).toBe('수정된 메모');
      expect(response.body.schedule.totalHours).toBe(9); // 수정된 시간으로 계산
    });

    it('승인된 근무일정은 수정할 수 없어야 함', async () => {
      // 먼저 승인 상태로 변경
      await WorkSchedule.findByIdAndUpdate(createdScheduleId, { status: 'approved' });

      const payload = {
        startTime: '10:00',
        endTime: '19:00',
      };

      const response = await request(app)
        .put(`/api/work-schedule/${createdScheduleId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send(payload)
        .expect(409);

      expect(response.body.message).toContain('승인된 근무');
    });

    it('존재하지 않는 근무일정은 404를 반환해야 함', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .put(`/api/work-schedule/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ startTime: '10:00', endTime: '19:00' })
        .expect(404);

      expect(response.body.message).toContain('찾을 수 없습니다');
    });
  });

  describe('DELETE /api/work-schedule/:id', () => {
    let deleteTestScheduleId;

    it('대기 중인 근무일정을 삭제할 수 있어야 함', async () => {
      // 테스트용 근무일정 생성 (pending 상태)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const schedule = await WorkSchedule.create({
        userId: testUserId,
        storeId: testStoreId,
        workDate: tomorrow,
        startTime: '09:00',
        endTime: '18:00',
        status: 'pending',
      });
      deleteTestScheduleId = schedule._id;

      const response = await request(app)
        .delete(`/api/work-schedule/${deleteTestScheduleId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('id');

      // 실제로 삭제되었는지 확인
      const deleted = await WorkSchedule.findById(deleteTestScheduleId);
      expect(deleted).toBeNull();
    });

    it('승인된 근무일정은 삭제할 수 없어야 함', async () => {
      // 테스트용 근무일정 생성 후 승인 상태로 변경
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const schedule = await WorkSchedule.create({
        userId: testUserId,
        storeId: testStoreId,
        workDate: tomorrow,
        startTime: '09:00',
        endTime: '18:00',
        status: 'approved',
      });
      const approvedScheduleId = schedule._id;

      const response = await request(app)
        .delete(`/api/work-schedule/${approvedScheduleId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(409);

      expect(response.body.message).toContain('승인된 근무');
      
      // 정리
      await WorkSchedule.findByIdAndDelete(approvedScheduleId);
    });

    it('존재하지 않는 근무일정은 404를 반환해야 함', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete(`/api/work-schedule/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`)
        .expect(404);

      expect(response.body.message).toContain('찾을 수 없습니다');
    });
  });
});

