import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders } from '../pages/_app';

type NotificationType = 'QUERY_REPLY' | 'QUERY_ASSIGNED' | 'QUERY_CREATED';

interface NotificationItem {
  id: number;
  queryId?: number;
  type?: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

function isResolvedNotification(notification: NotificationItem): boolean {
  if (notification.type === 'QUERY_REPLY') return true;
  const text = `${notification.title} ${notification.message}`.toLowerCase();
  return text.includes('resolved') || text.includes('status: done') || text.includes('status: resolved');
}

function getNotificationStyle(notification: NotificationItem): {
  label: string;
  boxClass: string;
  badgeClass: string;
} {
  if (isResolvedNotification(notification)) {
    return {
      label: 'Resolved',
      boxClass: 'border-green-200 bg-green-50',
      badgeClass: 'bg-green-100 text-green-700',
    };
  }

  return {
    label: 'Pending',
    boxClass: 'border-yellow-200 bg-yellow-50',
    badgeClass: 'bg-yellow-100 text-yellow-800',
  };
}

function dedupeNotifications(items: NotificationItem[]): NotificationItem[] {
  const byQuery = new Map<number, NotificationItem>();

  for (const item of items) {
    if (!item.queryId) {
      byQuery.set(-item.id, item);
      continue;
    }

    const existing = byQuery.get(item.queryId);
    if (!existing) {
      byQuery.set(item.queryId, item);
      continue;
    }

    const itemResolved = isResolvedNotification(item);
    const existingResolved = isResolvedNotification(existing);
    if (itemResolved && !existingResolved) {
      byQuery.set(item.queryId, item);
      continue;
    }
    if (itemResolved === existingResolved && item.createdAt > existing.createdAt) {
      byQuery.set(item.queryId, item);
    }
  }

  return Array.from(byQuery.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

const NotificationBell: React.FC = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(dedupeNotifications(data.notifications || []));
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);
  const displayed =
    unread.length > 0
      ? [...unread, ...read.slice(0, Math.max(0, 5 - unread.length))]
      : notifications.slice(0, 5);

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (!notification.isRead) {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ notificationIds: [notification.id] }),
      });
      load();
    }
    if (notification.queryId) {
      router.push(`/queries/reply?id=${notification.queryId}`);
      setOpen(false);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              if (next) load();
              return next;
            });
          }}
          className="relative rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Notifications
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </button>
        {open && (
          <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
            {notifications.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-500">No notifications yet.</p>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <span className="text-xs font-semibold text-slate-700">Notifications</span>
                  {unread.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        fetch('/api/notifications', {
                          method: 'PATCH',
                          headers: authHeaders({ 'Content-Type': 'application/json' }),
                          body: JSON.stringify({}),
                        }).then(() => load());
                      }}
                      className="text-[11px] text-teal-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-96 space-y-2 overflow-y-auto px-2 py-2">
                  {displayed.map((notification) => {
                    const style = getNotificationStyle(notification);
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => handleOpenNotification(notification)}
                        className={`flex w-full items-start rounded-md border p-2.5 text-left transition hover:brightness-95 ${style.boxClass} ${
                          notification.isRead ? 'opacity-75' : ''
                        }`}
                      >
                        {!notification.isRead && (
                          <span className="mr-2 mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-800">{notification.title}</p>
                            <span
                              className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badgeClass}`}
                            >
                              {style.label}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                            {notification.message}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {displayed.length < notifications.length && (
                  <div className="border-t border-slate-100 px-3 py-2 text-center text-[11px] text-slate-400">
                    Showing {displayed.length} of {notifications.length}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default NotificationBell;
