const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 50,
    },
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { 
      type: String, 
      required: true, 
      select: false, // select: false로 기본 조회 시 제외
    },
    phone: { 
      type: String, 
      default: '',
      trim: true,
      maxlength: 20,
    },
    role: {
      type: String,
      enum: ['owner', 'employee'],
      default: 'employee',
      required: true,
      index: true,
    },
    storeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      default: null,
      // 근로자는 storeId 필수, 점주는 null 가능 (여러 점포 소유 가능)
    },
    isActive: {
      type: Boolean,
      default: true, // 기본값: 활성
      index: true,
    },
  },
  { timestamps: true }
);

// 인덱스 추가
UserSchema.index({ role: 1, isActive: 1 }); // 역할별 활성 사용자 조회
UserSchema.index({ storeId: 1, isActive: 1 }); // 점포별 활성 직원 조회

// 검증: 근로자는 storeId 필수 (업데이트 시에만 엄격하게 검증)
// 주의: 새로 생성되는 경우(회원가입)에는 storeId가 없을 수 있음
//       이후 근무 배정 시 storeId가 설정되어야 함
UserSchema.pre('save', function (next) {
  // 점주는 여러 점포를 소유할 수 있으므로 storeId 없음이 정상
  if (this.role === 'owner') {
    // 점주는 storeId를 가질 수 있지만 권장하지 않음
    if (this.storeId && this.isModified('storeId')) {
      console.warn(`경고: 점주(${this.email})에게 storeId가 설정되어 있습니다. 점주는 여러 점포를 소유할 수 있으므로 storeId는 일반적으로 null이어야 합니다.`);
    }
    return next();
  }
  
  // 근로자 검증: 업데이트 시에만 엄격하게 검증
  // 새로 생성되는 경우(isNew)에는 storeId가 없어도 됨 (회원가입 시점)
  if (this.role === 'employee' && !this.isNew && !this.storeId && this.isModified('storeId')) {
    // 업데이트 시 storeId를 제거하려는 경우 에러
    const error = new Error('근로자는 소속 점포(storeId)가 필수입니다. storeId를 제거할 수 없습니다.');
    return next(error);
  }
  
  next();
});

// 비밀번호 해싱 (저장 전)
UserSchema.pre('save', async function (next) {
  // 비밀번호가 변경되지 않았으면 스킵
  if (!this.isModified('password')) return next();

  try {
    // 비밀번호 해싱 (10 rounds)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 비밀번호를 제외한 사용자 정보 반환
UserSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

module.exports = mongoose.model('User', UserSchema);

