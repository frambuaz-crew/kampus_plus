/**
 * Ağım (Network) Sayfası
 *
 * İki sekme:
 *   1. Arkadaşlarım  — kabul edilmiş arkadaşlar + "Mesaj Gönder" butonu
 *   2. Gelen İstekler — bekleyen istekler + "Kabul Et" / "Reddet" butonları
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { getImageUrl } from '../../utils/imageUrl';
import {
  getFriends,
  getPendingRequests,
  respondToRequest,
  type FriendshipResponse,
  type UserSummary,
} from '../../api/friendship';
import { useAuth } from '../../hooks/useAuth';
import { startDirectMessage } from '../../services/messages';

// ─── Yardımcı ───────────────────────────────────────────────────────────────

/** Arkadaşlık kaydındaki "karşı taraf" kullanıcısını döndürür. */
function getOtherUser(
  f: FriendshipResponse,
  myId: string,
): UserSummary | null {
  if (f.requester_id === myId) return f.addressee ?? null;
  return f.requester ?? null;
}

// ─── Alt Bileşenler ──────────────────────────────────────────────────────────

interface AvatarProps {
  user: UserSummary;
  size?: 'md' | 'lg';
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'md' }) => {
  const dim = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base';
  const src = user.profile_picture_url ? getImageUrl(user.profile_picture_url) : null;

  if (src) {
    return (
      <img
        src={src}
        alt={user.username}
        className={`${dim} rounded-full object-cover flex-shrink-0 ring-2 ring-indigo-100`}
      />
    );
  }

  const initials = `${user.first_name[0] ?? ''}${user.last_name[0] ?? ''}`.toUpperCase();
  return (
    <div
      className={`${dim} rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0 ring-2 ring-indigo-100`}
    >
      <span className="text-white font-bold">{initials}</span>
    </div>
  );
};

// ─── Ana Sayfa ───────────────────────────────────────────────────────────────

type TabType = 'friends' | 'pending';

