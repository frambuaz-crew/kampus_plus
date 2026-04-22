/**
 * CourseNoteDetailPage — Bir ders notları havuzunun thread görünümü.
 * Metin, PDF ve resim notlarını listeler; en üstte yeni not yükleme formu bulunur.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import {
  createCourseNoteEntry,
  deleteCourseNoteEntry,
  getCourseNoteTopicDetail,
  type NoteEntry,
  type TopicDetail,
} from '../../api/course_notes';

const BACKEND_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8001/api/v1')
  .replace('/api/v1', '');

function resolveUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return `${BACKEND_BASE}${url}`;
}

interface EntryCardProps {
  entry: NoteEntry;
  canDelete: boolean;
  onDelete: (entryId: string) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, canDelete, onDelete }) => {
  const [deleting, setDeleting] = useState(false);

  const authorName = entry.author
    ? `${entry.author.first_name} ${entry.author.last_name}`
    : 'Bilinmeyen';
  const date = new Date(entry.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDelete = async () => {
    if (!window.confirm('Bu notu silmek istediğine emin misin?')) return;
    setDeleting(true);
    try {
      await deleteCourseNoteEntry(entry.id);
      onDelete(entry.id);
    } catch {
      alert('Not silinirken bir hata oluştu.');
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Meta satırı */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
          {authorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{authorName}</p>
          <p className="text-xs text-gray-400">{date}</p>
        </div>
        {canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            title="Notu sil"
            className="shrink-0 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {deleting ? '...' : 'Sil'}
          </button>
        )}
      </div>

      {/* Metin içerik */}
      {entry.content && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
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
                  className="flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50 text-sm text-red-700"
                >
                  <span className="text-xl shrink-0">📄</span>
                  <span className="truncate font-medium flex-1">{att.file_name}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-md bg-white border border-red-300 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium"
                    >
                      Önizle
                    </a>
                    <span className="text-red-300 select-none">|</span>
                    <a
                      href={url}
                      download={att.file_name}
                      className="px-2.5 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors text-xs font-medium"
                    >
                      İndir
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <div key={att.id} className="rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={url}
                  alt={att.file_name}
                  className="max-h-72 w-full object-contain bg-gray-50"
                  loading="lazy"
                />
                <p className="text-xs text-gray-400 px-3 py-1 truncate">{att.file_name}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const CourseNoteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [topic, setTopic] = useState<TopicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Entry form state
  const [entryText, setEntryText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'university_admin';

  const loadTopic = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseNoteTopicDetail(id);
      setTopic(data);
    } catch {
      setError('Ders notları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTopic();
  }, [loadTopic]);

  const handleEntryDeleted = (entryId: string) => {
    setTopic((prev) =>
      prev ? { ...prev, entries: prev.entries.filter((e) => e.id !== entryId) } : prev,
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!entryText.trim() && selectedFiles.length === 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const newEntry = await createCourseNoteEntry(id, {
        content: entryText.trim() || undefined,
        files: selectedFiles.length > 0 ? selectedFiles : undefined,
      });
      setTopic((prev) =>
        prev ? { ...prev, entries: [...prev.entries, newEntry] } : prev,
      );
      setEntryText('');
      setSelectedFiles([]);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Not eklenirken bir hata oluştu.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-64">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error || !topic) {
    return (
      <MainLayout>
        <div className="max-w-3xl mx-auto px-4 py-8 text-center text-red-500 text-sm">
          {error || 'Ders bulunamadı.'}
          <div className="mt-4">
            <button
              onClick={() => navigate('/dashboard/course-notes')}
              className="text-indigo-600 hover:underline text-sm"
            >
              ← Geri dön
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Başlık */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard/course-notes')}
            className="text-indigo-600 hover:text-indigo-800 text-sm mb-3 flex items-center gap-1"
          >
            ← Tüm Havuzlar
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="bg-indigo-100 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full">
              {topic.course_code}
            </span>
            <h1 className="text-xl font-bold text-gray-900">{topic.title}</h1>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {topic.entries.length} paylaşım
          </p>
        </div>

        {/* Yeni Not Formu */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-xl p-4 mb-6 space-y-3"
        >
          <p className="text-sm font-semibold text-gray-700">Yeni Not Ekle</p>
          <textarea
            value={entryText}
            onChange={(e) => setEntryText(e.target.value)}
            placeholder="Not metni yaz (isteğe bağlı)..."
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Dosya seçici */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs border border-gray-300 rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <span>📎</span> PDF / Resim Ekle
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFiles.map((f, i) => (
              <span
                key={i}
                className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full"
              >
                {f.name.length > 20 ? f.name.slice(0, 20) + '…' : f.name}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-indigo-400 hover:text-indigo-700 font-bold leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {submitError && (
            <p className="text-xs text-red-600">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting || (!entryText.trim() && selectedFiles.length === 0)}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Paylaşılıyor...' : 'Paylaş'}
          </button>
        </form>

        {/* Not Akışı */}
        {topic.entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📝</p>
            <p className="text-sm">Henüz not paylaşılmamış. İlk notu sen ekle!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topic.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                canDelete={isAdmin || entry.user_id === currentUser?.id}
                onDelete={handleEntryDeleted}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};
