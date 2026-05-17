import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../api/config';
import { getImageUrl } from '../../utils/imageUrl';
import { cn } from '../../lib/utils';
import {
  Bell,
  MessageSquare,
  Search,
  Settings,
  LogOut,
  User,
  Shield,
  ChevronDown,
  LayoutDashboard,
  ShoppingBag,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';

interface Notification {
  id: string;
  type: 'forum_reply' | 'forum_mention' | 'academic_approval' | 'academic_rejection' | 'listing_expiring' | 'new_message' | string;
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  is_read?: boolean;
  link?: string;
}

interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
  source: 'marketplace' | 'career' | 'direct';
  listing_title: string;
  last_message: { content: string; created_at: string };
  last_message_at?: string;
  unread_count: number;
}

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const searchWrapRef = useRef<HTMLDivElement>(null);
  const suggestDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [suggestRows, setSuggestRows] = useState<
    { id: string; title: string; href: string; type: string; group: string }[]
  >([]);

  const loadSuggest = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestRows([]);
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await apiClient.get<{
        query: string;
        results: Record<
          string,
          {
            title: string;
            hits: { id: string; title: string; href: string; type: string }[];
            total: number;
          }
        >;
      }>('/search/suggest', { params: { q, limit: 5 } });
      const rows: { id: string; title: string; href: string; type: string; group: string }[] = [];
      for (const section of Object.values(res.data.results ?? {})) {
        for (const hit of section.hits ?? []) {
          rows.push({ id: hit.id, title: hit.title, href: hit.href, type: hit.type, group: section.title });
        }
      }
      setSuggestRows(rows.slice(0, 12));
    } catch {
      setSuggestRows([]);
    } finally {
      setSuggestLoading(false);
    }
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    loadNotifications();
    loadConversations();
    const interval = setInterval(() => {
      loadNotifications();
      loadConversations();
    }, 10000);
    const onUpdated = () => loadNotifications();
    window.addEventListener('kampus-notifications-updated', onUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener('kampus-notifications-updated', onUpdated);
    };
  }, []);

  // Arama sayfasındayken veya ?q= ile URL, üst çubuk metnini senkronize et
  useEffect(() => {
    if (location.pathname === '/dashboard/search') {
      const q = searchParams.get('q') || '';
      setSearchQuery(q);
    }
  }, [location.pathname, searchParams]);

  // ⌘K / Ctrl+K → arama sayfası
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/dashboard/search');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const loadNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications?limit=5');
      setNotifications(response.data.notifications || []);
      setUnreadNotificationsCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('Bildirimler yüklenemedi:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await apiClient.get('/messages/conversations?limit=50');
      const raw: Record<string, unknown>[] = response.data.conversations || [];
      const mapped: Conversation[] = raw.map((c) => ({
        ...(c as Conversation),
        source: (c.type ?? c.source) as Conversation['source'],
        last_message: (c.last_message_obj as { content: string; created_at: string }) ?? {
          content: (c.last_message as string) ?? '',
          created_at: (c.last_message_at as string) ?? '',
        },
        last_message_at: (c.last_message_at as string) ?? '',
      }));

      // Aynı kişiyle birden fazla konuşma varsa → direct tipi her zaman öncelikli
      const dedupMap = new Map<string, Conversation>();
      for (const conv of mapped) {
        const uid = conv.other_user?.id;
        if (!uid) continue;
        const existing = dedupMap.get(uid);
        if (!existing) {
          dedupMap.set(uid, conv);
        } else {
          const newIsDirect = conv.source === 'direct';
          const existingIsDirect = existing.source === 'direct';
          if (newIsDirect && !existingIsDirect) {
            dedupMap.set(uid, conv);
          } else if (!existingIsDirect && !newIsDirect) {
            if (new Date(conv.last_message_at || 0) > new Date(existing.last_message_at || 0)) {
              dedupMap.set(uid, conv);
            }
          }
        }
      }
      const deduped = Array.from(dedupMap.values())
        .sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime())
        .slice(0, 5);

      setConversations(deduped);
      setUnreadMessagesCount(response.data.unread_count ?? response.data.total_unread ?? 0);
    } catch (err) {
      console.error('Mesajlar yüklenemedi:', err);
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'az önce';
    if (diffMins < 60) return `${diffMins}dk önce`;
    if (diffHours < 24) return `${diffHours}sa önce`;
    if (diffDays === 1) return 'Dün';
    return `${diffDays}g önce`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSuggestOpen(false);
    if (q.length < 2) return;
    navigate(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

  const onSearchInputChange = (v: string) => {
    setSearchQuery(v);
    if (suggestDebounceRef.current) clearTimeout(suggestDebounceRef.current);
    const t = v.trim();
    if (t.length < 1) {
      setSuggestRows([]);
      setSuggestOpen(false);
      return;
    }
    suggestDebounceRef.current = setTimeout(() => {
      void loadSuggest(t);
      setSuggestOpen(true);
    }, 200);
  };

  const handleLogout = () => {
    logout();
    setTimeout(() => navigate('/login'), 100);
  };

  const userInitials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
  const isAdmin = (['admin', 'university_admin'] as const).includes(user?.role as 'admin' | 'university_admin');

  return (
    <header className="h-16 sm:h-20 bg-white/60 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 flex items-center px-4 sm:px-8 gap-3 sm:gap-4">
      {/* Left Spacer to push search to center */}
      <div className="flex-1 hidden lg:block order-1" />

      {/* Center: Search Bar + öneriler */}
      <div className="flex-1 lg:flex-[2] flex items-center w-full max-w-3xl relative order-2 min-w-0">
        <div ref={searchWrapRef} className="w-full relative group">
          <form onSubmit={handleSearch}>
            <div className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-1 sm:p-1.5 rounded-lg sm:bg-slate-50 group-focus-within:bg-sky-50 transition-colors">
              <Search className="h-4 w-4 text-slate-400 group-focus-within:text-sky-600 transition-colors" />
            </div>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onFocus={() => {
                const t = searchQuery.trim();
                if (t.length >= 1) void loadSuggest(t);
                if (t.length >= 1) setSuggestOpen(true);
              }}
              placeholder="Kampüste ara..."
              className="pl-9 sm:pl-14 pr-4 sm:pr-16 h-10 sm:h-12 bg-slate-50 border-transparent focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 rounded-xl sm:rounded-2xl outline-none transition-all text-xs sm:text-sm font-medium w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length < 2) {
                  e.preventDefault();
                  setSuggestOpen(false);
                  navigate('/dashboard/search');
                }
              }}
              autoComplete="off"
            />
            <kbd className="hidden sm:inline-flex absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none h-6 select-none items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[10px] font-bold text-slate-400 shadow-sm">
              ⌘K
            </kbd>
          </form>

          {suggestOpen && (suggestLoading || suggestRows.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-3 z-[60] bg-white/95 backdrop-blur-xl border border-slate-200 rounded-[2rem] shadow-2xl shadow-slate-200/50 max-h-[28rem] overflow-hidden py-3 animate-slide-up">
              <div className="px-5 py-2 mb-2 border-b border-slate-50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arama Sonuçları</p>
              </div>
              <div className="overflow-y-auto max-h-80 custom-scrollbar">
                {suggestLoading && (
                  <div className="flex items-center gap-3 px-6 py-4 text-sm text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-sky-500" /> 
                    <span className="font-bold">Kampüste aranıyor...</span>
                  </div>
                )}
                {!suggestLoading &&
                  suggestRows.map((row) => {
                    const Icon =
                      row.type === 'page'
                        ? LayoutDashboard
                        : row.type === 'forum'
                          ? MessageSquare
                          : row.type === 'marketplace'
                            ? ShoppingBag
                            : row.type === 'career'
                              ? Briefcase
                              : User;
                    return (
                      <Link
                        key={`${row.group}-${row.type}-${row.id}`}
                        to={row.href}
                        onClick={() => setSuggestOpen(false)}
                        className="flex items-center gap-4 px-6 py-3.5 hover:bg-sky-50/50 transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-white flex items-center justify-center transition-colors">
                           <Icon className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wide">
                            {row.group}
                          </p>
                          <p className="text-slate-900 truncate font-bold text-sm">{row.title}</p>
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Spacer to ensure search stays centered */}
      <div className="flex-1 hidden lg:block order-3" />

      {/* Right: Icons */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 order-4 ml-auto lg:ml-0">
        <div className="flex items-center bg-slate-50 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-100">
          {/* Notifications */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-white hover:shadow-sm">
                <Bell className="h-5 w-5 text-slate-600" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] mt-3" align="end">
              <div className="p-6 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-lg">Bildirimler</h4>
                  {unreadNotificationsCount > 0 && (
                    <Badge className="bg-sky-100 text-sky-600 border-none px-3 py-1 font-bold">{unreadNotificationsCount} Yeni</Badge>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm">Henüz bildirim yok</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => { if (notif.link) navigate(notif.link); }}
                      className={`w-full p-5 text-left hover:bg-slate-50 transition-colors flex gap-4 ${!(notif.read || notif.is_read) ? 'bg-sky-50/30' : ''}`}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", !(notif.read || notif.is_read) ? "bg-sky-100 text-sky-600" : "bg-slate-50 text-slate-400")}>
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm mb-0.5", !(notif.read || notif.is_read) ? "font-black text-slate-900" : "font-bold text-slate-600")}>{notif.title}</p>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">{formatTime(notif.created_at)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="p-4 bg-slate-50/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sky-600 font-black text-xs hover:bg-white rounded-xl py-5"
                  onClick={() => navigate('/dashboard/notifications')}
                >
                  TÜMÜNÜ GÖR
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Messages */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-white hover:shadow-sm">
                <MessageSquare className="h-5 w-5 text-slate-600" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute top-1 right-1 h-2.5 w-2.5 bg-sky-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-0 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] mt-3" align="end">
              <div className="p-6 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-lg">Mesajlar</h4>
                  {unreadMessagesCount > 0 && (
                    <Badge className="bg-sky-500 text-white border-none px-3 py-1 font-bold">{unreadMessagesCount} Yeni</Badge>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                {conversations.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground text-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 font-bold">Mesaj kutun boş</p>
                  </div>
                ) : (
                  conversations.map((conv) => {
                    const { other_user: ou } = conv;
                    const initials = `${ou.first_name.charAt(0)}${ou.last_name.charAt(0)}`.toUpperCase();
                    return (
                      <button
                        key={conv.id}
                        onClick={() => navigate(`/dashboard/messages/${conv.id}`)}
                        className={`w-full p-5 text-left hover:bg-slate-50 transition-colors flex gap-4 ${conv.unread_count > 0 ? 'bg-sky-50/30' : ''}`}
                      >
                        <Avatar className="h-12 w-12 shrink-0 rounded-xl">
                          {ou.profile_picture_url && (
                            <AvatarImage src={getImageUrl(ou.profile_picture_url)} className="object-cover" />
                          )}
                          <AvatarFallback className="rounded-xl bg-sky-100 text-sky-600 font-bold text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <p className="text-sm font-black text-slate-900 truncate">{ou.first_name} {ou.last_name}</p>
                            {conv.unread_count > 0 && (
                              <div className="h-2 w-2 bg-sky-500 rounded-full" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate leading-relaxed">{conv.last_message.content}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="p-4 bg-slate-50/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-sky-600 font-black text-xs hover:bg-white rounded-xl py-5"
                  onClick={() => navigate('/dashboard/messages')}
                >
                  MESAJLARIM'A GİT
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="w-px h-8 bg-slate-100 mx-2 hidden lg:block order-5" />

      {/* User Menu */}
      <div className="order-first lg:order-6 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 px-1 sm:px-2 h-10 sm:h-12 hover:bg-slate-50 rounded-xl sm:rounded-2xl transition-all">
              <div className="relative">
                <Avatar className="h-10 w-10 rounded-xl ring-2 ring-white shadow-sm">
                  {user?.profile_picture_url && (
                    <AvatarImage src={getImageUrl(user.profile_picture_url)} className="object-cover" />
                  )}
                  <AvatarFallback className="rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xs">
                    {userInitials || 'KU'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm" />
              </div>
              <div className="flex flex-col items-start hidden lg:flex">
                <span className="text-sm font-black text-slate-900 leading-none">
                  {user?.first_name} {user?.last_name}
                </span>
                <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Öğrenci</span>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-300 hidden lg:block shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-[2rem] p-3 mt-3 animate-slide-up">
            <div className="px-4 py-4 mb-2 bg-slate-50 rounded-[1.5rem]">
              <p className="text-sm font-black text-slate-900">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{user?.email}</p>
            </div>
            <div className="space-y-1">
              <DropdownMenuItem onClick={() => navigate('/dashboard/profile')} className="rounded-xl py-3 cursor-pointer focus:bg-sky-50 focus:text-sky-600 font-bold text-sm">
                <User className="mr-3 h-4 w-4" />
                Profilim
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="rounded-xl py-3 cursor-pointer focus:bg-sky-50 focus:text-sky-600 font-bold text-sm">
                <Settings className="mr-3 h-4 w-4" />
                Ayarlar
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate('/admin')} className="rounded-xl py-3 cursor-pointer focus:bg-sky-50 text-sky-600 font-bold text-sm">
                  <Shield className="mr-3 h-4 w-4" />
                  Admin Paneli
                </DropdownMenuItem>
              )}
            </div>
            <DropdownMenuSeparator className="my-2 bg-slate-50" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-xl py-3 cursor-pointer focus:bg-red-50 text-red-600 font-bold text-sm">
              <LogOut className="mr-3 h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
