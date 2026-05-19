import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Flag, Pin, Trash2, Check, X, AlertCircle, RefreshCw, Eye, Tag, Calendar, User, Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  getForumReports,
  resolveForumReport,
  getAdminForumTopics,
  deleteForumTopic,
  getForumTopicDetail,
  getForumCategories,
  createForumCategory,
  updateForumCategory,
  deleteForumCategory,
} from '../../api/forum';
import type { ForumReport, ForumTopic, ForumCategory, CreateCategoryPayload } from '../../types/forum';

type Tab = 'reports' | 'topics' | 'categories';

const tabs = [
  { key: 'reports' as Tab,    label: 'Raporlananlar',  icon: <Flag size={16} /> },
  { key: 'topics' as Tab,     label: 'Konular',        icon: <MessageSquare size={16} /> },
  { key: 'categories' as Tab, label: 'Kategoriler',    icon: <Pin size={16} /> },
];

// ============================================================================
// RAPORLAR SEKMESİ
// ============================================================================
const ReportsTab: React.FC = () => {
  const [reports, setReports] = useState<ForumReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getForumReports('pending');
      setReports(res.reports || []);
    } catch {
      setError('Raporlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchReports(); }, [fetchReports]);

  const handleResolve = async (reportId: string, action: 'delete_content' | 'reject') => {
    try {
      setProcessing(reportId);
      await resolveForumReport(reportId, action);
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch {
      setError('İşlem başarısız oldu.');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag size={15} className="text-slate-400 animate-pulse" />
          <span className="text-sm font-bold text-slate-700">Raporlanan İçerikler</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2.5 py-1 rounded-full border border-red-100 shadow-sm">
            {reports.length} bekleyen rapor
          </span>
          <button onClick={() => void fetchReports()} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 text-xs font-semibold text-red-600 flex items-center gap-2 bg-red-50 border border-red-100 p-3.5 rounded-xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 bg-green-55 bg-green-50 border border-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
            <Check size={22} className="stroke-[3]" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 mb-1">Temiz!</h3>
          <p className="text-xs text-slate-400">Bekleyen rapor bulunmuyor.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {reports.map(report => (
            <div key={report.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {report.topic_id && (
                      <span className="text-[9px] font-extrabold bg-sky-50 text-sky-600 px-2 py-0.5 rounded-full border border-sky-100 uppercase tracking-wider">Konu</span>
                    )}
                    {report.reply_id && (
                      <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider">Yorum</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(report.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {report.topic_title && (
                    <p className="text-sm font-semibold text-slate-800 mb-1 truncate">📄 {report.topic_title}</p>
                  )}
                  {report.reply_content && (
                    <p className="text-xs text-slate-500 mb-1 truncate leading-relaxed">💬 {report.reply_content}</p>
                  )}

                  <p className="text-xs text-slate-450 mt-2">
                    <span className="font-bold text-slate-500">Rapor Sebebi:</span> <span className="text-slate-700">{report.reason}</span>
                  </p>
                  {report.reporter_name && (
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Raporlayan: @{report.reporter_name}</p>
                  )}
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => void handleResolve(report.id, 'delete_content')}
                    disabled={processing === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-650 border border-red-100 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} /> İçeriği Sil
                  </button>
                  <button
                    onClick={() => void handleResolve(report.id, 'reject')}
                    disabled={processing === report.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-105 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    <X size={12} /> Reddet
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// KONU İNCELE MODALI
// ============================================================================
const TopicInspectModal: React.FC<{ topic: ForumTopic; onClose: () => void }> = ({ topic, onClose }) => {
  const authorName = topic.author
    ? `${topic.author.first_name} ${topic.author.last_name}`
    : 'Anonim';
  const authorUsername = topic.author?.username ? `@${topic.author.username}` : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Eye size={15} className="text-sky-600 shrink-0 mt-0.5" />
            <h2 className="text-sm font-bold text-slate-900 leading-snug">{topic.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-x-5 gap-y-1.5 shrink-0 text-xs text-slate-450 font-bold uppercase tracking-wider text-[10px]">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-slate-400" />
            <span className="text-slate-700">{authorName}</span>
            {authorUsername && <span className="text-sky-600 font-semibold">{authorUsername}</span>}
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-400" />
            <span>
              {new Date(topic.created_at).toLocaleDateString('tr-TR', {
                day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>{topic.reply_count} yorum</span>
            <span>•</span>
            <span>{topic.view_count} okuma</span>
          </div>
        </div>

        {/* Tags */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="px-6 py-2.5 border-b border-slate-100 flex items-center gap-1.5 flex-wrap shrink-0">
            <Tag size={11} className="text-slate-400" />
            {topic.tags.map(tag => (
              <span key={tag} className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg font-bold">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 bg-white">
          {topic.content ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{topic.content}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">İçerik bulunamadı.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold bg-slate-100 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-200 hover:text-slate-800 transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// KONULAR SEKMESİ
// ============================================================================
const TopicsTab: React.FC = () => {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<ForumTopic | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isInspecting, setIsInspecting] = useState<string | null>(null);

  const fetchTopics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminForumTopics({ page: 1, limit: 50 });
      setTopics(res.topics || []);
    } catch {
      setError('Konular yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTopics(); }, [fetchTopics]);

  const handleInspect = async (topic: ForumTopic) => {
    try {
      setIsInspecting(topic.id);
      const res = await getForumTopicDetail(topic.id);
      setSelectedTopic(res.topic);
      setIsInspectModalOpen(true);
    } catch {
      setError('Konu detayı yüklenemedi.');
    } finally {
      setIsInspecting(null);
    }
  };

  const handleCloseModal = () => {
    setIsInspectModalOpen(false);
    setSelectedTopic(null);
  };

  const handleDelete = async (topicId: string) => {
    if (!confirm('Bu konuyu silmek istediğinize emin misiniz?')) return;
    try {
      setDeleting(topicId);
      await deleteForumTopic(topicId);
      setTopics(prev => prev.filter(t => t.id !== topicId));
      if (selectedTopic?.id === topicId) handleCloseModal();
    } catch {
      setError('Konu silinemedi.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isInspectModalOpen && selectedTopic && (
        <TopicInspectModal topic={selectedTopic} onClose={handleCloseModal} />
      )}

      <div>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={15} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Forum Konuları</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100">
              {topics.length} aktif konu
            </span>
            <button onClick={() => void fetchTopics()} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-650 flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare size={36} className="text-slate-350 mb-3 animate-bounce" />
            <p className="text-sm text-slate-400 font-semibold">Henüz forum konusu bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {topics.map(topic => (
              <div key={topic.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate leading-snug">{topic.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    <span className="text-slate-650">{topic.author ? `${topic.author.first_name} ${topic.author.last_name}` : 'Anonim'}</span>
                    <span>•</span>
                    <span className="text-slate-500">{topic.reply_count} yorum</span>
                    <span>•</span>
                    <span>{topic.view_count} okuma</span>
                    <span>•</span>
                    <span>{new Date(topic.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => void handleInspect(topic)}
                    disabled={isInspecting === topic.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-colors disabled:opacity-50"
                  >
                    {isInspecting === topic.id
                      ? <span className="w-3 h-3 border border-sky-600 border-t-transparent rounded-full animate-spin" />
                      : <Eye size={12} />}
                    {isInspecting === topic.id ? 'İnceleniyor…' : 'İncele'}
                  </button>
                  <button
                    onClick={() => void handleDelete(topic.id)}
                    disabled={deleting === topic.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} /> {deleting === topic.id ? 'Siliniyor…' : 'Sil'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================================
// KATEGORİ FORMU MODALİ
// ============================================================================
interface CategoryFormModalProps {
  initial?: ForumCategory | null;
  onSave: (data: CreateCategoryPayload) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

const CategoryFormModal: React.FC<CategoryFormModalProps> = ({ initial, onSave, onClose, saving }) => {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) { setFormError('Kategori adı zorunludur.'); return; }
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
        order_index: orderIndex,
        is_active: isActive,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Kaydedilemedi.';
      setFormError(msg);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Pin size={16} className="text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">
              {initial ? 'Kategoriyi Düzenle' : 'Yeni Kategori Ekle'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={e => void handleSubmit(e)} className="px-6 py-5 space-y-4">
          {formError && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-650 bg-red-50 border border-red-100 p-3 rounded-xl">
              <AlertCircle size={14} className="shrink-0" /> {formError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Kategori Adı *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Örn: Duyurular"
              maxLength={100}
              required
              className="w-full bg-slate-55 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">İkon (Emoji)</label>
            <input
              type="text"
              value={icon}
              onChange={e => setIcon(e.target.value)}
              placeholder="Örn: 📢"
              maxLength={50}
              className="w-full bg-slate-55 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Açıklama</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Kategori hakkında kısa bir açıklama..."
              maxLength={500}
              rows={3}
              className="w-full bg-slate-55 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-sky-500 resize-none font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sıralama Önceliği</label>
            <input
              type="number"
              value={orderIndex}
              onChange={e => setOrderIndex(Number(e.target.value))}
              min={0}
              className="w-full bg-slate-55 bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 outline-none focus:bg-white focus:border-sky-500 font-bold"
            />
          </div>

          <div className="flex items-center justify-between py-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Yayında Aktif</span>
            <button
              type="button"
              onClick={() => setIsActive(v => !v)}
              className={`transition-colors ${isActive ? 'text-green-500' : 'text-slate-400'}`}
            >
              {isActive ? <ToggleRight size={30} /> : <ToggleLeft size={30} />}
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200 text-slate-650 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 transition-colors disabled:opacity-50 shadow-md shadow-sky-500/10"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// KATEGORİLER SEKMESİ
// ============================================================================
const CategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ForumCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getForumCategories();
      setCategories(res.categories ?? []);
    } catch {
      setError('Kategoriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchCategories(); }, [fetchCategories]);

  const openCreate = () => { setEditTarget(null); setIsModalOpen(true); };
  const openEdit = (cat: ForumCategory) => { setEditTarget(cat); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setEditTarget(null); };

  const handleSave = async (data: CreateCategoryPayload) => {
    setSaving(true);
    try {
      if (editTarget) {
        const res = await updateForumCategory(editTarget.id, data);
        setCategories(prev => prev.map(c => c.id === editTarget.id ? res.category : c));
      } else {
        const res = await createForumCategory(data);
        setCategories(prev => [...prev, res.category]);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: ForumCategory) => {
    if (cat.topic_count > 0) {
      setError(`"${cat.name}" kategorisinde ${cat.topic_count} aktif konu var. Önce konuları silin veya taşıyın.`);
      return;
    }
    if (!confirm(`"${cat.name}" kategorisini silmek istediğinize emin misiniz?`)) return;
    try {
      setDeleting(cat.id);
      await deleteForumCategory(cat.id);
      setCategories(prev => prev.filter(c => c.id !== cat.id));
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message ?? 'Silinemedi.';
      setError(msg);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-650 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isModalOpen && (
        <CategoryFormModal
          initial={editTarget}
          onSave={handleSave}
          onClose={closeModal}
          saving={saving}
        />
      )}

      <div>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Pin size={15} className="text-slate-400 animate-pulse" />
            <span className="text-sm font-bold text-slate-700">Forum Kategorileri</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100">
              {categories.length} kategori
            </span>
            <button onClick={() => void fetchCategories()} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw size={14} />
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-colors shadow-md shadow-sky-500/10"
            >
              <Plus size={13} /> Yeni Kategori Ekle
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-650 flex items-center gap-2 bg-red-50 border border-red-100 p-3.5 rounded-xl">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto hover:text-red-900"><X size={14} /></button>
          </div>
        )}

        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Pin size={36} className="text-slate-300 mb-3" />
            <h3 className="text-sm font-semibold text-slate-450 mb-1">Henüz kategori yok</h3>
            <p className="text-xs text-slate-450 mb-4">İlk kategoriyi ekleyerek başlayın.</p>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-sky-600 text-white rounded-xl hover:bg-sky-500 transition-colors"
            >
              <Plus size={14} /> Kategori Ekle
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-widest text-slate-450">
                  <th className="px-6 py-3 w-16 text-center">İkon</th>
                  <th className="px-6 py-3">Adı / Sıra</th>
                  <th className="px-6 py-3">Açıklama</th>
                  <th className="px-6 py-3 w-24 text-center">Konu Sayısı</th>
                  <th className="px-6 py-3 w-28 text-center">Durum</th>
                  <th className="px-6 py-3 w-28 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-150 text-base shadow-sm shrink-0 mx-auto">
                        {cat.icon && (cat.icon.codePointAt(0) ?? 0) > 127 ? cat.icon : '📁'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800 truncate">{cat.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sıra: #{cat.order_index}</p>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      <span className="line-clamp-2 max-w-sm">{cat.description ?? '—'}</span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{cat.topic_count}</span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        cat.is_active
                          ? 'bg-green-50 border-green-100 text-green-600'
                          : 'bg-slate-100 border-slate-200 text-slate-450'
                      }`}>
                        {cat.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                          title="Düzenle"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => void handleDelete(cat)}
                          disabled={deleting === cat.id}
                          className="p-1.5 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Sil"
                        >
                          <Trash2 size={13} />
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
    </>
  );
};

// ============================================================================
// ANA SAYFA
// ============================================================================
export const AdminForumPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('reports');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <MessageSquare size={22} className="text-sky-600 animate-pulse" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Forum Yönetimi</h1>
        </div>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">Raporlanan içerikleri inceleyin, konuları ve kategorileri yönetin.</p>
      </div>

      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 overflow-hidden">
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'topics' && <TopicsTab />}
        {activeTab === 'categories' && <CategoriesTab />}
      </div>
    </div>
  );
};
