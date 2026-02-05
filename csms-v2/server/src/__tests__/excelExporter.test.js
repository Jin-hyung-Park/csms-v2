const {
  buildPayrollListExcel,
  buildPayrollDetailExcel,
  buildSchedulesExcel,
  formatKRW,
} = require('../utils/excelExporter');

describe('Excel 내보내기 유틸리티', () => {
  describe('formatKRW', () => {
    it('숫자를 원화 문자열로 포맷해야 한다', () => {
      expect(formatKRW(1500000)).toMatch(/\d/);
      expect(formatKRW(0)).toBe('0');
      expect(formatKRW(null)).toBe('0');
    });
  });

  describe('buildPayrollListExcel', () => {
    it('매장별·근로자별 급여내역 Excel 버퍼를 반환해야 한다', () => {
      const salaries = [
        {
          employeeName: '홍길동',
          storeId: { name: '판교역점' },
          userId: { ssn: '900101-1******', hiredAt: new Date('2024-01-15'), workSchedule: {} },
          taxType: 'business-income',
          totalWorkHours: 80,
          totalGrossPay: 900000,
          taxInfo: {
            netPay: 889000,
            nationalPension: 10000,
            healthInsurance: 8000,
            longTermCare: 1000,
            employmentInsurance: 2000,
          },
        },
      ];
      const buffer = buildPayrollListExcel(salaries, 2026, 2);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it('빈 목록으로도 Excel을 생성해야 한다', () => {
      const buffer = buildPayrollListExcel([], 2026, 2);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });

  describe('buildPayrollDetailExcel', () => {
    it('급여 명세서 Excel 버퍼를 반환해야 한다', () => {
      const salary = {
        year: 2026,
        month: 2,
        employeeName: '홍길동',
        employeeEmail: 'hong@test.com',
        hourlyWage: 10030,
        taxType: 'labor-income',
        totalWorkHours: 80,
        totalWorkDays: 10,
        totalBasePay: 800000,
        totalHolidayPay: 100000,
        totalGrossPay: 900000,
        taxInfo: { incomeTax: 10000, localTax: 1000, totalTax: 11000, netPay: 889000 },
        weeklyDetails: [
          { weekNumber: 1, startDate: '2026-02-02', endDate: '2026-02-08', workHours: 20, basePay: 200000, holidayPay: 25000, holidayPayStatus: 'paid' },
        ],
      };
      const buffer = buildPayrollDetailExcel(salary);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });
  });

  describe('buildSchedulesExcel', () => {
    it('근무일정 Excel 버퍼를 반환해야 한다', () => {
      const schedules = [
        {
          workDate: new Date('2026-02-01'),
          userId: { name: '홍길동' },
          storeId: { name: '판교역점' },
          startTime: '09:00',
          endTime: '18:00',
          totalHours: 8,
          status: 'approved',
        },
      ];
      const buffer = buildSchedulesExcel(schedules, 2026, 2);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(100);
    });

    it('빈 목록으로도 Excel을 생성해야 한다', () => {
      const buffer = buildSchedulesExcel([], 2026, 2);
      expect(Buffer.isBuffer(buffer)).toBe(true);
    });
  });
});
