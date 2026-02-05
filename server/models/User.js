const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, '사용자명을 입력해주세요'],
    trim: true,
    maxlength: [50, '사용자명은 50자를 초과할 수 없습니다']
  },
  email: {
    type: String,
    required: [true, '이메일을 입력해주세요'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      '올바른 이메일 형식을 입력해주세요'
    ]
  },
  password: {
    type: String,
    required: function() {
      // 카카오 사용자가 아닌 경우에만 비밀번호 필수
      return !this.kakaoId;
    },
    minlength: [6, '비밀번호는 최소 6자 이상이어야 합니다'],
    select: false
  },
  role: {
    type: String,
    enum: ['employee', 'manager', 'owner'],
    default: 'employee'
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: function() {
      return (this.role === 'employee' || this.role === 'manager') && this.isActive !== false;
    },
    validate: {
      validator: function(v) {
        if ((this.role === 'employee' || this.role === 'manager') && this.isActive !== false && !v) {
          return false;
        }
        return true;
      },
      message: '근무점포를 선택해주세요'
    }
  },
  hourlyWage: {
    type: Number,
    default: 10030, // 최저시급 기본값
    min: [0, '시급은 0 이상이어야 합니다']
  },
  taxType: {
    type: String,
    enum: ['미신고', '주15시간미만', '사업자소득(3.3%)'],
    default: '미신고'
  },
  // 근로일과 시간 설정
  workSchedule: {
    monday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    tuesday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    wednesday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    thursday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    friday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    saturday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    },
    sunday: {
      enabled: { type: Boolean, default: false },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' }
    }
  },
  kakaoId: {
    type: String,
    unique: true,
    sparse: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  phoneNumber: {
    type: String,
    match: [/^[0-9-+()\s]+$/, '올바른 전화번호 형식을 입력해주세요']
  },
  address: {
    type: String,
    maxlength: [200, '주소는 200자를 초과할 수 없습니다']
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },
  // 주민번호 (원본 형태로 저장)
  ssn: {
    type: String,
    match: [/^\d{6}-\d{7}$/, '올바른 주민번호 형식을 입력해주세요 (000000-0000000)']
  },
  hireDate: {
    type: Date,
    default: function() {
      return this.createdAt || new Date();
    }
  },
  terminationDate: {
    type: Date,
    default: null
  },
  // 임금명세서 발송 대체 동의 여부
  payslipAlternativeConsent: {
    type: Boolean,
    default: false
  },
  // 임금명세서 발송 대체 동의 날짜
  payslipAlternativeConsentDate: {
    type: Date,
    default: null
  },
  // 임금명세서 발송 방법 ('email' | 'sms' | 'app' | 'paper')
  payslipDeliveryMethod: {
    type: String,
    enum: ['email', 'sms', 'app', 'paper'],
    default: 'app'
  }
}, {
  timestamps: true
});

// Encrypt password using bcrypt (카카오 사용자가 아닌 경우에만)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  if (!this.password) {
    return false; // 카카오 사용자는 비밀번호가 없음
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema); 