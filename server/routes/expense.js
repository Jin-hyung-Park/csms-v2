const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const Store = require('../models/Store');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// 수익률 계산 함수
const calculateProfitability = (expense) => {
  const totalIncome = (expense.incomeItems || []).reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);

  const totalExpenses = (expense.expenses || []).reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);

  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin
  };
};

// 점주만 접근 가능한 미들웨어
const ownerOnly = (req, res, next) => {
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: '점주만 접근할 수 있습니다.' });
  }
  next();
};

// 점포별 월별 비용 데이터 조회
router.get('/', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month, storeId } = req.query;
    const query = { ownerId: req.user._id };
    
    if (storeId) query.storeId = storeId;
    if (year) query.year = parseInt(year);
    if (month) query.month = parseInt(month);
    
    const expenses = await Expense.find(query)
      .populate('storeId', 'name')
      .sort({ year: -1, month: -1 })
      .limit(12); // 최근 12개월
    
    // 기존 데이터에 paymentMethod가 없는 경우 기본값 설정
    expenses.forEach(expense => {
      if (expense.expenses) {
        expense.expenses.forEach(item => {
          if (!item.paymentMethod) {
            item.paymentMethod = '카드';
          }
        });
      }
    });
    
    res.json(expenses);
  } catch (error) {
    logger.error('비용 데이터 조회 오류:', error);
    res.status(500).json({ message: '비용 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// 점포별 특정 월 비용 데이터 조회
router.get('/:year/:month', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    // 점포 소유권 확인
    const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    let expense = await Expense.findOne({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year),
      month: parseInt(month)
    }).populate('storeId', 'name');
    
    // 기존 데이터에 paymentMethod가 없는 경우 기본값 설정
    if (expense && expense.expenses) {
      expense.expenses.forEach(item => {
        if (!item.paymentMethod) {
          item.paymentMethod = '카드';
        }
      });
    }
    
    if (!expense) {
      // 해당 월 데이터가 없으면 빈 데이터 생성
      expense = new Expense({
        ownerId: req.user._id,
        storeId: storeId,
        year: parseInt(year),
        month: parseInt(month),
        settlementAmount: 0,
        incomeItems: [],
        expenses: [],
        notes: ''
      });
    }
    
    res.json(expense);
  } catch (error) {
    logger.error('월별 비용 데이터 조회 오류:', error);
    res.status(500).json({ message: '비용 데이터 조회 중 오류가 발생했습니다.' });
  }
});

// 점포별 월별 비용 데이터 생성/수정
router.post('/:year/:month', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { storeId, settlementAmount, incomeItems, expenses, notes } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    // 점포 소유권 확인
    const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    // 기존 데이터 확인
    let expense = await Expense.findOne({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (expense) {
      // 기존 데이터 업데이트
      expense.settlementAmount = settlementAmount || 0;
      expense.incomeItems = incomeItems || [];
      expense.expenses = expenses || [];
      expense.notes = notes || '';
    } else {
      // 새 데이터 생성
      expense = new Expense({
        ownerId: req.user._id,
        storeId: storeId,
        year: parseInt(year),
        month: parseInt(month),
        settlementAmount: settlementAmount || 0,
        incomeItems: incomeItems || [],
        expenses: expenses || [],
        notes: notes || ''
      });
    }
    
    await expense.save();
    await expense.populate('storeId', 'name');
    res.json(expense);
  } catch (error) {
    logger.error('비용 데이터 저장 오류:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: '해당 월의 데이터가 이미 존재합니다.' });
    }
    res.status(500).json({ message: '비용 데이터 저장 중 오류가 발생했습니다.' });
  }
});

