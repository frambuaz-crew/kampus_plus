import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  Inbox,
  CheckCircle,
  AlertCircle,
  X,
  User,
  Calendar,
  Clock,
  RefreshCw,
  Eye,
  Check,
  RotateCcw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getAdminMessages,
  getAdminMessageStats,
  updateMessageStatus,
  type AdminContactMessageResponse,
  type ContactMessageStats,
} from '../../api/contact';

// ── Types & constants ─────────────────────────────────────────────────────────

type Tab = 'inbox' | 'resolved' | 'spam';

const TAB_STATUS_MAP: Record<Tab, 'pending' | 'answered' | 'spam'> = {
  inbox:    'pending',
  resolved: 'answered',
  spam:     'spam',
};

const tabs = [
  { key: 'inbox'    as Tab, label: 'Gelen Kutusu', icon: <Inbox size={16} /> },
  { key: 'resolved' as Tab, label: 'Çözümlendi',   icon: <CheckCircle size={16} /> },
  { key: 'spam'     as Tab, label: 'Spam',          icon: <AlertCircle size={16} /> },
];

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending:  { label: 'Bekliyor',   className: 'bg-amber-500/10 text-amber-400' },
  answered: { label: 'Yanıtlandı', className: 'bg-green-500/10 text-green-400' },
  spam:     { label: 'Spam',       className: 'bg-red-500/10 text-red-400' },
};

const PAGE_LIMIT = 20;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ── MessageInspectModal ───────────────────────────────────────────────────────

interface ModalProps {
  message: AdminContactMessageResponse;
  onClose: () => void;
  onStatusChange: (id: string, status: 'pending' | 'answered' | 'spam') => Promise<void>;
  processing: boolean;
}

