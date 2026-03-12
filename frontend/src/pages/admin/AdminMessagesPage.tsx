import React, { useState } from 'react';
import { Mail, Inbox, CheckCircle, AlertCircle } from 'lucide-react';

type Tab = 'inbox' | 'resolved' | 'spam';

const tabs = [
  { key: 'inbox' as Tab,    label: 'Gelen Kutusu', icon: <Inbox size={16} /> },
  { key: 'resolved' as Tab, label: 'Çözümlendi',   icon: <CheckCircle size={16} /> },
  { key: 'spam' as Tab,     label: 'Spam',          icon: <AlertCircle size={16} /> },
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

export const AdminMessagesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('inbox');

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Mail size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">İletişim Mesajları</h1>
        </div>
        <p className="text-sm text-gray-500">Kullanıcılardan gelen destek talepleri ve iletişim formlarını yönetin.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Yeni Mesaj',     value: '3',  color: 'text-blue-400'  },
          { label: 'Bekleyen',       value: '8',  color: 'text-amber-400' },
          { label: 'Çözümlendi',     value: '54', color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
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
            {tab.key === 'inbox' && (
              <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">3</span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {activeTab === 'inbox' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-300">Gelen Mesajlar</span>
              <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-semibold">3 yeni</span>
            </div>
            <ComingSoon
              icon={<Inbox size={32} />}
              title="Gelen Kutusu"
              description="Kullanıcıların gönderdiği destek talepleri ve iletişim formlarını buradan yanıtlayabilirsiniz."
            />
          </div>
        )}
        {activeTab === 'resolved' && (
          <ComingSoon
            icon={<CheckCircle size={32} />}
            title="Çözümlenen Mesajlar"
            description="Daha önce yanıtlanmış ve çözüme kavuşturulmuş mesajlar."
          />
        )}
        {activeTab === 'spam' && (
          <ComingSoon
            icon={<AlertCircle size={32} />}
            title="Spam Mesajlar"
            description="Spam olarak işaretlenen mesajlar burada listelenir."
          />
        )}
      </div>
    </div>
  );
};
