import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import OwnerDashboardCard from '../../components/dashboard/OwnerDashboardCard';
import SummaryChips from '../../components/dashboard/SummaryChips';

export default function OwnerDashboardPage() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['owner-dashboard'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/dashboard');
      return data;
    },
    staleTime: 30 * 1000, // 30초
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-red-500">데이터를 불러오는 중 오류가 발생했습니다.</p>
      </div>
    );
  }

  const { summary, stores, actions } = data || {};

  return (
    <div className="space-y-6">
      {/* 요약 통계 */}
      {summary && <SummaryChips summary={summary} />}

      {/* 점포별 대시보드 카드 */}
      <OwnerDashboardCard
        stores={stores || []}
        actions={actions || []}
        onStoreClick={(storeId) => navigate(`/owner/stores/${storeId}`)}
        onActionClick={(action) => {
          if (action.link) {
            navigate(action.link);
          }
        }}
      />

      {/* 빠른 액션 */}
      {summary?.pendingRequests > 0 && (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">
            빠른 액션
          </h3>
          <button
            type="button"
            onClick={() => navigate('/owner/schedules?status=pending')}
            className="touch-target w-full rounded-2xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600"
          >
            승인 대기 근무일정 확인하기 ({summary.pendingRequests}건)
          </button>
        </div>
      )}
    </div>
  );
}

