const { Router } = require('express');
const { authenticate, requireOwner } = require('../middleware/auth');
const User = require('../models/User');
const Store = require('../models/Store');
const WorkSchedule = require('../models/WorkSchedule');
const {
  getStartOfMonth,
  getEndOfMonth,
  getWeekStart,
  getWeekEnd,
  formatDateRange,
  formatMonthLabel,
} = require('../utils/dateHelpers');

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
          
          // 각 직원의 시급 사용 (없으면 기본값 10030)
          const hourlyWage = schedule.userId?.hourlyWage || 10030;
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
    const schedule = await WorkSchedule.findById(id).populate('storeId', 'ownerId');

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

    // TODO: 알림 생성 (Notification 모델 연동 필요)

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
    const schedule = await WorkSchedule.findById(id).populate('storeId', 'ownerId');

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

    // TODO: 알림 생성 (Notification 모델 연동 필요)

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
 * GET /api/owner/employees
 * 직원 목록 조회
 */
router.get('/employees', async (req, res) => {
  try {
    const owner = req.user;
    const { storeId } = req.query;

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
      .populate('storeId', 'name address ownerId')
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
    const { hourlyWage, workSchedule, taxType } = req.body;

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

    if (!employee.storeId || employee.storeId.ownerId.toString() !== owner._id.toString()) {
      return res.status(403).json({
        message: '이 직원의 정보를 수정할 권한이 없습니다.',
      });
    }

    // 수정 가능한 필드 업데이트
    const updateData = {};
    
    if (hourlyWage !== undefined) {
      updateData.hourlyWage = hourlyWage;
    }
    
    if (workSchedule !== undefined) {
      updateData.workSchedule = workSchedule;
    }
    
    if (taxType !== undefined) {
      // taxType 검증
      const validTaxTypes = ['none', 'under-15-hours', 'business-income', 'labor-income'];
      if (validTaxTypes.includes(taxType)) {
        updateData.taxType = taxType;
      } else {
        return res.status(400).json({
          message: '올바른 세금 타입이 아닙니다.',
        });
      }
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
    const { name, address, phone, businessNumber, description } = req.body;

    // 필수 항목 검증
    if (!name || !address) {
      return res.status(400).json({
        message: '점포명과 주소는 필수 항목입니다.',
      });
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
    const store = await Store.create({
      name: name.trim(),
      address: address.trim(),
      phone: phone || '',
      businessNumber: businessNumber || '',
      description: description || '',
      ownerId: owner._id,
      isActive: true,
    });

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
    const { name, address, phone, businessNumber, description } = req.body;

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

module.exports = router;

