import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../api/config';
import { getImageUrl } from '../../utils/imageUrl';
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
    <header className="h-16 bg-white border-b border-border sticky top-0 z-50 flex items-center px-6 gap-4">
      {/* Left: Logo */}
      <div
        className="flex items-center gap-2 shrink-0 cursor-pointer"
        onClick={() => navigate('/dashboard')}
      >
        <div className="w-8 h-8 rounded-lg bg-[#0ea5e9] flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">K+</span>
        </div>
        <span className="font-bold text-xl text-[#0ea5e9] hidden sm:inline">KAMPUS+</span>
      </div>

      {/* Center: Search Bar + öneriler */}
      <div className="flex-1 flex justify-center px-4">
        <div ref={searchWrapRef} className="w-full max-w-xl relative hidden md:block">
          <form onSubmit={handleSearch}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchInputChange(e.target.value)}
              onFocus={() => {
                const t = searchQuery.trim();
                if (t.length >= 1) void loadSuggest(t);
                if (t.length >= 1) setSuggestOpen(true);
              }}
              placeholder="Kampüste ara… (ör. kariyer, pazar)"
              className="pl-9 pr-16 h-10 bg-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim().length < 2) {
                  e.preventDefault();
                  setSuggestOpen(false);
                  navigate('/dashboard/search');
                }
              }}
              autoComplete="off"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </form>

          {suggestOpen && (suggestLoading || suggestRows.length > 0) && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[60] bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 overflow-y-auto py-1 text-left">
              {suggestLoading && (
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Aranıyor…
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
                      className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-slate-50"
                    >
                      <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                          {row.group}
                        </p>
                        <p className="text-slate-800 truncate font-medium">{row.title}</p>
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Icons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-white border border-slate-200 shadow-xl rounded-xl" align="end">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Bildirimler</h4>
                {unreadNotificationsCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{unreadNotificationsCount} yeni</Badge>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Bildirim yok</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => { if (notif.link) navigate(notif.link); }}
                    className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${!(notif.read || notif.is_read) ? 'bg-sky-50 border-l-2 border-l-[#0ea5e9]' : ''}`}
                  >
                    <p className={`text-sm ${!(notif.read || notif.is_read) ? 'font-medium' : ''}`}>{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{notif.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTime(notif.created_at)}</p>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[#0ea5e9] text-xs"
                onClick={() => navigate('/dashboard/notifications')}
              >
                Tümünü Gör →
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Messages */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <MessageSquare className="h-5 w-5" />
              {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0 bg-white border border-slate-200 shadow-xl rounded-xl" align="end">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Mesajlar</h4>
                {unreadMessagesCount > 0 && (
                  <Badge variant="secondary" className="text-xs">{unreadMessagesCount} okunmamış</Badge>
                )}
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {conversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Mesaj yok</p>
                </div>
              ) : (
                conversations.map((conv) => {
                  const { other_user: ou } = conv;
                  const initials = `${ou.first_name.charAt(0)}${ou.last_name.charAt(0)}`.toUpperCase();
                  return (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/dashboard/messages/${conv.id}`)}
                      className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${conv.unread_count > 0 ? 'bg-sky-50 border-l-2 border-l-[#0ea5e9]' : ''}`}
                    >
                      <div className="flex gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          {ou.profile_picture_url && (
                            <AvatarImage src={getImageUrl(ou.profile_picture_url)} />
                          )}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 justify-between">
                            <p className="text-sm font-medium truncate">{ou.first_name} {ou.last_name}</p>
                            {conv.unread_count > 0 && (
                              <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-[#0ea5e9] shrink-0">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message.content}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-[#0ea5e9] text-xs"
                onClick={() => navigate('/dashboard/messages')}
              >
                Tüm Mesajlar →
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
              <Avatar className="h-8 w-8">
                {user?.profile_picture_url && (
                  <AvatarImage src={getImageUrl(user.profile_picture_url)} />
                )}
                <AvatarFallback className="text-xs font-semibold bg-[#0ea5e9] text-white">
                  {userInitials || 'KU'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden lg:block max-w-[120px] truncate">
                {user?.first_name} {user?.last_name}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground hidden lg:block shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white border border-slate-200 shadow-xl rounded-xl">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/dashboard/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profilim
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/dashboard/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Ayarlar
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/admin')} className="text-[#0ea5e9]">
                  <Shield className="mr-2 h-4 w-4" />
                  Admin Paneli
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
