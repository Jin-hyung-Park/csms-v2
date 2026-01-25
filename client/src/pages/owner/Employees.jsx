import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export default function OwnerEmployeesPage() {
  const navigate = useNavigate();
  const [storeFilter, setStoreFilter] = useState('');

  // 직원 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ['owner-employees', storeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (storeFilter) params.append('storeId', storeFilter);
      const { data } = await apiClient.get(`/owner/employees?${params}`);
      return data;
    },
    staleTime: 30 * 1000,
  });

  // 점포 목록 조회 (필터용)
  const { data: storesData } = useQuery({
    queryKey: ['owner-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/stores');
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-500">로딩 중...</p>
      </div>
    );
  }

  const { items = [] } = data || {};

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">직원 관리</h1>
        <p className="mt-1 text-sm text-slate-500">
          소속 직원 목록을 확인하고 관리할 수 있습니다.
        </p>
      </div>

      {/* 필터 */}
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
        >
          <option value="">전체 점포</option>
          {storesData?.items?.map((store) => (
            <option key={store._id} value={store._id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {/* 직원 목록 */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-12 text-center shadow-sm backdrop-blur">
          <p className="text-slate-500">등록된 직원이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((employee) => (
            <div
              key={employee._id}
              className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-600">
                      {employee.name.substring(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {employee.name}
                      </h3>
                      <p className="text-sm text-slate-500">{employee.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-900">점포:</span>{' '}
                      {employee.storeId?.name || '미할당'}
                    </p>
                    {employee.phone && (
                      <p>
                        <span className="font-semibold text-slate-900">전화번호:</span>{' '}
                        {employee.phone}
                      </p>
                    )}
                    <div className="mt-3 flex gap-4">
                      <div>
                        <span className="text-slate-500">이번 달 근무시간: </span>
                        <span className="font-semibold text-slate-900">
                          {employee.stats?.totalHours || 0}h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">승인 대기: </span>
                        <span className="font-semibold text-amber-600">
                          {employee.stats?.pendingCount || 0}건
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">승인됨: </span>
                        <span className="font-semibold text-emerald-600">
                          {employee.stats?.approvedCount || 0}건
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/owner/employees/${employee._id}`)}
                  className="ml-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  상세보기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