// 입금 항목 추가
router.post('/:year/:month/income', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { storeId, ...incomeItem } = req.body;
    
    console.log('입금 항목 추가 요청:', { year, month, storeId, incomeItem });
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    // 점포 소유권 확인
    const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    // 필수 필드 기본값 설정
    const enrichedIncomeItem = {
      ...incomeItem,
      category: incomeItem.category,
      amount: parseFloat(incomeItem.amount) || 0,
      description: incomeItem.description || incomeItem.category || '입금 항목',
      date: incomeItem.date || new Date()
    };
    
    console.log('처리된 입금 항목:', enrichedIncomeItem);
    
    // findOneAndUpdate를 사용하여 원자적 업데이트 수행
    const result = await Expense.findOneAndUpdate(
      {
        ownerId: req.user._id,
        storeId: storeId,
        year: parseInt(year),
        month: parseInt(month)
      },
      {
        $push: { incomeItems: enrichedIncomeItem },
        $setOnInsert: {
          settlementAmount: 0,
          expenses: [],
          notes: ''
        }
      },
      {
        new: true, // 업데이트된 문서 반환
        upsert: true, // 문서가 없으면 생성
        runValidators: true
      }
    );
    
    // 수익률 계산 및 업데이트
    const profitability = calculateProfitability(result);
    result.totalIncome = profitability.totalIncome;
    result.totalExpenses = profitability.totalExpenses;
    result.netProfit = profitability.netProfit;
    result.profitMargin = profitability.profitMargin;
    
    await result.save();
    await result.populate('storeId', 'name');
    console.log('저장 완료된 expense:', result);
    res.json(result);
  } catch (error) {
    console.error('입금 항목 추가 오류 상세:', error);
    logger.error('입금 항목 추가 오류:', error);
    res.status(500).json({ message: '입금 항목 추가 중 오류가 발생했습니다.', error: error.message });
  }
});

// 입금 항목 수정
router.put('/:year/:month/income/:incomeId', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month, incomeId } = req.params;
    const { storeId, ...updateData } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    const expense = await Expense.findOne({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!expense) {
      return res.status(404).json({ message: '비용 데이터를 찾을 수 없습니다.' });
    }
    
    // incomeId가 숫자인 경우 배열 인덱스로 처리, ObjectId인 경우 MongoDB id로 처리
    let incomeItem;
    if (isNaN(incomeId)) {
      incomeItem = expense.incomeItems.id(incomeId);
    } else {
      const index = parseInt(incomeId);
      if (index >= 0 && index < expense.incomeItems.length) {
        incomeItem = expense.incomeItems[index];
      }
    }
    
    if (!incomeItem) {
      return res.status(404).json({ message: '입금 항목을 찾을 수 없습니다.' });
    }
    
    Object.assign(incomeItem, updateData);
    
    // 수익률 계산 및 업데이트
    const profitability = calculateProfitability(expense);
    expense.totalIncome = profitability.totalIncome;
    expense.totalExpenses = profitability.totalExpenses;
    expense.netProfit = profitability.netProfit;
    expense.profitMargin = profitability.profitMargin;
    
    await expense.save();
    await expense.populate('storeId', 'name');
    
    res.json(expense);
  } catch (error) {
    logger.error('입금 항목 수정 오류:', error);
    res.status(500).json({ message: '입금 항목 수정 중 오류가 발생했습니다.' });
  }
});

// 입금 항목 삭제
router.delete('/:year/:month/income/:incomeId', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month, incomeId } = req.params;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    const expense = await Expense.findOne({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!expense) {
      return res.status(404).json({ message: '비용 데이터를 찾을 수 없습니다.' });
    }
    
    // incomeId가 숫자인 경우 배열 인덱스로 처리, ObjectId인 경우 MongoDB id로 처리
    if (isNaN(incomeId)) {
      expense.incomeItems.pull(incomeId);
    } else {
      const index = parseInt(incomeId);
      if (index >= 0 && index < expense.incomeItems.length) {
        expense.incomeItems.splice(index, 1);
      }
    }
    
    // 수익률 계산 및 업데이트
    const profitability = calculateProfitability(expense);
    expense.totalIncome = profitability.totalIncome;
    expense.totalExpenses = profitability.totalExpenses;
    expense.netProfit = profitability.netProfit;
    expense.profitMargin = profitability.profitMargin;
    
    await expense.save();
    await expense.populate('storeId', 'name');
    
    res.json(expense);
  } catch (error) {
    logger.error('입금 항목 삭제 오류:', error);
    res.status(500).json({ message: '입금 항목 삭제 중 오류가 발생했습니다.' });
  }
});

