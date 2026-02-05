import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export default function OwnerStoresPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    businessNumber: '',
    description: '',
    storeCode: '', // 5자리 매장코드 (근로자 회원가입 시 사용, 선택)
    minimumWage: 10320, // 점포 적용 최저시급 (2026년 10,320원)
  });
  const queryClient = useQueryClient();

  // 점포 목록 조회
  const { data, isLoading } = useQuery({
    queryKey: ['owner-stores'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/stores');
      return data;
    },
    staleTime: 30 * 1000,
  });

  // 점포 생성 mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await apiClient.post('/owner/stores', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-stores']);
      queryClient.invalidateQueries(['owner-dashboard']);
      setIsCreating(false);
      setFormData({
        name: '',
        address: '',
        phone: '',
        businessNumber: '',
        description: '',
        storeCode: '',
        minimumWage: 10320,
      });
    },
  });

  // 점포 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await apiClient.put(`/owner/stores/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-stores']);
      queryClient.invalidateQueries(['owner-dashboard']);
      setEditingId(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        businessNumber: '',
        description: '',
        storeCode: '',
        minimumWage: 10320,
      });
    },
  });

  // 점포 삭제 mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await apiClient.delete(`/owner/stores/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-stores']);
      queryClient.invalidateQueries(['owner-dashboard']);
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.address) {
      alert('점포명과 주소는 필수 항목입니다.');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = (id) => {
    if (!formData.name || !formData.address) {
      alert('점포명과 주소는 필수 항목입니다.');
      return;
    }
    const { name, address, phone, businessNumber, description, storeCode, minimumWage } = formData;
    updateMutation.mutate({
      id,
      data: {
        name,
        address,
        phone,
        businessNumber,
        description,
        storeCode,
        minimumWage: minimumWage ?? 10320,
      },
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('정말 이 점포를 비활성화하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const startEdit = (store) => {
    setEditingId(store._id);
    setFormData({
      name: store.name,
      address: store.address,
      phone: store.phone || '',
      businessNumber: store.businessNumber || '',
      description: store.description || '',
      storeCode: store.storeCode || '',
      minimumWage: store.minimumWage ?? 10320,
    });
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">점포 관리</h1>
            <p className="mt-1 text-sm text-slate-500">
              점포를 등록하고 관리할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="touch-target rounded-2xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600"
          >
            + 점포 등록
          </button>
        </div>
      </div>

      {/* 점포 등록 폼 */}
      {isCreating && (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">새 점포 등록</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                점포명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                placeholder="예: CSMS 판교역점"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                주소 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                placeholder="예: 경기도 성남시 분당구 판교역로 123"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">매장코드 (5자리, 선택)</label>
              <p className="text-xs text-slate-500">근로자 회원가입 시 사용할 5자리 코드. 미입력 시 근로자가 매장코드로 가입할 수 없습니다.</p>
              <input
                type="text"
                maxLength={5}
                value={formData.storeCode}
                onChange={(e) =>
                  setFormData({ ...formData, storeCode: e.target.value.trim().toUpperCase().slice(0, 5) })
                }
                className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 uppercase"
                placeholder="예: PG001"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">적용 최저시급 (원/시간)</label>
              <p className="text-xs text-slate-500">매년 변경 시 설정. 이 점포 소속 근로자 시급 기본값으로 사용됩니다. (2026년 10,320원)</p>
              <input
                type="number"
                min={0}
                value={formData.minimumWage ?? 10320}
                onChange={(e) =>
                  setFormData({ ...formData, minimumWage: e.target.value === '' ? 10320 : Number(e.target.value) })
                }
                className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                placeholder="10320"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">전화번호</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                placeholder="예: 031-123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">사업자번호</label>
              <input
                type="text"
                value={formData.businessNumber}
                onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                placeholder="예: 123-45-67890"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-touch mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base"
                rows={3}
                placeholder="점포에 대한 추가 설명"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCreate}
                disabled={createMutation.isLoading}
                className="touch-target flex-1 rounded-xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600 disabled:opacity-50"
              >
                등록하기
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setFormData({
                    name: '',
                    address: '',
                    phone: '',
                    businessNumber: '',
                    description: '',
                    storeCode: '',
                  });
                }}
                className="touch-target flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-50 hover:bg-slate-50"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 점포 목록 */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-white/60 bg-white/90 p-12 text-center shadow-sm backdrop-blur">
          <p className="text-slate-500">등록된 점포가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((store) => (
            <div
              key={store._id}
              className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur"
            >
              {editingId === store._id ? (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">점포 정보 수정</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        점포명 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        주소 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">전화번호</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        점포코드 (5자리)
                      </label>
                      <p className="text-xs text-slate-500">근로자 회원가입 시 사용할 5자리 코드</p>
                      <input
                        type="text"
                        maxLength={5}
                        value={formData.storeCode}
                        onChange={(e) =>
                          setFormData({ ...formData, storeCode: e.target.value.trim().toUpperCase().slice(0, 5) })
                        }
                        className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 uppercase"
                        placeholder="예: PG001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        사업자번호
                      </label>
                      <input
                        type="text"
                        value={formData.businessNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, businessNumber: e.target.value })
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">설명</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input-touch mt-1 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">적용 최저시급 (원/시간)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.minimumWage ?? 10320}
                        onChange={(e) =>
                          setFormData({ ...formData, minimumWage: e.target.value === '' ? 10320 : Number(e.target.value) })
                        }
                        className="input-touch mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3"
                        placeholder="10320"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleUpdate(store._id)}
                        disabled={updateMutation.isLoading}
                        className="touch-target flex-1 rounded-xl bg-brand-500 px-4 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600 disabled:opacity-50"
                      >
                        저장하기
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({
                            name: '',
                            address: '',
                            phone: '',
                            businessNumber: '',
                            description: '',
                            storeCode: '',
                            minimumWage: 10320,
                          });
                        }}
                        className="touch-target flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-50 hover:bg-slate-50"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
<div>
                    <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{store.name}</h3>
                      <p className="text-sm text-slate-500">{store.address}</p>
                      {store.storeCode && (
                        <p className="mt-0.5 text-sm font-medium text-slate-600">
                          점포코드(5자리): <span className="font-semibold">{store.storeCode}</span>
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(store)}
                        className="touch-target rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-semibold text-slate-700 transition active:bg-slate-100 hover:bg-slate-100"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(store._id)}
                        disabled={deleteMutation.isLoading}
                        className="touch-target rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base font-semibold text-red-700 transition active:bg-red-100 hover:bg-red-100 disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm text-slate-600">
                    {(store.storeCode != null && store.storeCode !== '') && (
                      <p>
                        <span className="font-semibold text-slate-900">점포코드(5자리):</span>{' '}
                        {store.storeCode}
                      </p>
                    )}
                    {store.phone && (
                      <p>
                        <span className="font-semibold text-slate-900">전화번호:</span>{' '}
                        {store.phone}
                      </p>
                    )}
                    {store.businessNumber && (
                      <p>
                        <span className="font-semibold text-slate-900">사업자번호:</span>{' '}
                        {store.businessNumber}
                      </p>
                    )}
                    <p>
                      <span className="font-semibold text-slate-900">직원 수:</span>{' '}
                      {store.employeeCount}명
                    </p>
                    {store.description && (
                      <p>
                        <span className="font-semibold text-slate-900">설명:</span>{' '}
                        {store.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

