/**
 * 세금 계산 유틸리티
 * taxType별 세금 및 실수령액 계산
 */

// 4대보험 요율 (근로자 부담분, 2024년 기준)
const INSURANCE_RATES = {
  nationalPension: 0.045,      // 국민연금 4.5%
  healthInsurance: 0.03545,    // 건강보험 3.545%
  longTermCare: 0.004591,      // 장기요양 (건강보험료의 12.95% → 건강보험 요율에 12.95% 곱한 값)
  employmentInsurance: 0.009,  // 고용보험 0.9%
};

/**
 * 근로소득세 간이세액 계산 (월 지급액 기준, 단순화된 버전)
 * 실제 간이세액표는 부양가족 수에 따라 다름 — 부양가족 0명(본인만) 기준
 */
function calculateLaborIncomeTax(grossPay) {
  // 월 급여 구간별 세율 (단순화, 부양가족 1명 기준 근사값)
  // 실제 업무에서는 국세청 간이세액표 사용 권장
  let incomeTax = 0;

  if (grossPay <= 1060000) {
    incomeTax = 0;
  } else if (grossPay <= 1500000) {
    incomeTax = Math.round((grossPay - 1060000) * 0.06);
  } else if (grossPay <= 3000000) {
    incomeTax = Math.round(26400 + (grossPay - 1500000) * 0.15);
  } else if (grossPay <= 4500000) {
    incomeTax = Math.round(251400 + (grossPay - 3000000) * 0.24);
  } else if (grossPay <= 8800000) {
    incomeTax = Math.round(611400 + (grossPay - 4500000) * 0.35);
  } else {
    incomeTax = Math.round(2116400 + (grossPay - 8800000) * 0.38);
  }

  const localTax = Math.round(incomeTax * 0.1);
  const totalTax = incomeTax + localTax;

  return {
    incomeTax,
    localTax,
    totalTax,
    netPay: Math.max(0, grossPay - totalTax),
  };
}

/**
 * 4대보험 계산
 */
function calculateFourInsurance(grossPay) {
  const nationalPension = Math.round(grossPay * INSURANCE_RATES.nationalPension);
  const healthInsurance = Math.round(grossPay * INSURANCE_RATES.healthInsurance);
  const longTermCare = Math.round(healthInsurance * 0.1295);
  const employmentInsurance = Math.round(grossPay * INSURANCE_RATES.employmentInsurance);

  const totalInsurance = nationalPension + healthInsurance + longTermCare + employmentInsurance;

  // 근로소득세도 함께 계산
  const laborTax = calculateLaborIncomeTax(grossPay);

  const totalTax = totalInsurance + laborTax.incomeTax + laborTax.localTax;

  return {
    incomeTax: laborTax.incomeTax,
    localTax: laborTax.localTax,
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    totalTax,
    netPay: Math.max(0, grossPay - totalTax),
  };
}

/**
 * taxType별 세금 계산
 * @param {string} taxType - 세금 유형
 * @param {number} grossPay - 세전 지급액
 * @returns {{ incomeTax, localTax, totalTax, netPay, ...보험료 }}
 */
function calculateMonthlyTax(taxType, grossPay) {
  switch (taxType) {
    case 'none':
    case 'under-15-hours':
      return {
        incomeTax: 0,
        localTax: 0,
        totalTax: 0,
        netPay: grossPay,
      };

    case 'business-income': {
      const totalTax = Math.round(grossPay * 0.033);
      const incomeTax = Math.round(totalTax * 0.9);
      const localTax = totalTax - incomeTax;
      return {
        incomeTax,
        localTax,
        totalTax,
        netPay: Math.max(0, grossPay - totalTax),
      };
    }

    case 'labor-income':
      return calculateLaborIncomeTax(grossPay);

    case 'four-insurance':
      return calculateFourInsurance(grossPay);

    default:
      return {
        incomeTax: 0,
        localTax: 0,
        totalTax: 0,
        netPay: grossPay,
      };
  }
}

module.exports = { calculateMonthlyTax };
