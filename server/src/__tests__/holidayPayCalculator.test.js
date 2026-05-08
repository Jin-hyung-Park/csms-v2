/**
 * 주휴수당 계산 로직 테스트
 */
const {
  calculateWeeklyContractHours,
  getContractDays,
  getDayName,
  checkHolidayPayEligibility,
  calculateHolidayPay,
  getMonthlyWeeksForHolidayPay,
  shouldCalculateHolidayPayInMonth,
} = require('../utils/holidayPayCalculator');

describe('주휴수당 계산 유틸리티', () => {
  // 테스트용 근무 스케줄 (월, 수, 금 근무)
  const workScheduleMWF = {
    monday: { enabled: true, startTime: '09:00', endTime: '17:00' },    // 8시간
    tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    wednesday: { enabled: true, startTime: '09:00', endTime: '17:00' }, // 8시간
    thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    friday: { enabled: true, startTime: '09:00', endTime: '17:00' },    // 8시간
    saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    sunday: { enabled: false, startTime: '09:00', endTime: '18:00' },
  };

  // 주 15시간 미만 근무 스케줄
  const workScheduleUnder15 = {
    monday: { enabled: true, startTime: '09:00', endTime: '12:00' },    // 3시간
    tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    wednesday: { enabled: true, startTime: '09:00', endTime: '12:00' }, // 3시간
    thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    friday: { enabled: true, startTime: '09:00', endTime: '12:00' },    // 3시간
    saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    sunday: { enabled: false, startTime: '09:00', endTime: '18:00' },
  };

  describe('calculateWeeklyContractHours', () => {
    it('주당 계약 근로시간을 정확히 계산해야 한다 (24시간)', () => {
      const hours = calculateWeeklyContractHours(workScheduleMWF);
      expect(hours).toBe(24);
    });

    it('주 15시간 미만 스케줄을 정확히 계산해야 한다 (9시간)', () => {
      const hours = calculateWeeklyContractHours(workScheduleUnder15);
      expect(hours).toBe(9);
    });

    it('근무 스케줄이 없으면 0을 반환해야 한다', () => {
      expect(calculateWeeklyContractHours(null)).toBe(0);
      expect(calculateWeeklyContractHours(undefined)).toBe(0);
    });
  });

  describe('getContractDays', () => {
    it('활성화된 근무 요일 목록을 반환해야 한다', () => {
      const days = getContractDays(workScheduleMWF);
      expect(days).toEqual(['monday', 'wednesday', 'friday']);
    });

    it('근무 스케줄이 없으면 빈 배열을 반환해야 한다', () => {
      expect(getContractDays(null)).toEqual([]);
    });
  });

  describe('getDayName', () => {
    it('날짜의 요일명을 정확히 반환해야 한다', () => {
      // 2025-11-03은 월요일
      expect(getDayName('2025-11-03')).toBe('monday');
      // 2025-11-04는 화요일
      expect(getDayName('2025-11-04')).toBe('tuesday');
      // 2025-11-09는 일요일
      expect(getDayName('2025-11-09')).toBe('sunday');
    });
  });

  describe('checkHolidayPayEligibility', () => {
    const employee = {
      workSchedule: workScheduleMWF,
      hourlyWage: 10030,
    };

    it('주 15시간 이상 & 개근 시 지급 대상이어야 한다', () => {
      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved' }, // 월
        { workDate: '2025-11-05', status: 'approved' }, // 수
        { workDate: '2025-11-07', status: 'approved' }, // 금
      ];

      const result = checkHolidayPayEligibility(employee, weekSchedules);
      expect(result.isEligible).toBe(true);
      expect(result.reason).toBe('지급 조건 충족');
    });

    it('주 15시간 미만이면 미지급이어야 한다', () => {
      const employeeUnder15 = {
        workSchedule: workScheduleUnder15,
        hourlyWage: 10030,
      };

      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved' },
        { workDate: '2025-11-05', status: 'approved' },
        { workDate: '2025-11-07', status: 'approved' },
      ];

      const result = checkHolidayPayEligibility(employeeUnder15, weekSchedules);
      expect(result.isEligible).toBe(false);
      expect(result.reason).toBe('근로계약상 주 15시간 미만');
    });

    it('소정근로일 결근 시 미지급이어야 한다', () => {
      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved' }, // 월
        { workDate: '2025-11-05', status: 'approved' }, // 수
        // 금요일 결근
      ];

      const result = checkHolidayPayEligibility(employee, weekSchedules);
      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('소정근로일 개근 미충족');
      expect(result.reason).toContain('금요일');
    });

    it('미승인 근무는 개근 체크에서 제외해야 한다', () => {
      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved' }, // 월
        { workDate: '2025-11-05', status: 'approved' }, // 수
        { workDate: '2025-11-07', status: 'pending' },  // 금 (미승인)
      ];

      const result = checkHolidayPayEligibility(employee, weekSchedules);
      expect(result.isEligible).toBe(false);
      expect(result.reason).toContain('금요일');
    });
  });

  describe('calculateHolidayPay', () => {
    const employee = {
      workSchedule: workScheduleMWF,
      hourlyWage: 10030,
    };

    it('주휴수당을 정확히 계산해야 한다', () => {
      // 주 24시간, 시급 10030원
      // 주휴수당 = (24/40) * 8 * 10030 = 48144
      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved', totalHours: 8 },
        { workDate: '2025-11-05', status: 'approved', totalHours: 8 },
        { workDate: '2025-11-07', status: 'approved', totalHours: 8 },
      ];

      const result = calculateHolidayPay(employee, weekSchedules);
      expect(result.isEligible).toBe(true);
      expect(result.amount).toBe(48144);
      expect(result.calculation.formula).toBe('(24 / 40) × 8 × 10030');
    });

    it('지급 조건 미충족 시 0원을 반환해야 한다', () => {
      const employeeUnder15 = {
        workSchedule: workScheduleUnder15,
        hourlyWage: 10030,
      };

      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved' },
        { workDate: '2025-11-05', status: 'approved' },
        { workDate: '2025-11-07', status: 'approved' },
      ];

      const result = calculateHolidayPay(employeeUnder15, weekSchedules);
      expect(result.isEligible).toBe(false);
      expect(result.amount).toBe(0);
    });

    it('기본 시급(10320원, 2026년 최저시급)을 사용해야 한다', () => {
      const employeeNoWage = {
        workSchedule: workScheduleMWF,
        // hourlyWage 없음
      };

      const weekSchedules = [
        { workDate: '2025-11-03', status: 'approved' },
        { workDate: '2025-11-05', status: 'approved' },
        { workDate: '2025-11-07', status: 'approved' },
      ];

      const result = calculateHolidayPay(employeeNoWage, weekSchedules);
      expect(result.calculation.hourlyWage).toBe(10320);
    });
  });

  describe('getMonthlyWeeksForHolidayPay', () => {
    it('2025년 11월의 주차를 정확히 계산해야 한다', () => {
      // 2025년 11월 1일은 토요일
      // 1주차: 10/27(월) ~ 11/02(일) - 전월에서 이어진 주차, 당월 산정
      // 마지막 주: 11/24(월) ~ 11/30(일) - 당월 전체
      // (12월 1주차는 12월에 산정)
      
      const weeks = getMonthlyWeeksForHolidayPay(2025, 11);
      
      expect(weeks.length).toBeGreaterThan(0);
      
      // 첫 번째 주 확인
      const firstWeek = weeks[0];
      expect(firstWeek.weekNumber).toBe(1);
      expect(firstWeek.startDate).toBe('2025-10-27'); // 월요일
      expect(firstWeek.endDate).toBe('2025-11-02');   // 일요일
      expect(firstWeek.startsInPrevMonth).toBe(true);
      expect(firstWeek.endsInNextMonth).toBe(false);
      expect(firstWeek.shouldCalculateInThisMonth).toBe(true); // 11월에 산정
    });

    it('월 경계 주차를 익월에 산정하도록 표시해야 한다', () => {
      // 2025년 10월 마지막 주: 10/27(월) ~ 11/02(일)
      // → 11월에 산정
      
      const weeks = getMonthlyWeeksForHolidayPay(2025, 10);
      const lastWeek = weeks[weeks.length - 1];
      
      // 일요일이 11월에 속하면 익월에 산정
      if (lastWeek.endsInNextMonth) {
        expect(lastWeek.shouldCalculateInThisMonth).toBe(false);
        expect(lastWeek.holidayPayMonth).toBe('2025-11');
      }
    });

    it('연말 월 경계를 정확히 처리해야 한다 (12월 → 1월)', () => {
      // 2025년 12월 마지막 주가 2026년 1월로 넘어가는 경우
      const weeks = getMonthlyWeeksForHolidayPay(2025, 12);
      const lastWeek = weeks[weeks.length - 1];
      
      if (lastWeek.endsInNextMonth) {
        expect(lastWeek.holidayPayMonth).toBe('2026-01');
      }
    });
  });

  describe('shouldCalculateHolidayPayInMonth', () => {
    it('현재 월에 산정해야 하는 주차를 정확히 판별해야 한다', () => {
      const weekInfo = {
        holidayPayMonth: '2025-11',
      };

      expect(shouldCalculateHolidayPayInMonth(weekInfo, 2025, 11)).toBe(true);
      expect(shouldCalculateHolidayPayInMonth(weekInfo, 2025, 10)).toBe(false);
      expect(shouldCalculateHolidayPayInMonth(weekInfo, 2025, 12)).toBe(false);
    });
  });
});

