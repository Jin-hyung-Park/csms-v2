const formatter = new Intl.NumberFormat('ko-KR');

const summarySchema = [
  { key: 'stores', label: '점포 수', unit: '개' },
  { key: 'employees', label: '근로자 수', unit: '명' },
  { key: 'approvedHours', label: '승인된 근로시간', unit: 'h' },
  { key: 'pendingRequests', label: '승인 대기', unit: '건' },
];

export default function SummaryChips({ summary }) {
  if (!summary) return null;

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {summarySchema.map(({ key, label, unit }) => (
        <article
          key={key}
          className="rounded-3xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur"
        >
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {formatter.format(summary[key] ?? 0)}
            <span className="ml-1 text-sm font-medium text-slate-500">
              {unit}
            </span>
          </p>
        </article>
      ))}
    </section>
  );
}

