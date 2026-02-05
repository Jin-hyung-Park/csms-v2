const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // 매월 정산 금액 (기본 수입)
  settlementAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  // 추가 입금 항목들
  incomeItems: [{
    category: {
      type: String,
      required: true,
      enum: ['월 정산', '부가 수입', '임대 수입', '기타 수입', '보조금', '환급금', '기타']
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
    date: {
      type: Date,
      required: true
    }
  }],
  // 지출 항목들
  expenses: [{
    category: {
      type: String,
      required: true,
      maxlength: 50
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
    paymentMethod: {
      type: String,
      required: true,
      enum: ['카드', '계좌이체', '현금', '기타']
    },
    notes: {
      type: String,
      maxlength: 500
    },
    date: {
      type: Date,
      required: true
    },
    isRecurring: {
      type: Boolean,
      default: false
    }
  }],
  // 메모
  notes: {
    type: String,
    maxlength: 500
  },
  // 계산된 필드들
  totalIncome: {
    type: Number,
    default: 0
  },
  totalExpenses: {
    type: Number,
    default: 0
  },
  netProfit: {
    type: Number,
    default: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// 점포별 월별로 중복 방지
expenseSchema.index({ storeId: 1, year: 1, month: 1 }, { unique: true });

// 총 수입, 지출, 순이익, 수익률 자동 계산
expenseSchema.pre('save', function(next) {
  // 총 수입 계산 (정산 금액 + 추가 입금 항목들)
  const totalIncomeItems = this.incomeItems.reduce((sum, item) => sum + item.amount, 0);
  this.totalIncome = this.settlementAmount + totalIncomeItems;
  
  // 총 지출 계산
  this.totalExpenses = this.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  
  // 순이익 계산
  this.netProfit = this.totalIncome - this.totalExpenses;
  
  // 수익률 계산 (수익률 = 순이익 / 총수입 * 100)
  this.profitMargin = this.totalIncome > 0 ? (this.netProfit / this.totalIncome) * 100 : 0;
  
  next();
});

module.exports = mongoose.model('Expense', expenseSchema); 