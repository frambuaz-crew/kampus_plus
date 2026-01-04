/**
 * Profile Page
 * 
 * Spec: 010-profile/spec.md
 * 
 * Kullanıcı profil sayfası
 */

import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';

export const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'info' | 'about' | 'listings' | 'forum' | 'applications'>('info');

  const getUserColor = (userId: string): string => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#FFD93D', '#6BCB77', '#A8DADC'
    ];
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getProfileAvatar = () => {
    if (user?.profile_picture_url) {
      return (
        <img
          src={user.profile_picture_url}
          alt={`${user.first_name} ${user.last_name}`}
          className="w-24 h-24 rounded-full object-cover"
        />
      );
    }
    
    const initials = `${user?.first_name?.charAt(0) || ''}${user?.last_name?.charAt(0) || ''}`.toUpperCase();
    const bgColor = user?.id ? getUserColor(user.id) : '#4ECDC4';
    
    return (
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-white text-2xl font-bold"
        style={{ backgroundColor: bgColor }}
      >
        {initials}
      </div>
    );
  };

  const tabs = [
    { id: 'info' as const, label: '📊 Profil Bilgi', icon: '📊' },
    { id: 'about' as const, label: '📝 Hakkımda', icon: '📝' },
    { id: 'listings' as const, label: '🛍️ İlanlarım', icon: '🛍️' },
    { id: 'forum' as const, label: '💬 Forum', icon: '💬' },
    { id: 'applications' as const, label: '💼 Başvurularım', icon: '💼' },
  ];

  return (
    <MainLayout>
      <div className="w-full px-8 xl:px-16 py-8">
        <div className="max-w-[1920px] mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="mr-3">👤</span>
            Profilim
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="text-center mb-6">
                  {getProfileAvatar()}
                  <p className="mt-4 font-semibold text-gray-900">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-sm text-gray-600">@{user?.email?.split('@')[0]}</p>
                </div>
                
                <div className="space-y-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        activeTab === tab.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm p-8">
                {activeTab === 'info' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Profil Bilgileri</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
                        <p className="text-gray-900">{user?.first_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                        <p className="text-gray-900">{user?.last_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-gray-900">{user?.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Üniversite</label>
                        <p className="text-gray-900">{user?.university || 'Belirtilmemiş'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bölüm</label>
                        <p className="text-gray-900">{user?.department || 'Belirtilmemiş'}</p>
                      </div>
                      <button className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
                        Düzenle
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'about' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Hakkımda</h2>
                    <p className="text-gray-600">Hakkımda özelliği yakında eklenecek.</p>
                  </div>
                )}

                {activeTab === 'listings' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">İlanlarım</h2>
                    <p className="text-gray-600">İlanlarım özelliği yakında eklenecek.</p>
                  </div>
                )}

                {activeTab === 'forum' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Forum Aktivitelerim</h2>
                    <p className="text-gray-600">Forum aktiviteleri özelliği yakında eklenecek.</p>
                  </div>
                )}

                {activeTab === 'applications' && (
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Başvurularım</h2>
                    <p className="text-gray-600">Başvurularım özelliği yakında eklenecek.</p>
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

