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
  { key: 'knowledge' as Tab, label: 'Bilgi Tabanı',    icon: <Database size={16} /> },
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
  <div className="bg-white rounded-[2rem] p-5 border border-slate-100/50 animate-pulse">
    <div className="w-6 h-6 rounded-full bg-slate-150 mb-3 animate-pulse" />
    <div className="w-16 h-7 rounded bg-slate-150 mb-2 animate-pulse" />
    <div className="w-24 h-3 rounded bg-slate-100 animate-pulse" />
  </div>
);

// ─── Stats Tab ────────────────────────────────────────────────────────────────

interface StatsTabProps {
  data: DailyUsageItem[];
}

const ChartTooltip: React.FC<{ active?: boolean; payload?: { value: number }[]; label?: string }> = ({
  active, payload, label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-slate-400 mb-0.5 font-medium">{label}</p>
      <p className="text-slate-900 font-extrabold">{payload[0].value} mesaj</p>
    </div>
  );
};

const StatsTab: React.FC<StatsTabProps> = ({ data }) => {
  const hasData = data.some(d => d.count > 0);

  const formatDate = (iso: string): string => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const chartData = data.map(d => ({ ...d, label: formatDate(d.date) }));

  const totalWeek = data.reduce((s, d) => s + d.count, 0);
  const peakDay = data.reduce((max, d) => (d.count > max.count ? d : max), data[0] ?? { date: '-', count: 0 });
  const avgDay = data.length ? Math.round(totalWeek / data.length) : 0;

  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">Kullanım İstatistikleri</h2>
        <p className="text-xs text-slate-400 mt-0.5">Son 7 günlük AI mesaj hacmi.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Bu Hafta Toplam', value: fmtNumber(totalWeek), color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
          { label: 'Günlük Ortalama', value: fmtNumber(avgDay), color: 'text-sky-600 bg-sky-50 border-sky-100' },
          {
            label: 'En Yoğun Gün',
            value: peakDay.count > 0 ? `${formatDate(peakDay.date)} (${fmtNumber(peakDay.count)})` : '—',
            color: 'text-amber-600 bg-amber-50 border-amber-100',
          },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl p-5 border ${card.color} font-semibold`}>
            <p className="text-2xl font-black">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-bold">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <BarChart2 size={26} />
          </div>
          <p className="text-sm font-semibold text-slate-450 mb-1">Yeterli veri yok</p>
          <p className="text-xs text-slate-400">Son 7 günde henüz AI mesajı bulunmuyor.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
            Günlük Mesaj Hacmi (son 7 gün)
          </p>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0284c7"
                strokeWidth={2}
                fill="url(#areaGrad)"
                dot={{ r: 3, fill: '#0284c7', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
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
    if (!window.confirm('Bu bilgi kaydını silmek istediğinize emin misiniz?')) return;
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
      <div className="p-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded-xl bg-slate-50 border border-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Bilgi Tabanı (Knowledge Base)</h2>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xl">
            AI'nın öncelikli olarak kullandığı özel soru-cevap çiftleri. Yüksek öncelikli kayıtlar önce değerlendirilir.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md shadow-sky-500/10"
        >
          <Plus size={14} />
          Yeni Ekle
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-650 text-xs font-semibold">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <Database size={26} />
          </div>
          <p className="text-sm text-slate-400 font-semibold">Henüz kayıt yok. "Yeni Ekle" ile başlayın.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left">
                <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-widest">Anahtar Kelimeler</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-widest">Cevap Önizleme</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-widest w-20 text-center">Öncelik</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-widest w-24 text-center">Durum</th>
                <th className="px-5 py-3 text-xs font-bold text-slate-450 uppercase tracking-widest w-24 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-slate-50/30 transition-colors"
                >
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {entry.keywords.map(kw => (
                        <span key={kw} className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 text-xs font-bold border border-sky-100 shadow-sm">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600 max-w-xs">
                    <span className="line-clamp-2 leading-relaxed">{entry.answer}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="text-slate-700 font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{entry.priority}</span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    {entry.is_active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-55 bg-slate-100 text-slate-500 text-xs font-bold border border-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Pasif
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Düzenle"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 transition-colors disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="absolute inset-0 bg-transparent" onClick={closeModal} />
          <div className="relative bg-white rounded-[2.5rem] border border-slate-100 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? 'Bilgi Kaydını Düzenle' : 'Yeni Bilgi Kaydı Ekle'}
              </h3>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-450 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
                  <AlertCircle size={13} className="shrink-0" /> {formError}
                </div>
              )}

              {/* Keywords */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Anahtar Kelimeler <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-400 mb-2 leading-relaxed">Enter veya virgül ile ekleyin. Sorguda bu kelimelerden biri geçerse AI bu kaydı kullanır.</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.keywords.map(kw => (
                    <span key={kw} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 text-xs font-bold border border-sky-100 shadow-sm">
                      {kw}
                      <button onClick={() => removeKeyword(kw)} className="hover:text-sky-900 transition-colors ml-1 font-bold">
                        <X size={11} />
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
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-sky-500 placeholder-slate-400 font-medium"
                  />
                  <button
                    onClick={addKeyword}
                    className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-650 hover:bg-slate-200 hover:text-slate-800 text-xs font-bold transition-colors"
                  >
                    Ekle
                  </button>
                </div>
              </div>

              {/* Answer */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                  Cevap İçeriği <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.answer}
                  onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                  rows={5}
                  placeholder="AI'nın vereceği cevabı buraya yazın…"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 px-4 py-3 text-sm outline-none focus:bg-white focus:border-sky-500 resize-y placeholder-slate-400 font-medium"
                />
              </div>

              {/* Priority + Active */}
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Öncelik Sırası</label>
                  <p className="text-xs text-slate-400 mb-2">Yüksek sayı = daha önce değerlendirilir.</p>
                  <input
                    type="number"
                    min={0}
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: Math.max(0, Number(e.target.value)) }))}
                    className="w-28 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-sky-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Yayın Durumu</label>
                  <button
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      form.is_active
                        ? 'bg-green-50 border-green-100 text-green-600'
                        : 'bg-slate-55 bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  >
                    {form.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    {form.is_active ? 'Aktif' : 'Pasif'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <button onClick={closeModal} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors">
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all disabled:opacity-60 shadow-md shadow-sky-500/10"
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
      <div className="p-8 space-y-5 animate-pulse">
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-slate-100" />
          <div className="w-full h-96 rounded-xl bg-slate-50 border border-slate-100" />
        </div>
        <div className="space-y-2">
          <div className="w-40 h-4 rounded bg-slate-100" />
          <div className="w-40 h-9 rounded-xl bg-slate-50 border border-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900">AI Model Ayarları</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Sistem promptunu ve günlük mesaj limitini buradan yapılandırın. Değişiklikler bir sonraki kullanıcı mesajından itibaren geçerli olur.
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* Success banner */}
      {saveStatus === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-100 text-green-600 text-xs font-semibold animate-in fade-in duration-200">
          <CheckCircle size={15} className="shrink-0" />
          Ayarlar başarıyla kaydedildi.
        </div>
      )}

      <div className="space-y-6">
        {/* System Prompt */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Sistem Promptu
          </label>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI asistanın davranışını, kısıtlamalarını ve kişiliğini belirleyen temel talimatlar.
            <code className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono font-bold">
              {'{user_context_block}'}
            </code>{' '}
            yer tutucusu, her istekte aktif kullanıcının profil bilgileriyle otomatik doldurulur — silmeyin.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={15}
            spellCheck={false}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 text-slate-850 px-4 py-3 text-xs font-mono leading-relaxed outline-none focus:bg-white focus:border-sky-500 resize-y min-h-[350px] placeholder-slate-400"
            placeholder="Sistem promptunu buraya yazın…"
          />
          <p className="text-[10px] text-slate-400 font-bold text-right">
            {systemPrompt.length.toLocaleString('tr-TR')} karakter
          </p>
        </div>

        {/* Rate Limit */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
            Günlük Mesaj Limiti (kullanıcı başına)
          </label>
          <p className="text-xs text-slate-400">
            Her kullanıcının 24 saatte gönderebileceği maksimum mesaj sayısı.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={10000}
              value={rateLimit}
              onChange={(e) => setRateLimit(Math.max(1, Math.min(10000, Number(e.target.value))))}
              className="w-40 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-sky-500 font-bold"
            />
            <span className="text-xs font-bold text-slate-550">mesaj / gün</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isDirty && !saving
                ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-500/10'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
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
              className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              Değişiklikleri geri al
            </button>
          )}
        </div>

        {/* Meta note */}
        {settings && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              <span>Son güncelleme:</span>{' '}
              <span className="text-slate-500">{fmtDateTime(settings.updated_at)}</span>
              {settings.updated_by_username && (
                <>
                  {' '}—{' '}
                  <span className="text-sky-600">@{settings.updated_by_username}</span>
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
        // stats failing silently
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
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Aktif Konuşma (24s)',
      value: stats ? fmtNumber(stats.active_conversations) : '—',
      icon: <Bot size={18} />,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
    },
    {
      label: 'Toplam Konuşma',
      value: stats ? fmtNumber(stats.total_conversations) : '—',
      icon: <BarChart2 size={18} />,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Bot size={22} className="text-sky-600 animate-pulse" />
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">AI Asistan Yönetimi</h1>
        </div>
        <p className="text-sm text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          AI model ayarlarını yapılandırın, bilgi tabanını yönetin ve kullanım istatistiklerini inceleyin.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statsLoading
          ? Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((stat) => (
              <div key={stat.label} className={`border rounded-[2.5rem] p-6 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-sky-200/10 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 ${stat.color}`}>
                <div className="p-3.5 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">
                  {stat.icon}
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              </div>
            ))}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-white p-1 rounded-xl border border-slate-100 shadow-sm w-fit">
        {TABS.map((tab) => (
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

      {/* Tab content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100/50 shadow-xl shadow-slate-200/40 overflow-hidden">
        {activeTab === 'settings' && <SettingsTab />}

        {activeTab === 'knowledge' && <KnowledgeBaseTab />}

        {activeTab === 'stats' && (
          <StatsTab data={stats?.daily_usage ?? []} />
        )}
      </div>
    </div>
  );
};
