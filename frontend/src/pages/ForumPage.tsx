import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/config';
import { MainLayout } from '../components/layout/MainLayout';
import { SearchBar } from '../components/forum/SearchBar';
import { CategoryCard } from '../components/forum/CategoryCard';
import { ThreadList } from '../components/forum/ThreadList';
import { ThreadView } from '../components/forum/ThreadView';
import { NewThreadForm } from '../components/forum/NewThreadForm';
import { ChevronRight, Home, PlusCircle, MessageSquare, Building2, GraduationCap, Users } from 'lucide-react';
import type { Category, ThreadListItem, ThreadWithReplies, SearchResult } from '../types/forum';
import { useAuth } from '../hooks/useAuth'; // 1. useAuth'ı import ediyoruz

type ForumView = 'categories' | 'category-threads' | 'thread-detail' | 'new-thread' | 'search';

export const ForumPage: React.FC = () => {
  const { user } = useAuth(); // 2. Kullanıcı bilgisini alıyoruz
  const [view, setView] = useState<ForumView>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [currentThread, setCurrentThread] = useState<ThreadWithReplies | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/forum/categories');
      setCategories(res.data.categories || []);
    } catch (err) {
      setError('Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (category: Category) => {
    try {
      setLoading(true);
      setSelectedCategory(category);
      const res = await apiClient.get(`/forum/categories/${category.slug}/threads?page=1&page_size=20`);
      setThreads(res.data.threads || []);
      setView('category-threads');
    } catch (err) {
      setError('Konular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = async (threadId: string) => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/forum/threads/${threadId}`);
      setCurrentThread(res.data);
      setView('thread-detail');
    } catch (err) {
      setError('Konu detayı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (data: {
    title: string; content: string; category_id: string; tags: string[]; files: File[];
  }) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('category_id', data.category_id);
      if (data.tags.length > 0) formData.append('tags', JSON.stringify(data.tags));
      data.files.forEach(file => formData.append('files', file));

      await apiClient.post('/forum/threads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setView('categories');
      fetchCategories();
    } catch (err) {
      setError('Konu oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (data: { content: string; files: File[]; mentions?: string[] }) => {
    if (!currentThread) return;
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('content', data.content);
      if (data.mentions) formData.append('mentions', JSON.stringify(data.mentions));
      data.files.forEach(file => formData.append('files', file));

      await apiClient.post(`/forum/threads/${currentThread.thread.id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await handleThreadClick(currentThread.thread.id);
    } catch (err) {
      setError('Cevap gönderilemedi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagPost = async (postId: string) => {
    try {
      await apiClient.post(`/forum/reports`, { content_type: 'post', content_id: postId, reason: 'other' });
      alert('Raporunuz iletildi.');
    } catch (err) {
      setError('Rapor iletilemedi.');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) { setView('categories'); return; }
    try {
      setLoading(true);
      const res = await apiClient.get(`/forum/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data.results || []);
      setView('search');
    } catch (err) {
      setError('Arama yapılamadı.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Kategorileri Kullanıcıya Göre Filtreliyoruz
  // NOT: Bu kısım backend verileri geldiğinde çalışacak, şimdilik mantığı kuruyoruz.
  const myUniversityCat = categories.find(c => c.name === user?.university && c.category_type === 'university');
  const myDepartmentCat = categories.find(c => c.name === user?.department?.name && c.category_type === 'department');
  const generalCats = categories.filter(c => c.category_type === 'general');

  const Breadcrumbs = () => (
    <nav className="flex items-center space-x-2 text-sm mb-8 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-gray-100 shadow-sm animate-in fade-in duration-500">
      <button 
        onClick={() => setView('categories')} 
        className="flex items-center text-gray-400 hover:text-indigo-600 transition-colors font-medium"
      >
        <Home size={16} className="mr-2" /> Forum
      </button>

      {/* Kategoriye tıklandığında yol uzasın */}
      {selectedCategory && (
        <>
          <ChevronRight size={14} className="text-gray-300" />
          <button 
            onClick={() => setView('category-threads')} 
            className="font-bold text-gray-700 hover:text-indigo-600 transition-colors"
          >
            {selectedCategory.name}
          </button>
        </>
      )}

      {/* Konu detayındayken en uca konu başlığını ekleyelim */}
      {view === 'thread-detail' && currentThread && (
        <>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-indigo-600 font-black truncate max-w-[300px]">
            {currentThread.thread.title}
          </span>
        </>
      )}
    </nav>
  );

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
        <div className="max-w-7xl mx-auto px-6 pt-10">
          
          {/* 4. Kişiselleştirilmiş Premium Header */}
          <header className="mb-12 p-12 rounded-[2rem] bg-gradient-to-br from-white to-indigo-50 border border-indigo-100/50 shadow-xl shadow-indigo-100/40 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 p-10 opacity-[0.04] select-none pointer-events-none text-indigo-600 rotate-12">
               <MessageSquare size={300} />
            </div>
            
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4 leading-tight">
                  Merhaba, <span className="text-indigo-600">{user?.first_name || 'Öğrenci'}</span>! 👋
                </h1>
                <p className="text-gray-500 text-xl font-medium leading-relaxed">
                  <span className="font-bold text-gray-700">{user?.university}</span> kampüsünde ve <span className="font-bold text-gray-700">{user?.department?.name}</span> alanında neler konuşuluyor, keşfet.
                </p>
              </div>
              <button 
                onClick={() => setView('new-thread')}
                className="group flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-5 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1 active:scale-95"
              >
                <PlusCircle size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                Yeni Bir Tartışma Başlat
              </button>
            </div>

            <div className="mt-12 max-w-3xl">
              <SearchBar onSearch={handleSearch} />
            </div>
          </header>

          <Breadcrumbs />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-indigo-600"></div>
              <p className="text-gray-400 font-bold animate-pulse uppercase tracking-widest text-xs">Kampüsün Hazırlanıyor...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              {view === 'categories' && (
                // 5. Yeni Üçlü Odak Sistemi
                <div className="space-y-16">
                  <CategorySection 
                    title="🏰 Benim Kampüsüm" 
                    description={`${user?.university} öğrencilerine özel duyurular, etkinlikler ve tartışmalar.`}
                    icon={<Building2 size={28} className="text-indigo-600" />}
                    items={myUniversityCat ? [myUniversityCat] : []} 
                    onCategoryClick={handleCategoryClick} 
                    emptyMessage="Kampüsüne ait bir kategori bulunamadı."
                  />
                  <CategorySection 
                    title="🔬 Meslektaş Alanım (TR Geneli)" 
                    description={`Türkiye'deki tüm ${user?.department?.name || ''} öğrencileriyle bilgi paylaşımı.`}
                    icon={<GraduationCap size={28} className="text-emerald-600" />}
                    items={myDepartmentCat ? [myDepartmentCat] : []} 
                    onCategoryClick={handleCategoryClick} 
                    emptyMessage="Bölümüne ait bir kategori bulunamadı."
                  />
                  <CategorySection 
                    title="🌍 Ortak Alan" 
                    description="Pazar yeri, etkinlikler ve tüm öğrencileri ilgilendiren serbest kürsü."
                    icon={<Users size={28} className="text-amber-600" />}
                    items={generalCats} 
                    onCategoryClick={handleCategoryClick}
                    emptyMessage="Henüz genel bir kategori bulunmuyor." 
                  />
                </div>
              )}

              {view === 'category-threads' && selectedCategory && (
                <ThreadList category={selectedCategory} threads={threads} onThreadClick={handleThreadClick} loading={loading} />
              )}

              {view === 'thread-detail' && currentThread && (
                <ThreadView 
                  data={currentThread} onReplySubmit={handleReplySubmit} 
                  onHelpful={async (postId) => {
                    await apiClient.post(`/forum/posts/${postId}/helpful`);
                    handleThreadClick(currentThread.thread.id);
                  }}
                  onReport={handleFlagPost} onRefresh={() => handleThreadClick(currentThread.thread.id)} 
                  isSubmitting={isSubmitting}
                />
              )}

              {/* 6. Yeni Konu Açma Formuna Kategorileri Geçiyoruz */}
              {view === 'new-thread' && (
                <NewThreadForm 
                  // Burada sadece kullanıcının yazabileceği kategorileri geçeceğiz.
                  // Backend verisi gelince burayı myUniversityCat, myDepartmentCat ve generalCats'i birleştirerek yapacağız.
                  categories={categories} 
                  onSubmit={handleCreateThread} 
                  onCancel={() => setView('categories')} 
                  isSubmitting={isSubmitting} 
                />
              )}
            </div>
          )}

          {error && (
            <div className="mt-10 p-5 bg-red-50 border border-red-200 rounded-2xl text-red-800 flex items-center gap-4 shadow-sm">
              <span className="text-2xl">⚠️</span> <span className="font-bold">{error}</span>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

// Alt Bileşen: Kategori Bölümü (Güncellenmiş Premium Tasarım)
const CategorySection = ({ title, description, icon, items, onCategoryClick, emptyMessage }: { title: string, description: string, icon: React.ReactNode, items: Category[], onCategoryClick: (c: Category) => void, emptyMessage: string }) => (
  <section>
    <div className="mb-8 flex items-start">
      <div className="p-3 bg-white rounded-2xl shadow-md border border-gray-100 mr-5">
        {icon}
      </div>
      <div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">{title}</h2>
        <p className="text-gray-500 font-bold text-sm tracking-wide leading-relaxed max-w-2xl">{description}</p>
      </div>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {items.length > 0 ? (
        items.map(category => (
          <CategoryCard key={category.id} category={category} onClick={() => onCategoryClick(category)} />
        ))
      ) : (
        <div className="col-span-full py-16 bg-white rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 shadow-sm">
           <MessageSquare size={48} className="mb-4 opacity-10" />
           <p className="font-bold tracking-tight text-lg italic">{emptyMessage}</p>
        </div>
      )}
    </div>
  </section>
);