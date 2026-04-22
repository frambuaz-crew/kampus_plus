import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteCourseNoteTopic,
  getCourseNoteTopics,
  type TopicItem,
} from '../../api/course_notes';

export const AdminCourseNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseNoteTopics({ limit: 100 });
      setTopics(data);
    } catch {
      setError('Ders havuzları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const handleDelete = async (topic: TopicItem) => {
    if (
      !window.confirm(
        `"${topic.title}" havuzunu ve içindeki tüm notları kalıcı olarak silmek istiyor musun?`,
      )
    )
      return;

    setDeletingId(topic.id);
    try {
      await deleteCourseNoteTopic(topic.id);
      setTopics((prev) => prev.filter((t) => t.id !== topic.id));
    } catch {
      alert('Havuz silinirken bir hata oluştu.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">DERS NOTLARI</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-1">
          Tüm ders notu havuzlarını yönet
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && topics.length === 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
          Henüz hiç ders notu havuzu oluşturulmamış.
        </div>
      )}

      {!loading && !error && topics.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Ders Kodu
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Başlık
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Oluşturan
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Not Sayısı
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Tarih
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-indigo-900/50 text-indigo-400 text-xs font-bold px-2 py-0.5 rounded">
                      {topic.course_code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-200 max-w-xs truncate">
                    {topic.title}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {topic.creator
                      ? `${topic.creator.first_name} ${topic.creator.last_name}`
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {topic.entry_count}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 text-xs whitespace-nowrap">
                    {new Date(topic.created_at).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/admin/course-notes/${topic.id}`)}
                        className="px-3 py-1.5 text-xs font-bold text-blue-400 border border-blue-900 rounded-lg hover:bg-blue-900/30 transition-colors"
                      >
                        İncele
                      </button>
                      <button
                        onClick={() => handleDelete(topic)}
                        disabled={deletingId === topic.id}
                        className="px-3 py-1.5 text-xs font-bold text-red-400 border border-red-900 rounded-lg hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === topic.id ? 'Siliniyor...' : 'Havuzu Sil'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
