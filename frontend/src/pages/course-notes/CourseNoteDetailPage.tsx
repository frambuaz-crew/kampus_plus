import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import {
  createCourseNoteEntry,
  deleteCourseNoteEntry,
  deleteCourseNoteTopic,
  getCourseNoteTopicDetail,
  type NoteEntry,
  type TopicDetail,
} from '../../api/course_notes';
import { 
  ArrowLeft, 
  Paperclip, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  ExternalLink,
  MessageSquare,
  Clock,
  User,
  GraduationCap,
  X,
  Send
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/utils';

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
  
  const dateStr = new Date(entry.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
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
    <Card className="p-6 rounded-[2.5rem] bg-white/60 backdrop-blur-md border-white/80 hover:bg-white/80 transition-all duration-300 shadow-xl shadow-slate-200/40">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[1.25rem] bg-indigo-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100">
            {authorName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-black text-slate-900 tracking-tight leading-none mb-1">{authorName}</h4>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              {dateStr}
            </div>
          </div>
        </div>
        {canDelete && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 w-10 p-0 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
      </div>

      {entry.content && (
        <div className="mb-6">
          <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap tracking-tight">
            {entry.content}
          </p>
        </div>
      )}

      {entry.attachments?.length > 0 && (
        <div className="space-y-4">
          {entry.attachments.map((att) => {
            const url = resolveUrl(att.file_url);
            if (att.file_type === 'pdf') {
              return (
                <div
                  key={att.id}
                  className="group flex items-center gap-4 p-5 bg-white/80 border border-slate-100 rounded-[1.5rem] hover:border-red-100 hover:bg-red-50/30 transition-all"
                >
                  <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{att.file_name}</p>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PDF DÖKÜMANI</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-50 transition-all"
                      title="Önizle"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <a
                      href={url}
                      download={att.file_name}
                      className="p-2 rounded-xl bg-slate-900 text-white hover:bg-indigo-600 shadow-lg transition-all"
                      title="İndir"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            }
            return (
              <div key={att.id} className="group relative rounded-[2rem] overflow-hidden border border-white shadow-sm hover:shadow-xl transition-all duration-500">
                <img
                  src={url}
                  alt={att.file_name}
                  className="w-full object-cover max-h-96 group-hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                   <div className="flex items-center justify-between">
                     <p className="text-white font-bold text-sm truncate flex-1 mr-4">{att.file_name}</p>
                     <a href={url} download className="p-2 rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-slate-900 transition-all">
                       <Download className="w-4 h-4" />
                     </a>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
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
  const isSuperAdmin = currentUser?.role === 'admin';

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

  const handleDeleteTopic = async () => {
    if (!id) return;
    if (!window.confirm('BU HAVUZU VE İÇİNDEKİ TÜM NOTLARI TAMAMEN SİLMEK İSTEDİĞİNE EMİN MİSİN? Bu işlem geri alınamaz.')) return;
    
    try {
      await deleteCourseNoteTopic(id);
      navigate('/dashboard/course-notes');
    } catch {
      alert('Havuz silinirken bir hata oluştu.');
    }
  };

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
        prev ? { ...prev, entries: [newEntry, ...(prev.entries ?? [])] } : prev,
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
        <div className="flex flex-col justify-center items-center min-h-screen bg-mesh">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-indigo-600 font-black text-xs uppercase tracking-widest">Yükleniyor...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !topic) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-mesh flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-12 text-center rounded-[3rem] shadow-2xl border-none">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
              <ArrowLeft className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-4">{error || 'Ders bulunamadı.'}</h3>
            <Button
              onClick={() => navigate('/dashboard/course-notes')}
              className="bg-slate-900 text-white rounded-2xl px-8 h-12 font-bold hover:bg-slate-800 transition-all"
            >
              LİSTEYE DÖN
            </Button>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-mesh">
        <div className="container mx-auto px-6 py-12 max-w-4xl relative z-10">
          
          {/* Header */}
          <header className="mb-10 animate-fade-in">
            <button
              onClick={() => navigate('/dashboard/course-notes')}
              className="group flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-[0.2em] mb-6 hover:text-indigo-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              TÜM HAVUZLAR
            </button>
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500 flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                   <div className="flex items-center gap-2 mb-1">
                     <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[10px] px-3 py-1 rounded-lg">
                       {topic.course_code}
                     </Badge>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">• {(topic.entries ?? []).length} PAYLAŞIM</span>
                   </div>
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{topic.title}</h1>
                </div>
              </div>

              {isSuperAdmin && (
                <Button
                  variant="outline"
                  onClick={handleDeleteTopic}
                  className="h-12 px-6 rounded-2xl border-red-100 text-red-500 font-black hover:bg-red-50 hover:border-red-200 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  HAVUZU SİL
                </Button>
              )}
            </div>
          </header>

          {/* New Note Form */}
          <section className="mb-12 animate-slide-up">
            <Card className="p-8 rounded-[3rem] bg-white shadow-2xl shadow-slate-200/50 border-none relative overflow-hidden">
              <form onSubmit={handleSubmit} className="relative z-10 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                   <MessageSquare className="w-5 h-5 text-indigo-500" />
                   <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">Yeni Not Paylaş</h4>
                </div>
                <Textarea
                  value={entryText}
                  onChange={(e) => setEntryText(e.target.value)}
                  placeholder="Not metni yazabilir veya dosya ekleyebilirsin..."
                  className="min-h-[120px] rounded-3xl bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 transition-all font-medium p-6"
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-600 font-bold hover:bg-white flex items-center gap-2"
                  >
                    <Paperclip className="w-4 h-4 text-indigo-500" />
                    DOSYA EKLE (PDF/RESİM)
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl text-xs font-bold border border-indigo-100 animate-fade-in"
                    >
                      <span className="truncate max-w-[150px]">{f.name}</span>
                      <button type="button" onClick={() => removeFile(i)} className="hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {submitError && (
                  <div className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold animate-shake italic">
                    ⚠️ {submitError}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting || (!entryText.trim() && selectedFiles.length === 0)}
                  className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black hover:bg-indigo-600 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {submitting ? 'PAYLAŞILIYOR...' : (
                    <>
                      PAYLAŞ <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            </Card>
          </section>

          {/* Note Feed */}
          <div className="space-y-6 animate-slide-up delay-200">
            {(topic.entries ?? []).length === 0 ? (
              <Card className="p-20 text-center rounded-[3rem] border-dashed border-2 border-slate-200 bg-transparent shadow-none">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold">Henüz hiç not paylaşılmamış.</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">İLK NOTU SEN EKLE!</p>
              </Card>
            ) : (
              (topic.entries ?? []).map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  canDelete={isAdmin || entry.user_id === currentUser?.id}
                  onDelete={handleEntryDeleted}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
