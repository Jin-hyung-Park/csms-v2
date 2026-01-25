export const ownerDashboard = {
  summary: {
    stores: 3,
    employees: 14,
    approvedHours: 312,
    pendingRequests: 4,
  },
  stores: [
    {
      id: 'store-1',
      name: 'CSMS 판교역점',
      employeeCount: 6,
      totalApprovedHours: 112,
      totalApprovedPay: 1_540_000,
      pendingRequests: 1,
    },
    {
      id: 'store-2',
      name: 'CSMS 수지구청점',
      employeeCount: 4,
      totalApprovedHours: 94,
      totalApprovedPay: 1_210_000,
      pendingRequests: 2,
    },
    {
      id: 'store-3',
      name: 'CSMS 분당서울대점',
      employeeCount: 4,
      totalApprovedHours: 106,
      totalApprovedPay: 1_330_000,
      pendingRequests: 1,
    },
  ],
  actions: [
    { id: 'store', label: '점포 상세', link: '/owner/stores' },
    { id: 'employee', label: '직원 목록', link: '/owner/employees' },
    { id: 'salary', label: '급여 캘린더', link: '/owner/salaries' },
  ],
};

export const employeeDashboard = {
  contract: {
    store: 'CSMS 판교역점',
    hourlyWage: 11000,
    weeklyHours: 28,
  },
  currentWeek: {
    planned: 20,
    completed: 12,
    pending: 8,
  },
  lastMonthSalary: {
    total: 1_320_000,
    holidayPay: 110_000,
    status: '지급완료',
  },
  upcomingShifts: [
    { id: 1, date: '11.18 (월)', time: '18:00 - 23:00', status: '확정' },
    { id: 2, date: '11.20 (수)', time: '18:00 - 23:00', status: '승인대기' },
  ],
};

