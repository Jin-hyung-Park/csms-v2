const express = require('express');
const router = express.Router();
const FixedExpense = require('../models/FixedExpense');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// 점주만 접근 가능한 미들웨어
const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: '점주만 접근할 수 있습니다.' });
  }
  next();
};

// 고정 지출 항목 목록 조회
router.get('/', protect, ownerOnly, async (req, res) => {
  try {
    const fixedExpenses = await FixedExpense.find({ ownerId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json(fixedExpenses);
  } catch (error) {
    logger.error('고정 지출 항목 조회 오류:', error);
    res.status(500).json({ message: '고정 지출 항목 조회 중 오류가 발생했습니다.' });
  }
});

// 특정 월에 적용 가능한 고정 지출 항목 조회
router.get('/applicable/:year/:month', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const fixedExpenses = await FixedExpense.find({ ownerId: req.user._id });
    
    // 해당 월에 적용 가능한 항목들만 필터링
    const applicableExpenses = fixedExpenses.filter(expense => 
      expense.isApplicableForMonth(parseInt(year), parseInt(month))
    );
    
    res.json(applicableExpenses);
  } catch (error) {
    logger.error('적용 가능한 고정 지출 항목 조회 오류:', error);
    res.status(500).json({ message: '고정 지출 항목 조회 중 오류가 발생했습니다.' });
  }
});

// 고정 지출 항목 생성
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const { category, description, amount, isRecurring, startMonth, endMonth, notes } = req.body;
    
    const fixedExpense = new FixedExpense({
      ownerId: req.user._id,
      category,
      description,
      amount,
      isRecurring: isRecurring !== undefined ? isRecurring : true,
      startMonth,
      endMonth,
      notes
    });
    
    await fixedExpense.save();
    res.status(201).json(fixedExpense);
  } catch (error) {
    logger.error('고정 지출 항목 생성 오류:', error);
    res.status(500).json({ message: '고정 지출 항목 생성 중 오류가 발생했습니다.' });
  }
});

// 고정 지출 항목 수정
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const { category, description, amount, isRecurring, isActive, startMonth, endMonth, notes } = req.body;
    
    const fixedExpense = await FixedExpense.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    });
    
    if (!fixedExpense) {
      return res.status(404).json({ message: '고정 지출 항목을 찾을 수 없습니다.' });
    }
    
    fixedExpense.category = category;
    fixedExpense.description = description;
    fixedExpense.amount = amount;
    fixedExpense.isRecurring = isRecurring;
    fixedExpense.isActive = isActive;
    fixedExpense.startMonth = startMonth;
    fixedExpense.endMonth = endMonth;
    fixedExpense.notes = notes;
    
    await fixedExpense.save();
    res.json(fixedExpense);
  } catch (error) {
    logger.error('고정 지출 항목 수정 오류:', error);
    res.status(500).json({ message: '고정 지출 항목 수정 중 오류가 발생했습니다.' });
  }
});

// 고정 지출 항목 삭제
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const fixedExpense = await FixedExpense.findOneAndDelete({
      _id: req.params.id,
      ownerId: req.user._id
    });
    
    if (!fixedExpense) {
      return res.status(404).json({ message: '고정 지출 항목을 찾을 수 없습니다.' });
    }
    
    res.json({ message: '고정 지출 항목이 삭제되었습니다.' });
  } catch (error) {
    logger.error('고정 지출 항목 삭제 오류:', error);
    res.status(500).json({ message: '고정 지출 항목 삭제 중 오류가 발생했습니다.' });
  }
});

// 고정 지출 항목 활성화/비활성화 토글
router.patch('/:id/toggle', protect, ownerOnly, async (req, res) => {
  try {
    const fixedExpense = await FixedExpense.findOne({
      _id: req.params.id,
      ownerId: req.user._id
    });
    
    if (!fixedExpense) {
      return res.status(404).json({ message: '고정 지출 항목을 찾을 수 없습니다.' });
    }
    
    fixedExpense.isActive = !fixedExpense.isActive;
    await fixedExpense.save();
    
    res.json(fixedExpense);
  } catch (error) {
    logger.error('고정 지출 항목 토글 오류:', error);
    res.status(500).json({ message: '고정 지출 항목 토글 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 