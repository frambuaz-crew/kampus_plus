import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Flag, Pin, Trash2, Check, X, AlertCircle, RefreshCw, Eye, Tag, Calendar, User } from 'lucide-react';
import {
  getForumReports,
  resolveForumReport,
  getAdminForumTopics,
  deleteForumTopic,
  getForumTopicDetail,
} from '../../api/forum';
import type { ForumReport, ForumTopic } from '../../types/forum';

type Tab = 'reports' | 'topics' | 'categories';

const tabs = [
  { key: 'reports' as Tab,    label: 'Raporlananlar',  icon: <Flag size={16} /> },
  { key: 'topics' as Tab,     label: 'Konular',        icon: <MessageSquare size={16} /> },
  { key: 'categories' as Tab, label: 'Kategoriler',    icon: <Pin size={16} /> },
];

const ComingSoon: React.FC<{ title: string; description: string; icon: React.ReactNode }> = ({
  title, description, icon,
}) => (
  <div className="flex flex-col items-center justify-center py-24 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4 text-gray-500">
      {icon}
    </div>
    <h3 className="text-lg font-bold text-gray-300 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 max-w-sm">{description}</p>
  </div>
);

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
        <div className="w-8 h-8 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag size={16} className="text-red-400" />
          <span className="text-sm font-semibold text-gray-300">Raporlanan İçerikler</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold">
            {reports.length} rapor
          </span>
          <button onClick={fetchReports} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 text-sm text-red-400 flex items-center gap-2 bg-red-500/10 p-3 rounded-lg">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Check size={40} className="text-green-500 mb-3" />
          <h3 className="text-base font-bold text-gray-300 mb-1">Temiz!</h3>
          <p className="text-sm text-gray-600">Bekleyen rapor bulunmuyor.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {reports.map(report => (
            <div key={report.id} className="px-6 py-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {report.topic_id && (
                      <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full uppercase">Konu</span>
                    )}
                    {report.reply_id && (
                      <span className="text-[10px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full uppercase">Yorum</span>
                    )}
                    <span className="text-[10px] text-gray-600">
                      {new Date(report.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {report.topic_title && (
                    <p className="text-sm font-semibold text-gray-200 mb-1 truncate">📄 {report.topic_title}</p>
                  )}
                  {report.reply_content && (
                    <p className="text-xs text-gray-400 mb-1 truncate">💬 {report.reply_content}</p>
                  )}

                  <p className="text-xs text-gray-500 mt-1">
                    <span className="font-semibold text-gray-400">Sebep:</span> {report.reason}
                  </p>
                  {report.reporter_name && (
                    <p className="text-[10px] text-gray-600 mt-0.5">Raporlayan: {report.reporter_name}</p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleResolve(report.id, 'delete_content')}
                    disabled={processing === report.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} /> İçeriği Sil
                  </button>
                  <button
                    onClick={() => handleResolve(report.id, 'reject')}
                    disabled={processing === report.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <Eye size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <h2 className="text-base font-bold text-white leading-snug">{topic.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-x-5 gap-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <User size={12} className="text-gray-500" />
            <span className="font-semibold text-gray-300">{authorName}</span>
            {authorUsername && <span className="text-gray-600">{authorUsername}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} className="text-gray-500" />
            {new Date(topic.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{topic.reply_count} yorum</span>
            <span>•</span>
            <span>{topic.view_count} görüntülenme</span>
          </div>
        </div>

        {/* Tags */}
        {topic.tags && topic.tags.length > 0 && (
          <div className="px-6 py-2.5 border-b border-gray-800 flex items-center gap-2 flex-wrap shrink-0">
            <Tag size={11} className="text-gray-600" />
            {topic.tags.map(tag => (
              <span key={tag} className="text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          {topic.content ? (
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{topic.content}</p>
          ) : (
            <p className="text-sm text-gray-600 italic">İçerik bulunamadı.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 hover:text-white transition-colors"
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
        <div className="w-8 h-8 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {isInspectModalOpen && selectedTopic && (
        <TopicInspectModal topic={selectedTopic} onClose={handleCloseModal} />
      )}

      <div>
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-300">Forum Konuları</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
              {topics.length} konu
            </span>
            <button onClick={fetchTopics} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-sm text-red-400 flex items-center gap-2 bg-red-500/10 p-3 rounded-lg">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {topics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare size={40} className="text-gray-600 mb-3" />
            <p className="text-sm text-gray-600">Henüz forum konusu bulunmuyor.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {topics.map(topic => (
              <div key={topic.id} className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-200 truncate">{topic.title}</p>
                  <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                    <span>{topic.author ? `${topic.author.first_name} ${topic.author.last_name}` : 'Anonim'}</span>
                    <span>•</span>
                    <span>{topic.reply_count} yorum</span>
                    <span>•</span>
                    <span>{topic.view_count} görüntülenme</span>
                    <span>•</span>
                    <span>{new Date(topic.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => void handleInspect(topic)}
                    disabled={isInspecting === topic.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    {isInspecting === topic.id
                      ? <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                      : <Eye size={12} />}
                    {isInspecting === topic.id ? '...' : 'İncele'}
                  </button>
                  <button
                    onClick={() => handleDelete(topic.id)}
                    disabled={deleting === topic.id}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={12} /> {deleting === topic.id ? '...' : 'Sil'}
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
// ANA SAYFA
// ============================================================================
export const AdminForumPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('reports');

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <MessageSquare size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">Forum Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">Raporlanan içerikleri inceleyin, konuları ve kategorileri yönetin.</p>
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-red-600 text-white shadow-lg'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'topics' && <TopicsTab />}
        {activeTab === 'categories' && (
          <ComingSoon
            icon={<Pin size={32} />}
            title="Kategori Yönetimi"
            description="Forum kategorilerini ekleyin, düzenleyin veya kaldırın."
          />
        )}
      </div>
    </div>
  );
};
