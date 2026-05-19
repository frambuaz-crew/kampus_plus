import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  deleteCourseNoteTopic,
  getCourseNoteTopics,
  type TopicItem,
} from '../../api/course_notes';

export const AdminCourseNotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">DERS NOTLARI</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
          Tüm ders notu havuzlarını yönet
        </p>
      </div>

      {user?.role !== 'admin' && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-amber-605 bg-amber-50 border border-amber-100 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Sadece <span className="font-bold">{user?.university}</span> verilerini görüntülüyorsunuz
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && topics.length === 0 && (
        <div className="bg-white border border-slate-100/50 rounded-[2rem] shadow-xl shadow-slate-200/40 p-12 text-center text-slate-400">
          Henüz hiç ders notu havuzu oluşturulmamış.
        </div>
      )}

      {!loading && !error && topics.length > 0 && (
        <div className="bg-white border border-slate-100/50 rounded-[2.5rem] shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-450 uppercase tracking-widest">
                    Ders Kodu
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-450 uppercase tracking-widest">
                    Başlık
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-450 uppercase tracking-widest">
                    Oluşturan
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-450 uppercase tracking-widest">
                    Not Sayısı
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-slate-450 uppercase tracking-widest">
                    Tarih
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-450 uppercase tracking-widest">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="bg-sky-50 text-sky-600 text-xs font-bold px-2.5 py-1 rounded-lg border border-sky-100">
                        {topic.course_code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-semibold max-w-xs truncate">
                      {topic.title}
                    </td>
                    <td className="px-6 py-4 text-slate-650">
                      {topic.creator
                        ? `${topic.creator.first_name} ${topic.creator.last_name}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-650">
                      {topic.entry_count}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-450 text-xs whitespace-nowrap">
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
                          className="px-3 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 border border-sky-100 rounded-lg hover:bg-sky-100/60 transition-colors"
                        >
                          İncele
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(topic)}
                            disabled={deletingId === topic.id}
                            className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100/60 disabled:opacity-50 transition-colors"
                          >
                            {deletingId === topic.id ? 'Siliniyor...' : 'Havuzu Sil'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
