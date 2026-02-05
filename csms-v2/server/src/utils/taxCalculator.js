/**
 * 근로소득·사업자소득·4대보험 세금 계산
 *
 * - labor-income: 근로소득 과세소득 구간별 세율 (소득세법 제55조 2024년 기준, 월 급여 적용)
 * - business-income: 사업자소득 3.3% (소득세 90% + 지방세 10%)
 * - four-insurance: 4대 보험 대상 (국민연금·건강·장기요양·고용보험·소득세·지방세)
 * - none, under-15-hours: 세금 0
 */

/** 10원 미만 절사 */
function floorTo10(x) {
  return Math.floor(Number(x) / 10) * 10;
}

/** 1,000원 미만 절사 */
function floorTo1000(x) {
  return Math.floor(Number(x) / 1000) * 1000;
}

/**
 * 4대 보험 대상 산정 (대상 급여 = 월 총 급여)
 * - 국민연금: 4.5%, 1000원 미만 절사
 * - 건강보험: 3.545%, 10원 미만 절사
 * - 장기요양: 건강보험료의 12.95%, 10원 미만 절사
 * - 고용보험: 0.9%, 10원 미만 절사
 * - 소득세: 1.53%, 10원 미만 절사
 * - 지방소득세: 소득세의 10%, 10원 미만 절사
 *
 * @param {number} monthlyGrossPay - 월 총 급여 (원)
 * @returns {object} 4대보험·소득세·지방세 및 totalTax, netPay
 */
function calculateFourInsurance(monthlyGrossPay) {
  const gross = Math.max(0, monthlyGrossPay);

  const nationalPension = floorTo1000(gross * 0.045);
  const healthInsurance = floorTo10(gross * 0.03545);
  const longTermCare = floorTo10(healthInsurance * 0.1295);
  const employmentInsurance = floorTo10(gross * 0.009);
  const incomeTax = floorTo10(gross * 0.0153);
  const localTax = floorTo10(incomeTax * 0.1);

  const totalTax =
    nationalPension +
    healthInsurance +
    longTermCare +
    employmentInsurance +
    incomeTax +
    localTax;
  const netPay = Math.max(0, gross - totalTax);

  return {
    nationalPension,
    healthInsurance,
    longTermCare,
    employmentInsurance,
    incomeTax,
    localTax,
    totalTax,
    netPay,
  };
}

/**
 * 2024년 소득세법 제55조 기준 과세소득 구간별 세율 (월 급여 적용)
 * - 1,400만원 이하: 6%
 * - 1,400만원 초과 ~ 5,000만원: 84만원 + 초과금액 15%
 * - 5,000만원 초과 ~ 8,800만원: 624만원 + 초과금액 24%
 * - 8,800만원 초과 ~ 1억5천만원: 1,536만원 + 초과금액 35%
 * - 1억5천만원 초과 ~ 3억원: 3,706만원 + 초과금액 38%
 * - 3억원 초과 ~ 5억원: 9,406만원 + 초과금액 40%
 * - 5억원 초과 ~ 10억원: 17,406만원 + 초과금액 42%
 * - 10억원 초과: 38,406만원 + 초과금액 45%
 * 월 급여에 동일 구조 적용 시 누진세액 = 해당 구간 누적세액 + (급여 - 구간하한) × 세율
 */
const LABOR_INCOME_TAX_BRACKETS_2024 = [
  { min: 0, rate: 0.06, cumulativeBelow: 0 },
  { min: 1_400_000, rate: 0.15, cumulativeBelow: 84_000 },
  { min: 5_000_000, rate: 0.24, cumulativeBelow: 624_000 },
  { min: 8_800_000, rate: 0.35, cumulativeBelow: 1_536_000 },
  { min: 15_000_000, rate: 0.38, cumulativeBelow: 3_706_000 },
  { min: 30_000_000, rate: 0.4, cumulativeBelow: 9_406_000 },
  { min: 50_000_000, rate: 0.42, cumulativeBelow: 17_406_000 },
  { min: 88_000_000, rate: 0.45, cumulativeBelow: 38_406_000 },
  { min: 100_000_000, rate: 0.45, cumulativeBelow: 43_806_000 },
];

