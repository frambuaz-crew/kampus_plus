import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  console.log("Şu anki kullanıcı verisi:", user);
  const [activeTab, setActiveTab] = useState<'info' | 'about' | 'listings' | 'forum' | 'applications'>('info');

  // Dinamik Avatar Oluşturma
  const getProfileAvatar = () => {
    if (user?.profile_picture_url) {
      return (
        <img
          src={user.profile_picture_url}
          alt={`${user.first_name} ${user.last_name}`}
          className="w-28 h-28 rounded-full object-cover border-4 border-white shadow-lg"
        />
      );
    }
    
    const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
    
    return (
      <div className="w-28 h-28 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-orange-400 shadow-lg shadow-orange-100 border-4 border-white">
        {initials}
      </div>
    );
  };

  const tabs = [
    { id: 'info' as const, label: 'Profil Bilgi', icon: '📊' },
    { id: 'about' as const, label: 'Hakkımda', icon: '📝' },
    { id: 'listings' as const, label: 'İlanlarım', icon: '🛍️' },
    { id: 'forum' as const, label: 'Forum', icon: '💬' },
    { id: 'applications' as const, label: 'Başvurularım', icon: '💼' },
  ];

  return (
    <MainLayout>
      <div className="w-full px-6 md:px-12 py-10 bg-gray-50/50 min-h-[calc(100vh-64px)]">
        <div className="max-w-6xl mx-auto">
          {/* Başlık */}
          <h1 className="text-3xl font-extrabold text-gray-900 mb-10 flex items-center">
            <span className="mr-4 p-2 bg-white rounded-2xl shadow-sm">👤</span>
            Profilim
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* --- Sidebar --- */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profil Kartı */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 text-center">
                <div className="flex justify-center mb-6">
                  {getProfileAvatar()}
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {user?.first_name} {user?.last_name}
                </h2>
                <p className="text-indigo-600 font-semibold text-sm mt-1">
                  @{user?.username}
                </p>
              </div>
              
              {/* Tab Menüsü */}
              <nav className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-3 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className="text-sm">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* --- Main Content Area --- */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10 min-h-[600px]">
                {activeTab === 'info' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-10">
                      <h2 className="text-2xl font-bold text-gray-900">Profil Bilgileri</h2>
                      <button className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-colors font-bold text-sm">
                        <span>✏️</span>
                        <span>Düzenle</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                      <InfoField label="Ad" value={user?.first_name} />
                      <InfoField label="Soyad" value={user?.last_name} />
                      <InfoField label="Email Adresi" value={user?.email} className="md:col-span-2" />
                      <InfoField label="Üniversite" value={user?.university || 'Selçuk Üniversitesi'} />
                      <InfoField label="Bölüm" value={user?.department || 'Belirtilmemiş'} />
                    </div>
                  </div>
                )}

                {/* Diğer tab içerikleri (About, Listings vb.) buraya gelecek */}
                {activeTab !== 'info' && (
                   <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                     <div className="text-5xl opacity-20">🚀</div>
                     <h3 className="text-xl font-bold text-gray-400">Yakında Gelecek</h3>
                     <p className="text-gray-400 max-w-xs text-sm">Bu bölüm üzerinde şu an çalışıyoruz. Takipte kalın!</p>
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

// Yardımcı Alt Bileşen - GÜNCELLENDİ 🚀
const InfoField = ({ label, value, className = "" }: { label: string; value?: string | { name?: string } | null; className?: string }) => {
  // Eğer gelen değer bir nesne ise (Department objesi gibi), içindeki 'name' alanını alıyoruz.
  // Eğer düz metin (string) ise direkt kendisini kullanıyoruz.
  const displayValue = (value && typeof value === 'object') ? value.name : value;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      <div className="w-full px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-900 font-medium text-lg">
        {displayValue || 'Belirtilmemiş'}
      </div>
    </div>
  );
};