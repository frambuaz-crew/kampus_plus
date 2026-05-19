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
  pending:  { label: 'Bekliyor',   className: 'bg-amber-50 text-amber-600 border border-amber-100' },
  answered: { label: 'Yanıtlandı', className: 'bg-green-50 text-green-600 border border-green-100' },
  spam:     { label: 'Spam',       className: 'bg-red-50 text-red-650 border border-red-100' },
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Mail size={15} className="text-sky-600 shrink-0 mt-0.5 animate-pulse" />
            <h2 className="text-sm font-bold text-slate-900 leading-snug truncate">{message.subject}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-450 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Meta */}
        <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-x-5 gap-y-1.5 shrink-0 text-xs text-slate-450 font-bold uppercase tracking-wider text-[10px]">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-slate-400" />
            <span className="text-slate-700">{senderName}</span>
            <span className="text-sky-600 font-semibold">@{message.sender.username}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <span>{message.sender.email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-slate-400" />
            <span>Gönderildi: {fmtDate(message.created_at)}</span>
          </div>
          {message.answered_at && (
            <div className="flex items-center gap-1.5 text-slate-500">
              <Clock size={12} />
              <span>İşlendi: {fmtDate(message.answered_at)}</span>
            </div>
          )}
        </div>

        {/* Status badge */}
        <div className="px-6 pt-3 shrink-0">
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_META[message.status].className}`}>
            {STATUS_META[message.status].label}
          </span>
        </div>

        {/* Message body */}
        <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 bg-white">
          <p className="text-sm text-slate-705 text-slate-700 whitespace-pre-wrap leading-relaxed font-medium">{message.message}</p>
        </div>

        {/* Footer – actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0 bg-slate-50/50">
          <div className="flex gap-2">
            {message.status === 'pending' && (
              <>
                <button
                  onClick={() => void onStatusChange(message.id, 'answered')}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-green-50 text-green-600 border border-green-100 rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50"
                >
                  {processing
                    ? <span className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
                    : <Check size={12} />}
                  Yanıtlandı İşaretle
                </button>
                <button
                  onClick={() => void onStatusChange(message.id, 'spam')}
                  disabled={processing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-50 text-red-650 border border-red-100 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  <ShieldAlert size={12} /> Spam İşaretle
                </button>
              </>
            )}
            {(message.status === 'answered' || message.status === 'spam') && (
              <button
                onClick={() => void onStatusChange(message.id, 'pending')}
                disabled={processing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                {processing
                  ? <span className="w-3 h-3 border border-amber-600 border-t-transparent rounded-full animate-spin" />
                  : <RotateCcw size={12} />}
                Bekliyora Geri Al
              </button>
            )}
          </div>
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
        <div className="w-8 h-8 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
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
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Inbox size={15} className="text-slate-400 animate-pulse" />
            <span className="text-sm font-bold text-slate-700">{subHeaderLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold bg-sky-50 text-sky-600 px-2.5 py-1 rounded-full border border-sky-100">
              {total} mesaj listelendi
            </span>
            <button
              onClick={() => void fetchMessages()}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 text-xs font-semibold text-red-655 flex items-center gap-2 bg-red-50 border border-red-100 p-3 rounded-xl">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Check size={36} className="text-green-500 mb-3 stroke-[3]" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">Temiz!</h3>
            <p className="text-xs text-slate-400">Bu kategoride mesaj bulunmuyor.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {messages.map(msg => {
                const meta = STATUS_META[msg.status] ?? STATUS_META.pending;
                const senderName = `${msg.sender.first_name} ${msg.sender.last_name}`;
                return (
                  <div
                    key={msg.id}
                    className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate leading-snug">{msg.subject}</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="text-slate-600">{senderName}</span>
                        <span>•</span>
                        <span className="text-sky-600 font-semibold">@{msg.sender.username}</span>
                        <span>•</span>
                        <span className="text-slate-500 font-semibold">{msg.sender.email}</span>
                        <span>•</span>
                        <span>{new Date(msg.created_at).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${meta.className}`}>
                        {meta.label}
                      </span>
                      <button
                        onClick={() => setSelected(msg)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-sky-50 text-sky-600 rounded-xl hover:bg-sky-100 transition-colors"
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
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/20">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Sayfa {page} / {totalPages} · Toplam {total} mesaj
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronLeft size={14} /> Önceki
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
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
    { label: 'Bekleyen',   value: stats?.pending  ?? 0, color: 'text-sky-600'  },
    { label: 'Yanıtlandı', value: stats?.answered ?? 0, color: 'text-green-600' },
    { label: 'Spam',       value: stats?.spam     ?? 0, color: 'text-red-655'   },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Mail size={22} className="text-sky-600 animate-pulse" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">İletişim Mesajları</h1>
        </div>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          Kullanıcılardan gelen destek talepleri ve iletişim formlarını yönetin.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statsCards.map(s => (
          <div key={s.label} className="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-md shadow-slate-200/30 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">{s.label}</p>
              {statsLoading ? (
                <div className="h-8 w-10 bg-slate-100 animate-pulse rounded mt-2.5" />
              ) : (
                <p className={`text-3xl font-black ${s.color} mt-1`}>{s.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
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
            {tab.key === 'inbox' && stats && stats.pending > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full ml-1">
                {stats.pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content — key forces remount on tab change, resetting page/data */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 overflow-hidden">
        <MessagesTab
          key={activeTab}
          statusFilter={TAB_STATUS_MAP[activeTab]}
          onStatsRefresh={() => void fetchStats()}
        />
      </div>
    </div>
  );
};
