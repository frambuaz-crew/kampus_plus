import React, { useState } from 'react';
import { MessageSquare, Flag, Pin, Trash2 } from 'lucide-react';

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
        {activeTab === 'reports' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag size={16} className="text-red-400" />
                <span className="text-sm font-semibold text-gray-300">Raporlanan İçerikler</span>
              </div>
              <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-semibold">7 rapor</span>
            </div>
            <ComingSoon
              icon={<Flag size={32} />}
              title="İçerik Moderasyonu"
              description="Kullanıcıların raporladığı konu ve yanıtları buradan inceleyip işlem yapabilirsiniz."
            />
          </div>
        )}
        {activeTab === 'topics' && (
          <ComingSoon
            icon={<MessageSquare size={32} />}
            title="Konu Yönetimi"
            description="Tüm forum konularını listeleyin, sabitleyin veya silin."
          />
        )}
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
