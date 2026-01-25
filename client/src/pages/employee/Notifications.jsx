import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

const fetchNotifications = async () => {
  const { data } = await apiClient.get('/employee/notifications');
  return data;
};

const markAsRead = async (id) => {
  const { data } = await apiClient.put(`/employee/notifications/${id}/read`);
  return data;
};

export default function EmployeeNotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['employee-notifications'],
    queryFn: fetchNotifications,
  });

  const mutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-notifications'] }),
  });

  if (isLoading) {
    return (
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 text-center">
        알림을 불러오는 중입니다...
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-3xl border border-red-100 bg-red-50 p-6 text-center text-red-600">
        알림을 불러오지 못했습니다.
      </section>
    );
  }

  const unread = data.items.filter((item) => !item.isRead);
  const read = data.items.filter((item) => item.isRead);

  return (
    <div className="space-y-5 pb-8">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">알림</p>
            <p className="text-sm text-slate-500">
              읽지 않은 알림 {data.unreadCount}건
            </p>
          </div>
        </header>

        <NotificationList
          title="읽지 않은 알림"
          items={unread}
          onRead={(id) => mutation.mutate(id)}
          emptyText="읽지 않은 알림이 없습니다."
        />

        <NotificationList
          title="읽은 알림"
          items={read}
          emptyText="읽은 알림이 없습니다."
          subdued
        />
      </section>
    </div>
  );
}

function NotificationList({ title, items, emptyText, onRead, subdued }) {
  return (
    <div className="mt-6 space-y-3">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-400">{emptyText}</p>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border border-slate-100 p-4 ${
              subdued ? 'bg-slate-50/80 text-slate-500' : 'bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-slate-500">{item.message}</p>
                <p className="text-xs text-slate-400">
                  {new Date(item.createdAt).toLocaleString('ko-KR')}
                </p>
              </div>
              {!item.isRead && onRead && (
                <button
                  onClick={() => onRead(item.id)}
                  className="rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-600"
                >
                  읽음
                </button>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

