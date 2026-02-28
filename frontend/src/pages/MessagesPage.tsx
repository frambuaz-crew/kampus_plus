/**
 * Messages Page — Konuşma listesi
 * Spec: 013-messages/spec.md
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageCircle,
  Briefcase,
  ShoppingBag,
  ChevronRight,
  Search,
} from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';
import { getImageUrl } from '../utils/imageUrl';

interface OtherUser {
  id: string;
  username: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  profile_picture_url?: string | null;
}

interface Conversation {
  id: string;
  type: 'career' | 'marketplace';
  listing_title: string;
  reference: { id: string; title: string; image_url?: string | null; company_name?: string | null };
  other_user: OtherUser;
  last_message: string;
  last_message_at: string | null;
  relative_time: string;
  unread_count: number;
}

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Dün';
  if (diffDays < 7) return `${diffDays} gün önce`;
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get('/messages/conversations?limit=50');
        setConversations(res.data?.conversations || []);
      } catch {
        setConversations([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.other_user.username.toLowerCase().includes(q) ||
      c.other_user.full_name.toLowerCase().includes(q) ||
      c.listing_title.toLowerCase().includes(q)
    );
  });

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return (
    <MainLayout>
      <div className="w-full px-6 xl:px-10 py-8">
        <div className="max-w-2xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mesajlar</h1>
              {totalUnread > 0 && (
                <p className="text-sm text-slate-500 mt-0.5">
                  {totalUnread} okunmamış mesaj
                </p>
              )}
            </div>
            <MessageCircle className="w-6 h-6 text-indigo-600" />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kişi veya ilan ara..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-1/3" />
                      <div className="h-3 bg-slate-100 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 px-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">
                  {search ? 'Sonuç bulunamadı' : 'Henüz mesajınız yok'}
                </h3>
                <p className="text-sm text-slate-500">
                  {search
                    ? 'Farklı bir arama terimi deneyin'
                    : 'Pazar veya kariyer ilanlarından mesaj gönderince burada görünür'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((conv) => {
                  const initials = conv.other_user.full_name
                    ? conv.other_user.full_name.charAt(0).toUpperCase()
                    : conv.other_user.username.charAt(0).toUpperCase();

                  return (
                    <li key={conv.id}>
                      <button
                        onClick={() => navigate(`/dashboard/messages/${conv.id}`)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          {conv.other_user.profile_picture_url ? (
                            <img
                              src={getImageUrl(conv.other_user.profile_picture_url)}
                              alt={conv.other_user.username}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-lg">
                              {initials}
                            </div>
                          )}
                          {/* Type badge */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow ${conv.type === 'career' ? 'bg-blue-500' : 'bg-emerald-500'}`}>
                            {conv.type === 'career' ? (
                              <Briefcase className="w-2.5 h-2.5 text-white" />
                            ) : (
                              <ShoppingBag className="w-2.5 h-2.5 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className={`text-sm font-semibold truncate ${conv.unread_count > 0 ? 'text-slate-900' : 'text-slate-700'}`}>
                              @{conv.other_user.username}
                            </span>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {formatTime(conv.last_message_at)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mb-1">{conv.listing_title}</p>
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                              {conv.last_message || '—'}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                {conv.unread_count > 9 ? '9+' : conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
