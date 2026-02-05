const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export default function EmployeeDashboardCard({
  contract,
  currentWeek,
  lastMonthSalary,
  upcomingShifts = [],
}) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-md backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            근로자 홈
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            근로자 대시보드
          </h2>
        </div>
      </header>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            근무 점포 & 계약 정보
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            {contract?.store}
          </h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            <li>시급: {currency.format(contract?.hourlyWage)}</li>
            <li>주당 계약 시간: {contract?.weeklyHours}h</li>
          </ul>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            이번 주 근무 현황
          </p>
          <div className="mt-3 flex items-center gap-6">
            <div>
              <p className="text-3xl font-semibold text-slate-900">
                {currentWeek?.completed}
              </p>
              <p className="text-xs text-slate-500">완료 시간</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-brand-600">
                {currentWeek?.planned}
              </p>
              <p className="text-xs text-slate-500">계획 시간</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-amber-500">
                {currentWeek?.pending}
              </p>
              <p className="text-xs text-slate-500">승인 대기</p>
            </div>
          </div>
        </article>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            직전월 급여
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {currency.format(lastMonthSalary?.total)}
          </p>
          <p className="text-sm text-slate-500">
            주휴수당 {currency.format(lastMonthSalary?.holidayPay)}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
            {lastMonthSalary?.status}
          </span>
        </article>
        <article className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            다가오는 근무
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {upcomingShifts.map((shift) => (
              <li
                key={shift.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-slate-900">{shift.date}</p>
                  <p className="text-xs text-slate-500">{shift.time}</p>
                </div>
                <span className="text-xs font-semibold text-brand-600">
                  {shift.status}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

