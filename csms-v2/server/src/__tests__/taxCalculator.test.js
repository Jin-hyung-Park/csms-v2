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

    it('국민연금 4.75%, 1000원 미만 절사', () => {
      // 100000 * 0.0475 = 4750 → 4000 (1000원 절사)
      const result = calculateFourInsurance(100_000);
      expect(result.nationalPension).toBe(4000);
    });

    it('건강보험 3.595%, 10원 미만 절사', () => {
      // 100000 * 0.03595 = 3595 → 3590 (10원 절사)
      const result = calculateFourInsurance(100_000);
      expect(result.healthInsurance).toBe(3590);
    });

    it('장기요양 0.465% (총 급여 기준), 10원 미만 절사', () => {
      const result = calculateFourInsurance(100_000);
      // 100000 * 0.00465 = 465 → 460
      expect(result.longTermCare).toBe(460);
    });

    it('고용보험 0.9%, 10원 미만 절사', () => {
      const result = calculateFourInsurance(100_000);
      expect(result.employmentInsurance).toBeGreaterThanOrEqual(890);
      expect(result.employmentInsurance).toBeLessThanOrEqual(900);
      expect(result.employmentInsurance % 10).toBe(0);
    });

    it('소득세 3.3%, 10원 미만 절사', () => {
      // 100000 * 0.033 = 3300
      const result = calculateFourInsurance(100_000);
      expect(result.incomeTax).toBe(3300);
    });

    it('4대보험 유형은 지방세 없음', () => {
      const result = calculateFourInsurance(100_000);
      expect(result.localTax).toBe(0);
    });

    it('월 200만원 급여 시 totalTax 및 netPay 일치', () => {
      const gross = 2_000_000;
      const result = calculateFourInsurance(gross);
      const expectedNational = Math.floor((gross * 0.0475) / 1000) * 1000;
      const expectedHealth = Math.floor((gross * 0.03595) / 10) * 10;
      const expectedLongTerm = Math.floor((gross * 0.00465) / 10) * 10;
      const expectedEmployment = Math.floor((gross * 0.009) / 10) * 10;
      const expectedIncome = Math.floor((gross * 0.033) / 10) * 10;

      expect(result.nationalPension).toBe(expectedNational);
      expect(result.healthInsurance).toBe(expectedHealth);
      expect(result.longTermCare).toBe(expectedLongTerm);
      expect(result.employmentInsurance).toBe(expectedEmployment);
      expect(result.incomeTax).toBe(expectedIncome);
      expect(result.localTax).toBe(0);
      expect(result.totalTax).toBe(
        expectedNational +
          expectedHealth +
          expectedLongTerm +
          expectedEmployment +
          expectedIncome
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

    it('taxType labor-income 시 공제 없음 (3가지 유형 외 존재하지 않음)', () => {
      const result = calculateMonthlyTax('labor-income', 1_500_000);
      expect(result.totalTax).toBe(0);
      expect(result.incomeTax).toBe(0);
      expect(result.localTax).toBe(0);
      expect(result.netPay).toBe(1_500_000);
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
