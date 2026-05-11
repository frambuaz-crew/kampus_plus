import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ChevronRight, Home, Loader2, MessageSquare, PenLine } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
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
import { getImageUrl } from '../utils/imageUrl';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

type ForumView = 'feed' | 'category-threads' | 'thread-detail' | 'new-thread';

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
    <nav
      className="mb-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm"
      aria-label="Konum"
    >
      <button
        type="button"
        onClick={() => {
          setView('feed');
          setActiveFilter('all');
          void fetchFeed();
          if (id) {
            navigate('/dashboard/forum', { replace: true });
          }
        }}
        className="inline-flex items-center gap-1.5 font-medium text-slate-500 transition-colors hover:text-indigo-700"
      >
        <Home className="h-4 w-4" aria-hidden />
        Forum
      </button>

      {view === 'thread-detail' && currentThread && (
        <>
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
          <span className="max-w-[min(100%,20rem)] truncate font-medium text-indigo-700">
            {currentThread.thread.title}
          </span>
        </>
      )}
    </nav>
  );

  const { listTitle, listSubtitle } = useMemo(() => {
    if (activeFilter === 'text') {
      return { listTitle: 'Gönderiler', listSubtitle: 'Metin tabanlı konular' };
    }
    if (activeFilter === 'event') {
      return { listTitle: 'Etkinlikler', listSubtitle: 'Etkinlik ve duyuru konuları' };
    }
    return { listTitle: 'Konular', listSubtitle: 'Kampüsteki son tartışmalar' };
  }, [activeFilter]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <header className="mb-8 border-b border-slate-200/80 pb-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800 ring-1 ring-indigo-100">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  Topluluk
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Forum</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
                  Soru sorun, etkinlik paylaşın veya kampüsteki konularda tartışın. Üst çubuktaki arama ile forum
                  gönderilerinde de arama yapabilirsiniz.
                </p>
              </div>
            </div>
          </header>

          {view !== 'feed' && view !== 'new-thread' && <Breadcrumbs />}

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-600" aria-hidden />
              <p className="text-sm font-medium text-slate-500">Yükleniyor…</p>
            </div>
          ) : (
            <div>
              {(view === 'feed' || view === 'category-threads') && (
                <section>
                  <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => setView('new-thread')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('new-thread');
                      }
                    }}
                    className="group mb-6 cursor-pointer overflow-hidden border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5 transition-all hover:border-indigo-200 hover:shadow-md hover:ring-indigo-500/10"
                  >
                    <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-500 opacity-90" />
                    <div className="p-4 sm:p-5">
                      <div className="flex gap-4">
                        <Avatar className="h-11 w-11 shrink-0 ring-2 ring-slate-100">
                          {getImageUrl(user?.profile_picture_url) ? (
                            <AvatarImage src={getImageUrl(user?.profile_picture_url)!} alt="" className="object-cover" />
                          ) : null}
                          <AvatarFallback className="bg-indigo-600 text-sm font-semibold text-white">
                            {user?.first_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Yeni içerik
                            </p>
                            <p className="mt-0.5 text-sm font-medium text-slate-800">Gönderi veya etkinlik oluştur</p>
                          </div>
                          <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 transition-colors group-hover:border-slate-300 group-hover:bg-white">
                            <p className="text-sm text-slate-500">
                              Sorunuzu, duyurunuzu veya etkinlik bilgilerinizi paylaşmak için düzenleyiciyi açın.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs leading-relaxed text-slate-400">
                              Paylaşımlar topluluk kurallarına tabidir; net başlık ve açıklayıcı içerik önerilir.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              className="shrink-0 bg-indigo-600 hover:bg-indigo-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setView('new-thread');
                              }}
                            >
                              <PenLine className="mr-2 h-4 w-4" aria-hidden />
                              Düzenleyiciyi aç
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="mb-6 flex snap-x gap-2 overflow-x-auto pb-1">
                    <Button
                      type="button"
                      variant={activeFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      className={
                        activeFilter === 'all'
                          ? 'shrink-0 bg-indigo-600 hover:bg-indigo-700'
                          : 'shrink-0 border-slate-200 bg-white'
                      }
                      onClick={() => {
                        setActiveFilter('all');
                        setView('feed');
                        void fetchFeed();
                      }}
                    >
                      Tümü
                    </Button>
                    <Button
                      type="button"
                      variant={activeFilter === 'text' ? 'default' : 'outline'}
                      size="sm"
                      className={
                        activeFilter === 'text'
                          ? 'shrink-0 bg-indigo-600 hover:bg-indigo-700'
                          : 'shrink-0 border-slate-200 bg-white'
                      }
                      onClick={() => loadTopicsByType('text')}
                    >
                      Gönderiler
                    </Button>
                    <Button
                      type="button"
                      variant={activeFilter === 'event' ? 'default' : 'outline'}
                      size="sm"
                      className={
                        activeFilter === 'event'
                          ? 'shrink-0 bg-indigo-600 hover:bg-indigo-700'
                          : 'shrink-0 border-slate-200 bg-white'
                      }
                      onClick={() => loadTopicsByType('event')}
                    >
                      Etkinlikler
                    </Button>
                  </div>

                  <ThreadList
                    threads={threads}
                    onThreadClick={handleThreadClick}
                    loading={loading}
                    isFeed
                    listTitle={listTitle}
                    listSubtitle={listSubtitle}
                  />
                </section>
              )}

              {view === 'thread-detail' && currentThread && (
                <div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mb-4 -ml-2 gap-1 text-slate-600 hover:text-slate-900"
                    onClick={goBackFromThread}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden />
                    Foruma dön
                  </Button>
                  <ThreadView
                    data={currentThread}
                    onReplySubmit={handleReplySubmit}
                    isSubmitting={isSubmitting}
                    autoOpenReply={autoOpenReply}
                  />
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
            <div
              className="mt-8 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};