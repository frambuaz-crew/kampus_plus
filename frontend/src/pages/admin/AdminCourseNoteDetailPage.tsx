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
        <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-650 text-sm">
          {error || 'Havuz bulunamadı.'}
        </div>
        <button
          onClick={() => navigate('/admin/course-notes')}
          className="text-slate-400 hover:text-slate-700 text-sm font-semibold transition-colors"
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
          className="text-slate-400 hover:text-slate-700 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2 transition-colors"
        >
          ← Tüm Havuzlar
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-sky-50 text-sky-600 text-sm font-black px-3 py-1 rounded-lg border border-sky-105 shadow-sm">
            {topic.course_code}
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">{topic.title}</h1>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">
          {topic.entries.length} gönderi
        </p>
      </div>

      {/* Gönderiler */}
      {topic.entries.length === 0 ? (
        <div className="bg-white border border-slate-100/50 rounded-[2rem] shadow-xl shadow-slate-200/40 p-12 text-center text-slate-400">
          Bu havuzda henüz not paylaşılmamış.
        </div>
      ) : (
        <div className="space-y-6">
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
                className="bg-white shadow-xl shadow-slate-200/40 border border-slate-100/50 rounded-[2rem] p-6 space-y-4"
              >
                {/* Meta satırı */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center font-black text-sky-600 text-sm shrink-0">
                      {authorName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{authorName}</p>
                      {entry.author && (
                        <p className="text-xs text-slate-400 truncate">@{entry.author.username}</p>
                      )}
                      <p className="text-[10px] text-slate-450 mt-0.5">{date}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry)}
                    disabled={deletingId === entry.id}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold text-red-650 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100/60 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === entry.id ? 'Siliniyor...' : 'Notu Sil'}
                  </button>
                </div>

                {/* Metin içerik */}
                {entry.content && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {entry.content}
                  </p>
                )}

                {/* Ekler */}
                {entry.attachments.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {entry.attachments.map((att) => {
                      const url = resolveUrl(att.file_url);
                      if (att.file_type === 'pdf') {
                        return (
                          <div
                            key={att.id}
                            className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm"
                          >
                            <span className="text-xl shrink-0">📄</span>
                            <span className="truncate text-slate-700 flex-1 font-semibold">
                              {att.file_name}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 transition-colors text-xs font-bold"
                              >
                                Önizle
                              </a>
                              <span className="text-slate-300 select-none px-1">|</span>
                              <a
                                href={url}
                                download={att.file_name}
                                className="px-2.5 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-500 transition-colors text-xs font-bold shadow-md shadow-sky-500/10"
                              >
                                İndir
                              </a>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div key={att.id} className="rounded-xl overflow-hidden border border-slate-100 max-w-md bg-slate-50">
                          <img
                            src={url}
                            alt={att.file_name}
                            className="max-h-64 w-full object-contain"
                            loading="lazy"
                          />
                          <p className="text-xs text-slate-450 px-3 py-1.5 truncate border-t border-slate-100 bg-white">
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
