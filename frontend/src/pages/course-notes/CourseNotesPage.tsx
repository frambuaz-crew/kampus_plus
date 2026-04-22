/**
 * CourseNotesPage — Ders kodu bazlı not havuzları listesi.
 * Arama çubuğuyla havuzları filtreler, yeni havuz oluşturmaya olanak tanır.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import {
  createCourseNoteTopic,
  getCourseNoteTopics,
  type TopicItem,
} from '../../api/course_notes';

export const CourseNotesPage: React.FC = () => {
  const navigate = useNavigate();

  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Yeni havuz oluşturma formu
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCourseCode, setNewCourseCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTopics = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseNoteTopics(
        query ? { course_code: query } : undefined,
      );
      setTopics(data);
    } catch {
      setError('Dersler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics(searchQuery);
  }, [fetchTopics, searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(inputValue.trim());
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseCode.trim() || !newTitle.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCourseNoteTopic({
        course_code: newCourseCode.trim(),
        title: newTitle.trim(),
      });
      setTopics((prev) => [created, ...prev]);
      setShowCreateForm(false);
      setNewCourseCode('');
      setNewTitle('');
    } catch {
      setCreateError('Havuz oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Başlık */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Ders Notları</h1>
          <p className="mt-2 text-gray-500 text-sm">
            Ders koduna göre ortak not havuzlarını bul veya yeni bir havuz oluştur.
          </p>
        </div>

        {/* Arama Çubuğu */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ders kodu ara (örn: CENG401, MATH101)..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Ara
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setInputValue(''); setSearchQuery(''); }}
              className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Temizle
            </button>
          )}
        </form>

        {/* Yeni Havuz Aç */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
          >
            <span className="text-lg">+</span>
            {showCreateForm ? 'İptal' : 'Yeni not havuzu oluştur'}
          </button>

          {showCreateForm && (
            <form
              onSubmit={handleCreateTopic}
              className="mt-3 p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ders Kodu *
                </label>
                <input
                  type="text"
                  value={newCourseCode}
                  onChange={(e) => setNewCourseCode(e.target.value.toUpperCase())}
                  placeholder="Örn: CENG401"
                  maxLength={20}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Havuz Başlığı *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Örn: CENG401 - Algoritma Analizi Notları"
                  maxLength={200}
                  required
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {createError && (
                <p className="text-xs text-red-600">{createError}</p>
              )}
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Oluşturuluyor...' : 'Havuz Oluştur'}
              </button>
            </form>
          )}
        </div>

        {/* Sonuç Listesi */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12 text-red-500 text-sm">{error}</div>
        )}

        {!loading && !error && topics.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm">
              {searchQuery
                ? `"${searchQuery}" için not havuzu bulunamadı.`
                : 'Henüz not havuzu yok. İlk havuzu oluştur!'}
            </p>
          </div>
        )}

        {!loading && !error && topics.length > 0 && (
          <ul className="space-y-3">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button
                  onClick={() => navigate(`/dashboard/course-notes/${topic.id}`)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded mb-1">
                        {topic.course_code}
                      </span>
                      <p className="text-sm font-medium text-gray-900 truncate">{topic.title}</p>
                      {topic.creator && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {topic.creator.first_name} {topic.creator.last_name} tarafından açıldı
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs text-gray-500">{topic.entry_count} not</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MainLayout>
  );
};