export const NetworkPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<FriendshipResponse[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipResponse[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  // friendshipId → 'accepting' | 'rejecting'
  const [responding, setResponding] = useState<Record<string, 'accepting' | 'rejecting'>>({});
  // userId → mesaj butonu yükleniyor mu
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    setLoadingFriends(true);
    try {
      const data = await getFriends();
      setFriends(data.friends);
    } catch (err) {
      console.error('Arkadaşlar yüklenemedi:', err);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  const loadPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const data = await getPendingRequests();
      setPendingRequests(data.requests);
    } catch (err) {
      console.error('Bekleyen istekler yüklenemedi:', err);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    loadFriends();
    loadPending();
  }, [loadFriends, loadPending]);

  const handleRespond = async (
    friendshipId: string,
    status: 'accepted' | 'rejected',
  ) => {
    setResponding((prev) => ({
      ...prev,
      [friendshipId]: status === 'accepted' ? 'accepting' : 'rejecting',
    }));
    try {
      await respondToRequest(friendshipId, status);
      // Listeyi güncelle
      setPendingRequests((prev) => prev.filter((r) => r.id !== friendshipId));
      if (status === 'accepted') {
        await loadFriends();
      }
    } catch (err) {
      console.error('İstek yanıtlanamadı:', err);
    } finally {
      setResponding((prev) => {
        const next = { ...prev };
        delete next[friendshipId];
        return next;
      });
    }
  };

  const handleMessage = async (friendUserId: string) => {
    setMessagingId(friendUserId);
    setMessageError(null);
    try {
      const { conversation_id } = await startDirectMessage(friendUserId);
      navigate(`/dashboard/messages/${conversation_id}`);
    } catch {
      setMessageError('Sohbet başlatılamadı. Lütfen tekrar dene.');
    } finally {
      setMessagingId(null);
    }
  };

  const handleProfileClick = (username: string) => {
    navigate(`/dashboard/profile/${username}`);
  };

  // ─── Render: Arkadaşlarım ──────────────────────────────────────────────────

  const renderFriends = () => {
    if (loadingFriends) {
      return (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 animate-pulse"
            >
              <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
              <div className="h-9 w-28 bg-gray-100 rounded-xl" />
            </div>
          ))}
        </div>
      );
    }

    if (friends.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">👥</p>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Henüz arkadaşın yok</h3>
          <p className="text-gray-500 text-sm">
            Forum ve pazar sayfalarında diğer öğrencileri keşfederek arkadaşlık isteği gönderebilirsin.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {friends.map((f) => {
          const other = getOtherUser(f, currentUser?.id ?? '');
          if (!other) return null;

          return (
            <div
              key={f.id}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow border border-gray-50"
            >
              <button
                onClick={() => handleProfileClick(other.username)}
                className="flex-shrink-0 focus:outline-none"
                aria-label={`${other.first_name} ${other.last_name} profilini görüntüle`}
              >
                <Avatar user={other} />
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleProfileClick(other.username)}
                  className="text-left hover:underline focus:outline-none"
                >
                  <p className="font-bold text-gray-900 truncate">
                    {other.first_name} {other.last_name}
                  </p>
                  <p className="text-sm text-gray-400 truncate">@{other.username}</p>
                </button>
              </div>

              <button
                onClick={() => handleMessage(other.id)}
                disabled={messagingId === other.id}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed text-indigo-700 font-semibold text-sm rounded-xl transition-colors"
              >
                {messagingId === other.id ? (
                  <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>💬</span>
                )}
                <span>Mesaj Gönder</span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Render: Gelen İstekler ────────────────────────────────────────────────

  const renderPending = () => {
    if (loadingPending) {
      return (
        <div className="flex flex-col gap-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 animate-pulse"
            >
              <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/5" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-20 bg-gray-100 rounded-xl" />
                <div className="h-9 w-20 bg-gray-100 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (pendingRequests.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-12 text-center">
          <p className="text-5xl mb-4">📭</p>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Bekleyen istek yok</h3>
          <p className="text-gray-500 text-sm">Sana gelen arkadaşlık istekleri burada görünecek.</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {pendingRequests.map((req) => {
          const sender = req.requester;
          if (!sender) return null;
          const isAccepting = responding[req.id] === 'accepting';
          const isRejecting = responding[req.id] === 'rejecting';
          const isBusy = isAccepting || isRejecting;

          return (
            <div
              key={req.id}
              className="bg-white rounded-2xl p-5 flex items-center gap-4 shadow-sm border border-gray-50"
            >
              <button
                onClick={() => handleProfileClick(sender.username)}
                className="flex-shrink-0 focus:outline-none"
                aria-label={`${sender.first_name} ${sender.last_name} profilini görüntüle`}
              >
                <Avatar user={sender} />
              </button>

              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleProfileClick(sender.username)}
                  className="text-left hover:underline focus:outline-none"
                >
                  <p className="font-bold text-gray-900 truncate">
                    {sender.first_name} {sender.last_name}
                  </p>
                  <p className="text-sm text-gray-400 truncate">@{sender.username}</p>
                </button>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(req.created_at).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                  })}{' '}
                  tarihinde istek gönderdi
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleRespond(req.id, 'accepted')}
                  disabled={isBusy}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isAccepting ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>✓</span>
                  )}
                  Kabul Et
                </button>
                <button
                  onClick={() => handleRespond(req.id, 'rejected')}
                  disabled={isBusy}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 font-semibold text-sm rounded-xl transition-colors flex items-center gap-1.5"
                >
                  {isRejecting ? (
                    <span className="inline-block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>✕</span>
                  )}
                  Reddet
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Ana Render ──────────────────────────────────────────────────────────────

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Sayfa Başlığı */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Ağım</h1>
          <p className="text-gray-500 mt-1">Arkadaşlarını yönet ve gelen istekleri incele.</p>
        </div>

        {/* Sekme Çubuğu */}
        <div className="flex gap-2 mb-6 p-1 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 w-fit">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/80'
            }`}
          >
            👥 Arkadaşlarım
            {friends.length > 0 && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'friends'
                    ? 'bg-white/20 text-white'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {friends.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all relative ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/80'
            }`}
          >
            📬 Gelen İstekler
            {pendingRequests.length > 0 && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'pending'
                    ? 'bg-white/20 text-white'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Hata Bildirimi */}
        {messageError && (
          <div className="mb-4 flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl">
            <span>⚠️ {messageError}</span>
            <button
              onClick={() => setMessageError(null)}
              className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>
        )}

        {/* Sekme İçeriği */}
        {activeTab === 'friends' ? renderFriends() : renderPending()}
      </div>
    </MainLayout>
  );
};
