const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 100
  },
  address: {
    type: String,
    required: true,
    maxlength: 200
  },
  ownerName: {
    type: String,
    maxlength: 50
  },
  businessNumber: {
    type: String,
    maxlength: 20
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
});

// 점주별로 점포명 중복 방지
storeSchema.index({ ownerId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Store', storeSchema); 