// 지출 항목 추가
router.post('/:year/:month/expenses', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { storeId, ...expenseItem } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    // 점포 소유권 확인
    const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    // 필수 필드 기본값 설정
    const enrichedExpenseItem = {
      ...expenseItem,
      category: expenseItem.category,
      amount: parseFloat(expenseItem.amount) || 0,
      description: expenseItem.description || expenseItem.category || '지출 항목',
      paymentMethod: expenseItem.paymentMethod || '카드',
      notes: expenseItem.notes || '',
      date: expenseItem.date || new Date()
    };
    
    // findOneAndUpdate를 사용하여 원자적 업데이트 수행
    const result = await Expense.findOneAndUpdate(
      {
        ownerId: req.user._id,
        storeId: storeId,
        year: parseInt(year),
        month: parseInt(month)
      },
      {
        $push: { expenses: enrichedExpenseItem },
        $setOnInsert: {
          settlementAmount: 0,
          incomeItems: [],
          notes: ''
        }
      },
      {
        new: true, // 업데이트된 문서 반환
        upsert: true, // 문서가 없으면 생성
        runValidators: true
      }
    );
    
    // 수익률 계산 및 업데이트
    const profitability = calculateProfitability(result);
    result.totalIncome = profitability.totalIncome;
    result.totalExpenses = profitability.totalExpenses;
    result.netProfit = profitability.netProfit;
    result.profitMargin = profitability.profitMargin;
    
    await result.save();
    await result.populate('storeId', 'name');
    console.log('저장 완료된 expense:', result);
    res.json(result);
  } catch (error) {
    logger.error('지출 항목 추가 오류:', error);
    res.status(500).json({ message: '지출 항목 추가 중 오류가 발생했습니다.' });
  }
});

// 지출 항목 수정
router.put('/:year/:month/expenses/:expenseId', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month, expenseId } = req.params;
    const { storeId, ...updateData } = req.body;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    const expense = await Expense.findOne({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!expense) {
      return res.status(404).json({ message: '비용 데이터를 찾을 수 없습니다.' });
    }
    
    // 기존 데이터에 paymentMethod가 없는 경우 기본값 설정
    if (expense.expenses) {
      expense.expenses.forEach(item => {
        if (!item.paymentMethod) {
          item.paymentMethod = '카드';
        }
      });
    }
    
    // expenseId가 숫자인 경우 배열 인덱스로 처리, ObjectId인 경우 MongoDB id로 처리
    let expenseItem;
    if (isNaN(expenseId)) {
      expenseItem = expense.expenses.id(expenseId);
    } else {
      const index = parseInt(expenseId);
      if (index >= 0 && index < expense.expenses.length) {
        expenseItem = expense.expenses[index];
      }
    }
    
    if (!expenseItem) {
      return res.status(404).json({ message: '지출 항목을 찾을 수 없습니다.' });
    }
    
    // 필수 필드가 없는 경우 기본값 설정
    const enrichedUpdateData = {
      ...updateData,
      paymentMethod: updateData.paymentMethod || expenseItem.paymentMethod || '카드',
      notes: updateData.notes || expenseItem.notes || ''
    };
    
    Object.assign(expenseItem, enrichedUpdateData);
    
    // 수익률 계산 및 업데이트
    const profitability = calculateProfitability(expense);
    expense.totalIncome = profitability.totalIncome;
    expense.totalExpenses = profitability.totalExpenses;
    expense.netProfit = profitability.netProfit;
    expense.profitMargin = profitability.profitMargin;
    
    await expense.save();
    await expense.populate('storeId', 'name');
    
    res.json(expense);
  } catch (error) {
    logger.error('지출 항목 수정 오류:', error);
    res.status(500).json({ message: '지출 항목 수정 중 오류가 발생했습니다.' });
  }
});

