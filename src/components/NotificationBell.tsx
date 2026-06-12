import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { authHeaders } from '../pages/_app';

interface NotificationItem {
  id: number;
  queryId?: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
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
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);
  const displayed =
    unread.length > 0
      ? [...unread, ...read.slice(0, Math.max(0, 3 - unread.length))]
      : notifications.slice(0, 3);

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
          onClick={() => setOpen((value) => !value)}
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
                {displayed.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleOpenNotification(notification)}
                    className={`flex w-full items-start px-3 py-2 text-left hover:bg-slate-50 ${
                      notification.isRead ? 'opacity-70' : ''
                    }`}
                  >
                    {!notification.isRead && (
                      <span className="mr-2 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800">{notification.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                        {notification.message}
                      </p>
                    </div>
                  </button>
                ))}
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