/**
 * 근로소득 소득세 계산 (월 급여 기준, 과세소득 구간별 세율)
 * 2024년 소득세법 제55조 기준 구간별 누진 적용, 10원 미만 절사
 *
 * @param {number} monthlyGrossPay - 월 급여액 (원)
 * @returns {{ incomeTax: number, localTax: number, totalTax: number }}
 */
function calculateLaborIncomeTax(monthlyGrossPay) {
  const amount = Math.max(0, Math.floor(monthlyGrossPay));
  const brackets = LABOR_INCOME_TAX_BRACKETS_2024;
  let bracket = brackets[0];

  for (let i = brackets.length - 1; i >= 0; i--) {
    if (amount >= brackets[i].min) {
      bracket = brackets[i];
      break;
    }
  }

  const incomeTaxRaw = bracket.cumulativeBelow + (amount - bracket.min) * bracket.rate;
  const incomeTax = floorTo10(incomeTaxRaw);
  const localTax = floorTo10(incomeTax * 0.1);
  const totalTax = incomeTax + localTax;

  return { incomeTax, localTax, totalTax };
}

/**
 * 사업자소득 세금 계산 (3.3%)
 * @param {number} monthlyGrossPay - 월 급여액 (원)
 * @returns {{ incomeTax: number, localTax: number, totalTax: number }}
 */
function calculateBusinessIncomeTax(monthlyGrossPay) {
  const totalTax = Math.round(Math.max(0, monthlyGrossPay) * 0.033);
  const incomeTax = Math.round(totalTax * 0.9);
  const localTax = totalTax - incomeTax;
  return { incomeTax, localTax, totalTax };
}

/**
 * taxType에 따른 월 급여 세금 계산
 * @param {string} taxType - none | under-15-hours | business-income | labor-income | four-insurance
 * @param {number} monthlyGrossPay - 월 총 급여 (기본급 + 주휴수당)
 * @returns {{ incomeTax: number, localTax: number, totalTax: number, netPay: number, [nationalPension]: number, ... }}
 */
function calculateMonthlyTax(taxType, monthlyGrossPay) {
  const gross = Math.max(0, monthlyGrossPay);
  let incomeTax = 0;
  let localTax = 0;
  let totalTax = 0;
  let nationalPension = 0;
  let healthInsurance = 0;
  let longTermCare = 0;
  let employmentInsurance = 0;

  switch (taxType) {
    case 'business-income':
      ({ incomeTax, localTax, totalTax } = calculateBusinessIncomeTax(gross));
      break;
    case 'labor-income':
      ({ incomeTax, localTax, totalTax } = calculateLaborIncomeTax(gross));
      break;
    case 'four-insurance': {
      const four = calculateFourInsurance(gross);
      incomeTax = four.incomeTax;
      localTax = four.localTax;
      totalTax = four.totalTax;
      nationalPension = four.nationalPension;
      healthInsurance = four.healthInsurance;
      longTermCare = four.longTermCare;
      employmentInsurance = four.employmentInsurance;
      break;
    }
    case 'none':
    case 'under-15-hours':
    default:
      totalTax = 0;
      incomeTax = 0;
      localTax = 0;
  }

  const netPay = taxType === 'four-insurance' ? Math.max(0, gross - totalTax) : Math.max(0, gross - totalTax);

  const result = {
    incomeTax,
    localTax,
    totalTax,
    netPay,
  };
  if (taxType === 'four-insurance') {
    result.nationalPension = nationalPension;
    result.healthInsurance = healthInsurance;
    result.longTermCare = longTermCare;
    result.employmentInsurance = employmentInsurance;
  }
  return result;
}

module.exports = {
  calculateLaborIncomeTax,
  calculateBusinessIncomeTax,
  calculateFourInsurance,
  calculateMonthlyTax,
};
