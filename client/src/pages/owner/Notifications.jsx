import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export default function OwnerNotificationsPage() {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const { data: employeesData } = useQuery({
    queryKey: ['owner-employees'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/employees');
      return data;
    },
  });

  const { data: sentData, isLoading } = useQuery({
    queryKey: ['owner-notifications-sent'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/notifications/sent');
      return data;
    },
  });

  const { data: receivedData } = useQuery({
    queryKey: ['owner-notifications-received'],
    queryFn: async () => {
      const { data } = await apiClient.get('/owner/notifications');
      return data;
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (body) => {
      const { data } = await apiClient.post('/owner/notifications', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['owner-notifications-sent']);
      setTitle('');
      setMessage('');
      setUserId('');
      alert('알림이 전송되었습니다.');
    },
    onError: (err) => {
      alert(err.response?.data?.message || '알림 전송에 실패했습니다.');
    },
  });

  const employees = employeesData?.items?.filter((e) => e.approvalStatus === 'approved') || [];

  const handleSend = () => {
    if (!userId || !title.trim() || !message.trim()) {
      alert('받는 사람, 제목, 내용을 모두 입력해 주세요.');
      return;
    }
    sendMutation.mutate({ userId, title: title.trim(), message: message.trim() });
  };

  const sentItems = sentData?.items || [];
  const receivedItems = receivedData?.items || [];

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold text-slate-900">근로자 알림</h1>
        <p className="mt-1 text-sm text-slate-500">
          근로자에게 알림을 보내고, 읽었는지 확인할 수 있습니다.
        </p>
      </div>

      {/* 발송 폼 */}
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">알림 보내기</h2>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">받는 사람</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
            >
              <option value="">선택</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} {emp.storeId?.name ? `(${emp.storeId.name})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 급여 확인 요청"
              maxLength={200}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">내용</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="알림 내용을 입력하세요."
              maxLength={1000}
              rows={4}
              className="input-touch w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
            />
          </div>
          <button
            type="button"
            onClick={handleSend}
            disabled={sendMutation.isPending}
            className="touch-target w-full rounded-2xl bg-brand-500 py-3 text-base font-semibold text-white transition active:bg-brand-600 hover:bg-brand-600 disabled:opacity-50"
          >
            {sendMutation.isPending ? '전송 중...' : '알림 보내기'}
          </button>
        </div>
      </section>

      {/* 받은 알림 (근로자 피드백 등) */}
      {receivedItems.length > 0 && (
        <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">받은 알림</h2>
          <ul className="space-y-3">
            {receivedItems.map((n) => (
              <li
                key={n.id}
                className="rounded-2xl border border-sky-100 bg-sky-50/80 p-4"
              >
                <p className="font-semibold text-slate-900">{n.title}</p>
                <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {n.createdByName ? `${n.createdByName} · ` : ''}
                  {n.createdAt ? new Date(n.createdAt).toLocaleString('ko-KR') : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 보낸 알림 목록 (읽음 여부) */}
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">보낸 알림</h2>
        {isLoading ? (
          <p className="py-6 text-center text-slate-500">목록을 불러오는 중...</p>
        ) : sentItems.length === 0 ? (
          <p className="py-6 text-center text-slate-500">보낸 알림이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {sentItems.map((n) => (
              <li
                key={n.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{n.message}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      → {n.userName || '직원'} · {n.createdAt ? new Date(n.createdAt).toLocaleString('ko-KR') : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                      n.isRead ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {n.isRead ? '읽음' : '안 읽음'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
