import React, { useState } from 'react';
import { GraduationCap, Calendar, BookOpen, Clock, CheckCircle, XCircle, FileText } from 'lucide-react';

type Tab = 'pending' | 'schedule' | 'calendar';

const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: 'pending',  label: 'Bekleyen Katkılar',    icon: <Clock size={16} /> },
  { key: 'schedule', label: 'Ders Programı',         icon: <BookOpen size={16} /> },
  { key: 'calendar', label: 'Akademik Takvim',       icon: <Calendar size={16} /> },
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

export const AdminAcademicPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <GraduationCap size={22} className="text-red-500" />
          <h1 className="text-2xl font-black text-white tracking-tight">Akademik Yönetim</h1>
        </div>
        <p className="text-sm text-gray-500">Ders programları, akademik takvim ve öğrenci katkılarını yönetin.</p>
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        {activeTab === 'pending' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-400" />
                <span className="text-sm font-semibold text-gray-300">Onay Bekleyen Katkılar</span>
              </div>
              <span className="text-xs bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full font-semibold">12 bekliyor</span>
            </div>
            <ComingSoon
              icon={<CheckCircle size={32} />}
              title="Katkı Onay Sistemi"
              description="Öğrencilerin gönderdiği ders programı ve akademik takvim katkılarını buradan onaylayabilir veya reddedebilirsiniz."
            />
          </div>
        )}
        {activeTab === 'schedule' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-800">
              <span className="text-sm font-semibold text-gray-300">Ders Programı Yönetimi</span>
            </div>
            <ComingSoon
              icon={<BookOpen size={32} />}
              title="Ders Programı Yönetimi"
              description="Üniversite ve bölüm bazlı ders programlarını ekleyin, düzenleyin veya silin."
            />
          </div>
        )}
        {activeTab === 'calendar' && (
          <div>
            <div className="px-6 py-4 border-b border-gray-800">
              <span className="text-sm font-semibold text-gray-300">Akademik Takvim Yönetimi</span>
            </div>
            <ComingSoon
              icon={<Calendar size={32} />}
              title="Akademik Takvim Yönetimi"
              description="Sınav tarihleri, kayıt dönemleri ve tatil günlerini üniversite bazlı ekleyin."
            />
          </div>
        )}
      </div>
    </div>
  );
};
