import React, { useState } from 'react';
import { Users, UserCheck, UserX, Search } from 'lucide-react';

type Tab = 'all' | 'verified' | 'banned';

const tabs = [
  { key: 'all' as Tab,      label: 'Tüm Kullanıcılar',     icon: <Users size={16} /> },
  { key: 'verified' as Tab, label: 'Doğrulanmış',           icon: <UserCheck size={16} /> },
  { key: 'banned' as Tab,   label: 'Engellenenler',         icon: <UserX size={16} /> },
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

export const AdminUsersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Users size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">Kullanıcı Yönetimi</h1>
        </div>
        <p className="text-sm text-gray-500">Kayıtlı kullanıcıları görüntüleyin, hesap durumlarını yönetin.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Toplam Kullanıcı',   value: '1,247', color: 'text-blue-400'   },
          { label: 'Doğrulanmış',         value: '1,189', color: 'text-green-400'  },
          { label: 'Doğrulanmamış',       value: '58',    color: 'text-amber-400'  },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Tabs */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex gap-1 bg-gray-900 p-1 rounded-xl">
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

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Kullanıcı ara..."
            className="bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-red-500 w-64"
          />
        </div>
      </div>

      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <ComingSoon
          icon={<Users size={32} />}
          title="Kullanıcı Listesi"
          description="Tüm kayıtlı kullanıcıları burada listeleyip yönetebilirsiniz. Email doğrulama durumu, rol değiştirme ve hesap engelleme işlemleri yakında."
        />
      </div>
    </div>
  );
};
