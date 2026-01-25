const { Router } = require('express');
const mongoose = require('mongoose');
const WorkSchedule = require('../models/WorkSchedule');
const { authenticate, requireUser } = require('../middleware/auth');

const router = Router();

// 모든 WorkSchedule 라우트에 인증 적용
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { month } = req.query; // month: 'YYYY-MM'
    const filter = {};
    
    // 사용자별 필터링: 근로자는 자신의 근무일정만, 점주는 모든 근무일정 조회 가능
    if (req.user.role === 'employee') {
      filter.userId = req.user._id;
    } else if (req.query.userId && mongoose.Types.ObjectId.isValid(req.query.userId)) {
      // 점주는 특정 사용자의 근무일정 조회 가능
      filter.userId = req.query.userId;
    }
    if (month) {
      const [y, m] = month.split('-').map((n) => parseInt(n, 10));
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 1));
      filter.workDate = { $gte: start, $lt: end };
    }
    const items = await WorkSchedule.find(filter).sort({ workDate: 1, startTime: 1 }).lean();
    res.json({ items });
  } catch (e) {
    res.status(500).json({ message: '근무 조회 실패', error: e.message });
  }
});

router.post('/', async (req, res) => {
  const payload = req.body || {};

  if (!payload.workDate || !payload.startTime || !payload.endTime) {
    return res.status(400).json({ message: '필수 항목이 누락되었습니다.' });
  }

  try {
    // 근로자는 자신의 ID만 사용, 점주는 payload의 userId 사용 가능
    const scheduleUserId = req.user.role === 'employee' ? req.user._id : (payload.userId || req.user._id);
    
    const schedule = await WorkSchedule.create({
      userId: scheduleUserId,
      storeId: payload.storeId || req.user.storeId,
      workDate: new Date(payload.workDate),
      startTime: payload.startTime,
      endTime: payload.endTime,
      notes: payload.notes || '',
      status: 'pending',
    });
    return res.status(201).json({
      message: '근무 일정이 저장되었습니다.',
      schedule,
    });
  } catch (e) {
    return res.status(500).json({ message: '근무 저장 실패', error: e.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await WorkSchedule.findById(id);
    if (!current) return res.status(404).json({ message: '근무를 찾을 수 없습니다.' });
    
    // 권한 확인: 근로자는 자신의 근무일정만 수정 가능
    if (req.user.role === 'employee' && current.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '본인의 근무일정만 수정할 수 있습니다.' });
    }
    
    if (current.status === 'approved') {
      return res.status(409).json({ message: '승인된 근무는 수정할 수 없습니다.' });
    }
    const payload = req.body || {};
    if (!payload.startTime || !payload.endTime) {
      return res.status(400).json({ message: 'startTime/endTime이 필요합니다.' });
    }
    const updated = await WorkSchedule.findByIdAndUpdate(
      id,
      {
        startTime: payload.startTime,
        endTime: payload.endTime,
        notes: payload.notes ?? current.notes,
      },
      { new: true, runValidators: true }
    );
    return res.json({ message: '근무 일정이 수정되었습니다.', schedule: updated });
  } catch (e) {
    return res.status(500).json({ message: '근무 수정 실패', error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const current = await WorkSchedule.findById(id);
    if (!current) return res.status(404).json({ message: '근무를 찾을 수 없습니다.' });
    
    // 권한 확인: 근로자는 자신의 근무일정만 삭제 가능
    if (req.user.role === 'employee' && current.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: '본인의 근무일정만 삭제할 수 있습니다.' });
    }
    
    if (current.status === 'approved') {
      return res.status(409).json({ message: '승인된 근무는 취소할 수 없습니다.' });
    }
    await WorkSchedule.findByIdAndDelete(id);
    return res.json({ message: '근무 일정이 취소되었습니다.', id });
  } catch (e) {
    return res.status(500).json({ message: '근무 취소 실패', error: e.message });
  }
});

module.exports = router;

