import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Settings, Database, BarChart2, Zap, Save, CheckCircle, AlertCircle, RefreshCw, Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  getAIStats,
  getAISettings,
  updateAISettings,
  getKnowledgeBase,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
  type AISettingsResponse,
  type AIStatsResponse,
  type AIKnowledgeBaseEntry,
  type AIKnowledgeBaseCreate,
  type DailyUsageItem,
} from '../../api/admin_ai';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'settings' | 'knowledge' | 'stats';

const TABS = [
  { key: 'settings' as Tab,  label: 'Ayarlar',        icon: <Settings size={16} /> },
  { key: 'knowledge' as Tab, label: 'Knowledge Base',  icon: <Database size={16} /> },
  { key: 'stats' as Tab,     label: 'İstatistikler',   icon: <BarChart2 size={16} /> },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtNumber(n: number): string {
  return n.toLocaleString('tr-TR');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatSkeleton: React.FC = () => (
  <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 animate-pulse">
    <div className="w-6 h-6 rounded bg-gray-800 mb-3" />
    <div className="w-16 h-7 rounded bg-gray-800 mb-2" />
    <div className="w-24 h-3 rounded bg-gray-800" />
  </div>
);

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

// ─── Stats Tab ────────────────────────────────────────────────────────────────

interface StatsTabProps {
  data: DailyUsageItem[];
}

// Tooltip rendered inside the chart — dark-panel themed
const ChartTooltip: React.FC<{ active?: boolean; payload?: { value: number }[]; label?: string }> = ({
  active, payload, label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-0.5">{label}</p>
      <p className="text-white font-bold">{payload[0].value} mesaj</p>
    </div>
  );
};

const StatsTab: React.FC<StatsTabProps> = ({ data }) => {
  const hasData = data.some(d => d.count > 0);

  // Format "2026-04-27" → "27 Nis" for axis labels
  const formatDate = (iso: string): string => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const chartData = data.map(d => ({ ...d, label: formatDate(d.date) }));

  const totalWeek = data.reduce((s, d) => s + d.count, 0);
  const peakDay = data.reduce((max, d) => (d.count > max.count ? d : max), data[0] ?? { date: '-', count: 0 });
  const avgDay = data.length ? Math.round(totalWeek / data.length) : 0;

  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-100">Kullanım İstatistikleri</h2>
        <p className="text-xs text-gray-500 mt-0.5">Son 7 günlük AI mesaj hacmi.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Bu Hafta Toplam', value: fmtNumber(totalWeek), color: 'text-red-400' },
          { label: 'Günlük Ortalama', value: fmtNumber(avgDay), color: 'text-blue-400' },
          {
            label: 'En Yoğun Gün',
            value: peakDay.count > 0 ? `${formatDate(peakDay.date)} (${fmtNumber(peakDay.count)})` : '—',
            color: 'text-yellow-400',
          },
        ].map(card => (
          <div key={card.label} className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/60">
            <p className={`text-xl font-black ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-3 text-gray-600">
            <BarChart2 size={26} />
          </div>
          <p className="text-sm font-semibold text-gray-400 mb-1">Yeterli veri yok</p>
          <p className="text-xs text-gray-600">Son 7 günde henüz AI mesajı bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-gray-800/40 rounded-xl border border-gray-700/60 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Günlük Mesaj Hacmi (son 7 gün)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#6b7280', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#4b5563', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#ef4444', stroke: '#1f2937', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

// ─── Knowledge Base Tab ───────────────────────────────────────────────────────

const EMPTY_FORM: AIKnowledgeBaseCreate = { keywords: [], answer: '', priority: 0, is_active: true };

const KnowledgeBaseTab: React.FC = () => {
  const [entries, setEntries] = useState<AIKnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AIKnowledgeBaseEntry | null>(null);
  const [form, setForm] = useState<AIKnowledgeBaseCreate>(EMPTY_FORM);
  const [keywordInput, setKeywordInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKnowledgeBase();
      setEntries(data);
    } catch {
      setError('Bilgi tabanı yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setKeywordInput('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (entry: AIKnowledgeBaseEntry) => {
    setEditing(entry);
    setForm({ keywords: [...entry.keywords], answer: entry.answer, priority: entry.priority, is_active: entry.is_active });
    setKeywordInput('');
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || form.keywords.includes(kw)) { setKeywordInput(''); return; }
    setForm(f => ({ ...f, keywords: [...f.keywords, kw] }));
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => {
    setForm(f => ({ ...f, keywords: f.keywords.filter(k => k !== kw) }));
  };

  const handleSave = async () => {
    if (form.keywords.length === 0) { setFormError('En az bir anahtar kelime ekleyin.'); return; }
    if (!form.answer.trim()) { setFormError('Cevap boş bırakılamaz.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const updated = await updateKnowledgeBase(editing.id, form);
        setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
      } else {
        const created = await createKnowledgeBase(form);
        setEntries(prev => [created, ...prev]);
      }
      closeModal();
    } catch {
      setFormError('Kaydetme başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteKnowledgeBase(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch {
      setError('Silme işlemi başarısız oldu.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeyword(); }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-100">Knowledge Base</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            AI'nın öncelikli olarak kullandığı özel soru-cevap çiftleri. Yüksek öncelikli kayıtlar önce değerlendirilir.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all"
        >
          <Plus size={14} />
          Yeni Ekle
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-3 text-gray-600">
            <Database size={26} />
          </div>
          <p className="text-sm text-gray-500">Henüz kayıt yok. "Yeni Ekle" ile başlayın.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Anahtar Kelimeler</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cevap Önizleme</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20 text-center">Öncelik</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24 text-center">Durum</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-24 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors ${idx === entries.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {entry.keywords.map(kw => (
                        <span key={kw} className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-medium border border-blue-500/20">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs">
                    <span className="line-clamp-2">{entry.answer}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-gray-300 font-mono font-semibold">{entry.priority}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs font-medium border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700/60 text-gray-500 text-xs font-medium border border-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        title="Sil"
                      >
                        {deletingId === entry.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-gray-900 rounded-2xl border border-gray-700 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-gray-100">
                {editing ? 'Kaydı Düzenle' : 'Yeni Kayıt Ekle'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  <AlertCircle size={13} className="shrink-0" /> {formError}
                </div>
              )}

              {/* Keywords */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Anahtar Kelimeler <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-600 mb-2">Enter veya virgül ile ekleyin. AI bu kelimelerden herhangi biri sorguya dahilse bu kaydı kullanır.</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.keywords.map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs border border-blue-500/20">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-white transition-colors ml-0.5">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                    placeholder="Kelime yaz, Enter'a bas…"
                    className="flex-1 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-600"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium transition-colors"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Answer */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">
                  Cevap <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  rows={5}
                  placeholder="AI'nın vereceği cevabı buraya yazın…"
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-y placeholder-gray-600"
                />
              </div>

              {/* Priority + Active */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Öncelik</label>
                  <p className="text-xs text-gray-600 mb-2">Yüksek sayı = daha önce değerlendirilir.</p>
                  <input
                    type="number"
                    min={0}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Math.max(0, Number(e.target.value)) }))}
                    className="w-28 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Aktif</label>
                  <button
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      form.is_active
                        ? 'bg-green-500/15 border-green-500/30 text-green-400'
                        : 'bg-gray-800 border-gray-700 text-gray-500'
                    }`}
                  >
                    {form.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {form.is_active ? 'Aktif' : 'Pasif'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-60"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Settings Tab ─────────────────────────────────────────────────────────────

const SettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<AISettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [systemPrompt, setSystemPrompt] = useState('');
  const [rateLimit, setRateLimit] = useState<number>(50);

  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAISettings();
      setSettings(data);
      setSystemPrompt(data.system_prompt);
      setRateLimit(data.rate_limit_per_day);
    } catch {
      setError('Ayarlar yüklenemedi. Lütfen sayfayı yenileyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, [load]);

  const isDirty =
    settings !== null &&
    (systemPrompt !== settings.system_prompt || rateLimit !== settings.rate_limit_per_day);

  const handleSave = async () => {
    if (saving || !isDirty) return;
    setSaving(true);
    setSaveStatus('idle');
    setError(null);
    try {
      const updated = await updateAISettings({
        system_prompt: systemPrompt,
        rate_limit_per_day: rateLimit,
      });
      setSettings(updated);
      setSystemPrompt(updated.system_prompt);
      setRateLimit(updated.rate_limit_per_day);
      setSaveStatus('success');
      successTimer.current = setTimeout(() => setSaveStatus('idle'), 3500);
    } catch {
      setSaveStatus('error');
      setError('Kaydetme başarısız oldu. Lütfen tekrar deneyin.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5 animate-pulse">
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-gray-800" />
          <div className="w-full h-96 rounded-lg bg-gray-800" />
        </div>
        <div className="space-y-2">
          <div className="w-40 h-4 rounded bg-gray-800" />
          <div className="w-40 h-9 rounded-lg bg-gray-800" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-100">AI Model Ayarları</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Sistem promptunu ve günlük mesaj limitini buradan yapılandırın. Değişiklikler bir sonraki kullanıcı mesajından itibaren geçerli olur.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Success banner */}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <CheckCircle size={15} className="shrink-0" />
          Ayarlar başarıyla kaydedildi.
        </div>
      )}

      <div className="space-y-6">
        {/* System Prompt */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">
            Sistem Promptu
          </label>
          <p className="text-xs text-gray-600 mb-2">
            AI asistanın davranışını, kısıtlamalarını ve kişiliğini belirleyen temel talimatlar.
            <code className="ml-1 px-1 py-0.5 rounded bg-gray-800 text-gray-400 text-[11px] font-mono">
              {'{user_context_block}'}
            </code>{' '}
            yer tutucusu, her istekte aktif kullanıcının profil bilgileriyle otomatik doldurulur — silmeyin.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-4 py-3 text-sm font-mono leading-relaxed outline-none focus:ring-2 focus:ring-red-500 resize-y min-h-[400px] placeholder-gray-600"
            placeholder="Sistem promptunu buraya yazın…"
          />
          <p className="text-xs text-gray-600 mt-1 text-right">
            {systemPrompt.length} karakter
          </p>
        </div>

        {/* Rate Limit */}
        <div>
          <label className="block text-xs font-semibold text-gray-400 mb-1.5">
            Günlük Mesaj Limiti (kullanıcı başına)
          </label>
          <p className="text-xs text-gray-600 mb-2">
            Her kullanıcının 24 saatte gönderebileceği maksimum mesaj sayısı. Limit devre dışıysa bu değer yine de referans olarak gösterilir.
          </p>
          <input
            type="number"
            min={1}
            max={10000}
            value={rateLimit}
            onChange={(e) => setRateLimit(Math.max(1, Math.min(10000, Number(e.target.value))))}
            className="w-40 rounded-lg border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500"
          />
          <span className="ml-3 text-xs text-gray-600">mesaj / gün</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              isDirty && !saving
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {saving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>

          {isDirty && !saving && (
            <button
              onClick={() => {
                if (settings) {
                  setSystemPrompt(settings.system_prompt);
                  setRateLimit(settings.rate_limit_per_day);
                  setSaveStatus('idle');
                  setError(null);
                }
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Değişiklikleri geri al
            </button>
          )}
        </div>

        {/* Meta note */}
        {settings && (
          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-600">
              <span className="text-gray-500">Son güncelleme:</span>{' '}
              {fmtDateTime(settings.updated_at)}
              {settings.updated_by_username && (
                <>
                  {' '}—{' '}
                  <span className="font-medium text-gray-500">@{settings.updated_by_username}</span>
                </>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const AdminAIPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('settings');
  const [stats, setStats] = useState<AIStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getAIStats();
        if (!cancelled) setStats(data);
      } catch {
        // stats failing silently — cards will just show "—"
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const statCards = [
    {
      label: 'Bugün AI Mesaj',
      value: stats ? fmtNumber(stats.messages_today) : '—',
      icon: <Zap size={18} />,
      color: 'text-yellow-400',
    },
    {
      label: 'Aktif Konuşma (24s)',
      value: stats ? fmtNumber(stats.active_conversations) : '—',
      icon: <Bot size={18} />,
      color: 'text-blue-400',
    },
    {
      label: 'Toplam Konuşma',
      value: stats ? fmtNumber(stats.total_conversations) : '—',
      icon: <BarChart2 size={18} />,
      color: 'text-green-400',
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Bot size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">AI Asistan Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">
          AI model ayarlarını yapılandırın, bilgi tabanını yönetin ve kullanım istatistiklerini inceleyin.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((stat) => (
              <div key={stat.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className={`mb-2 ${stat.color}`}>{stat.icon}</div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((tab) => (
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

      {/* Tab content */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {activeTab === 'settings' && <SettingsTab />}

        {activeTab === 'knowledge' && <KnowledgeBaseTab />}

        {activeTab === 'stats' && (
          <StatsTab data={stats?.daily_usage ?? []} />
        )}
      </div>
    </div>
  );
};
