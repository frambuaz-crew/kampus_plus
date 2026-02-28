import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Home, MessageSquare, PlusCircle } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { SearchBar } from '../components/forum/SearchBar';
import { CategoryCard } from '../components/forum/CategoryCard';
import { ThreadList } from '../components/forum/ThreadList';
import { ThreadView } from '../components/forum/ThreadView';
import { NewThreadForm } from '../components/forum/NewThreadForm';
import type { Category, ThreadListItem, ThreadWithReplies } from '../types/forum';
import { useAuth } from '../hooks/useAuth';
import {
  createForumReply,
  createForumTopic,
  getForumCategories,
  getForumTopicDetail,
  getForumTopics,
} from '../api/forum';

type ForumView = 'categories' | 'category-threads' | 'thread-detail' | 'new-thread' | 'search';

interface BackState {
  from?: string;
  tab?: string;
}

const SEARCH_CATEGORY: Category = {
  id: 'search-results',
  name: 'Arama Sonuçları',
  description: 'Tüm forum konuları içinde arama sonuçları',
  icon: '🔎',
  topic_count: 0,
};

export const ForumPage: React.FC = () => {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<ForumView>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [currentThread, setCurrentThread] = useState<ThreadWithReplies | null>(null);

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getForumCategories();
      setCategories(res.categories || []);
    } catch {
      setError('Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, []);

  useEffect(() => {
    if (id && !currentThread) {
      const loadFromRoute = async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await getForumTopicDetail(id);
          setCurrentThread({ thread: res.topic, replies: res.replies });
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

  const loadTopicsByCategory = async (category: Category) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedCategory(category);
      const res = await getForumTopics({
        category_id: category.id,
        page: 1,
        limit: 20,
        sort: 'newest',
      });
      setThreads(res.topics || []);
      setView('category-threads');
      if (id) {
        navigate('/dashboard/forum', { replace: true });
      }
    } catch {
      setError('Konular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = async (threadId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getForumTopicDetail(threadId);
      setCurrentThread({ thread: res.topic, replies: res.replies });
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

  const handleCreateThread = async (data: {
    title: string;
    content: string;
    category_id: string;
  }) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await createForumTopic(data);
      await fetchCategories();
      await handleThreadClick(response.topic_id);
    } catch {
      setError('Konu oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (data: { content: string }) => {
    if (!currentThread) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createForumReply(currentThread.thread.id, { content: data.content });
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
      setView('categories');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getForumTopics({ page: 1, limit: 100, sort: 'newest' });
      const normalizedQuery = query.toLocaleLowerCase('tr-TR');
      const filtered = (res.topics || []).filter((topic) => {
        const title = topic.title.toLocaleLowerCase('tr-TR');
        const content = topic.content.toLocaleLowerCase('tr-TR');
        const author = topic.author
          ? `${topic.author.first_name} ${topic.author.last_name} ${topic.author.username}`.toLocaleLowerCase('tr-TR')
          : '';
        return (
          title.includes(normalizedQuery) ||
          content.includes(normalizedQuery) ||
          author.includes(normalizedQuery)
        );
      });

      setSelectedCategory(null);
      setThreads(filtered);
      setView('search');
    } catch {
      setError('Arama yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const activeThreadListCategory = useMemo(() => {
    if (view === 'search') {
      return {
        ...SEARCH_CATEGORY,
        topic_count: threads.length,
      };
    }

    return selectedCategory;
  }, [view, selectedCategory, threads.length]);

  const goBackFromThread = () => {
    const state = (location.state as BackState | null) || null;
    if (state?.from) {
      navigate(state.from, { state: state.tab ? { tab: state.tab } : undefined });
      return;
    }

    setCurrentThread(null);
    if (selectedCategory) {
      setView('category-threads');
    } else {
      setView('categories');
    }

    if (id) {
      navigate('/dashboard/forum', { replace: true });
    }
  };

  const Breadcrumbs = () => (
    <nav className="mb-8 flex items-center space-x-2 rounded-2xl border border-gray-100 bg-white/50 p-4 text-sm shadow-sm backdrop-blur-md animate-in fade-in duration-500">
      <button
        onClick={() => {
          setView('categories');
          if (id) {
            navigate('/dashboard/forum', { replace: true });
          }
        }}
        className="flex items-center font-medium text-gray-400 transition-colors hover:text-indigo-600"
      >
        <Home size={16} className="mr-2" /> Forum
      </button>

      {activeThreadListCategory && (view === 'category-threads' || view === 'search') && (
        <>
          <ChevronRight size={14} className="text-gray-300" />
          <button
            onClick={() => {
              setView('category-threads');
              if (id) {
                navigate('/dashboard/forum', { replace: true });
              }
            }}
            className="font-bold text-gray-700 transition-colors hover:text-indigo-600"
          >
            {activeThreadListCategory.name}
          </button>
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
        <div className="mx-auto max-w-7xl px-6 pt-10">
          <header className="relative mb-12 overflow-hidden rounded-[2rem] border border-indigo-100/50 bg-gradient-to-br from-white to-indigo-50 p-12 shadow-xl shadow-indigo-100/40">
            <div className="pointer-events-none absolute -right-24 -top-24 rotate-12 select-none p-10 text-indigo-600 opacity-[0.04]">
              <MessageSquare size={300} />
            </div>

            <div className="relative z-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-center">
              <div className="max-w-2xl">
                <h1 className="mb-4 text-5xl font-black leading-tight tracking-tight text-gray-900">
                  Merhaba, <span className="text-indigo-600">{user?.first_name || 'Öğrenci'}</span>! 👋
                </h1>
                <p className="text-xl font-medium leading-relaxed text-gray-500">
                  Forumda kategorileri keşfet, konu aç ve diğer öğrencilerle bilgi paylaş.
                </p>
              </div>
              <button
                onClick={() => setView('new-thread')}
                className="group flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 px-8 py-5 font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 hover:bg-indigo-700 active:scale-95"
              >
                <PlusCircle size={24} className="transition-transform duration-300 group-hover:rotate-90" />
                Yeni Bir Tartışma Başlat
              </button>
            </div>

            <div className="mt-12 max-w-3xl">
              <SearchBar onSearch={handleSearch} />
            </div>
          </header>

          <Breadcrumbs />

          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-32">
              <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-indigo-600" />
              <p className="animate-pulse text-xs font-bold uppercase tracking-widest text-gray-400">
                Forum hazırlanıyor...
              </p>
            </div>
          ) : (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-700">
              {view === 'categories' && (
                <section>
                  <div className="mb-8 flex items-start">
                    <div className="mr-5 rounded-2xl border border-gray-100 bg-white p-3 shadow-md">📚</div>
                    <div>
                      <h2 className="mb-2 text-3xl font-black tracking-tight text-gray-900">
                        Forum Kategorileri
                      </h2>
                      <p className="max-w-2xl text-sm font-bold leading-relaxed tracking-wide text-gray-500">
                        Backend tarafından dönen aktif kategorilerden birini seçerek konu listesini
                        görüntüleyebilirsin.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <CategoryCard key={category.id} category={category} onClick={loadTopicsByCategory} />
                      ))
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-200 bg-white py-16 text-gray-400 shadow-sm">
                        <MessageSquare size={48} className="mb-4 opacity-10" />
                        <p className="text-lg font-bold italic tracking-tight">Henüz kategori bulunmuyor.</p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {(view === 'category-threads' || view === 'search') && activeThreadListCategory && (
                <ThreadList
                  category={activeThreadListCategory}
                  threads={threads}
                  onThreadClick={handleThreadClick}
                  loading={loading}
                />
              )}

              {view === 'thread-detail' && currentThread && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <button
                    onClick={goBackFromThread}
                    className="mb-6 flex items-center font-bold text-indigo-600 underline"
                  >
                    ← Geri Dön
                  </button>
                  <ThreadView data={currentThread} onReplySubmit={handleReplySubmit} isSubmitting={isSubmitting} />
                </div>
              )}

              {view === 'new-thread' && (
                <NewThreadForm
                  categories={categories}
                  onSubmit={handleCreateThread}
                  onCancel={() => setView('categories')}
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
