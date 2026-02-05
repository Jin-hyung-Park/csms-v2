import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export default function OwnerSalaryDetailPage() {
  const { userId, year, month } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingWeek, setEditingWeek] = useState(null);
  const [holidayPayAmount, setHolidayPayAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  // 급여 상세 조회
  const { data, isLoading } = useQuery({
    queryKey: ['monthly-salary-detail', userId, year, month],
    queryFn: async () => {
      const { data } = await apiClient.get(`/monthly-salary/${userId}/${year}/${month}`);
      return data.salary;
    },
  });

  // 주휴수당 수정 mutation
  const adjustHolidayPayMutation = useMutation({
    mutationFn: async ({ salaryId, weekIndex, amount, reason, notes }) => {
      const { data } = await apiClient.put(`/monthly-salary/${salaryId}/adjust-holiday-pay`, {
        weekIndex,
        amount: Number(amount),
        reason,
        notes,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-salary-detail']);
      setEditingWeek(null);
      setHolidayPayAmount('');
      setAdjustReason('');
      setAdjustNotes('');
      alert('주휴수당이 수정되었습니다.');
    },
    onError: (error) => {
      const message = error.response?.data?.message || '주휴수당 수정 중 오류가 발생했습니다.';
      alert(message);
    },
  });

  // 급여 확정 mutation
  const confirmSalaryMutation = useMutation({
    mutationFn: async (salaryId) => {
      const { data } = await apiClient.put(`/monthly-salary/${salaryId}/confirm`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['monthly-salary-detail']);
      queryClient.invalidateQueries(['monthly-salaries']);
      alert('급여가 확정되었습니다.');
    },
    onError: (error) => {
      const message = error.response?.data?.message || '급여 확정 중 오류가 발생했습니다.';
      alert(message);
    },
  });

  const handleEditHolidayPay = (week, weekIndex) => {
    setEditingWeek(weekIndex);
    setHolidayPayAmount(week.holidayPay.toString());
    setAdjustReason(week.holidayPayCalculation?.adjusted?.reason || '');
    setAdjustNotes(week.holidayPayCalculation?.adjusted?.notes || '');
  };

  const handleSaveHolidayPay = () => {
    if (!holidayPayAmount) {
      alert('주휴수당 금액을 입력해주세요.');
      return;
    }

    adjustHolidayPayMutation.mutate({
      salaryId: data._id,
      weekIndex: editingWeek,
      amount: holidayPayAmount,
      reason: adjustReason,
      notes: adjustNotes,
    });
  };

  const handleConfirmSalary = () => {
    if (data.status === 'confirmed') {
      alert('이미 확정된 급여입니다.');
      return;
    }

    if (window.confirm('급여를 확정하시겠습니까? 확정 후에는 수정할 수 없습니다.')) {
      confirmSalaryMutation.mutate(data._id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">급여 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  const isConfirmed = data.status === 'confirmed';
  const isAdjusted = data.status === 'adjusted';

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/owner/salary')}
                className="touch-target -ml-1 py-2 text-slate-400 active:opacity-80 hover:text-slate-600"
              >
                ← 뒤로
              </button>
              <h1 className="text-2xl font-semibold text-slate-900">
                {data.employeeName}님 급여 상세
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {year}년 {month}월 급여 내역
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isConfirmed && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">
                ✓ 확정됨
              </span>
            )}
            {data.employeeConfirmed && !isConfirmed && (
              <span className="inline-flex items-center rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-700">
                근로자 확인 완료
              </span>
            )}
            {isAdjusted && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-700">
                수정됨
              </span>
            )}
            {!isConfirmed && (
              <button
                type="button"
                onClick={handleConfirmSalary}
                disabled={confirmSalaryMutation.isPending || !data.employeeConfirmed}
                title={!data.employeeConfirmed ? '근로자가 급여 내용을 확인한 후에만 확정할 수 있습니다.' : undefined}
                className="touch-target rounded-2xl bg-brand-500 px-6 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmSalaryMutation.isPending ? '확정 중...' : '급여 확정'}
              </button>
            )}
            {!isConfirmed && !data.employeeConfirmed && (
              <p className="w-full text-sm text-slate-500">
                근로자가 급여를 확인한 후에 확정 버튼이 활성화됩니다.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 급여 요약: 총근무시간 / 기본급 / 주휴수당 / 실수령액(복지포인트 제외) / 복지포인트 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="min-w-0 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">총 근무시간</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl" title={String(data.totalWorkHours)}>
            {data.totalWorkHours}h
          </p>
        </div>
        <div className="min-w-0 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">기본급</p>
          <p className="mt-2 truncate text-2xl font-bold text-slate-900 sm:text-3xl" title={currency.format(data.totalBasePay)}>
            {currency.format(data.totalBasePay)}
          </p>
        </div>
        <div className="min-w-0 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">주휴수당</p>
          <p className="mt-2 truncate text-2xl font-bold text-emerald-600 sm:text-3xl" title={currency.format(data.totalHolidayPay)}>
            {currency.format(data.totalHolidayPay)}
          </p>
        </div>
        <div className="min-w-0 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">실수령액</p>
          <p className="mt-2 truncate text-2xl font-bold text-brand-600 sm:text-3xl" title={currency.format(data.taxInfo?.netPay ?? 0)}>
            {currency.format(data.taxInfo?.netPay ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-400">(복지포인트 제외)</p>
        </div>
        <div className="min-w-0 rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold text-slate-500">복지포인트</p>
          <p className="mt-2 truncate text-2xl font-bold text-violet-600 sm:text-3xl" title={currency.format(data.totalWelfarePoints ?? 0)}>
            {currency.format(data.totalWelfarePoints ?? 0)}
          </p>
        </div>
      </div>

      {/* 세금 정보 */}
      {data.taxInfo && data.taxInfo.totalTax > 0 && (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {data.taxInfo.nationalPension != null ? '4대 보험·세금 정보' : '세금 정보'}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.taxInfo.nationalPension != null && (
              <>
                <div>
                  <p className="text-sm text-slate-500">국민연금</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {currency.format(data.taxInfo.nationalPension)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">건강보험</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {currency.format(data.taxInfo.healthInsurance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">장기요양보험</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {currency.format(data.taxInfo.longTermCare)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">고용보험</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {currency.format(data.taxInfo.employmentInsurance)}
                  </p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm text-slate-500">소득세</p>
              <p className="text-lg font-semibold text-slate-900">
                {currency.format(data.taxInfo.incomeTax)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">지방세</p>
              <p className="text-lg font-semibold text-slate-900">
                {currency.format(data.taxInfo.localTax)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-500">총 공제액</p>
              <p className="text-lg font-semibold text-red-600">
                {currency.format(data.taxInfo.totalTax)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 주차별 상세 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">주차별 급여 상세</h2>
        <div className="space-y-4">
          {data.weeklyDetails?.map((week, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {week.weekNumber}주차
                  </h3>
                  <p className="text-sm text-slate-500">
                    {week.startDate} ~ {week.endDate}
                  </p>
                  {week.note && (
                    <p className="mt-1 text-xs text-amber-600">{week.note}</p>
                  )}
                </div>
                {!isConfirmed && week.shouldCalculateInThisMonth !== false && (
                  <button
                    onClick={() => handleEditHolidayPay(week, index)}
                    className="touch-target rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-100 hover:bg-slate-100"
                  >
                    주휴수당 수정
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-5">
                <div>
                  <p className="text-slate-500">근무시간</p>
                  <p className="font-semibold text-slate-900">{week.workHours}h</p>
                </div>
                <div>
                  <p className="text-slate-500">근무일수</p>
                  <p className="font-semibold text-slate-900">{week.workDays}일</p>
                </div>
                <div>
                  <p className="text-slate-500">기본급</p>
                  <p className="font-semibold text-slate-900">
                    {currency.format(week.basePay)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">주휴수당</p>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-emerald-600">
                      {currency.format(week.holidayPay)}
                    </p>
                    {week.holidayPayCalculation?.adjusted?.amount !== null && (
                      <span className="text-xs text-amber-600">(수정됨)</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-slate-500">주간 합계</p>
                  <p className="text-lg font-bold text-brand-600">
                    {currency.format(week.weeklyTotal)}
                  </p>
                </div>
              </div>

              {/* 주휴수당 계산 정보 */}
              {week.holidayPayCalculation?.calculated && (
                <div className="mt-3 rounded-xl bg-white p-3 text-xs">
                  <p className="font-semibold text-slate-700">주휴수당 계산 정보</p>
                  <p className="mt-1 text-slate-600">
                    {week.holidayPayCalculation.calculated.isEligible ? (
                      <>
                        <span className="text-emerald-600">✓ 지급 대상</span>
                        {week.holidayPayCalculation.calculated.formula && (
                          <span className="ml-2 text-slate-500">
                            ({week.holidayPayCalculation.calculated.formula})
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-red-600">
                        ✗ {week.holidayPayCalculation.calculated.reason}
                      </span>
                    )}
                  </p>
                  {week.holidayPayCalculation.adjusted?.reason && (
                    <p className="mt-1 text-amber-600">
                      수정 사유: {week.holidayPayCalculation.adjusted.reason}
                    </p>
                  )}
                </div>
              )}

              {/* 주휴수당 수정 폼 */}
              {editingWeek === index && (
                <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4">
                  <h4 className="mb-3 font-semibold text-slate-900">주휴수당 수정</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        주휴수당 금액 (원)
                      </label>
                      <input
                        type="number"
                        value={holidayPayAmount}
                        onChange={(e) => setHolidayPayAmount(e.target.value)}
                        className="input-touch w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                        placeholder="예: 48144"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        수정 사유
                      </label>
                      <input
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        className="input-touch w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                        placeholder="예: 개근 미충족으로 조정"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-semibold text-slate-700">
                        메모 (선택)
                      </label>
                      <textarea
                        value={adjustNotes}
                        onChange={(e) => setAdjustNotes(e.target.value)}
                        className="input-touch min-h-[80px] w-full rounded-xl border border-slate-300 px-3 py-3 text-base"
                        rows="2"
                        placeholder="추가 메모"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSaveHolidayPay}
                        disabled={adjustHolidayPayMutation.isPending}
                        className="touch-target flex-1 rounded-xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600 disabled:opacity-50"
                      >
                        {adjustHolidayPayMutation.isPending ? '저장 중...' : '저장'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingWeek(null)}
                        className="touch-target flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-50 hover:bg-slate-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 근로자 피드백 */}
      {data.employeeFeedbackMessage && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-amber-900">근로자 피드백</h2>
          <p className="text-sm text-amber-800">{data.employeeFeedbackMessage}</p>
          {data.employeeFeedbackAt && (
            <p className="mt-1 text-xs text-amber-600">
              {new Date(data.employeeFeedbackAt).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
      )}

      {/* 확정 정보 */}
      {isConfirmed && data.confirmedAt && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-emerald-900">확정 정보</h2>
          <p className="text-sm text-emerald-700">
            확정 일시: {new Date(data.confirmedAt).toLocaleString('ko-KR')}
          </p>
          {data.confirmedBy?.name && (
            <p className="text-sm text-emerald-700">
              확정자: {data.confirmedBy.name}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
