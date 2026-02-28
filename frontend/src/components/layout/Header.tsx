/**
 * Header Component
 * 
 * Spec: 004-dashboard/spec.md
 * 
 * Dashboard header:
 * - Logo (sol)
 * - Arama çubuğu (orta) - Global arama
 * - Bildirimler dropdown (🔔) - Son 3 bildirim
 * - Mesajlar dropdown (💬) - Son 3 konuşma
 * - Profil dropdown (👤) - Profilim, Ayarlar, Çıkış Yap
 * 
 * Profil avatar: Profil resmi varsa göster, yoksa baş harfler (tutarlı renk)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../api/config';
import { getImageUrl } from '../../utils/imageUrl';

interface Notification {
  id: string;
  type: 'forum_reply' | 'forum_mention' | 'academic_approval' | 'academic_rejection' | 'listing_expiring';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
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
  source: 'marketplace' | 'career';
  listing_title: string;
  last_message: {
    content: string;
    created_at: string;
  };
  unread_count: number;
}

export const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State for dropdowns
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // State for data
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Refs for click outside
  const notificationsRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load notifications and messages
  useEffect(() => {
    loadNotifications();
    loadConversations();

    // Polling: 30 saniyede bir güncelle
    const interval = setInterval(() => {
      loadNotifications();
      loadConversations();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (messagesRef.current && !messagesRef.current.contains(event.target as Node)) {
        setMessagesOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      setIsLoadingNotifications(true);
      const response = await apiClient.get('/notifications?limit=3');
      setNotifications(response.data.notifications || []);
      setUnreadNotificationsCount(response.data.unread_count || 0);
    } catch (err) {
      console.error('Bildirimler yüklenemedi:', err);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const loadConversations = async () => {
    try {
      setIsLoadingMessages(true);
      const response = await apiClient.get('/messages/conversations?limit=3');
      const raw = response.data.conversations || [];
      setConversations(raw.map((c: Record<string, unknown>) => ({
        ...c,
        source: c.type ?? c.source,
        last_message: c.last_message_obj ?? { content: c.last_message ?? '', created_at: c.last_message_at ?? '' },
      })));
      setUnreadMessagesCount(response.data.unread_count ?? response.data.total_unread ?? 0);
    } catch (err) {
      console.error('Mesajlar yüklenemedi:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Generate consistent color from user ID
  const getUserColor = (userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#FFD93D', '#6BCB77', '#A8DADC'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Get profile avatar
  const getProfileAvatar = () => {
    if (user?.profile_picture_url) {
      return (
        <img
          src={getImageUrl(user.profile_picture_url)}
          alt={`${user.first_name} ${user.last_name}`}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }

    const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
    const bgColor = user?.id ? getUserColor(user.id) : '#4ECDC4';

    return (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'forum_reply': return '💬';
      case 'forum_mention': return '📌';
      case 'academic_approval': return '✅';
      case 'academic_rejection': return '❌';
      case 'listing_expiring': return '⏰';
      default: return '📬';
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
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/dashboard/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    setTimeout(() => {
      navigate('/login');
    }, 100);
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="w-full px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 max-w-[1920px] mx-auto">

          {/* Logo - Left */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/dashboard')}
          >
            <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform">📚</span>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              KAMPÜS+
            </h1>
          </div>

          {/* Search Bar - Center */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Konu, kullanıcı veya içerik ara..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
          </div>

          {/* Actions - Right */}
          <div className="flex items-center space-x-1">

            {/* Notifications */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setMessagesOpen(false);
                  setProfileOpen(false);
                }}
                className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
              >
                <span className="text-xl">🔔</span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                      <span>🔔</span>
                      <span>Bildirimler</span>
                      {unreadNotificationsCount > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                          {unreadNotificationsCount} yeni
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Notifications List */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingNotifications ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <p className="text-sm">Yükleniyor...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <span className="text-3xl block mb-2">📭</span>
                        <p className="text-sm">Bildirim yok</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif.id}
                          onClick={() => {
                            if (notif.link) {
                              navigate(notif.link);
                            }
                            setNotificationsOpen(false);
                          }}
                          className={`w-full px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 ${!notif.read ? 'bg-blue-50' : ''
                            }`}
                        >
                          <div className="flex items-start space-x-3">
                            <span className="text-xl">{getNotificationIcon(notif.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                              <p className="text-xs text-gray-600 truncate">{notif.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{formatTime(notif.created_at)}</p>
                            </div>
                            {!notif.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        navigate('/dashboard/notifications');
                        setNotificationsOpen(false);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium w-full text-center"
                    >
                      Tümünü Gör →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="relative" ref={messagesRef}>
              <button
                onClick={() => {
                  setMessagesOpen(!messagesOpen);
                  setNotificationsOpen(false);
                  setProfileOpen(false);
                }}
                className="p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors relative"
              >
                <span className="text-xl">💬</span>
                {unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                  </span>
                )}
              </button>

              {/* Messages Dropdown */}
              {messagesOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* Header */}
                  <div className="px-4 py-2 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                      <span>💬</span>
                      <span>Mesajlar</span>
                      {unreadMessagesCount > 0 && (
                        <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                          {unreadMessagesCount} okunmamış
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Conversations List */}
                  <div className="max-h-96 overflow-y-auto">
                    {isLoadingMessages ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <p className="text-sm">Yükleniyor...</p>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <span className="text-3xl block mb-2">✉️</span>
                        <p className="text-sm">Mesaj yok</p>
                      </div>
                    ) : (
                      conversations.map((conv) => {
                        const otherUser = conv.other_user;
                        const avatarBgColor = getUserColor(otherUser.id);
                        const initials = `${otherUser.first_name.charAt(0)}${otherUser.last_name.charAt(0)}`.toUpperCase();
                        const hasUnread = conv.unread_count > 0;

                        return (
                          <button
                            key={conv.id}
                            onClick={() => {
                              navigate(`/dashboard/messages/${conv.id}`);
                              setMessagesOpen(false);
                            }}
                            className={`w-full px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 ${hasUnread ? 'bg-blue-50' : ''
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              {otherUser.profile_picture_url ? (
                                <img
                                  src={getImageUrl(otherUser.profile_picture_url)}
                                  alt={`${otherUser.first_name} ${otherUser.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                                  style={{ backgroundColor: avatarBgColor }}
                                >
                                  {initials}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {hasUnread ? '🟢' : '⚪'} {otherUser.first_name} {otherUser.last_name}
                                  </p>
                                  {hasUnread && (
                                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 mb-1">
                                  {conv.source === 'marketplace' ? '📦 Pazar' : '💼 Kariyer'}: {conv.listing_title}
                                </p>
                                <p className="text-xs text-gray-600 truncate">{conv.last_message.content}</p>
                                <p className="text-xs text-gray-400 mt-1">{formatTime(conv.last_message.created_at)}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        navigate('/dashboard/messages');
                        setMessagesOpen(false);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium w-full text-center"
                    >
                      Tüm Mesajları Gör →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                  setMessagesOpen(false);
                }}
                className="flex items-center space-x-2 lg:space-x-3 p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {getProfileAvatar()}
                <span className="text-sm font-medium hidden lg:block">
                  {user?.first_name} {user?.last_name}
                </span>
                <svg
                  className="w-4 h-4 text-gray-500 hidden lg:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown */}
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      {getProfileAvatar()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      onClick={() => {
                        navigate('/dashboard/profile');
                        setProfileOpen(false);
                      }}
                    >
                      <span>👤</span>
                      <span>Profilim</span>
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3"
                      onClick={() => {
                        navigate('/dashboard/settings');
                        setProfileOpen(false);
                      }}
                    >
                      <span>⚙️</span>
                      <span>Ayarlar</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-2"></div>

                  {/* Logout */}
                  <div className="py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 font-medium"
                    >
                      <span>🚪</span>
                      <span>Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
};