// 지출 항목 삭제
router.delete('/:year/:month/expenses/:expenseId', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month, expenseId } = req.params;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    const expense = await Expense.findOne({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year),
      month: parseInt(month)
    });
    
    if (!expense) {
      return res.status(404).json({ message: '비용 데이터를 찾을 수 없습니다.' });
    }
    
    // 기존 데이터에 paymentMethod가 없는 경우 기본값 설정
    if (expense.expenses) {
      expense.expenses.forEach(item => {
        if (!item.paymentMethod) {
          item.paymentMethod = '카드';
        }
      });
    }
    
    // expenseId가 숫자인 경우 배열 인덱스로 처리, ObjectId인 경우 MongoDB id로 처리
    if (isNaN(expenseId)) {
      expense.expenses.pull(expenseId);
    } else {
      const index = parseInt(expenseId);
      if (index >= 0 && index < expense.expenses.length) {
        expense.expenses.splice(index, 1);
      }
    }
    
    // 수익률 계산 및 업데이트
    const profitability = calculateProfitability(expense);
    expense.totalIncome = profitability.totalIncome;
    expense.totalExpenses = profitability.totalExpenses;
    expense.netProfit = profitability.netProfit;
    expense.profitMargin = profitability.profitMargin;
    
    await expense.save();
    await expense.populate('storeId', 'name');
    
    res.json(expense);
  } catch (error) {
    logger.error('지출 항목 삭제 오류:', error);
    res.status(500).json({ message: '지출 항목 삭제 중 오류가 발생했습니다.' });
  }
});

// 연간 통계 조회
router.get('/stats/annual/:year', protect, ownerOnly, async (req, res) => {
  try {
    const { year } = req.params;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    // 점포 소유권 확인
    const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    const expenses = await Expense.find({
      ownerId: req.user._id,
      storeId: storeId,
      year: parseInt(year)
    });
    
    const stats = {
      totalSettlement: expenses.reduce((sum, exp) => sum + exp.settlementAmount, 0),
      totalIncome: expenses.reduce((sum, exp) => sum + exp.totalIncome, 0),
      totalExpenses: expenses.reduce((sum, exp) => sum + exp.totalExpenses, 0),
      totalNetProfit: expenses.reduce((sum, exp) => sum + exp.netProfit, 0),
      averageProfitMargin: expenses.length > 0 
        ? expenses.reduce((sum, exp) => sum + exp.profitMargin, 0) / expenses.length 
        : 0
    };
    
    res.json(stats);
  } catch (error) {
    logger.error('연간 통계 조회 오류:', error);
    res.status(500).json({ message: '연간 통계 조회 중 오류가 발생했습니다.' });
  }
});

// 월별 인건비 조회
router.get('/labor-cost/:year/:month', protect, ownerOnly, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { storeId } = req.query;
    
    if (!storeId) {
      return res.status(400).json({ message: '점포 ID가 필요합니다.' });
    }
    
    // 점포 소유권 확인
    const store = await Store.findOne({ _id: storeId, ownerId: req.user._id });
    if (!store) {
      return res.status(404).json({ message: '점포를 찾을 수 없습니다.' });
    }
    
    // WorkSchedule 모델을 사용하여 해당 월의 인건비 계산
    const WorkSchedule = require('../models/WorkSchedule');
    
    const workSchedules = await WorkSchedule.find({
      storeId: storeId,
      status: 'approved'
    }).populate('userId', 'username hourlyWage');
    
    const employees = {};
    let totalLaborCost = 0;
    let employeeCount = 0;
    
    workSchedules.forEach(schedule => {
      const employeeId = schedule.userId._id.toString();
      if (!employees[employeeId]) {
        employees[employeeId] = {
          name: schedule.userId.username,
          totalPay: 0,
          totalHours: 0
        };
        employeeCount++;
      }
      
      const pay = schedule.totalHours * schedule.userId.hourlyWage;
      employees[employeeId].totalPay += pay;
      employees[employeeId].totalHours += schedule.totalHours;
      totalLaborCost += pay;
    });
    
    const employeeList = Object.values(employees);
    
    res.json({
      totalLaborCost,
      employeeCount,
      employees: employeeList
    });
  } catch (error) {
    logger.error('인건비 조회 오류:', error);
    res.status(500).json({ message: '인건비 조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router; 