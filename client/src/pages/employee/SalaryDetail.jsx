import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-salary-detail', year, month],
    queryFn: fetchSalaryDetail,
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

