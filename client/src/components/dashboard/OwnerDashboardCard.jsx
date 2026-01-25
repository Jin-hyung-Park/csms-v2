const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export default function OwnerDashboardCard({
  stores = [],
  actions = [],
  onStoreClick,
  onActionClick,
}) {
  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-md backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            점포 현황
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            점주 대시보드 (스토어 중심)
          </h2>
        </div>
        <div className="hidden gap-2 sm:flex">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onActionClick?.(action)}
              className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 transition hover:bg-brand-100"
            >
              {action.label}
            </button>
          ))}
        </div>
      </header>

      {stores.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <p className="text-slate-500">등록된 점포가 없습니다.</p>
          <button
            onClick={() => onActionClick?.({ link: '/owner/stores' })}
            className="mt-4 rounded-2xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            점포 등록하기
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {stores.map((store) => (
            <article
              key={store.id}
              className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                점포
              </p>
              <h3 className="text-lg font-semibold text-slate-900">
                {store.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">{store.address}</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  근로 인원{' '}
                  <span className="font-semibold text-slate-900">
                    {store.employeeCount}명
                  </span>
                </p>
                <p>
                  승인된 근로시간{' '}
                  <span className="font-semibold text-slate-900">
                    {store.totalApprovedHours}h
                  </span>
                </p>
                <p>
                  승인된 급여 총액{' '}
                  <span className="font-semibold text-slate-900">
                    {currency.format(store.totalApprovedPay)}
                  </span>
                </p>
                <p>
                  승인 대기 요청{' '}
                  <span className="font-semibold text-brand-600">
                    {store.pendingRequests}건
                  </span>
                </p>
              </div>
              <button
                onClick={() => onStoreClick?.(store.id)}
                className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                상세 보기
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

