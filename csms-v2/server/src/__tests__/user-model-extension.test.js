/**
 * User 모델 확장 테스트
 * 
 * 실행 방법:
 *   npm test -- user-model-extension
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../lib/mongo');
const app = require('../app');
const User = require('../models/User');
const Store = require('../models/Store');
const { generateToken } = require('../utils/jwt');
const {
  getWorkDaysString,
  getWorkTimeString,
  calculateWeeklyHours,
  formatTaxType,
} = require('../utils/userHelpers');

describe('User 모델 확장 테스트', () => {
  let testStoreId;
  let employeeUser;
  let employeeToken;
  let ownerUser;
  let ownerToken;

  beforeAll(async () => {
    await connectDB();
    
    // 기존 테스트 데이터 정리
    await User.deleteMany({ email: /@user-model-test\.com$/ });
    await Store.deleteMany({ name: /User모델테스트/ });

    // 테스트용 점주 생성
    ownerUser = await User.create({
      name: 'User모델테스트 점주',
      email: 'owner@user-model-test.com',
      password: 'password123',
      role: 'owner',
    });

    // 테스트용 점포 생성
    const testStore = await Store.create({
      name: 'User모델테스트 점포',
      address: 'User모델테스트 주소',
      phone: '031-0000-0000',
      ownerId: ownerUser._id,
    });
    testStoreId = testStore._id;

    // 테스트용 근로자 생성 (새 필드 포함)
    employeeUser = await User.create({
      name: 'User모델테스트 근로자',
      email: 'employee@user-model-test.com',
      password: 'password123',
      role: 'employee',
      storeId: testStoreId,
      hourlyWage: 12000,
      taxType: 'business-income',
      position: '파트타이머',
      workSchedule: {
        monday: { enabled: true, startTime: '18:00', endTime: '23:00' },
        tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        wednesday: { enabled: true, startTime: '18:00', endTime: '23:00' },
        thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        friday: { enabled: true, startTime: '18:00', endTime: '23:00' },
        saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
        sunday: { enabled: false, startTime: '09:00', endTime: '18:00' },
      },
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
    await User.deleteMany({ email: /@user-model-test\.com$/ });
    await Store.deleteMany({ name: /User모델테스트/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('User 모델 필드 테스트', () => {
    it('User 모델에 새 필드가 저장되어야 함', async () => {
      const user = await User.findById(employeeUser._id);
      
      expect(user.hourlyWage).toBe(12000);
      expect(user.taxType).toBe('business-income');
      expect(user.position).toBe('파트타이머');
      expect(user.workSchedule).toBeDefined();
      expect(user.workSchedule.monday.enabled).toBe(true);
      expect(user.workSchedule.monday.startTime).toBe('18:00');
    });

    it('기본값이 올바르게 설정되어야 함', async () => {
      const newUser = await User.create({
        name: '기본값테스트',
        email: 'default@user-model-test.com',
        password: 'password123',
        role: 'employee',
        storeId: testStoreId,
      });

      expect(newUser.hourlyWage).toBe(10320); // 기본값 (2026년 최저시급)
      expect(newUser.taxType).toBe('none'); // 기본값
      expect(newUser.position).toBe('파트타이머'); // 기본값

      await User.findByIdAndDelete(newUser._id);
    });
  });

  describe('userHelpers 유틸리티 함수 테스트', () => {
    it('getWorkDaysString이 올바른 요일 문자열을 반환해야 함', () => {
      const workDays = getWorkDaysString(employeeUser.workSchedule);
      expect(workDays).toBe('월, 수, 금');
    });

    it('getWorkTimeString이 올바른 시간 문자열을 반환해야 함', () => {
      const workTime = getWorkTimeString(employeeUser.workSchedule);
      expect(workTime).toBe('18:00 - 23:00');
    });

    it('calculateWeeklyHours가 올바른 주당 시간을 계산해야 함', () => {
      const weeklyHours = calculateWeeklyHours(employeeUser.workSchedule);
      // 월, 수, 금 각 5시간 = 15시간
      expect(weeklyHours).toBe(15);
    });

    it('formatTaxType이 올바른 세금 타입 문자열을 반환해야 함', () => {
      expect(formatTaxType('none')).toBe('미신고 (세금 면제)');
      expect(formatTaxType('business-income')).toBe('사업자소득 (3.3%)');
      expect(formatTaxType('under-15-hours')).toBe('주 15시간 미만 (세금 면제)');
    });
  });

  describe('Employee API - User 모델 필드 사용', () => {
    it('대시보드 API가 User 모델의 시급을 사용해야 함', async () => {
      const response = await request(app)
        .get('/api/employee/dashboard')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.workInfo.contractInfo.hourlyWage).toBe(12000);
      expect(response.body.workInfo.contractInfo.workDays).toBe('월, 수, 금');
      expect(response.body.workInfo.contractInfo.workTime).toBe('18:00 - 23:00');
      expect(response.body.workInfo.contractInfo.weeklyHours).toBe(15);
      expect(response.body.workInfo.contractInfo.taxType).toBe('사업자소득 (3.3%)');
    });

    it('프로필 API가 User 모델의 정보를 반환해야 함', async () => {
      const response = await request(app)
        .get('/api/employee/profile')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body.position).toBe('파트타이머');
      expect(response.body.contract.hourlyWage).toBe(12000);
      expect(response.body.contract.workDays).toBe('월, 수, 금');
      expect(response.body.contract.workTime).toBe('18:00 - 23:00');
      expect(response.body.contract.weeklyHours).toBe(15);
      expect(response.body.contract.taxType).toBe('사업자소득 (3.3%)');
    });
  });

  describe('Owner API - 직원 정보 수정', () => {
    it('점주는 직원의 시급을 수정할 수 있어야 함', async () => {
      const response = await request(app)
        .put(`/api/owner/employees/${employeeUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ hourlyWage: 13000 })
        .expect(200);

      expect(response.body.employee.hourlyWage).toBe(13000);

      // 원래 값으로 복구
      await User.findByIdAndUpdate(employeeUser._id, { hourlyWage: 12000 });
    });

    it('점주는 직원의 세금 타입을 수정할 수 있어야 함', async () => {
      const response = await request(app)
        .put(`/api/owner/employees/${employeeUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ taxType: 'labor-income' })
        .expect(200);

      expect(response.body.employee.taxType).toBe('labor-income');

      // 원래 값으로 복구
      await User.findByIdAndUpdate(employeeUser._id, { taxType: 'business-income' });
    });

    it('점주는 직원의 세금 타입을 4대 보험 대상(four-insurance)으로 수정할 수 있어야 함', async () => {
      const response = await request(app)
        .put(`/api/owner/employees/${employeeUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ taxType: 'four-insurance' })
        .expect(200);

      expect(response.body.employee.taxType).toBe('four-insurance');

      // 원래 값으로 복구
      await User.findByIdAndUpdate(employeeUser._id, { taxType: 'business-income' });
    });

    it('유효하지 않은 세금 타입은 거부되어야 함', async () => {
      const response = await request(app)
        .put(`/api/owner/employees/${employeeUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ taxType: 'invalid-type' })
        .expect(400);

      expect(response.body.message).toContain('올바른 세금 타입');
    });
  });
});
