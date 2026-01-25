const mongoose = require('mongoose');

/**
 * Store 모델 (Phase 2 확장)
 * 점포 정보 및 설정
 */
const StoreSchema = new mongoose.Schema(
  {
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

