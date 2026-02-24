import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>(); 
  const { user: currentUser } = useAuth(); 
  const [otherUserData, setOtherUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'listings' | 'favorites'>('info');

  // 1. MANTIK: URL'deki isim boşsa veya senin isminle aynıysa "Kendi Profilim"dir
  const isOwnProfile = !username || username === currentUser?.username;

  // 2. VERİ KAYNAĞI: Kendi profilimse currentUser'ı kullan, başkasıysa çekilen veriyi
  const profileData = isOwnProfile ? currentUser : otherUserData;

  useEffect(() => {
    const fetchOtherProfile = async () => {
      if (isOwnProfile) {
        setOtherUserData(null); // Kendi profilimize döndüğümüzde eskiyi temizle
        return;
      }
      
      setLoading(true);
      try {
        const response = await axios.get(`http://localhost:8000/api/v1/users/profile/${username}`);
        setOtherUserData(response.data);
      } catch (err) {
        console.error("Profil çekilemedi:", err);
        setOtherUserData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOtherProfile();
  }, [username, isOwnProfile]); // URL değişimini takip et

  if (loading) return <MainLayout><div className="p-20 text-center">Yükleniyor...</div></MainLayout>;
  
  // profileData yoksa (ve isOwnProfile değilse) hata göster
  if (!profileData) return <MainLayout><div className="p-20 text-center text-red-500 font-bold">Kullanıcı bulunamadı!</div></MainLayout>;

  // İlk halindeki UI yapısı
  return (
    <MainLayout>
      <div className="w-full px-6 md:px-12 py-10 bg-gray-50/50 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-10">
            {isOwnProfile ? "👤 Profilim" : `👤 ${profileData.first_name}'in Profili`}
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 text-center">
                <div className="flex justify-center mb-6">
                  <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-orange-400 border-4 border-white shadow-lg">
                    {profileData.first_name?.[0]}{profileData.last_name?.[0]}
                  </div>
                </div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">
                  {profileData.first_name} {profileData.last_name}
                </h2>
                <p className="text-indigo-600 font-semibold text-sm mt-1">@{profileData.username}</p>
              </div>
              
              <nav className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-3 space-y-1">
                <button onClick={() => setActiveTab('info')} className={`w-full text-left px-6 py-4 rounded-2xl transition-all ${activeTab === 'info' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500'}`}>📊 Bilgiler</button>
                {isOwnProfile && <button onClick={() => setActiveTab('favorites')} className={`w-full text-left px-6 py-4 rounded-2xl transition-all ${activeTab === 'favorites' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-500'}`}>❤️ Favorilerim</button>}
              </nav>
            </div>

            <div className="lg:col-span-3 bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <InfoField label="Ad Soyad" value={`${profileData.first_name} ${profileData.last_name}`} />
                  <InfoField label="Üniversite" value={profileData.university} />
                  <InfoField label="Bölüm" value={profileData.department_rel?.name || profileData.department} />
                </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

const InfoField = ({ label, value }: { label: string; value?: string }) => (
  <div className="space-y-1">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="px-5 py-4 bg-gray-50/50 border border-gray-100 rounded-2xl text-gray-900 font-medium">{value || 'Belirtilmemiş'}</div>
  </div>
);