describe('주휴수당 계산 시나리오 테스트', () => {
  // 주 24시간 근무 스케줄 (월, 수, 금 각 8시간)
  const fullTimeSchedule = {
    monday: { enabled: true, startTime: '09:00', endTime: '17:00' },
    tuesday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    wednesday: { enabled: true, startTime: '09:00', endTime: '17:00' },
    thursday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    friday: { enabled: true, startTime: '09:00', endTime: '17:00' },
    saturday: { enabled: false, startTime: '09:00', endTime: '18:00' },
    sunday: { enabled: false, startTime: '09:00', endTime: '18:00' },
  };

  const employee = {
    workSchedule: fullTimeSchedule,
    hourlyWage: 10030,
  };

  it('시나리오 1: 완전한 개근 - 주휴수당 지급', () => {
    const weekSchedules = [
      { workDate: '2025-11-03', status: 'approved', totalHours: 8 }, // 월
      { workDate: '2025-11-05', status: 'approved', totalHours: 8 }, // 수
      { workDate: '2025-11-07', status: 'approved', totalHours: 8 }, // 금
    ];

    const result = calculateHolidayPay(employee, weekSchedules);
    expect(result.isEligible).toBe(true);
    expect(result.amount).toBe(48144); // (24/40) * 8 * 10030
  });

  it('시나리오 2: 하루 결근 - 주휴수당 미지급', () => {
    const weekSchedules = [
      { workDate: '2025-11-03', status: 'approved', totalHours: 8 }, // 월
      { workDate: '2025-11-05', status: 'approved', totalHours: 8 }, // 수
      // 금요일 결근
    ];

    const result = calculateHolidayPay(employee, weekSchedules);
    expect(result.isEligible).toBe(false);
    expect(result.amount).toBe(0);
    expect(result.reason).toContain('금요일');
  });

  it('시나리오 3: 추가 근무해도 계약 시간 기준 계산', () => {
    // 계약은 월, 수, 금이지만 화요일에도 추가 근무
    const weekSchedules = [
      { workDate: '2025-11-03', status: 'approved', totalHours: 8 }, // 월
      { workDate: '2025-11-04', status: 'approved', totalHours: 8 }, // 화 (추가)
      { workDate: '2025-11-05', status: 'approved', totalHours: 8 }, // 수
      { workDate: '2025-11-07', status: 'approved', totalHours: 8 }, // 금
    ];

    const result = calculateHolidayPay(employee, weekSchedules);
    expect(result.isEligible).toBe(true);
    // 계약 시간 기준 (24시간)으로 계산
    expect(result.amount).toBe(48144);
  });

  it('시나리오 4: 월 경계 주차 처리', () => {
    // 2025년 11월 1주차: 10/27(월) ~ 11/02(일)
    const weekSchedules = [
      { workDate: '2025-10-27', status: 'approved', totalHours: 8 }, // 월 (10월)
      { workDate: '2025-10-29', status: 'approved', totalHours: 8 }, // 수 (10월)
      { workDate: '2025-10-31', status: 'approved', totalHours: 8 }, // 금 (10월)
    ];

    // 전체 주 기준으로 개근 확인 (10/27 ~ 11/02)
    const result = calculateHolidayPay(employee, weekSchedules);
    expect(result.isEligible).toBe(true);
    expect(result.amount).toBe(48144);
  });
});
