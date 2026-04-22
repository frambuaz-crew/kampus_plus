import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  deleteCourseNoteEntry,
  getCourseNoteTopicDetail,
  type NoteEntry,
  type TopicDetail,
} from '../../api/course_notes';

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1')
  .replace('/api/v1', '');

function resolveUrl(url: string): string {
  return url.startsWith('http') ? url : `${BACKEND_BASE}${url}`;
}

export const AdminCourseNoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setTopic(await getCourseNoteTopicDetail(id));
    } catch {
      setError('Ders notu havuzu yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteEntry = async (entry: NoteEntry) => {
    if (!window.confirm('Bu notu kalıcı olarak silmek istiyor musun?')) return;
    setDeletingId(entry.id);
    try {
      await deleteCourseNoteEntry(entry.id);
      setTopic((prev) =>
        prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== entry.id) } : prev,
      );
    } catch {
      alert('Not silinirken bir hata oluştu.');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-4">
        <div className="bg-red-900/20 border border-red-800 rounded-2xl p-6 text-red-400 text-sm">
          {error || 'Havuz bulunamadı.'}
        </div>
        <button
          onClick={() => navigate('/admin/course-notes')}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Listeye Dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Başlık */}
      <div>
        <button
          onClick={() => navigate('/admin/course-notes')}
          className="text-gray-500 hover:text-white text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors"
        >
          ← Tüm Havuzlar
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-indigo-900/50 text-indigo-400 text-sm font-black px-3 py-1 rounded-lg">
            {topic.course_code}
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">{topic.title}</h1>
        </div>
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
          {topic.entries.length} gönderi
        </p>
      </div>

      {/* Gönderiler */}
      {topic.entries.length === 0 ? (
        <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-12 text-center text-gray-500">
          Bu havuzda henüz not paylaşılmamış.
        </div>
      ) : (
        <div className="space-y-4">
          {topic.entries.map((entry) => {
            const authorName = entry.author
              ? `${entry.author.first_name} ${entry.author.last_name}`
              : 'Bilinmeyen';
            const date = new Date(entry.created_at).toLocaleDateString('tr-TR', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div
                key={entry.id}
                className="bg-gray-900/40 border border-gray-800 rounded-2xl p-6 space-y-4"
              >
                {/* Meta satırı */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-black text-red-500 text-sm shrink-0">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{authorName}</p>
                      {entry.author && (
                        <p className="text-xs text-gray-500 truncate">@{entry.author.username}</p>
                      )}
                      <p className="text-xs text-gray-600">{date}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry)}
                    disabled={deletingId === entry.id}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold text-red-400 border border-red-900 rounded-lg hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === entry.id ? 'Siliniyor...' : 'Notu Sil'}
                  </button>
                </div>

                {/* Metin içerik */}
                {entry.content && (
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                )}

                {/* Ekler */}
                {entry.attachments.length > 0 && (
                  <div className="space-y-2">
                    {entry.attachments.map((att) => {
                      const url = resolveUrl(att.file_url);
                      if (att.file_type === 'pdf') {
                        return (
                          <div
                            key={att.id}
                            className="flex items-center gap-3 p-3 bg-gray-800/60 border border-gray-700 rounded-xl text-sm"
                          >
                            <span className="text-xl shrink-0">📄</span>
                            <span className="truncate text-gray-300 flex-1 font-medium">
                              {att.file_name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-md bg-gray-700 border border-gray-600 text-gray-300 hover:bg-gray-600 transition-colors text-xs font-medium"
                              >
                                Önizle
                              </a>
                              <span className="text-gray-600 select-none">|</span>
                              <a
                                href={url}
                                download={att.file_name}
                                className="px-2.5 py-1 rounded-md bg-indigo-700 text-white hover:bg-indigo-600 transition-colors text-xs font-medium"
                              >
                                İndir
                              </a>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={att.id} className="rounded-xl overflow-hidden border border-gray-700">
                          <img
                            src={url}
                            alt={att.file_name}
                            className="max-h-64 w-full object-contain bg-gray-950"
                            loading="lazy"
                          />
                          <p className="text-xs text-gray-500 px-3 py-1.5 truncate bg-gray-800/60">
                            {att.file_name}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
