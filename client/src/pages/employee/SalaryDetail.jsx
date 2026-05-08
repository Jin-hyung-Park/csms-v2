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
  const queryClient = useQueryClient();

  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctionMessage, setCorrectionMessage] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-salary-detail', year, month],
    queryFn: fetchSalaryDetail,
  });

  const confirmMutation = useMutation({
    mutationFn: () => apiClient.put(`/monthly-salary/${data.salaryId}/confirm-employee`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-salary-detail', year, month] }),
    onError: (err) => alert(err?.response?.data?.message || '확인 처리 중 오류가 발생했습니다.'),
  });

  const correctionMutation = useMutation({
    mutationFn: (message) => apiClient.put(`/monthly-salary/${data.salaryId}/correction-request`, { message }),
    onSuccess: () => {
      setShowCorrectionForm(false);
      setCorrectionMessage('');
      queryClient.invalidateQueries({ queryKey: ['employee-salary-detail', year, month] });
    },
    onError: (err) => alert(err?.response?.data?.message || '수정 요청 중 오류가 발생했습니다.'),
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
        onClick={() => navigate(-1)}
        className="text-sm font-semibold text-brand-600 underline-offset-2 hover:underline"
      >
        ← 급여 목록으로 돌아가기
      </button>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              월별 급여 합계
            </p>
            <h2 className="text-xl font-semibold text-slate-900">{data.monthLabel}</h2>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            {data.isConfirmed ? '확정' : '대기'}
          </span>
        </header>
        <div className="grid gap-3 text-sm text-slate-600">
          <DetailRow label="총 근무시간" value={`${data.monthlyTotal.totalHours}시간`} />
          <DetailRow label="기본급" value={currency.format(data.monthlyTotal.totalBasePay)} />
          <DetailRow label="주휴수당" value={currency.format(data.monthlyTotal.totalHolidayPay)} />
          <DetailRow label="총 지급액" value={currency.format(data.monthlyTotal.totalGrossPay)} />
          <DetailRow label="세금" value={`-${currency.format(data.monthlyTotal.taxInfo.taxAmount)}`} />
          <DetailRow label="실수령액" value={currency.format(data.monthlyTotal.taxInfo.netPay)} highlight />
        </div>
      </section>

      <SalaryConfirmSection
        data={data}
        showCorrectionForm={showCorrectionForm}
        correctionMessage={correctionMessage}
        onCorrectionMessageChange={setCorrectionMessage}
        onConfirm={() => confirmMutation.mutate()}
        onOpenCorrection={() => setShowCorrectionForm(true)}
        onCancelCorrection={() => { setShowCorrectionForm(false); setCorrectionMessage(''); }}
        onSubmitCorrection={() => correctionMutation.mutate(correctionMessage)}
        isConfirming={confirmMutation.isPending}
        isSubmittingCorrection={correctionMutation.isPending}
      />

      {data.weeklyData.map((week) => (
        <WeekDetail key={week.weekNumber} week={week} focused={week.weekNumber === selectedWeekNumber} />
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

function WeekDetail({ week, focused }) {
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
        <Info label="주휴수당" value={currency.format(week.holidayPay)} />
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500">일별 근무</p>
        <ul className="mt-2 space-y-2 text-sm">
          {week.dailySchedules?.length ? (
            week.dailySchedules.map((day) => (
              <li key={day.date} className="flex items-center justify-between">
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
                        : 'text-red-500'
                  }`}
                >
                  {day.status === 'approved' && '승인'}
                  {day.status === 'pending' && '대기'}
                  {day.status === 'rejected' && '반려'}
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

function SalaryConfirmSection({
  data,
  showCorrectionForm,
  correctionMessage,
  onCorrectionMessageChange,
  onConfirm,
  onOpenCorrection,
  onCancelCorrection,
  onSubmitCorrection,
  isConfirming,
  isSubmittingCorrection,
}) {
  const { salaryId, salaryStatus, isConfirmed, employeeConfirmed, employeeConfirmedAt, correctionRequest } = data;

  if (!salaryId) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-center text-sm text-slate-400">
        급여가 아직 산정되지 않았습니다.
      </section>
    );
  }

  if (isConfirmed) {
    return (
      <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-center">
        <p className="text-sm font-semibold text-emerald-600">급여가 확정되었습니다.</p>
        {employeeConfirmed && employeeConfirmedAt && (
          <p className="mt-1 text-xs text-slate-400">
            근로자 확인: {new Date(employeeConfirmedAt).toLocaleDateString('ko-KR')}
          </p>
        )}
      </section>
    );
  }

  if (employeeConfirmed) {
    return (
      <section className="rounded-3xl border border-brand-100 bg-brand-50 p-5 text-center">
        <p className="text-sm font-semibold text-brand-600">확인 완료</p>
        <p className="mt-1 text-xs text-slate-500">
          {employeeConfirmedAt && new Date(employeeConfirmedAt).toLocaleDateString('ko-KR')} 확인하셨습니다. 점주 확정 대기 중입니다.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">급여 확인</p>
        <p className="mt-1 text-sm text-slate-500">급여 내역을 검토하고 이상 여부를 확인해 주세요.</p>
      </header>

      {correctionRequest?.status === 'pending' && (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-600">수정 요청 접수됨</p>
          <p className="mt-1 text-sm text-slate-700">"{correctionRequest.message}"</p>
          <p className="mt-1 text-xs text-slate-400">
            {new Date(correctionRequest.requestedAt).toLocaleDateString('ko-KR')} 요청
          </p>
        </div>
      )}

      {!showCorrectionForm ? (
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 rounded-2xl bg-brand-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isConfirming ? '처리 중...' : '확인 완료'}
          </button>
          <button
            onClick={onOpenCorrection}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
          >
            수정 요청
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={correctionMessage}
            onChange={(e) => onCorrectionMessageChange(e.target.value)}
            placeholder="수정이 필요한 내용을 구체적으로 작성해 주세요. (예: 5월 2일 근무시간이 잘못 기록되었습니다.)"
            rows={4}
            maxLength={1000}
            className="w-full rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 placeholder-slate-300 focus:border-brand-400 focus:outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={onSubmitCorrection}
              disabled={isSubmittingCorrection || !correctionMessage.trim()}
              className="flex-1 rounded-2xl bg-amber-500 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmittingCorrection ? '전송 중...' : '수정 요청 전송'}
            </button>
            <button
              onClick={onCancelCorrection}
              className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

