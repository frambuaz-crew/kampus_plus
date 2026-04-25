import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, MessageSquare, Briefcase, ShoppingBag, CheckCheck } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  read: boolean;
  link?: string;
  created_at: string;
  relative_time?: string;
  actor?: {
    id: string;
    username: string;
    full_name: string;
  };
}

function getIcon(type: string) {
  if (type === 'new_message') return <MessageSquare className="w-4 h-4 text-[#0ea5e9]" />;
  if (type.includes('career')) return <Briefcase className="w-4 h-4 text-amber-500" />;
  if (type.includes('market') || type.includes('listing')) return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
  return <Bell className="w-4 h-4 text-slate-400" />;
}

function getIconBg(type: string) {
  if (type === 'new_message') return 'bg-sky-50';
  if (type.includes('career')) return 'bg-amber-50';
  if (type.includes('market') || type.includes('listing')) return 'bg-emerald-50';
  return 'bg-slate-100';
}

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const limit = 20;

  const load = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/notifications?page=${p}&limit=${limit}`);
      const data = res.data;
      setUnreadCount(data.unread_count || 0);
      setHasMore(data.has_more || false);
      if (p === 1) {
        setNotifications(data.notifications || []);
      } else {
        setNotifications((prev) => [...prev, ...(data.notifications || [])]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const notifyHeader = () => {
    window.dispatchEvent(new CustomEvent('kampus-notifications-updated'));
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true, read: true })));
      setUnreadCount(0);
      notifyHeader();
    } catch {
      // ignore
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = async (notif: Notification) => {
    try {
      await apiClient.patch(`/notifications/${notif.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, is_read: true, read: true } : n)
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      notifyHeader();
    } catch { /* ignore */ }

    if (notif.link) navigate(notif.link);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    load(next);
  };

  return (
    <MainLayout>
      <div className="w-full px-6 xl:px-10 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Bildirimler</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-slate-500 mt-0.5">{unreadCount} okunmamış bildirim</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                disabled={markingAll}
                className="flex items-center gap-1.5 text-sm text-[#0ea5e9] hover:text-[#0284c7] font-medium transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                {markingAll ? 'İşaretleniyor...' : 'Tümünü okundu say'}
              </button>
            )}
          </div>

          {/* Content */}
          {loading && notifications.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-full" />
                      <div className="h-2.5 bg-slate-100 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-7 h-7 text-slate-300" />
              </div>
              <h2 className="text-base font-semibold text-slate-700 mb-1">Bildirim yok</h2>
              <p className="text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">
                Mesaj, pazar ve kariyer bildirimleriniz burada görünecek.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {notifications.map((notif) => {
                const isUnread = !(notif.is_read || notif.read);
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClick(notif)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all hover:shadow-sm ${
                      isUnread
                        ? 'bg-sky-50/60 border-sky-100 hover:bg-sky-50'
                        : 'bg-white border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1.5">
                        {notif.relative_time || new Date(notif.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <div className="w-2 h-2 rounded-full bg-[#0ea5e9] flex-shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })}

              {hasMore && (
                <div className="pt-2 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="text-sm text-[#0ea5e9] hover:underline font-medium disabled:opacity-50"
                  >
                    {loading ? 'Yükleniyor...' : 'Daha fazla göster'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
