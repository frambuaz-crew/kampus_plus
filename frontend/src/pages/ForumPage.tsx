/**
 * ForumPage Component
 * 
 * Spec: 005-forum-page/spec.md
 * 
 * Forum ana sayfası:
 * - Kategori listesi (3 grup: Üniversite, Bölüm, Genel)
 * - Thread listesi (kategoriye göre)
 * - Thread detay sayfası
 * - Arama
 * - Yeni konu açma
 * 
 * NOT: Tüm kullanıcılar profilli (anonim paylaşım yok)
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/config';
import { ThreadList } from '../components/forum/ThreadList';
import { ThreadView } from '../components/forum/ThreadView';
import { NewThreadForm } from '../components/forum/NewThreadForm';
import { SearchBar } from '../components/forum/SearchBar';
import { MainLayout } from '../components/layout/MainLayout';
import type { ThreadListItem, ThreadWithReplies, SearchResult, Category } from '../types/forum';

export const ForumPage: React.FC = () => {
  const [view, setView] = useState<'list' | 'thread' | 'new' | 'search'>('list');
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [currentThread, setCurrentThread] = useState<ThreadWithReplies | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadCategories();
    loadThreads();
  }, [page]);

  const loadCategories = async () => {
    try {
      const response = await apiClient.get('/forum/categories');
      setCategories(response.data.categories || []);
    } catch (err) {
      console.error('Kategoriler yüklenemedi:', err);
    }
  };

  const loadThreads = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/forum/threads?page=${page}&page_size=20`);
      setThreads(response.data.items || []);
      setHasMore((response.data.items || []).length === 20);
    } catch (err) {
      console.error('Konular yüklenemedi:', err);
      setError('Konular yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (threadId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/forum/threads/${threadId}`);
      setCurrentThread(response.data);
      setView('thread');
    } catch (err) {
      console.error('Konu yüklenemedi:', err);
      setError('Konu yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateThread = async (data: {
    title: string;
    content: string;
    category_id: string;
    tags: string[];
    files: File[];
  }) => {
    try {
      setIsSubmitting(true);
      setError(null);
      const formData = new FormData();
      formData.append('title', data.title);
      formData.append('content', data.content);
      formData.append('category_id', data.category_id);
      if (data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }
      data.files.forEach((file) => {
        formData.append('files', file);
      });
      
      await apiClient.post('/forum/threads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setView('list');
      setPage(1);
      await loadThreads();
    } catch (err) {
      console.error('Konu oluşturulamadı:', err);
      throw new Error('Konu oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (data: { content: string; files: File[]; mentions?: string[] }) => {
    if (!currentThread) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const formData = new FormData();
      formData.append('content', data.content);
      if (data.mentions) {
        formData.append('mentions', JSON.stringify(data.mentions));
      }
      data.files.forEach((file) => {
        formData.append('files', file);
      });
      
      await apiClient.post(`/forum/threads/${currentThread.thread.id}/replies`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Reload thread to show new reply
      await loadThread(currentThread.thread.id);
    } catch (err) {
      console.error('Cevap gönderilemedi:', err);
      throw new Error('Cevap gönderilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagPost = async (postId: string) => {
    try {
      await apiClient.post(`/forum/posts/${postId}/flag`);
      if (currentThread) {
        await loadThread(currentThread.thread.id);
      }
    } catch (err) {
      console.error('Gönderi rapor edilemedi:', err);
      setError('Gönderi rapor edilemedi');
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setView('list');
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get(`/forum/search?q=${encodeURIComponent(query)}`);
      setSearchResults(response.data.results || []);
      setView('search');
    } catch (err) {
      console.error('Arama başarısız:', err);
      setError('Arama başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchResultClick = (result: SearchResult) => {
    const threadId = result.thread_id || result.id;
    loadThread(threadId);
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              💬 KAMPÜS+ Forum
            </h1>
            {view !== 'list' && (
              <button
                onClick={() => {
                  setView('list');
                  setCurrentThread(null);
                  setSearchResults([]);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ← Konulara Dön
              </button>
            )}
          </div>

          <div className="mb-4">
            <SearchBar onSearch={handleSearch} disabled={loading} />
          </div>

          {view === 'list' && (
            <button
              onClick={() => setView('new')}
              className="w-full bg-indigo-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              ✨ Yeni Konu Aç
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {view === 'list' && (
          <div>
            <ThreadList
              threads={threads}
              onThreadClick={loadThread}
              loading={loading}
            />
            {hasMore && !loading && (
              <button
                onClick={() => setPage(page + 1)}
                className="mt-4 w-full py-2 text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Daha Fazla Yükle
              </button>
            )}
          </div>
        )}

        {view === 'new' && (
          <NewThreadForm
            categories={categories}
            onSubmit={handleCreateThread}
            onCancel={() => setView('list')}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'thread' && currentThread && (
          <ThreadView
            threadData={currentThread}
            onReplySubmit={handleReplySubmit}
            onHelpful={async (postId) => {
              try {
                await apiClient.post(`/forum/posts/${postId}/helpful`);
                await loadThread(currentThread.thread.id);
              } catch (err) {
                console.error('Yararlı işaretlenemedi:', err);
              }
            }}
            onReport={handleFlagPost}
            loading={loading}
            isSubmitting={isSubmitting}
          />
        )}

        {view === 'search' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Arama Sonuçları ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500">Sonuç bulunamadı</p>
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 text-left"
                  >
                    {result.title && (
                      <h3 className="font-semibold text-gray-900 mb-2">{result.title}</h3>
                    )}
                    <p className="text-gray-700 line-clamp-2">{result.content}</p>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span>👤 {result.author.first_name} {result.author.last_name}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(result.created_at).toLocaleDateString('tr-TR')}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
