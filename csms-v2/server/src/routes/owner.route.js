const { Router } = require('express');
const { authenticate, requireOwner } = require('../middleware/auth');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
const MonthlySalary = require('../models/MonthlySalary');
const Notification = require('../models/Notification');
const {
  getStartOfMonth,
  getEndOfMonth,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  formatMonthLabel,
} = require('../utils/dateHelpers');
const { buildPayrollListExcel, buildSchedulesExcel } = require('../utils/excelExporter');

const router = Router();

// 모든 Owner 라우트에 인증 적용
router.use(authenticate);
router.use(requireOwner);

/**
 * GET /api/owner/dashboard
 * 점주 대시보드 - 점포별 통계, 승인 대기 건수 등
 */
router.get('/dashboard', async (req, res) => {
  try {
    const owner = req.user;

    // 점주가 소유한 모든 점포 조회
    const stores = await Store.find({
      ownerId: owner._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    // 점포별 통계 계산
    const now = new Date();
    const currentMonthStart = getStartOfMonth(now.getFullYear(), now.getMonth() + 1);
    const currentMonthEnd = getEndOfMonth(now.getFullYear(), now.getMonth() + 1);

    const storeStats = await Promise.all(
      stores.map(async (store) => {
        // 점포의 직원 수
        const employeeCount = await User.countDocuments({
          storeId: store._id,
          isActive: true,
          role: 'employee',
        });

        // 이번 달 승인된 근무일정 조회
        const approvedSchedules = await WorkSchedule.find({
          storeId: store._id,
          workDate: {
            $gte: currentMonthStart,
            $lte: currentMonthEnd,
          },
          status: 'approved',
        })
          .populate('userId', 'hourlyWage')
          .lean();

        // 승인된 근무시간 합계 및 급여 계산 (각 직원의 시급 사용)
        let totalApprovedHours = 0;
        let totalApprovedPay = 0;

        for (const schedule of approvedSchedules) {
          const hours = schedule.totalHours || 0;
          totalApprovedHours += hours;
          
          // 각 직원의 시급 사용 (없으면 기본값 10320, 2026년 최저시급)
          const hourlyWage = schedule.userId?.hourlyWage || 10320;
          totalApprovedPay += Math.round(hours * hourlyWage);
        }

        // 승인 대기 중인 근무일정 수
        const pendingRequests = await WorkSchedule.countDocuments({
          storeId: store._id,
          status: 'pending',
        });

        return {
          id: store._id.toString(),
          name: store.name,
          address: store.address,
          storeCode: store.storeCode || '',
          employeeCount,
          totalApprovedHours: Math.round(totalApprovedHours * 100) / 100,
          totalApprovedPay,
          pendingRequests,
        };
      })
    );

    // 전체 통계
    const totalStores = stores.length;
    const totalEmployees = await User.countDocuments({
      storeId: { $in: stores.map((s) => s._id) },
      isActive: true,
      role: 'employee',
    });
    const totalApprovedHours = storeStats.reduce(
      (sum, s) => sum + s.totalApprovedHours,
      0
    );
    const totalPendingRequests = storeStats.reduce(
      (sum, s) => sum + s.pendingRequests,
      0
    );

    res.json({
      summary: {
        stores: totalStores,
        employees: totalEmployees,
        approvedHours: Math.round(totalApprovedHours * 100) / 100,
        pendingRequests: totalPendingRequests,
      },
      stores: storeStats,
      actions: [
        { id: 'store', label: '점포 상세', link: '/owner/stores' },
        { id: 'employee', label: '직원 목록', link: '/owner/employees' },
        { id: 'schedule', label: '근무일정 승인', link: '/owner/schedules' },
        { id: 'salary', label: '급여 캘린더', link: '/owner/salary' },
      ],
    });
  } catch (error) {
    console.error('점주 대시보드 조회 오류:', error);
    res.status(500).json({
      message: '대시보드 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/schedules
 * 근무일정 승인 대기 목록 조회
 */
router.get('/schedules', async (req, res) => {
  try {
    const owner = req.user;
    const { status, storeId, month } = req.query;

    // 점주가 소유한 점포 목록
    const stores = await Store.find({
      ownerId: owner._id,
      isActive: true,
    });

    if (stores.length === 0) {
      return res.json({
        items: [],
        summary: {
          pending: 0,
          approved: 0,
          rejected: 0,
        },
      });
    }

    const storeIds = stores.map((s) => s._id);

    // 필터 구성
    const filter = {
      storeId: { $in: storeIds },
    };

    // 상태 필터
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      filter.status = status;
    }

    // 점포 필터
    if (storeId && storeIds.some((id) => id.toString() === storeId)) {
      filter.storeId = storeId;
    }

    // 월별 필터
    if (month) {
      const [y, m] = month.split('-').map((n) => parseInt(n, 10));
      const start = getStartOfMonth(y, m);
      const end = getEndOfMonth(y, m);
      filter.workDate = { $gte: start, $lte: end };
    }

    // 근무일정 조회 (직원 정보 포함)
    const schedules = await WorkSchedule.find(filter)
      .populate('userId', 'name email phone')
      .populate('storeId', 'name address')
      .sort({ workDate: 1, startTime: 1 })
      .lean();

    // 통계 계산
    const summary = {
      pending: schedules.filter((s) => s.status === 'pending').length,
      approved: schedules.filter((s) => s.status === 'approved').length,
      rejected: schedules.filter((s) => s.status === 'rejected').length,
    };

    res.json({
      items: schedules,
      summary,
    });
  } catch (error) {
    console.error('근무일정 조회 오류:', error);
    res.status(500).json({
      message: '근무일정 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/owner/schedules/:id/approve
 * 근무일정 승인
 */
router.put('/schedules/:id/approve', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;

    // 근무일정 조회
    const schedule = await WorkSchedule.findById(id).populate('storeId', 'ownerId name');

    if (!schedule) {
      return res.status(404).json({
        message: '근무일정을 찾을 수 없습니다.',
      });
    }

    // 권한 확인: 점주가 소유한 점포의 근무일정인지 확인
    if (schedule.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 근무일정을 승인할 권한이 없습니다.',
      });
    }

    // 이미 승인된 경우
    if (schedule.status === 'approved') {
      return res.status(409).json({
        message: '이미 승인된 근무일정입니다.',
      });
    }

    // 승인 처리
    schedule.status = 'approved';
    schedule.approvedBy = owner._id;
    schedule.approvedAt = new Date();
    schedule.rejectionReason = ''; // 거절 사유 초기화

    await schedule.save();

    const { notifyScheduleApproved } = require('../utils/notificationHelper');
    await notifyScheduleApproved(
      schedule.userId,
      schedule.workDate,
      schedule.storeId?.name,
      schedule._id
    );

    res.json({
      message: '근무일정이 승인되었습니다.',
      schedule,
    });
  } catch (error) {
    console.error('근무일정 승인 오류:', error);
    res.status(500).json({
      message: '근무일정 승인 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/owner/schedules/:id/reject
 * 근무일정 거절
 */
router.put('/schedules/:id/reject', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // 근무일정 조회
    const schedule = await WorkSchedule.findById(id).populate('storeId', 'ownerId name');

    if (!schedule) {
      return res.status(404).json({
        message: '근무일정을 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    if (schedule.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 근무일정을 거절할 권한이 없습니다.',
      });
    }

    // 이미 거절된 경우
    if (schedule.status === 'rejected') {
      return res.status(409).json({
        message: '이미 거절된 근무일정입니다.',
      });
    }

    // 거절 처리
    schedule.status = 'rejected';
    schedule.approvedBy = owner._id;
    schedule.approvedAt = new Date();
    schedule.rejectionReason = rejectionReason || '';

    await schedule.save();

    const { notifyScheduleRejected } = require('../utils/notificationHelper');
    await notifyScheduleRejected(
      schedule.userId,
      schedule.workDate,
      schedule.storeId?.name,
      rejectionReason || '',
      schedule._id
    );

    res.json({
      message: '근무일정이 거절되었습니다.',
      schedule,
    });
  } catch (error) {
    console.error('근무일정 거절 오류:', error);
    res.status(500).json({
      message: '근무일정 거절 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/owner/schedules/:id
 * 근무일정 수정 (승인된 일정 포함, 점주만)
 */
router.put('/schedules/:id', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;
    const { workDate, startTime, endTime, notes } = req.body;

    const schedule = await WorkSchedule.findById(id).populate('storeId', 'ownerId name');
    if (!schedule) {
      return res.status(404).json({ message: '근무일정을 찾을 수 없습니다.' });
    }
    if (schedule.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({ message: '이 근무일정을 수정할 권한이 없습니다.' });
    }

    const updateData = {};
    if (workDate !== undefined) updateData.workDate = new Date(workDate);
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (notes !== undefined) updateData.notes = notes;
    // totalHours 재계산을 위해 시간 변경 시 둘 다 전달
    if (startTime !== undefined && endTime === undefined) updateData.endTime = schedule.endTime;
    if (endTime !== undefined && startTime === undefined) updateData.startTime = schedule.startTime;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: '수정할 항목이 없습니다.' });
    }

    const updated = await WorkSchedule.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    return res.json({ message: '근무일정이 수정되었습니다.', schedule: updated });
  } catch (error) {
    console.error('근무일정 수정 오류:', error);
    res.status(500).json({
      message: '근무일정 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/owner/schedules/:id
 * 근무일정 삭제 (승인된 일정 포함, 점주만)
 */
router.delete('/schedules/:id', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;

    const schedule = await WorkSchedule.findById(id).populate('storeId', 'ownerId name');
    if (!schedule) {
      return res.status(404).json({ message: '근무일정을 찾을 수 없습니다.' });
    }
    if (schedule.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({ message: '이 근무일정을 삭제할 권한이 없습니다.' });
    }

    await WorkSchedule.findByIdAndDelete(id);
    return res.json({ message: '근무일정이 삭제되었습니다.', id });
  } catch (error) {
    console.error('근무일정 삭제 오류:', error);
    res.status(500).json({
      message: '근무일정 삭제 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/employees
 * 직원 목록 조회
 */
router.get('/employees', async (req, res) => {
  try {
    const owner = req.user;
    const { storeId, approvalStatus } = req.query;

    // 점주가 소유한 점포 목록
    const stores = await Store.find({
      ownerId: owner._id,
      isActive: true,
    });

    if (stores.length === 0) {
      return res.json({ items: [] });
    }

    const storeIds = stores.map((s) => s._id);

    // 필터 구성
    const filter = {
      storeId: { $in: storeIds },
      role: 'employee',
      isActive: true,
    };

    // 점포 필터
    if (storeId && storeIds.some((id) => id.toString() === storeId)) {
      filter.storeId = storeId;
    }

    // 가입 승인 상태 필터 (pending: 승인 대기, approved: 승인됨)
    if (approvalStatus && ['pending', 'approved'].includes(approvalStatus)) {
      filter.approvalStatus = approvalStatus;
    }

    // 직원 조회
    const employees = await User.find(filter)
      .populate('storeId', 'name address')
      .select('-password')
      .sort({ name: 1 })
      .lean();

    // 각 직원의 통계 추가
    const employeesWithStats = await Promise.all(
      employees.map(async (employee) => {
        const now = new Date();
        const currentMonthStart = getStartOfMonth(
          now.getFullYear(),
          now.getMonth() + 1
        );
        const currentMonthEnd = getEndOfMonth(now.getFullYear(), now.getMonth() + 1);

        // 이번 달 근무일정 통계
        const schedules = await WorkSchedule.find({
          userId: employee._id,
          workDate: {
            $gte: currentMonthStart,
            $lte: currentMonthEnd,
          },
        });

        const totalHours = schedules.reduce(
          (sum, s) => sum + (s.totalHours || 0),
          0
        );
        const pendingCount = schedules.filter((s) => s.status === 'pending').length;
        const approvedCount = schedules.filter((s) => s.status === 'approved').length;

        return {
          ...employee,
          stats: {
            totalHours: Math.round(totalHours * 100) / 100,
            pendingCount,
            approvedCount,
          },
        };
      })
    );

    res.json({
      items: employeesWithStats,
    });
  } catch (error) {
    console.error('직원 목록 조회 오류:', error);
    res.status(500).json({
      message: '직원 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/employees/:id
 * 직원 상세 정보 조회
 */
router.get('/employees/:id', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;

    // 직원 조회
    const employee = await User.findById(id)
      .populate('storeId', 'name address ownerId minimumWage')
      .select('-password')
      .lean();

    if (!employee) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.',
      });
    }

    // 권한 확인: 점주가 소유한 점포의 직원인지 확인
    if (employee.role !== 'employee') {
      return res.status(400).json({
        message: '직원 정보가 아닙니다.',
      });
    }

    if (!employee.storeId) {
      return res.status(400).json({
        message: '직원이 점포에 할당되지 않았습니다.',
      });
    }

    if (employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 직원의 정보를 조회할 권한이 없습니다.',
      });
    }

    // 최근 3개월 근무일정 통계
    const now = new Date();
    const stats = [];

    for (let i = 0; i < 3; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = getStartOfMonth(month.getFullYear(), month.getMonth() + 1);
      const monthEnd = getEndOfMonth(month.getFullYear(), month.getMonth() + 1);

      const schedules = await WorkSchedule.find({
        userId: employee._id,
        workDate: {
          $gte: monthStart,
          $lte: monthEnd,
        },
        status: 'approved',
      });

      const totalHours = schedules.reduce(
        (sum, s) => sum + (s.totalHours || 0),
        0
      );

      stats.push({
        year: month.getFullYear(),
        month: month.getMonth() + 1,
        monthLabel: formatMonthLabel(month.getFullYear(), month.getMonth() + 1),
        totalHours: Math.round(totalHours * 100) / 100,
        workDays: schedules.length,
      });
    }

    res.json({
      employee,
      stats,
    });
  } catch (error) {
    console.error('직원 상세 조회 오류:', error);
    res.status(500).json({
      message: '직원 상세 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/owner/employees/:id
 * 직원 정보 수정 (시급, 계약 정보 등)
 */
router.put('/employees/:id', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;
    const { hourlyWage, workSchedule, taxType, approvalStatus, ssn, hiredAt } = req.body;

    // 직원 조회
    const employee = await User.findById(id).populate({
      path: 'storeId',
      select: 'ownerId',
    });

    if (!employee) {
      return res.status(404).json({
        message: '직원을 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    if (employee.role !== 'employee') {
      return res.status(400).json({
        message: '직원 정보가 아닙니다.',
      });
    }

    // 점포 미할당 직원은 점주가 소유한 점포인지 확인 불가 → storeId 있을 때만 점주 소유 확인
    if (employee.storeId && employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 직원의 정보를 수정할 권한이 없습니다.',
      });
    }

    // 수정 가능한 필드 업데이트
    const updateData = {};

    if (approvalStatus === 'approved') {
      updateData.approvalStatus = 'approved';
    }

    if (hourlyWage !== undefined) {
      updateData.hourlyWage = hourlyWage;
    }

    if (workSchedule !== undefined) {
      updateData.workSchedule = workSchedule;
    }

    if (taxType !== undefined) {
      // taxType 검증
      const validTaxTypes = ['none', 'under-15-hours', 'business-income', 'labor-income', 'four-insurance'];
      if (validTaxTypes.includes(taxType)) {
        updateData.taxType = taxType;
      } else {
        return res.status(400).json({
          message: '올바른 세금 타입이 아닙니다.',
        });
      }
    }

    if (ssn !== undefined) {
      updateData.ssn = typeof ssn === 'string' ? ssn.trim() : '';
    }
    if (hiredAt !== undefined) {
      updateData.hiredAt = hiredAt === '' || hiredAt == null ? null : new Date(hiredAt);
    }

    // User 정보 업데이트
    const updatedEmployee = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: '직원 정보가 수정되었습니다.',
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error('직원 정보 수정 오류:', error);
    res.status(500).json({
      message: '직원 정보 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/stores
 * 점포 목록 조회
 */
router.get('/stores', async (req, res) => {
  try {
    const owner = req.user;

    // 점주가 소유한 모든 점포 조회
    const stores = await Store.find({
      ownerId: owner._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // 각 점포의 직원 수 추가
    const storesWithStats = await Promise.all(
      stores.map(async (store) => {
        const employeeCount = await User.countDocuments({
          storeId: store._id,
          isActive: true,
          role: 'employee',
        });

        return {
          ...store,
          employeeCount,
        };
      })
    );

    res.json({
      items: storesWithStats,
    });
  } catch (error) {
    console.error('점포 목록 조회 오류:', error);
    res.status(500).json({
      message: '점포 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * POST /api/owner/stores
 * 점포 생성
 */
router.post('/stores', async (req, res) => {
  try {
    const owner = req.user;
    const { name, address, phone, businessNumber, description, storeCode, minimumWage } = req.body;

    // 필수 항목 검증
    if (!name || !address) {
      return res.status(400).json({
        message: '점포명과 주소는 필수 항목입니다.',
      });
    }

    const code = (storeCode || '').trim().toUpperCase();
    if (code.length !== 0 && code.length !== 5) {
      return res.status(400).json({
        message: '매장코드는 5자리로 입력해 주세요. (근로자 회원가입 시 사용)',
      });
    }
    if (code.length === 5) {
      const existingCode = await Store.findOne({ storeCode: code });
      if (existingCode) {
        return res.status(409).json({
          message: '이미 사용 중인 매장코드입니다.',
        });
      }
    }

    // 점포명 중복 확인 (같은 점주 내에서)
    const existingStore = await Store.findOne({
      ownerId: owner._id,
      name: name.trim(),
      isActive: true,
    });

    if (existingStore) {
      return res.status(409).json({
        message: '이미 존재하는 점포명입니다.',
      });
    }

    // 점포 생성
    const storePayload = {
      storeCode: code.length === 5 ? code : undefined,
      name: name.trim(),
      address: address.trim(),
      phone: phone || '',
      businessNumber: businessNumber || '',
      description: description || '',
      ownerId: owner._id,
      isActive: true,
    };
    if (minimumWage !== undefined) {
      const wage = Number(minimumWage);
      if (!Number.isNaN(wage) && wage >= 0) storePayload.minimumWage = wage;
    }
    const store = await Store.create(storePayload);

    res.status(201).json({
      message: '점포가 생성되었습니다.',
      store,
    });
  } catch (error) {
    console.error('점포 생성 오류:', error);
    res.status(500).json({
      message: '점포 생성 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * PUT /api/owner/stores/:id
 * 점포 정보 수정
 */
router.put('/stores/:id', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;
    const { name, address, phone, businessNumber, description, storeCode, minimumWage } = req.body;

    // 점포 조회
    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        message: '점포를 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    if (store.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 점포를 수정할 권한이 없습니다.',
      });
    }

    // 점포명 중복 확인 (다른 점포와 중복되지 않는지)
    if (name && name.trim() !== store.name) {
      const existingStore = await Store.findOne({
        ownerId: owner._id,
        name: name.trim(),
        isActive: true,
        _id: { $ne: id },
      });

      if (existingStore) {
        return res.status(409).json({
          message: '이미 존재하는 점포명입니다.',
        });
      }
    }

    // 점포 정보 수정
    if (name) store.name = name.trim();
    if (address) store.address = address.trim();
    if (phone !== undefined) store.phone = phone || '';
    if (businessNumber !== undefined) store.businessNumber = businessNumber || '';
    if (description !== undefined) store.description = description || '';
    if (storeCode !== undefined) {
      const code = (storeCode || '').trim().toUpperCase();
      if (code.length !== 0 && code.length !== 5) {
        return res.status(400).json({ message: '매장코드는 5자리로 입력해 주세요.' });
      }
      if (code.length === 5) {
        const existingCode = await Store.findOne({ storeCode: code, _id: { $ne: id } });
        if (existingCode) {
          return res.status(409).json({ message: '이미 사용 중인 매장코드입니다.' });
        }
        store.storeCode = code;
      } else {
        store.storeCode = undefined;
      }
    }
    if (minimumWage !== undefined) {
      const wage = Number(minimumWage);
      if (wage < 0 || Number.isNaN(wage)) {
        return res.status(400).json({ message: '최저시급은 0 이상의 숫자여야 합니다.' });
      }
      store.minimumWage = wage;
    }

    await store.save();

    res.json({
      message: '점포 정보가 수정되었습니다.',
      store,
    });
  } catch (error) {
    console.error('점포 정보 수정 오류:', error);
    res.status(500).json({
      message: '점포 정보 수정 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * DELETE /api/owner/stores/:id
 * 점포 비활성화 (삭제 대신 isActive: false)
 */
router.delete('/stores/:id', async (req, res) => {
  try {
    const owner = req.user;
    const { id } = req.params;

    // 점포 조회
    const store = await Store.findById(id);

    if (!store) {
      return res.status(404).json({
        message: '점포를 찾을 수 없습니다.',
      });
    }

    // 권한 확인
    if (store.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 점포를 삭제할 권한이 없습니다.',
      });
    }

    // 점포 비활성화
    store.isActive = false;
    await store.save();

    res.json({
      message: '점포가 비활성화되었습니다.',
      store,
    });
  } catch (error) {
    console.error('점포 비활성화 오류:', error);
    res.status(500).json({
      message: '점포 비활성화 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * POST /api/owner/notifications
 * 점주가 근로자에게 알림 발송
 */
router.post('/notifications', async (req, res) => {
  try {
    const owner = req.user;
    const { userId, title, message } = req.body || {};

    if (!userId || !title || !message) {
      return res.status(400).json({
        message: 'userId, title, message가 필요합니다.',
      });
    }

    const employee = await User.findById(userId).populate('storeId', 'ownerId');
    if (!employee || employee.role !== 'employee') {
      return res.status(404).json({ message: '해당 근로자를 찾을 수 없습니다.' });
    }
    if (!employee.storeId || employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({ message: '본인 점포 소속 근로자에게만 알림을 보낼 수 있습니다.' });
    }

    const { createNotification } = require('../utils/notificationHelper');
    await createNotification({
      userId: employee._id,
      type: 'owner_message',
      title: String(title).trim().slice(0, 200),
      message: String(message).trim().slice(0, 1000),
      createdBy: owner._id,
    });

    res.status(201).json({
      message: '알림이 전송되었습니다.',
    });
  } catch (error) {
    console.error('알림 발송 오류:', error);
    res.status(500).json({
      message: error.message || '알림 발송 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/notifications/sent
 * 점주가 보낸 알림 목록 (읽음 여부 포함)
 */
router.get('/notifications/sent', async (req, res) => {
  try {
    const owner = req.user;

    const list = await Notification.find({ createdBy: owner._id, type: 'owner_message' })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('userId', 'name email')
      .lean();

    const items = list.map((n) => ({
      id: n._id.toString(),
      userId: n.userId?._id?.toString(),
      userName: n.userId?.name,
      userEmail: n.userId?.email,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
    }));

    res.json({ items });
  } catch (error) {
    console.error('발송 알림 목록 조회 오류:', error);
    res.status(500).json({
      message: error.message || '발송 알림 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/notifications
 * 점주가 받은 알림 (근로자 피드백 등)
 */
router.get('/notifications', async (req, res) => {
  try {
    const owner = req.user;

    const list = await Notification.find({ userId: owner._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('createdBy', 'name')
      .lean();

    const items = list.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      createdAt: n.createdAt,
      isRead: n.isRead,
      createdByName: n.createdBy?.name,
    }));

    res.json({ items });
  } catch (error) {
    console.error('받은 알림 목록 조회 오류:', error);
    res.status(500).json({
      message: error.message || '받은 알림 목록 조회 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/export/payroll
 * 월별 급여 목록 Excel 다운로드 (점주)
 */
router.get('/export/payroll', async (req, res) => {
  try {
    const owner = req.user;
    const { year, month, storeId } = req.query;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (!year || !month || Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      return res.status(400).json({ message: 'year, month 쿼리가 필요합니다.' });
    }

    const stores = await Store.find({ ownerId: owner._id, isActive: true });
    if (stores.length === 0) {
      return res.status(404).json({ message: '소유한 점포가 없습니다.' });
    }
    const storeIds = stores.map((s) => s._id);

    const filter = { storeId: { $in: storeIds }, year: yearNum, month: monthNum };
    if (storeId && storeIds.some((id) => id.toString() === storeId)) {
      filter.storeId = storeId;
    }

    const salaries = await MonthlySalary.find(filter)
      .populate('userId', 'name email ssn hiredAt workSchedule')
      .populate('storeId', 'name')
      .sort({ 'storeId.name': 1, employeeName: 1 })
      .lean();

    const buffer = buildPayrollListExcel(salaries, yearNum, monthNum);
    const filename = `급여목록_${yearNum}${String(monthNum).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    console.error('급여 Excel 내보내기 오류:', error);
    res.status(500).json({
      message: '급여 Excel 내보내기 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

/**
 * GET /api/owner/export/schedules
 * 월별 근무일정 Excel 다운로드 (점주)
 */
router.get('/export/schedules', async (req, res) => {
  try {
    const owner = req.user;
    const { year, month, storeId } = req.query;
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);

    if (!year || !month || Number.isNaN(yearNum) || Number.isNaN(monthNum)) {
      return res.status(400).json({ message: 'year, month 쿼리가 필요합니다.' });
    }

    const stores = await Store.find({ ownerId: owner._id, isActive: true });
    if (stores.length === 0) {
      return res.status(404).json({ message: '소유한 점포가 없습니다.' });
    }
    const storeIds = stores.map((s) => s._id);

    const start = getStartOfMonth(yearNum, monthNum);
    const end = getEndOfMonth(yearNum, monthNum);
    const filter = { storeId: { $in: storeIds }, workDate: { $gte: start, $lte: end } };
    if (storeId && storeIds.some((id) => id.toString() === storeId)) {
      filter.storeId = storeId;
    }

    const schedules = await WorkSchedule.find(filter)
      .populate('userId', 'name email')
      .populate('storeId', 'name')
      .sort({ workDate: 1, startTime: 1 })
      .lean();

    const buffer = buildSchedulesExcel(schedules, yearNum, monthNum);
    const filename = `근무일정_${yearNum}${String(monthNum).padStart(2, '0')}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.send(buffer);
  } catch (error) {
    console.error('근무일정 Excel 내보내기 오류:', error);
    res.status(500).json({
      message: '근무일정 Excel 내보내기 중 오류가 발생했습니다.',
      error: error.message,
    });
  }
});

module.exports = router;

