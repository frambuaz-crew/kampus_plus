import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Settings, Database, BarChart2, Zap, Save, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import {
  getAIStats,
  getAISettings,
  updateAISettings,
  type AISettingsResponse,
  type AIStatsResponse,
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

        {activeTab === 'knowledge' && (
          <ComingSoon
            icon={<Database size={32} />}
            title="Knowledge Base"
            description="AI'nin kullandığı dokümanları yükleyin, güncelleyin veya silin."
          />
        )}

        {activeTab === 'stats' && (
          <ComingSoon
            icon={<BarChart2 size={32} />}
            title="Kullanım İstatistikleri"
            description="Günlük, haftalık ve aylık AI kullanım istatistiklerini grafik olarak görüntüleyin."
          />
        )}
      </div>
    </div>
  );
};
