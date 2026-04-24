import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Home, MessageSquare, PlusCircle } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { SearchBar } from '../components/forum/SearchBar';
import { ThreadList } from '../components/forum/ThreadList';
import { ThreadView } from '../components/forum/ThreadView';
import { NewThreadForm } from '../components/forum/NewThreadForm';
import type { ThreadListItem, ThreadWithReplies } from '../types/forum';
import { useAuth } from '../hooks/useAuth';
import {
  createForumReply,
  createForumTopic,
  getForumTopicDetail,
  getForumTopics,
} from '../api/forum';
import { API_BASE_URL } from '../api/config';

type ForumView = 'feed' | 'category-threads' | 'thread-detail' | 'new-thread' | 'search';

interface BackState {
  from?: string;
  tab?: string;
}



export const ForumPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<ForumView>('feed');
  const [activeFilter, setActiveFilter] = useState<'all' | 'text' | 'event'>('all');
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [currentThread, setCurrentThread] = useState<ThreadWithReplies | null>(null);
  const [autoOpenReply, setAutoOpenReply] = useState(false);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      setActiveFilter('all');
      const res = await getForumTopics({
        page: 1,
        limit: 20,
        sort: 'newest',
      });
      setThreads(res.topics || []);
    } catch {
      setError('Akış yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFeed();
  }, []);

  useEffect(() => {
    if (id && !currentThread) {
      const loadFromRoute = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await getForumTopicDetail(id);
          setCurrentThread({ thread: res.topic, replies: res.replies });
          setAutoOpenReply(false);
          setView('thread-detail');
        } catch {
          setError('Konu detayı yüklenemedi.');
        } finally {
          setLoading(false);
        }
      };

      void loadFromRoute();
    }
  }, [id, currentThread]);

  const loadTopicsByType = async (type: 'text' | 'event') => {
    try {
      setLoading(true);
      setError(null);
      setActiveFilter(type);
      const res = await getForumTopics({
        topic_type: type,
        page: 1,
        limit: 20,
        sort: 'newest',
      });
      setThreads(res.topics || []);
      setView('feed');
      if (id) {
        navigate('/dashboard/forum', { replace: true });
      }
    } catch {
      setError('Konular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = async (threadId: string, action?: 'comment') => {
    try {
      setLoading(true);
      setError(null);
      const res = await getForumTopicDetail(threadId);
      setCurrentThread({ thread: res.topic, replies: res.replies });
      setAutoOpenReply(action === 'comment');
      setView('thread-detail');
      if (id !== threadId) {
        navigate(`/dashboard/forum/${threadId}`, { replace: false, state: location.state });
      }
    } catch {
      setError('Konu detayı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);
      await createForumTopic(data);
      setView('feed');
      void fetchFeed();
    } catch {
      setError('Konu oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (data: { content: string; parent_id?: string }) => {
    if (!currentThread) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createForumReply(currentThread.thread.id, { content: data.content, parent_id: data.parent_id });
      const refreshed = await getForumTopicDetail(currentThread.thread.id);
      setCurrentThread({ thread: refreshed.topic, replies: refreshed.replies });
    } catch {
      setError('Cevap gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setView('feed');
      void fetchFeed();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getForumTopics({ page: 1, limit: 20, sort: 'newest', search: query.trim() });

      setActiveFilter('all');
      setThreads(res.topics || []);
      setView('search');
    } catch {
      setError('Arama yapılamadı.');
    } finally {
      setLoading(false);
    }
  };



  const goBackFromThread = () => {
    const state = (location.state as BackState | null) || null;
    if (state?.from) {
      navigate(state.from, { state: state.tab ? { tab: state.tab } : undefined });
      return;
    }

    setCurrentThread(null);
    setView('feed');

    if (id) {
      navigate('/dashboard/forum', { replace: true });
    }
  };

  const Breadcrumbs = () => (
    <nav className="mb-8 flex items-center space-x-2 rounded-2xl border border-gray-100 bg-white/50 p-4 text-sm shadow-sm backdrop-blur-md animate-in fade-in duration-500">
      <button
        onClick={() => {
          setView('feed');
          setActiveFilter('all');
          void fetchFeed();
          if (id) {
            navigate('/dashboard/forum', { replace: true });
          }
        }}
        className="flex items-center font-medium text-gray-400 transition-colors hover:text-indigo-600"
      >
        <Home size={16} className="mr-2" /> Forum
      </button>

      {view === 'search' && (
        <>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="font-bold text-gray-700">Arama Sonuçları</span>
        </>
      )}

      {view === 'thread-detail' && currentThread && (
        <>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="max-w-[300px] truncate font-black text-indigo-600">{currentThread.thread.title}</span>
        </>
      )}
    </nav>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 pb-20 text-gray-900">
        <div className="mx-auto max-w-7xl px-6 pt-6">
          <div className="mb-6">
            <SearchBar onSearch={handleSearch} />
          </div>

          {view !== 'feed' && <Breadcrumbs />}

          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-32">
              <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-indigo-600" />
              <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-gray-400">
                Forum hazırlanıyor...
              </p>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-700">
              {/* Main Content Areas */}
              {(view === 'feed' || view === 'category-threads' || view === 'search') && (
                <section>
                  {/* Gönderi Oluştur Input */}
                  <div
                    onClick={() => setView('new-thread')}
                    className="mb-8 p-4 bg-white border border-gray-100/80 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-text group"
                  >
                    <div className="flex items-center gap-4">
                      {user?.profile_picture_url ? (
                        <img
                          src={user.profile_picture_url.startsWith('http') ? user.profile_picture_url : `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${user.profile_picture_url}`}
                          alt="Profil"
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden'); }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0 ${user?.profile_picture_url ? 'hidden' : ''}`}>
                        {user?.first_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 text-gray-400 font-medium text-sm group-hover:text-gray-500 transition-colors">
                        Soru sor, etkinlik paylaş veya bir konuyu tartış...
                      </div>
                      <button className="shrink-0 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2">
                        <PlusCircle size={16} />
                        Gönderi Oluştur
                      </button>
                    </div>
                  </div>
                  {/* İçerik Filtreleri */}
                  <div className="mb-6 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
                    <button
                      onClick={() => {
                        setActiveFilter('all');
                        setView('feed');
                        void fetchFeed();
                      }}
                      className={`whitespace-nowrap rounded-2xl px-5 py-2.5 text-sm font-bold transition-all snap-start ${activeFilter === 'all' && view !== 'search'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100'
                        }`}
                    >
                      Tümü
                    </button>
                    <button
                      onClick={() => loadTopicsByType('text')}
                      className={`whitespace-nowrap flex items-center rounded-2xl px-5 py-2.5 text-sm font-bold transition-all snap-start ${activeFilter === 'text'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100'
                        }`}
                    >
                      Gönderiler
                    </button>
                    <button
                      onClick={() => loadTopicsByType('event')}
                      className={`whitespace-nowrap flex items-center rounded-2xl px-5 py-2.5 text-sm font-bold transition-all snap-start ${activeFilter === 'event'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                        : 'bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-100'
                        }`}
                    >
                      Etkinlikler
                    </button>
                  </div>

                  <ThreadList
                    threads={threads}
                    onThreadClick={handleThreadClick}
                    loading={loading}
                    isFeed={true}
                  />
                </section>
              )}

              {view === 'thread-detail' && currentThread && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <button
                    onClick={goBackFromThread}
                    className="mb-6 flex items-center font-bold text-indigo-600 underline"
                  >
                    ← Geri Dön
                  </button>
                  <ThreadView data={currentThread} onReplySubmit={handleReplySubmit} isSubmitting={isSubmitting} autoOpenReply={autoOpenReply} />
                </div>
              )}

              {view === 'new-thread' && (
                <NewThreadForm
                  onSubmit={handleCreateThread}
                  onCancel={() => {
                    setView('feed');
                    void fetchFeed();
                  }}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          )}

          {error && (
            <div className="mt-10 flex items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-800 shadow-sm">
              <span className="text-2xl">⚠️</span>
              <span className="font-bold">{error}</span>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};