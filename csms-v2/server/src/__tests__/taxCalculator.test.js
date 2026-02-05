/**
 * 세금 계산 유틸리티 테스트 (4대 보험·근로소득·사업자소득)
 *
 * 실행: npm test -- taxCalculator
 */

const {
  calculateFourInsurance,
  calculateMonthlyTax,
  calculateLaborIncomeTax,
  calculateBusinessIncomeTax,
} = require('../utils/taxCalculator');

describe('taxCalculator', () => {
  describe('calculateFourInsurance (4대 보험 대상)', () => {
    it('월 급여 0원이면 모든 공제 0, netPay 0', () => {
      const result = calculateFourInsurance(0);
      expect(result.nationalPension).toBe(0);
      expect(result.healthInsurance).toBe(0);
      expect(result.longTermCare).toBe(0);
      expect(result.employmentInsurance).toBe(0);
      expect(result.incomeTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.netPay).toBe(0);
    });

    it('국민연금 4.5%, 1000원 미만 절사', () => {
      // 100000 * 0.045 = 4500 → 4000 (1000원 절사)
      const result = calculateFourInsurance(100_000);
      expect(result.nationalPension).toBe(4000);
    });

    it('건강보험 3.545%, 10원 미만 절사', () => {
      // 100000 * 0.03545 = 3545 → 3540 (10원 절사)
      const result = calculateFourInsurance(100_000);
      expect(result.healthInsurance).toBe(3540);
    });

    it('장기요양은 건강보험료의 12.95%, 10원 미만 절사', () => {
      const result = calculateFourInsurance(100_000);
      // healthInsurance = 3540, 3540 * 0.1295 = 458.46 → 450
      expect(result.longTermCare).toBe(450);
    });

    it('고용보험 0.9%, 10원 미만 절사', () => {
      // 100000 * 0.009 = 900 (부동소수점에 따라 890~900 가능). 10원 단위 절사 적용
      const result = calculateFourInsurance(100_000);
      expect(result.employmentInsurance).toBeGreaterThanOrEqual(890);
      expect(result.employmentInsurance).toBeLessThanOrEqual(900);
      expect(result.employmentInsurance % 10).toBe(0);
    });

    it('소득세 1.53%, 10원 미만 절사', () => {
      // 100000 * 0.0153 = 1530 → 1530
      const result = calculateFourInsurance(100_000);
      expect(result.incomeTax).toBe(1530);
    });

    it('지방소득세는 소득세의 10%, 10원 미만 절사', () => {
      const result = calculateFourInsurance(100_000);
      // incomeTax = 1530, 1530 * 0.1 = 153 → 150
      expect(result.localTax).toBe(150);
    });

    it('월 200만원 급여 시 totalTax 및 netPay 일치', () => {
      const gross = 2_000_000;
      const result = calculateFourInsurance(gross);
      const expectedNational = Math.floor((gross * 0.045) / 1000) * 1000; // 90000
      const expectedHealth = Math.floor((gross * 0.03545) / 10) * 10; // 70890
      const expectedLongTerm = Math.floor((expectedHealth * 0.1295) / 10) * 10;
      const expectedEmployment = Math.floor((gross * 0.009) / 10) * 10; // 18000
      const expectedIncome = Math.floor((gross * 0.0153) / 10) * 10; // 30600
      const expectedLocal = Math.floor((expectedIncome * 0.1) / 10) * 10; // 3060

      expect(result.nationalPension).toBe(expectedNational);
      expect(result.healthInsurance).toBe(expectedHealth);
      expect(result.longTermCare).toBe(expectedLongTerm);
      expect(result.employmentInsurance).toBe(expectedEmployment);
      expect(result.incomeTax).toBe(expectedIncome);
      expect(result.localTax).toBe(expectedLocal);
      expect(result.totalTax).toBe(
        expectedNational +
          expectedHealth +
          expectedLongTerm +
          expectedEmployment +
          expectedIncome +
          expectedLocal
      );
      expect(result.netPay).toBe(gross - result.totalTax);
      expect(result.netPay).toBeGreaterThan(0);
    });
  });

  describe('calculateMonthlyTax', () => {
    it('taxType four-insurance 시 4대보험 항목 반환', () => {
      const result = calculateMonthlyTax('four-insurance', 1_500_000);
      expect(result.incomeTax).toBeDefined();
      expect(result.localTax).toBeDefined();
      expect(result.totalTax).toBeGreaterThan(0);
      expect(result.netPay).toBeGreaterThan(0);
      expect(result.netPay).toBe(1_500_000 - result.totalTax);
      expect(result.nationalPension).toBeDefined();
      expect(result.healthInsurance).toBeDefined();
      expect(result.longTermCare).toBeDefined();
      expect(result.employmentInsurance).toBeDefined();
    });

    it('taxType none 시 세금 0', () => {
      const result = calculateMonthlyTax('none', 2_000_000);
      expect(result.totalTax).toBe(0);
      expect(result.incomeTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.netPay).toBe(2_000_000);
      expect(result.nationalPension).toBeUndefined();
    });

    it('taxType under-15-hours 시 세금 0', () => {
      const result = calculateMonthlyTax('under-15-hours', 1_000_000);
      expect(result.totalTax).toBe(0);
      expect(result.netPay).toBe(1_000_000);
    });

    it('taxType business-income 시 3.3% 근사', () => {
      const result = calculateMonthlyTax('business-income', 1_000_000);
      expect(result.totalTax).toBe(33000); // 1M * 0.033
      expect(result.netPay).toBe(967_000);
    });

    it('taxType labor-income 시 구간별 세율 적용', () => {
      const result = calculateMonthlyTax('labor-income', 1_500_000);
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.localTax).toBeGreaterThan(0);
      expect(result.totalTax).toBe(result.incomeTax + result.localTax);
      expect(result.netPay).toBe(1_500_000 - result.totalTax);
    });
  });

  describe('calculateLaborIncomeTax (과세소득 구간별 세율)', () => {
    it('0원 시 소득세·지방세 0', () => {
      const result = calculateLaborIncomeTax(0);
      expect(result.incomeTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.totalTax).toBe(0);
    });

    it('1,400만원 이하 구간 6% 적용', () => {
      const result = calculateLaborIncomeTax(1_000_000);
      expect(result.incomeTax).toBe(60_000);
      expect(result.localTax).toBe(6_000);
      expect(result.totalTax).toBe(66_000);
    });

    it('1,400만원 초과 ~ 5,000만원 구간 15% 적용', () => {
      const result = calculateLaborIncomeTax(2_000_000);
      const expectedIncome = 84_000 + (2_000_000 - 1_400_000) * 0.15;
      expect(result.incomeTax).toBe(Math.floor(expectedIncome / 10) * 10);
      expect(result.localTax).toBe(Math.floor((result.incomeTax * 0.1) / 10) * 10);
      expect(result.totalTax).toBe(result.incomeTax + result.localTax);
    });

    it('구간 경계(1,400,000원)에서 누진 적용', () => {
      const result = calculateLaborIncomeTax(1_400_000);
      expect(result.incomeTax).toBe(84_000);
      expect(result.localTax).toBe(8_400);
    });
  });

  describe('calculateBusinessIncomeTax', () => {
    it('3.3% 적용', () => {
      const result = calculateBusinessIncomeTax(1_000_000);
      expect(result.totalTax).toBe(33_000);
    });
  });
});
