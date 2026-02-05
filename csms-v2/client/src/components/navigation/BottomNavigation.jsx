const ownerTabs = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'employees', label: '직원' },
  { id: 'salary', label: '급여' },
  { id: 'notifications', label: '알림' },
];

const employeeTabs = [
  { id: 'dashboard', label: '홈' },
  { id: 'schedule', label: '근무표' },
  { id: 'salary', label: '급여' },
  { id: 'settings', label: '설정' },
];

export default function BottomNavigation({ role }) {
  const tabs = role === 'owner' ? ownerTabs : employeeTabs;

  return (
    <nav className="sticky bottom-0 border-t border-white/40 bg-white/80 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-center justify-between px-6 py-3 text-xs font-semibold text-slate-500">
        {tabs.map((tab) => (
          <li key={tab.id}>
            <button className="flex flex-col items-center gap-1 rounded-2xl px-3 py-2 transition hover:text-brand-600">
              <span>{tab.label}</span>
              <span className="h-1 w-6 rounded-full bg-slate-200" />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

