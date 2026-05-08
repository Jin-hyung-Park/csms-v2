/**
 * MonthlySalary 모델 및 API 테스트
 * 
 * 실행 방법:
 *   npm test -- monthlySalary
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { connectDB } = require('../lib/mongo');
const app = require('../app');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
const MonthlySalary = require('../models/MonthlySalary');
const { generateToken } = require('../utils/jwt');
const { getStartOfMonth, getEndOfMonth } = require('../utils/dateHelpers');

describe('MonthlySalary 모델 및 API 테스트', () => {
  let ownerUser;
  let employeeUser;
  let ownerToken;
  let employeeToken;
  let testStoreId;
  let testScheduleId;

  beforeAll(async () => {
    await connectDB();
    
    // 기존 테스트 데이터 정리
    await MonthlySalary.deleteMany({});
    await WorkSchedule.deleteMany({});
    await User.deleteMany({ email: /@monthly-salary-test\.com$/ });
    await Store.deleteMany({ name: /MonthlySalary테스트/ });

    // 테스트용 점주 생성
    ownerUser = await User.create({
      name: 'MonthlySalary테스트 점주',
      email: 'owner@monthly-salary-test.com',
      password: 'password123',
      role: 'owner',
    });

    // 테스트용 점포 생성
    const testStore = await Store.create({
      name: 'MonthlySalary테스트 점포',
      address: 'MonthlySalary테스트 주소',
      phone: '031-0000-0000',
      ownerId: ownerUser._id,
    });
    testStoreId = testStore._id;

    // 테스트용 근로자 생성
    employeeUser = await User.create({
      name: 'MonthlySalary테스트 근로자',
      email: 'employee@monthly-salary-test.com',
      password: 'password123',
      role: 'employee',
      storeId: testStoreId,
      hourlyWage: 12000,
      taxType: 'business-income',
    });

    // 테스트용 근무일정 생성
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const monthStart = getStartOfMonth(currentYear, currentMonth);
    
    const testSchedule = await WorkSchedule.create({
      userId: employeeUser._id,
      storeId: testStoreId,
      workDate: new Date(monthStart),
      startTime: '09:00',
      endTime: '18:00',
      status: 'approved',
    });
    testScheduleId = testSchedule._id;

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
    await MonthlySalary.deleteMany({});
    await WorkSchedule.deleteMany({});
    await User.deleteMany({ email: /@monthly-salary-test\.com$/ });
    await Store.deleteMany({ name: /MonthlySalary테스트/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  describe('MonthlySalary 모델 테스트', () => {
    it('MonthlySalary를 생성할 수 있어야 함', async () => {
      const now = new Date();
      const salary = await MonthlySalary.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        employeeName: employeeUser.name,
        employeeEmail: employeeUser.email,
        hourlyWage: 12000,
        taxType: 'business-income',
        totalWorkHours: 40,
        totalWorkDays: 5,
        totalBasePay: 480000,
        totalHolidayPay: 0,
        totalGrossPay: 480000,
        taxInfo: {
          incomeTax: 14256,
          localTax: 1584,
          totalTax: 15840,
          netPay: 464160,
        },
        weeklyDetails: [],
        status: 'draft',
      });

      expect(salary).toBeDefined();
      expect(salary.status).toBe('draft');
      expect(salary.totalGrossPay).toBe(480000);

      await MonthlySalary.findByIdAndDelete(salary._id);
    });

    it('확정된 급여는 수정할 수 없어야 함', async () => {
      const now = new Date();
      const salary = await MonthlySalary.create({
        userId: employeeUser._id,
        storeId: testStoreId,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        employeeName: employeeUser.name,
        employeeEmail: employeeUser.email,
        hourlyWage: 12000,
        taxType: 'business-income',
        totalWorkHours: 40,
        totalWorkDays: 5,
        totalBasePay: 480000,
        totalHolidayPay: 0,
        totalGrossPay: 480000,
        taxInfo: {
          incomeTax: 14256,
          localTax: 1584,
          totalTax: 15840,
          netPay: 464160,
        },
        weeklyDetails: [],
        status: 'confirmed',
        confirmedBy: ownerUser._id,
        confirmedAt: new Date(),
      });

      // 확정된 급여 수정 시도
      salary.totalBasePay = 500000;
      
      try {
        await salary.save();
        // 에러가 발생해야 함
        expect(true).toBe(false);
      } catch (error) {
        expect(error.message).toContain('확정된 급여는 수정할 수 없습니다');
      }

      await MonthlySalary.findByIdAndDelete(salary._id);
    });
  });

  describe('POST /api/monthly-salary/calculate', () => {
    it('점주는 급여를 산정할 수 있어야 함', async () => {
      const now = new Date();
      const testYear = now.getFullYear();
      const testMonth = now.getMonth() + 1;
      
      // 기존 데이터 정리
      await MonthlySalary.deleteMany({
        userId: employeeUser._id,
        year: testYear,
        month: testMonth,
      });
      
      const response = await request(app)
        .post('/api/monthly-salary/calculate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: employeeUser._id.toString(),
          year: testYear,
          month: testMonth,
        })
        .expect(201);

      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('salary');
      expect(response.body.salary.status).toBe('calculated');
      expect(response.body.salary.weeklyDetails).toBeDefined();

      // 정리
      await MonthlySalary.findByIdAndDelete(response.body.salary._id);
    });

    it('근로자는 급여를 산정할 수 없어야 함', async () => {
      const now = new Date();
      const response = await request(app)
        .post('/api/monthly-salary/calculate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          userId: employeeUser._id.toString(),
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        })
        .expect(403);

      expect(response.body.message).toContain('점주만');
    });

    it('이미 산정된 급여는 중복 생성할 수 없어야 함', async () => {
      const now = new Date();
      const testYear = now.getFullYear();
      const testMonth = now.getMonth() + 1;
      
      // 기존 데이터 정리
      await MonthlySalary.deleteMany({
        userId: employeeUser._id,
        year: testYear,
        month: testMonth,
      });
      
      // 첫 번째 산정
      const firstResponse = await request(app)
        .post('/api/monthly-salary/calculate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: employeeUser._id.toString(),
          year: testYear,
          month: testMonth,
        })
        .expect(201);

      // 두 번째 산정 시도 (중복)
      const secondResponse = await request(app)
        .post('/api/monthly-salary/calculate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: employeeUser._id.toString(),
          year: testYear,
          month: testMonth,
        })
        .expect(409);

      expect(secondResponse.body.message).toContain('이미 산정된');

      // 정리
      await MonthlySalary.findByIdAndDelete(firstResponse.body.salary._id);
    });
  });

  describe('GET /api/monthly-salary', () => {
    it('근로자는 자신의 급여 목록을 조회할 수 있어야 함', async () => {
      const response = await request(app)
        .get('/api/monthly-salary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('PUT /api/monthly-salary/:id/confirm', () => {
    it('점주는 급여를 확정할 수 있어야 함', async () => {
      const now = new Date();
      const testYear = now.getFullYear();
      const testMonth = now.getMonth() + 1;
      
      // 기존 데이터 정리
      await MonthlySalary.deleteMany({
        userId: employeeUser._id,
        year: testYear,
        month: testMonth,
      });
      
      // 급여 산정
      const calculateResponse = await request(app)
        .post('/api/monthly-salary/calculate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: employeeUser._id.toString(),
          year: testYear,
          month: testMonth,
        })
        .expect(201);

      const salaryId = calculateResponse.body.salary._id;

      // 급여 확정
      const confirmResponse = await request(app)
        .put(`/api/monthly-salary/${salaryId}/confirm`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(confirmResponse.body.salary.status).toBe('confirmed');
      expect(confirmResponse.body.salary.confirmedBy).toBeDefined();
      expect(confirmResponse.body.salary.confirmedAt).toBeDefined();

      // 정리
      await MonthlySalary.findByIdAndDelete(salaryId);
    });

    it('근로자는 급여를 확정할 수 없어야 함', async () => {
      const now = new Date();
      const testYear = now.getFullYear();
      const testMonth = now.getMonth() + 1;
      
      // 기존 데이터 정리
      await MonthlySalary.deleteMany({
        userId: employeeUser._id,
        year: testYear,
        month: testMonth,
      });
      
      // 급여 산정
      const calculateResponse = await request(app)
        .post('/api/monthly-salary/calculate')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: employeeUser._id.toString(),
          year: testYear,
          month: testMonth,
        })
        .expect(201);

      const salaryId = calculateResponse.body.salary._id;

      // 근로자가 확정 시도
      const response = await request(app)
        .put(`/api/monthly-salary/${salaryId}/confirm`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(response.body.message).toContain('점주만');

      // 정리
      await MonthlySalary.findByIdAndDelete(salaryId);
    });
  });
});
