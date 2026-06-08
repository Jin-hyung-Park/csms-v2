import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { usePersistedFilter } from '../../hooks/usePersistedFilter';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const toMD = (dateStr) => {
  if (!dateStr) return '';
  const [, m, d] = String(dateStr).split('-');
  return `${m}/${d}`;
};

const MINIMUM_WAGE = 10320;

// 해당 주차의 최종 시급: 주 마지막 날 기준으로 수습 여부 판단
// probationEndDate 당일부터 계약 시급 적용 (서버 로직과 동일: workDate < probationEnd)
const getWeekWage = (employee, weekEndDate) => {
  const contractWage = employee.hourlyWage || MINIMUM_WAGE;
  if (!employee.probationEndDate) return contractWage;
  const probationEnd = employee.probationEndDate.slice(0, 10); // YYYY-MM-DD
  return weekEndDate < probationEnd ? MINIMUM_WAGE : contractWage;
};

export default function OwnerSalaryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = usePersistedFilter('csms_filter_salary_year', new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = usePersistedFilter('csms_filter_salary_month', new Date().getMonth() + 1);
  const [storeFilter, setStoreFilter] = usePersistedFilter('csms_filter_salary_store', '');

  // 직원 목록 조회
  const { data: employeesData } = useQuery({
    queryKey: ['owner-employees', storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/owner/employees?${params}`);
      return data;
    },
  });

  // 점포 목록 조회
  const { data: storesData } = useQuery({
    queryKey: ['owner-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/stores');
      return data;
    },
  });

  // 월별 급여 목록 조회
  const { data: salariesData, isLoading } = useQuery({
    queryKey: ['monthly-salaries', selectedYear, selectedMonth, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/monthly-salary?${params}`);
      return data;
    },
  });

  // 산정 전 복지포인트 미리보기
  const { data: previewData } = useQuery({
    queryKey: ['salary-preview', selectedYear, selectedMonth, storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/owner/salary-preview?${params}`);
      return data;
    },
  });

  // 급여 산정 mutation
  const calculateSalaryMutation = useMutation({
    mutationFn: async ({ userId }) => {
      const { data } = await apiClient.post('/monthly-salary/calculate', {
        userId,
        year: selectedYear,
        month: selectedMonth,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-salaries']);
      alert('급여가 산정되었습니다.');
    },
    onError: (error) => {
      const message = error.response?.data?.message || '급여 산정 중 오류가 발생했습니다.';
      alert(message);
    },
  });

  // 산정 취소 mutation
  const cancelSalaryMutation = useMutation({
    mutationFn: async (salaryId) => {
      const { data } = await apiClient.delete(`/monthly-salary/${salaryId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-salaries']);
      alert('급여 산정이 취소되었습니다. 다시 산정할 수 있습니다.');
    },
    onError: (error) => {
      const message = error.response?.data?.message || '산정 취소 중 오류가 발생했습니다.';
      alert(message);
    },
  });

  // 연도/월 옵션 생성
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const employees = employeesData?.items || [];
  const salaries = salariesData?.items || [];
  const previewMap = previewData?.previewMap || {};

  // 직원별 급여 매핑 (userId가 null인 항목 제외)
  const salaryMap = new Map(
    salaries
      .filter((s) => s.userId != null)
      .map((s) => [s.userId?._id ?? s.userId, s])
  );

  const handleCalculateSalary = (employee) => {
    if (window.confirm(`${employee.name}님의 ${selectedMonth}월 급여를 산정하시겠습니까?`)) {
      calculateSalaryMutation.mutate({ userId: employee._id });
    }
  };

  const handleViewDetail = (salary) => {
    const userId = salary.userId?._id ?? salary.userId;
    if (!userId) return;
    navigate(`/owner/salary/${userId}/${salary.year}/${salary.month}`);
  };

  const handleCancelSalary = (salary, employee) => {
    if (salary.status === 'confirmed') {
      alert('확정된 급여는 산정 취소할 수 없습니다.');
      return;
    }
    if (window.confirm(`${employee.name}님의 ${salary.month}월 급여 산정을 취소하시겠습니까? 취소 후 다시 산정할 수 있습니다.`)) {
      cancelSalaryMutation.mutate(salary._id);
    }
  };

  const [exportingPayroll, setExportingPayroll] = useState(false);
  const handleExportPayrollExcel = async () => {
    try {
      setExportingPayroll(true);
      const params = new URLSearchParams();
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/owner/export/payroll?${params}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `급여목록_${selectedYear}${String(selectedMonth).padStart(2, '0')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err.response?.data?.message || 'Excel 다운로드에 실패했습니다.';
      alert(msg);
    } finally {
      setExportingPayroll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">급여 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          직원·주차별 근무와 급여를 산정하고 확인할 수 있습니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* 연도 선택 */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">연도</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input-touch w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </div>

          {/* 월 선택 */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">월</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input-touch w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}월
                </option>
              ))}
            </select>
          </div>

          {/* 점포 필터 */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">점포</label>
            <select
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-700"
            >
              <option value="">전체 점포</option>
              {storesData?.items?.map((store) => (
                <option key={store._id} value={store._id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          {/* Excel 내보내기 */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleExportPayrollExcel}
              disabled={exportingPayroll || salaries.length === 0}
              className="touch-target rounded-2xl border border-emerald-500 bg-white px-4 py-3 text-base font-semibold text-emerald-700 transition active:bg-emerald-50 hover:bg-emerald-50 disabled:opacity-50"
            >
              {exportingPayroll ? '다운로드 중...' : '📥 Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* 급여 통계 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">총 직원 수</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{employees.length}명</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">산정 완료</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{salaries.length}명</p>
        </div>
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">총 급여액</p>
          <p className="mt-2 text-3xl font-bold text-brand-600">
            {currency.format(salaries.reduce((sum, s) => sum + (s.totalGrossPay || 0), 0))}
          </p>
        </div>
      </div>

      {/* 인원-주차별 급여 목록 */}
      {employees.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-12 text-center shadow-sm backdrop-blur">
          <p className="text-slate-500">등록된 직원이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {employees.map((employee) => {
            const salary = salaryMap.get(employee._id);
            const hasCalculated = !!salary;
            const weeklyDetails = salary?.weeklyDetails || [];

            return (
              <div
                key={employee._id}
                className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur"
              >
                {/* 직원 헤더 */}
                <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
                      {employee.name.substring(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-slate-900">
                        {employee.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {employee.storeId?.name || '미할당'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCalculated && (
                      <>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                          {salary.status === 'confirmed' ? '✓ 확정됨' : '산정 완료'}
                        </span>
                        {salary.status === 'adjusted' && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            수정됨
                          </span>
                        )}
                      </>
                    )}
                    {hasCalculated ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(salary)}
                          className="touch-target rounded-2xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600"
                        >
                          상세보기
                        </button>
                        {salary.status !== 'confirmed' && (
                          <button
                            type="button"
                            onClick={() => handleCancelSalary(salary, employee)}
                            disabled={cancelSalaryMutation.isPending}
                            className="touch-target rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-600 transition active:bg-slate-100 hover:bg-slate-50 disabled:opacity-50"
                          >
                            {cancelSalaryMutation.isPending ? '취소 중...' : '산정 취소'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCalculateSalary(employee)}
                        disabled={calculateSalaryMutation.isPending}
                        className="touch-target rounded-2xl border border-brand-500 bg-white px-4 py-3 text-base font-semibold text-brand-600 transition active:bg-brand-50 hover:bg-brand-50 disabled:opacity-50"
                      >
                        {calculateSalaryMutation.isPending ? '산정 중...' : '급여 산정'}
                      </button>
                    )}
                  </div>
                </div>

                {/* 인원-주차별 근무 테이블 */}
                {hasCalculated && weeklyDetails.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50/50">
                    <table className="w-full min-w-[480px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/80">
                          <th className="px-3 py-3 text-left font-semibold text-slate-700">주차</th>
                          <th className="px-3 py-3 text-left font-semibold text-slate-700">기간</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-700">근무시간</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-700">기본급</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-700">주휴수당</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-700">복지포인트</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-700">소계</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyDetails.map((week, idx) => (
                          <tr key={idx} className="border-b border-slate-100 last:border-0">
                            <td className="px-3 py-2.5 font-medium text-slate-900">{week.weekNumber}주차</td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {toMD(week.startDate)} ~ {toMD(week.endDate)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                              {week.workHours}h
                              <span className="ml-1 text-xs font-normal text-slate-400">
                                {currency.format(getWeekWage(employee, week.endDate))}/h
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                              {currency.format(week.basePay)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-emerald-600">
                              {currency.format(week.holidayPay)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-violet-600">
                              {currency.format(week.welfarePoints ?? 0)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-brand-600">
                              {currency.format(week.weeklyTotal)}
                            </td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-slate-200 bg-white/80 font-semibold">
                          <td colSpan={2} className="px-3 py-3 text-slate-700">
                            {selectedYear}년 {selectedMonth}월 합계
                          </td>
                          <td className="px-3 py-3 text-right text-slate-900">
                            {salary.totalWorkHours}h
                          </td>
                          <td className="px-3 py-3 text-right text-slate-900">
                            {currency.format(salary.totalBasePay)}
                          </td>
                          <td className="px-3 py-3 text-right text-emerald-600">
                            {currency.format(salary.totalHolidayPay)}
                          </td>
                          <td className="px-3 py-3 text-right text-violet-600">
                            {currency.format(salary.totalWelfarePoints ?? 0)}
                          </td>
                          <td className="px-3 py-3 text-right text-brand-600">
                            {currency.format(salary.totalGrossPay)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <WelfarePreviewTable preview={previewMap[employee._id]} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WelfarePreviewTable({ preview }) {
  if (!preview) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
        승인된 근무일정이 없거나 데이터를 불러오는 중입니다.
      </div>
    );
  }

  const hasHours = preview.totalHours > 0;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">산정 전 복지포인트 미리보기</p>
      {!hasHours ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
          이 달 승인된 근무가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-violet-100 bg-violet-50/30">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/60">
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">주차</th>
                <th className="px-3 py-2.5 text-left font-semibold text-slate-600">기간</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">근무시간</th>
                <th className="px-3 py-2.5 text-right font-semibold text-slate-600">기본급</th>
                <th className="px-3 py-2.5 text-right font-semibold text-violet-600">복지포인트</th>
              </tr>
            </thead>
            <tbody>
              {preview.weeklyDetails.map((week) => (
                <tr key={week.weekNumber} className="border-b border-violet-50 last:border-0">
                  <td className="px-3 py-2 text-slate-700">{week.weekNumber}주차</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{week.range}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">{week.workHours}h</td>
                  <td className="px-3 py-2 text-right text-slate-700">{currency.format(week.basePay)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-violet-600">{currency.format(week.welfarePoints)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-violet-100 bg-white/60 font-semibold">
                <td colSpan={2} className="px-3 py-2.5 text-slate-600">합계</td>
                <td className="px-3 py-2.5 text-right text-slate-800">{preview.totalHours}h</td>
                <td className="px-3 py-2.5 text-right text-slate-700">{currency.format(preview.totalBasePay)}</td>
                <td className="px-3 py-2.5 text-right text-violet-600">{currency.format(preview.totalWelfarePoints)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
