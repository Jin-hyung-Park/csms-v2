import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const fetchSalaryDetail = async ({ queryKey }) => {
  const [, year, month] = queryKey;
  const { data } = await apiClient.get(`/employee/salary/${year}/${month}`);
  return data;
};

export default function EmployeeSalaryDetailPage() {
  const navigate = useNavigate();
  const { year, month } = useParams();
  const [searchParams] = useSearchParams();
  const focusedWeek = searchParams.get('week');
  const [exportingExcel, setExportingExcel] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-salary-detail', year, month],
    queryFn: fetchSalaryDetail,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data: res } = await apiClient.put(`/employee/salary/confirm/${year}/${month}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-salary-detail', year, month]);
      queryClient.invalidateQueries(['employee-salary-summary']);
      alert('급여 내용을 확인했습니다. (분쟁 방지용으로 보관됩니다.)');
    },
    onError: (err) => {
      alert(err.response?.data?.message || '확인 처리에 실패했습니다.');
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (message) => {
      const { data: res } = await apiClient.post(`/employee/salary/feedback/${year}/${month}`, { message });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['employee-salary-detail', year, month]);
      setFeedbackOpen(false);
      setFeedbackMessage('');
      alert('피드백이 점주에게 전달되었으며, 보관됩니다.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || '피드백 전송에 실패했습니다.');
    },
  });

  const selectedWeekNumber = useMemo(
    () => Number(focusedWeek) || data?.weeklyData?.[0]?.weekNumber,
    [focusedWeek, data]
  );

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center">
        급여 상세를 불러오는 중입니다...
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        급여 상세 정보를 가져오지 못했습니다.
      </section>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="touch-target -ml-1 inline-block py-2 text-base font-semibold text-brand-600 underline-offset-2 hover:underline active:opacity-80"
      >
        ← 급여 목록으로 돌아가기
      </button>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              월별 급여 합계
            </p>
            <h2 className="text-xl font-semibold text-slate-900">{data.monthLabel}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              {data.isConfirmed ? '확정' : '대기'}
            </span>
            {data.monthlySalaryId && data.employeeConfirmed && (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                ✓ 확인 완료 (보관됨)
              </span>
            )}
            {data.monthlySalaryId && !data.isConfirmed && !data.employeeConfirmed && (
              <>
                <button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                  className="touch-target rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white active:bg-brand-600 disabled:opacity-50"
                >
                  {confirmMutation.isPending ? '처리 중...' : '급여 확인 완료'}
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackOpen(true)}
                  className="touch-target rounded-2xl border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-700 active:bg-amber-50"
                >
                  수정 요청
                </button>
              </>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  setExportingExcel(true);
                  const { data: blob } = await apiClient.get(
                    `/employee/export/payroll/${year}/${month}`,
                    { responseType: 'blob' }
                  );
                  const url = window.URL.createObjectURL(new Blob([blob]));
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `급여명세서_${year}${month}.xlsx`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (err) {
                  const msg =
                    err.response?.status === 404
                      ? '해당 월의 급여 데이터가 없습니다. 급여가 산정된 후 다운로드할 수 있습니다.'
                      : err.response?.data?.message || 'Excel 다운로드에 실패했습니다.';
                  alert(msg);
                } finally {
                  setExportingExcel(false);
                }
              }}
              disabled={exportingExcel}
              className="touch-target rounded-2xl border border-emerald-500 bg-white px-4 py-3 text-sm font-semibold text-emerald-700 active:bg-emerald-50 disabled:opacity-50"
            >
              {exportingExcel ? '다운로드 중...' : '📥 Excel'}
            </button>
          </div>
        </header>
        <div className="grid gap-3 text-sm text-slate-600">
          <DetailRow label="총 근무시간" value={`${data.monthlyTotal.totalHours}시간`} />
          <DetailRow label="기본급" value={currency.format(data.monthlyTotal.totalBasePay)} />
          {data.monthlySalaryId && (
            <DetailRow label="주휴수당" value={currency.format(data.monthlyTotal.totalHolidayPay)} />
          )}
          <DetailRow label="총 지급액" value={currency.format(data.monthlyTotal.totalGrossPay)} />
          {data.monthlyTotal.welfarePoints != null && data.monthlyTotal.welfarePoints > 0 && (
            <DetailRow label="복지포인트" value={currency.format(data.monthlyTotal.welfarePoints)} />
          )}
          {data.monthlySalaryId && data.monthlyTotal.taxInfo && (
            <DetailRow label="실수령액" value={currency.format(data.monthlyTotal.taxInfo?.netPay ?? 0)} highlight />
          )}
        </div>
        {/* 세금 정보 - 산정 후에만 노출, 점주 화면과 유사하게 */}
        {data.monthlySalaryId && data.monthlyTotal.taxInfo && (data.monthlyTotal.taxInfo.taxAmount > 0 || data.monthlyTotal.taxInfo.totalTax > 0 || data.taxType === 'four-insurance') && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-base font-semibold text-slate-900">
              {data.taxType === 'four-insurance' || data.monthlyTotal.taxInfo.nationalPension != null || data.monthlyTotal.taxInfo.healthInsurance != null ? '4대 보험·세금 정보' : '세금 정보'}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(data.taxType === 'four-insurance' || data.monthlyTotal.taxInfo.nationalPension != null || data.monthlyTotal.taxInfo.healthInsurance != null || data.monthlyTotal.taxInfo.longTermCare != null || data.monthlyTotal.taxInfo.employmentInsurance != null) && (
                <>
                  <div>
                    <p className="text-xs text-slate-500">국민연금</p>
                    <p className="text-base font-semibold text-slate-900">
                      {currency.format(data.monthlyTotal.taxInfo.nationalPension ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">건강보험</p>
                    <p className="text-base font-semibold text-slate-900">
                      {currency.format(data.monthlyTotal.taxInfo.healthInsurance ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">장기요양보험</p>
                    <p className="text-base font-semibold text-slate-900">
                      {currency.format(data.monthlyTotal.taxInfo.longTermCare ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">고용보험</p>
                    <p className="text-base font-semibold text-slate-900">
                      {currency.format(data.monthlyTotal.taxInfo.employmentInsurance ?? 0)}
                    </p>
                  </div>
                </>
              )}
              <div>
                <p className="text-xs text-slate-500">소득세</p>
                <p className="text-base font-semibold text-slate-900">
                  {currency.format(data.monthlyTotal.taxInfo.incomeTax ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">지방세</p>
                <p className="text-base font-semibold text-slate-900">
                  {currency.format(data.monthlyTotal.taxInfo.localTax ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">총 공제액</p>
                <p className="text-base font-semibold text-red-600">
                  {currency.format(data.monthlyTotal.taxInfo.totalTax ?? data.monthlyTotal.taxInfo.taxAmount ?? 0)}
                </p>
              </div>
            </div>
          </div>
        )}
        {data.employeeFeedbackMessage && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">보낸 피드백 (점주에게 전달됨)</p>
            <p className="mt-1 text-sm text-amber-900">{data.employeeFeedbackMessage}</p>
            {data.employeeFeedbackAt && (
              <p className="mt-1 text-xs text-amber-600">
                {new Date(data.employeeFeedbackAt).toLocaleString('ko-KR')}
              </p>
            )}
          </div>
        )}
      </section>

      {feedbackOpen && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm">
          <h3 className="mb-3 text-base font-semibold text-amber-900">점주에게 피드백 보내기</h3>
          <p className="mb-3 text-sm text-amber-800">
            급여 내용에 이상이 있으면 내용을 적어 보내면 점주에게 전달되며, 분쟁 방지용으로 보관됩니다.
          </p>
          <textarea
            value={feedbackMessage}
            onChange={(e) => setFeedbackMessage(e.target.value)}
            placeholder="예: 주휴수당 금액이 다릅니다. 2주차 근무일수를 확인해 주세요."
            className="input-touch mb-3 min-h-[100px] w-full rounded-2xl border border-amber-300 px-4 py-3 text-base"
            maxLength={2000}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => feedbackMutation.mutate(feedbackMessage)}
              disabled={feedbackMutation.isPending || !feedbackMessage.trim()}
              className="touch-target rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {feedbackMutation.isPending ? '전송 중...' : '전송'}
            </button>
            <button
              type="button"
              onClick={() => { setFeedbackOpen(false); setFeedbackMessage(''); }}
              className="touch-target rounded-2xl border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-700"
            >
              취소
            </button>
          </div>
        </section>
      )}

      {data.weeklyData.map((week) => (
        <WeekDetail
          key={week.weekNumber}
          week={week}
          focused={week.weekNumber === selectedWeekNumber}
          showHolidayPay={!!data.monthlySalaryId}
        />
      ))}
    </div>
  );
}

function DetailRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-brand-600' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  );
}

function WeekDetail({ week, focused, showHolidayPay }) {
  return (
    <section
      className={`rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm ${
        focused ? 'ring-2 ring-brand-100' : ''
      }`}
    >
      <header className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          {week.weekNumber}주차
        </p>
        <p className="text-sm text-slate-500">{week.range}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
        <Info label="근무시간" value={`${week.totalHours}시간`} />
        <Info label="근무일수" value={`${week.workDays}일`} />
        <Info label="기본급" value={currency.format(week.basePay)} />
        {showHolidayPay && (
          <Info label="주휴수당" value={currency.format(week.holidayPay)} />
        )}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500">일별 근무</p>
        <ul className="mt-2 space-y-2 text-sm">
          {week.dailySchedules?.length ? (
            week.dailySchedules.map((day) => (
              <li key={day.id || `${day.date}-${day.startTime}`} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">
                    {day.dayOfWeek} {day.startTime}~{day.endTime}
                  </p>
                  <p className="text-xs text-slate-500">
                    {day.date} · {day.storeName} ({day.hours}h)
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    day.status === 'approved'
                      ? 'text-emerald-600'
                      : day.status === 'pending'
                        ? 'text-amber-600'
                        : day.status === 'rejected'
                          ? 'text-red-500'
                          : 'text-slate-500'
                  }`}
                >
                  {day.status === 'approved' && '승인'}
                  {day.status === 'pending' && '미승인'}
                  {day.status === 'rejected' && '거절'}
                </span>
              </li>
            ))
          ) : (
            <p className="text-xs text-slate-500">등록된 근무가 없습니다.</p>
          )}
        </ul>
      </div>
    </section>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p>{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

