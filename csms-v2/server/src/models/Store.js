const mongoose = require('mongoose');

/**
 * Store 모델 (Phase 2 확장)
 * 점포 정보 및 설정
 */
const StoreSchema = new mongoose.Schema(
  {
    /** 5자리 매장코드 (근로자 회원가입 시 매장 검증용, 고유) */
    storeCode: {
      type: String,
      required: false, // 기존 데이터 호환; 신규 점포는 입력 권장
      trim: true,
      uppercase: true,
      minlength: [5, '매장코드는 5자리입니다'],
      maxlength: 5,
      unique: true,
      sparse: true, // null/빈 값은 중복 허용
      index: true,
    },
    name: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 100,
    },
    address: { 
      type: String, 
      required: true,
      trim: true,
      maxlength: 200,
    },
    phone: { 
      type: String, 
      default: '',
      trim: true,
      maxlength: 20,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true, // 점주 필수
      index: true,
    },
    businessNumber: { 
      type: String, 
      default: '',
      trim: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true, // 기본값: 활성
      index: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    /** 점포 적용 최저시급 (원/시간). 매년 변경 시 점주가 설정. 기본값 2026년 10,320원 */
    minimumWage: {
      type: Number,
      default: 10320,
      min: [0, '최저시급은 0 이상이어야 합니다'],
    },
  },
  { timestamps: true }
);

// 복합 인덱스: 점주별 점포명 중복 방지
StoreSchema.index({ ownerId: 1, name: 1 }, { unique: true });
// 점주별 활성 점포 조회 최적화
StoreSchema.index({ ownerId: 1, isActive: 1 });

// 가상 필드: 점포의 직원 수 (나중에 populate로 사용 가능)
StoreSchema.virtual('employeeCount', {
  ref: 'User',
  localField: '_id',
  foreignField: 'storeId',
  count: true,
});

module.exports = mongoose.model('Store', StoreSchema);

