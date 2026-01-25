import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const fetchSalarySummary = async (month) => {
  const { data } = await apiClient.get('/employee/salary/summary', {
    params: month ? { month } : {},
  });
  return data;
};

export default function EmployeeSalaryPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-salary-summary'],
    queryFn: () => fetchSalarySummary(),
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center">
        급여 정보를 불러오는 중입니다...
      </section>
    );
  }

  const { months, current } = data;

  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
        급여 정보를 불러오지 못했습니다.
      </section>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              월별 급여
            </p>
            <select
              className="rounded-2xl border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
              value={current.id}
              onChange={(e) =>
                fetchSalarySummary(e.target.value).then((next) => {
                  // React Query 없이 간단히 페이지 새로고침으로 처리할 수도 있지만,
                  // 지금은 네비게이션으로 상세 페이지에서 처리하는 흐름이 더 자연스러워
                  // 요약 화면에서는 선택만 바꾸고 상세로 들어가는 패턴을 유지합니다.
                  window.location.href = `/employee/salary/${next.current.year}/${String(next.current.month).padStart(2, '0')}`;
                })
              }
            >
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.monthLabel}
                </option>
              ))}
            </select>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            {current.monthLabel} 급여 요약
          </h2>
          <p className="text-sm text-slate-500">주휴수당과 주차별 급여를 한눈에 확인</p>
        </header>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
          <p className="text-xs text-slate-500">예상 실수령액</p>
          <p className="text-3xl font-bold text-slate-900">{currency.format(current.netPay)}</p>
          <p className="text-xs text-slate-500">
            기본급 {currency.format(current.basePay)} · 주휴수당 {currency.format(current.holidayPay)}
          </p>
        </div>
        <button
          onClick={() =>
            navigate(
              `/employee/salary/${current.year}/${String(current.month).padStart(2, '0')}`
            )
          }
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-brand-600"
        >
          월별 상세 보기
        </button>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
              주별 급여
            </p>
            <p className="text-sm text-slate-500">월요일 ~ 일요일 기준 주차</p>
          </div>
        </header>

        <div className="space-y-3">
          {current.weeks.map((week) => (
            <WeekCard
              key={week.weekNumber}
              week={week}
              onClick={() =>
                navigate(
                  `/employee/salary/${current.year}/${String(current.month).padStart(
                    2,
                    '0'
                  )}?week=${week.weekNumber}`
                )
              }
            />
          ))}
        </div>
      </section>

    </div>
  );
}

function WeekCard({ week, onClick }) {
  return (
    <article
      onClick={onClick}
      className={`rounded-2xl border border-slate-100 p-4 ${
        onClick ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {week.weekNumber}주차 · {week.range}
          </p>
          <p className="text-xs text-slate-500">근무 {week.totalHours}시간</p>
        </div>
        <span className="text-lg font-bold text-slate-900">{currency.format(week.basePay)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-500">
        <Info label="주휴수당" value={currency.format(week.holidayPay)} />
        <Info label="상태" value={week.holidayPayStatus} />
      </div>
    </article>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p>{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

