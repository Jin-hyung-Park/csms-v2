const mongoose = require('mongoose');

const fixedExpenseSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['임대료', '전기세', '수도세', '가스비', '인터넷비', '보험료', '세금', '기타']
  },
  description: {
    type: String,
    required: true,
    maxlength: 200
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // 매월 반복 여부
  isRecurring: {
    type: Boolean,
    default: true
  },
  // 활성화 여부
  isActive: {
    type: Boolean,
    default: true
  },
  // 시작 월 (YYYY-MM 형식)
  startMonth: {
    type: String,
    required: true,
    match: [/^\d{4}-\d{2}$/, '올바른 월 형식을 입력해주세요 (YYYY-MM)']
  },
  // 종료 월 (YYYY-MM 형식, null이면 무제한)
  endMonth: {
    type: String,
    match: [/^\d{4}-\d{2}$/, '올바른 월 형식을 입력해주세요 (YYYY-MM)'],
    default: null
  },
  // 메모
  notes: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// 고정 지출 항목이 특정 월에 적용되는지 확인하는 메서드
fixedExpenseSchema.methods.isApplicableForMonth = function(year, month) {
  if (!this.isActive) return false;
  
  const targetMonth = `${year}-${String(month).padStart(2, '0')}`;
  
  // 시작 월보다 이전이면 false
  if (targetMonth < this.startMonth) return false;
  
  // 종료 월이 설정되어 있고, 종료 월보다 이후면 false
  if (this.endMonth && targetMonth > this.endMonth) return false;
  
  return true;
};

module.exports = mongoose.model('FixedExpense', fixedExpenseSchema); 