const MessageInspectModal: React.FC<ModalProps> = ({
  message, onClose, onStatusChange, processing,
}) => {
  const senderName = `${message.sender.first_name} ${message.sender.last_name}`;

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
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={16} className="text-red-400 shrink-0 mt-0.5" />
            <h2 className="text-base font-bold text-white leading-snug truncate">{message.subject}</h2>
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
            <span className="font-semibold text-gray-300">{senderName}</span>
            <span className="text-gray-600">@{message.sender.username}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{message.sender.email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Calendar size={12} className="text-gray-500" />
            <span>Gönderildi: {fmtDate(message.created_at)}</span>
          </div>
          {message.answered_at && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock size={12} />
              <span>İşlendi: {fmtDate(message.answered_at)}</span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="px-6 pt-3 shrink-0">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_META[message.status].className}`}>
            {STATUS_META[message.status].label}
          </span>
        </div>

        {/* Message body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{message.message}</p>
        </div>

        {/* Footer – actions */}
        <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex gap-2">
            {message.status === 'pending' && (
              <>
                <button
                  onClick={() => void onStatusChange(message.id, 'answered')}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors disabled:opacity-50"
                >
                  {processing
                    ? <span className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                    : <Check size={12} />}
                  Yanıtlandı İşaretle
                </button>
                <button
                  onClick={() => void onStatusChange(message.id, 'spam')}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                >
                  <ShieldAlert size={12} /> Spam İşaretle
                </button>
              </>
            )}
            {(message.status === 'answered' || message.status === 'spam') && (
              <button
                onClick={() => void onStatusChange(message.id, 'pending')}
                disabled={processing}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 transition-colors disabled:opacity-50"
              >
                {processing
                  ? <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" />
                  : <RotateCcw size={12} />}
                Bekliyora Geri Al
              </button>
            )}
          </div>
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

// ── MessagesTab ───────────────────────────────────────────────────────────────

interface MessagesTabProps {
  statusFilter: 'pending' | 'answered' | 'spam';
  onStatsRefresh: () => void;
}

const MessagesTab: React.FC<MessagesTabProps> = ({ statusFilter, onStatsRefresh }) => {
  const [messages, setMessages] = useState<AdminContactMessageResponse[]>([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminContactMessageResponse | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getAdminMessages({ status: statusFilter, page, limit: PAGE_LIMIT });
      setMessages(res.messages);
      setTotal(res.total);
    } catch {
      setError('Mesajlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { void fetchMessages(); }, [fetchMessages]);

  const handleStatusChange = async (id: string, newStatus: 'pending' | 'answered' | 'spam') => {
    try {
      setProcessing(true);
      await updateMessageStatus(id, { status: newStatus });
      // Remove item from current list (it now belongs to a different tab)
      setMessages(prev => prev.filter(m => m.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      setSelected(null);
      onStatsRefresh();
    } catch {
      setError('Durum güncellenemedi.');
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const subHeaderLabel = statusFilter === 'pending'
    ? 'Bekleyen Mesajlar'
    : statusFilter === 'answered'
    ? 'Yanıtlanan Mesajlar'
    : 'Spam Mesajlar';

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {selected && (
        <MessageInspectModal
          message={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          processing={processing}
        />
      )}

      <div>
        {/* Sub-header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox size={16} className="text-red-400" />
            <span className="text-sm font-semibold text-gray-300">{subHeaderLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold">
              {total} mesaj
            </span>
            <button
              onClick={() => void fetchMessages()}
              className="p-1.5 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-sm text-red-400 flex items-center gap-2 bg-red-500/10 p-3 rounded-lg">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Check size={40} className="text-green-500 mb-3" />
            <h3 className="text-base font-bold text-gray-300 mb-1">Temiz!</h3>
            <p className="text-sm text-gray-600">Bu kategoride mesaj bulunmuyor.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-800">
              {messages.map(msg => {
                const meta = STATUS_META[msg.status] ?? STATUS_META.pending;
                const senderName = `${msg.sender.first_name} ${msg.sender.last_name}`;
                return (
                  <div
                    key={msg.id}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{msg.subject}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-500">
                        <span>{senderName}</span>
                        <span>•</span>
                        <span className="text-gray-600">@{msg.sender.username}</span>
                        <span>•</span>
                        <span>{msg.sender.email}</span>
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.className}`}>
                        {meta.label}
                      </span>
                      <button
                        onClick={() => setSelected(msg)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                      >
                        <Eye size={12} /> İncele
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-600">
                  Sayfa {page} / {totalPages} · {total} mesaj
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} /> Önceki
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sonraki <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};

// ── AdminMessagesPage ─────────────────────────────────────────────────────────

export const AdminMessagesPage: React.FC = () => {
  const [activeTab, setActiveTab]     = useState<Tab>('inbox');
  const [stats, setStats]             = useState<ContactMessageStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await getAdminMessageStats();
      setStats(res);
    } catch {
      // stats are non-critical, fail silently
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { void fetchStats(); }, [fetchStats]);

  const statsCards = [
    { label: 'Bekleyen',   value: stats?.pending  ?? 0, color: 'text-blue-400'  },
    { label: 'Yanıtlandı', value: stats?.answered ?? 0, color: 'text-green-400' },
    { label: 'Spam',       value: stats?.spam     ?? 0, color: 'text-red-400'   },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Mail size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">İletişim Mesajları</h1>
        </div>
        <p className="text-sm text-gray-500">
          Kullanıcılardan gelen destek talepleri ve iletişim formlarını yönetin.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {statsCards.map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            {statsLoading ? (
              <div className="h-8 w-10 bg-gray-800 animate-pulse rounded mb-1" />
            ) : (
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
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
            {tab.key === 'inbox' && stats && stats.pending > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content — key forces remount on tab change, resetting page/data */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <MessagesTab
          key={activeTab}
          statusFilter={TAB_STATUS_MAP[activeTab]}
          onStatsRefresh={() => void fetchStats()}
        />
      </div>
    </div>
  );
};
