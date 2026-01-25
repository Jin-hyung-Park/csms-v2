import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

const fetchProfile = async () => {
  const { data } = await apiClient.get('/employee/profile');
  return data;
};

export default function EmployeeProfilePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-profile'],
    queryFn: fetchProfile,
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center">
        내 정보를 불러오는 중입니다...
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        정보를 불러오지 못했습니다.
      </section>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-xl">
            {data.initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{data.name}</p>
            <p className="text-xs text-slate-500">{data.position}</p>
          </div>
        </header>

        <div className="grid gap-3 text-sm text-slate-600">
          <InfoRow label="이메일" value={data.email} />
          <InfoRow label="연락처" value={data.phone} />
          <InfoRow label="점포" value={data.store.name} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            근로 계약 정보
          </p>
        </header>

        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
          <InfoRow label="근무 요일" value={data.contract.workDays} />
          <InfoRow label="근무 시간" value={data.contract.workTime} />
          <InfoRow label="주간 계약 시간" value={`${data.contract.weeklyHours}시간`} />
          <InfoRow label="시급" value={`₩${data.contract.hourlyWage.toLocaleString()}`} />
          <InfoRow label="세금 유형" value={data.contract.taxType} />
          <InfoRow label="계약 상태" value={data.contract.status} />
        </div>
      </section>

      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
            알림 설정
          </p>
          <p className="text-sm text-slate-500">승인 결과/급여 확정 알림을 수신합니다.</p>
        </header>

        <div className="space-y-3 text-sm font-semibold text-slate-600">
          {data.notifications.map((notify) => (
            <div
              key={notify.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
            >
              <div>
                <p>{notify.label}</p>
                <p className="text-xs text-slate-400">{notify.description}</p>
              </div>
              <span
                className={`text-xs ${
                  notify.enabled ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                {notify.enabled ? 'ON' : 'OFF'}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

