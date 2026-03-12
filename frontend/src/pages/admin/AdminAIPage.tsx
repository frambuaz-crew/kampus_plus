import React, { useState } from 'react';
import { Bot, Settings, Database, BarChart2, Zap } from 'lucide-react';

type Tab = 'settings' | 'knowledge' | 'stats';

const tabs = [
  { key: 'settings' as Tab,   label: 'Ayarlar',       icon: <Settings size={16} /> },
  { key: 'knowledge' as Tab,  label: 'Knowledge Base', icon: <Database size={16} /> },
  { key: 'stats' as Tab,      label: 'İstatistikler', icon: <BarChart2 size={16} /> },
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

export const AdminAIPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('settings');

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Bot size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">AI Asistan Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">AI model ayarlarını yapılandırın, bilgi tabanını yönetin ve kullanım istatistiklerini inceleyin.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Bugün AI Mesaj', value: '2,543', icon: <Zap size={18} />, color: 'text-yellow-400' },
          { label: 'Aktif Konuşma',  value: '87',    icon: <Bot size={18} />,  color: 'text-blue-400'   },
          { label: 'Ort. Yanıt (s)', value: '1.2',   icon: <BarChart2 size={18} />, color: 'text-green-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className={`mb-2 ${stat.color}`}>{stat.icon}</div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
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
        {activeTab === 'settings' && (
          <ComingSoon
            icon={<Settings size={32} />}
            title="AI Model Ayarları"
            description="Sistem promptunu, temperature ve token limitlerini buradan yapılandırabilirsiniz."
          />
        )}
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
