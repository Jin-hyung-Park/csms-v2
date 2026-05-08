import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';

const currency = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

function AssignStoreModal({ employee, stores, onClose, onAssign }) {
  const [selectedStoreId, setSelectedStoreId] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">점포 배정</h2>
        <p className="mb-4 text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{employee.name}</span> 님을 배정할 점포를 선택하세요.
        </p>
        <select
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
          className="mb-4 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm"
        >
          <option value="">점포 선택</option>
          {stores.map((s) => (
            <option key={s._id} value={s._id}>{s.name}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            onClick={() => onAssign(employee._id, selectedStoreId)}
            disabled={!selectedStoreId}
            className="flex-1 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            배정하기
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OwnerEmployeesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [storeFilter, setStoreFilter] = useState('');
  const [assigningEmployee, setAssigningEmployee] = useState(null);

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

  const { data: storesData } = useQuery({
    queryKey: ['owner-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/stores');
      return data;
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ employeeId, storeId }) => {
      const { data } = await apiClient.put(`/owner/employees/${employeeId}`, { storeId });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-employees']);
      setAssigningEmployee(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || '점포 배정 중 오류가 발생했습니다.');
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
  const stores = storesData?.items || [];
  const assigned = items.filter((e) => e.storeId);
  const unassigned = items.filter((e) => !e.storeId);

  const statusBadge = (approvalStatus) => {
    if (approvalStatus === 'pending') return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">승인 대기</span>;
    if (approvalStatus === 'rejected') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">거절됨</span>;
    return null;
  };

  return (
    <div className="space-y-6">
      {assigningEmployee && (
        <AssignStoreModal
          employee={assigningEmployee}
          stores={stores}
          onClose={() => setAssigningEmployee(null)}
          onAssign={(employeeId, storeId) => assignMutation.mutate({ employeeId, storeId })}
        />
      )}

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
          {stores.map((store) => (
            <option key={store._id} value={store._id}>
              {store.name}
            </option>
          ))}
        </select>
      </div>

      {/* 미배정 직원 */}
      {unassigned.length > 0 && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="mb-3 text-base font-semibold text-amber-800">
            점포 미배정 직원 ({unassigned.length}명)
          </h2>
          <div className="space-y-3">
            {unassigned.map((employee) => (
              <div
                key={employee._id}
                className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                    {employee.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{employee.name}</p>
                      {statusBadge(employee.approvalStatus)}
                    </div>
                    <p className="text-xs text-slate-500">{employee.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/owner/employees/${employee._id}`)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    상세
                  </button>
                  {employee.approvalStatus === 'approved' && (
                    <button
                      onClick={() => setAssigningEmployee(employee)}
                      className="rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                    >
                      점포 배정
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 배정된 직원 목록 */}
      {assigned.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-12 text-center shadow-sm backdrop-blur">
          <p className="text-slate-500">등록된 직원이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {assigned.map((employee) => (
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
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {employee.name}
                        </h3>
                        {statusBadge(employee.approvalStatus)}
                      </div>
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
