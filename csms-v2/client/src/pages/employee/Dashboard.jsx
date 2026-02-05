import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const number = new Intl.NumberFormat('ko-KR');

const fetchDashboard = async () => {
  const { data } = await apiClient.get('/employee/dashboard');
  return data;
};

export default function EmployeeDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-dashboard'],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center shadow-sm backdrop-blur">
        <p className="text-sm text-slate-500">대시보드 데이터를 불러오는 중입니다...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-700">
        데이터를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
      </section>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <DashboardCard
        title="근무 점포 및 계약 정보"
        description={`${data.workInfo.storeName} · ${data.workInfo.contractInfo.workDays}`}
        onClick={() => navigate(data.workInfo.link)}
      >
        <div className="space-y-2 text-sm text-slate-600">
          <InfoRow label="근무 점포" value={data.workInfo.storeName} />
          <InfoRow label="주소" value={data.workInfo.storeAddress} />
          {data.workInfo.storeCode && (
            <InfoRow label="점포코드(5자리)" value={data.workInfo.storeCode} />
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <InfoRow label="근무 요일" value={data.workInfo.contractInfo.workDays} />
          <InfoRow label="근무 시간" value={data.workInfo.contractInfo.workTime} />
          <InfoRow
            label="주간 계약"
            value={`${data.workInfo.contractInfo.weeklyHours}시간`}
          />
          <InfoRow
            label="시급"
            value={currency.format(data.workInfo.contractInfo.hourlyWage)}
            highlight
          />
        </div>
      </DashboardCard>

      <DashboardCard
        title={`이번 주 근무 현황 (${data.thisWeekWork.weekNumber}주차)`}
        description={data.thisWeekWork.weekRange}
        onClick={() => navigate(data.thisWeekWork.link)}
      >
        <div className="grid grid-cols-3 gap-3 text-center text-slate-600">
          <Metric label="총 근무시간" value={`${data.thisWeekWork.totalHours}h`} />
          <Metric label="근무일수" value={`${data.thisWeekWork.workDays}일`} />
          <Metric
            label="예상 급여"
            value={currency.format(data.thisWeekWork.estimatedPay)}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <StatusPill label="승인 완료" value={`${data.thisWeekWork.approvedCount}건`} />
          {data.thisWeekWork.pendingCount > 0 && (
            <StatusPill
              label="승인 대기"
              value={`${data.thisWeekWork.pendingCount}건`}
              variant="warning"
            />
          )}
        </div>
      </DashboardCard>

      <DashboardCard
        title={`직전월 급여 (${data.lastMonthSalary.monthLabel})`}
        description="주휴수당 포함 금액"
        onClick={() => navigate(data.lastMonthSalary.link)}
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600">
          <InfoRow
            label="총 근무시간"
            value={`${data.lastMonthSalary.totalHours}시간`}
          />
          <InfoRow
            label="기본급"
            value={currency.format(data.lastMonthSalary.basePay)}
          />
          <InfoRow
            label="주휴수당"
            value={currency.format(data.lastMonthSalary.holidayPay)}
          />
          <InfoRow
            label="총 지급액"
            value={currency.format(data.lastMonthSalary.grossPay)}
            highlight
          />
          <InfoRow
            label="세금"
            value={`-${currency.format(data.lastMonthSalary.taxInfo.taxAmount)}`}
          />
        </div>
        <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-center">
          <p className="text-xs font-medium text-emerald-600">실수령액</p>
          <p className="text-2xl font-semibold text-emerald-700">
            {currency.format(data.lastMonthSalary.taxInfo.netPay)}
          </p>
          {data.lastMonthSalary.isConfirmed && (
            <p className="text-xs text-emerald-600">✅ 점주 확정 완료</p>
          )}
        </div>
      </DashboardCard>

      <DashboardCard title="읽지 않은 알림" description="승인 결과를 확인하세요">
        <p className="text-center text-2xl font-semibold text-brand-600">
          {number.format(data.unreadNotifications)}건
        </p>
      </DashboardCard>
    </div>
  );
}

function DashboardCard({ title, description, children, onClick }) {
  return (
    <section
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur ${
        onClick ? 'cursor-pointer transition active:scale-[0.99] hover:-translate-y-0.5 hover:shadow-md' : ''
      }`}
    >
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">
          {title}
        </p>
        <p className="text-sm text-slate-500">{description}</p>
      </header>
      {children}
    </section>
  );
}

function InfoRow({ label, value, highlight }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-slate-500">{label}</span>
      <span
        className={`text-sm font-semibold ${
          highlight ? 'text-brand-600' : 'text-slate-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function StatusPill({ label, value, variant = 'success' }) {
  const styles =
    variant === 'warning'
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${styles}`}>
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-xs">{value}</span>
    </span>
  );
}

