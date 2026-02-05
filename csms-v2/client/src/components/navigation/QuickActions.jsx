const ownerActions = [
  { id: 'schedule', label: '근로시간 승인', description: '요청 확인 및 승인' },
  { id: 'salary', label: '급여 캘린더', description: '주휴수당 계산·확정' },
  { id: 'employee', label: '직원 목록', description: '상세 팝업 수정' },
];

const employeeActions = [
  { id: 'register', label: '근무 일정 등록', description: '스마트 초기값 자동' },
  { id: 'history', label: '근무 히스토리', description: '주간/월간 확인' },
  { id: 'salary', label: '급여 정보', description: '월별 주휴수당 포함' },
];

export default function QuickActions({ variant = 'owner' }) {
  const list = variant === 'owner' ? ownerActions : employeeActions;

  return (
    <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-md backdrop-blur">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            빠른 이동
          </p>
          <h2 className="text-xl font-semibold text-slate-900">
            주요 메뉴 바로가기
          </h2>
        </div>
      </header>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {list.map((action) => (
          <button
            key={action.id}
            className="flex flex-col rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-left transition hover:bg-slate-100"
          >
            <span className="text-sm font-semibold text-slate-900">
              {action.label}
            </span>
            <span className="text-xs text-slate-500">{action.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

