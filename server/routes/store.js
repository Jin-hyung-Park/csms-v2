const express = require('express');
const router = express.Router();
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// 점주만 접근 가능한 미들웨어
const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: '점주만 접근할 수 있습니다.' });
  }
  next();
};

// 점포관리에서 등록된 모든 점포 목록 조회 (인증된 사용자)
router.get('/', protect, async (req, res) => {
  try {
    // 점주인 경우 자신의 점포만, 다른 역할은 모든 활성화된 점포 조회
    const query = req.user.role === 'owner' 
      ? { ownerId: req.user._id, isActive: true }
      : { isActive: true };
    
    const stores = await Store.find(query)
      .populate('ownerId', 'username email')
      .sort({ createdAt: -1 });
    
    res.json(stores);
  } catch (error) {
    logger.error('점포 목록 조회 오류:', error);
    res.status(500).json({ message: '점포 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 회원가입용 점포 목록 조회 (인증되지 않은 사용자)
router.get('/public', async (req, res) => {
  try {
    const stores = await Store.find({ isActive: true })
      .select('_id name address')
      .sort({ createdAt: -1 });
    
    res.json(stores);
  } catch (error) {
    logger.error('공개 점포 목록 조회 오류:', error);
    res.status(500).json({ message: '점포 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 점주별 점포 목록 조회 (회원가입용)
router.get('/public/owner/:ownerId', async (req, res) => {
  try {
    const { ownerId } = req.params;
    
    const stores = await Store.find({ 
      ownerId: ownerId, 
      isActive: true 
    })
      .select('_id name address')
      .sort({ createdAt: -1 });
    
    res.json(stores);
  } catch (error) {
    logger.error('점주별 점포 목록 조회 오류:', error);
    res.status(500).json({ message: '점포 목록 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 점포 조회
router.get('/:id', protect, async (req, res) => {
  try {
    // 점주인 경우 자신의 점포만, 다른 역할은 모든 활성화된 점포 조회 가능
    const query = req.user.role === 'owner' 
      ? { _id: req.params.id, ownerId: req.user._id, isActive: true }
      : { _id: req.params.id, isActive: true };
    
    const store = await Store.findOne(query)
      .populate('ownerId', 'username email');
    
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    res.json(store);
  } catch (error) {
    logger.error('점포 조회 오류:', error);
    res.status(500).json({ message: '점포 조회 중 오류가 발생했습니다.' });
  }
});

// 점포 생성 (점주만 가능)
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const { name, address, ownerName, businessNumber, description } = req.body;
    
    const store = new Store({
      ownerId: req.user._id,
      name,
      address,
      ownerName,
      businessNumber,
      description
    });
    
    await store.save();
    res.status(201).json(store);
  } catch (error) {
    logger.error('점포 생성 오류:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 점포명입니다.' });
    }
    res.status(500).json({ message: '점포 생성 중 오류가 발생했습니다.' });
  }
});

// 점포 수정 (점주만 가능)
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const { name, address, ownerName, businessNumber, description } = req.body;
    
    const store = await Store.findOne({ 
      _id: req.params.id, 
      ownerId: req.user._id 
    });
    
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    store.name = name || store.name;
    store.address = address || store.address;
    store.ownerName = ownerName || store.ownerName;
    store.businessNumber = businessNumber || store.businessNumber;
    store.description = description || store.description;
    
    await store.save();
    res.json(store);
  } catch (error) {
    logger.error('점포 수정 오류:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '이미 존재하는 점포명입니다.' });
    }
    res.status(500).json({ message: '점포 수정 중 오류가 발생했습니다.' });
  }
});

// 점포 삭제 (점주만 가능, 비활성화)
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const store = await Store.findOne({ 
      _id: req.params.id, 
      ownerId: req.user._id 
    });
    
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    store.isActive = false;
    await store.save();
    
    res.json({ message: '점포가 비활성화되었습니다.' });
  } catch (error) {
    logger.error('점포 삭제 오류:', error);
    res.status(500).json({ message: '점포 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 