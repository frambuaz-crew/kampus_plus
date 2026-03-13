import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../api/config';
import { getImageUrl } from '../utils/imageUrl';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { sendRequest } from '../api/friendship';

// Tab ve Liste Tipleri
type TabType = 'info' | 'activity' | 'favorites';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  created_at: string;
  status: string;
}

interface FavoriteItem {
  favorite_id: string;
  target_type: string;
  target_id: string;
  favorited_at: string;
  title?: string;
  status?: string;
  price?: string;
  image?: string;
}

interface ProfileData {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  university?: string;
  department?: string;
  profile_picture_url?: string | null;
  bio?: string | null;
  created_at: string;
}

interface ProfileLocationState {
  tab?: TabType;
}

export const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser, updateUser } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const locationState = (location.state as ProfileLocationState | null) || null;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(locationState?.tab || 'info');

  useEffect(() => {
    if (locationState?.tab) {
      setActiveTab(locationState.tab);
    }
  }, [locationState?.tab]);

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Düzenleme State'leri
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    profile_picture_url: ''
  });

  // Profil Fotoğrafı Kırpma State'leri
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/jpeg');
    });
  };

  // URL'deki isim boşsa veya senin isminle aynıysa "Kendi Profilim"dir
  const isOwnProfile = !username || username === currentUser?.username;
  const targetUsername = isOwnProfile ? currentUser?.username : username;

  // Arkadaşlık isteği state'i
  const [friendRequestStatus, setFriendRequestStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetUsername) return;

      setLoading(true);
      try {
        // 1. Profil Bilgileri
        const userRes = await apiClient.get(`/users/profile/${targetUsername}`);
        setProfileData(userRes.data);

        // Düzenleme formu için başlangıç değerleri
        if (isOwnProfile) {
          setEditForm({
            bio: userRes.data.bio || '',
            profile_picture_url: userRes.data.profile_picture_url || ''
          });
        }

        // 2. Paylaşımlar (Aktiviteler)
        const actRes = await apiClient.get(`/users/${targetUsername}/activity`);
        setActivities(actRes.data.activities || []);

        // 3. Favoriler (Sadece Kendi Profiliyse)
        if (isOwnProfile) {
          const token = localStorage.getItem('access_token');
          if (token) {
            const favRes = await apiClient.get(`/users/favorites/all`);
            setFavorites(favRes.data.favorites || []);
          }
        }

      } catch (err) {
        console.error("Profil verisi çekilemedi:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [targetUsername, isOwnProfile]);

  const handleSendFriendRequest = async () => {
    if (!profileData) return;
    setFriendRequestStatus('sending');
    try {
      await sendRequest(profileData.id);
      setFriendRequestStatus('sent');
    } catch {
      setFriendRequestStatus('error');
      setTimeout(() => setFriendRequestStatus('idle'), 3000);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.put(`/users/profile`, editForm);
      // UI güncelle
      setProfileData((prev) => (prev ? { ...prev, ...editForm } : prev));
      // Auth context'i güncelle (navbar'a vb. anında yansıması için)
      updateUser({ bio: editForm.bio, profile_picture_url: editForm.profile_picture_url });

      setIsEditing(false);
      alert("Profil başarıyla güncellendi.");
    } catch (error) {
      console.error("Profil güncellenirken hata:", error);
      alert("Hata oluştu.");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setSelectedImageSrc(reader.result?.toString() || null));
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarCropSave = async () => {
    if (!selectedImageSrc || !croppedAreaPixels) return;

    try {
      setIsUploading(true);
      const blob = await getCroppedImg(selectedImageSrc, croppedAreaPixels);
      if (!blob) throw new Error("Kırpma işlemi başarısız.");

      const formData = new FormData();
      formData.append("file", blob, "avatar.jpg");

      const response = await apiClient.post(`/users/profile/picture`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      const newPicUrl = response.data.profile_picture_url;
      setProfileData((prev) => (prev ? { ...prev, profile_picture_url: newPicUrl } : prev));
      updateUser({ profile_picture_url: newPicUrl });

      setSelectedImageSrc(null);
    } catch (error) {
      console.error("Fotoğraf yükleme hatası:", error);
      alert("Fotoğraf yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) return <MainLayout><div className="flex items-center justify-center min-h-screen"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div></MainLayout>;
  if (!profileData) return <MainLayout><div className="p-20 text-center text-red-500 font-bold text-2xl">Kullanıcı bulunamadı!</div></MainLayout>;

  return (
    <MainLayout>
      <div className="w-full bg-gray-50/30 min-h-screen pb-20 pt-10">

        {/* ANA İÇERİK KONTEYNERİ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

          {/* PROFİL KARTI (ÜST) */}
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-6 md:p-10 mb-8 border border-white mt-10">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-8 mb-6">

              {/* Profil Fotoğrafı */}
              <div className="relative group">
                <input
                  type="file"
                  id="avatarUpload"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor={isOwnProfile && !isEditing ? "avatarUpload" : undefined}
                  className={`w-32 h-32 md:w-36 md:h-36 rounded-[2rem] overflow-hidden bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-indigo-200/50 relative border-4 border-white ${isOwnProfile && !isEditing ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
                >
                  {profileData.profile_picture_url ? (
                    <img
                      src={getImageUrl(profileData.profile_picture_url)}
                      className="w-full h-full object-cover"
                      alt="Profile"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <>{profileData.first_name?.[0]}{profileData.last_name?.[0]}</>
                  )}
                  {isOwnProfile && !isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-2xl mb-1">📸</span>
                      <span className="text-xs font-bold text-center px-2">{isUploading ? 'Yükleniyor...' : 'Fotoğraf Değiştir'}</span>
                    </div>
                  )}
                </label>
              </div>

              {/* İsim ve Başlık */}
              <div className="flex-1 text-center md:text-left pt-4 md:pt-0">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
                  {profileData.first_name} {profileData.last_name}
                </h1>
                <div className="flex items-center justify-center md:justify-start gap-4 mt-3 text-sm font-semibold text-gray-500 uppercase tracking-widest">
                  <span className="flex items-center gap-1">🎓 {profileData.university}</span>
                  <span className="flex items-center gap-1">📚 {profileData.department}</span>
                </div>
              </div>

              {/* Aksiyon Butonları (Sağ) */}
              <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0 flex-wrap">
                {!isOwnProfile ? (
                  <>
                    <button
                      onClick={() => navigate('/dashboard/messages')}
                      className="flex-1 md:flex-none px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                      💬 Mesaj Gönder
                    </button>
                    <button
                      onClick={handleSendFriendRequest}
                      disabled={friendRequestStatus === 'sending' || friendRequestStatus === 'sent'}
                      className={`flex-1 md:flex-none px-6 py-3 font-bold rounded-2xl shadow-lg transition-all active:scale-95 ${
                        friendRequestStatus === 'sent'
                          ? 'bg-emerald-500 text-white shadow-emerald-200 cursor-default'
                          : friendRequestStatus === 'error'
                          ? 'bg-red-100 text-red-600 shadow-none'
                          : 'bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-indigo-100'
                      }`}
                    >
                      {friendRequestStatus === 'sending' && (
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                          Gönderiliyor...
                        </span>
                      )}
                      {friendRequestStatus === 'sent' && '✓ İstek Gönderildi'}
                      {friendRequestStatus === 'error' && '✕ Hata oluştu'}
                      {(friendRequestStatus === 'idle') && '👤+ Arkadaş Ekle'}
                    </button>
                  </>
                ) : (
                  !isEditing && (
                    <button onClick={() => setIsEditing(true)} className="flex-1 md:flex-none px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95">
                      Profili Düzenle
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Biyografi ve İstatistikler */}
            {!isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-gray-100">
                <div className="md:col-span-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Hakkımda</h3>
                  <p className="text-gray-700 text-base leading-relaxed">
                    {profileData.bio ? profileData.bio : "Henüz bir biyografi eklenmemiş. Gizemli biri! 🕵️"}
                  </p>
                </div>
                <div className="md:col-span-1 flex justify-around md:justify-end gap-6 md:gap-10">
                  <div className="text-center group">
                    <div className="text-3xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{activities.length}</div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Paylaşım</div>
                  </div>
                  {isOwnProfile && (
                    <div className="text-center group">
                      <div className="text-3xl font-black text-gray-900 group-hover:text-pink-600 transition-colors">{favorites.length}</div>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Favori</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DÜZENLEME FORMU KARTI */}
          {isEditing && (
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 p-8 md:p-12 mb-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                <h3 className="text-2xl font-black text-gray-900">Profili Düzenle</h3>
                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-900 font-bold transition-colors">✕ Kapat</button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-6 max-w-2xl mx-auto">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Biyografi (Hakkımda)</label>
                  <textarea
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all resize-none text-gray-700"
                    rows={4}
                    placeholder="Kendinizden, ilgi alanlarınızdan bahsedin..."
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">Profil Fotoğrafı URL</label>
                  <input
                    type="url"
                    className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-gray-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-gray-700"
                    placeholder="https://example.com/photo.jpg"
                    value={editForm.profile_picture_url}
                    onChange={(e) => setEditForm({ ...editForm, profile_picture_url: e.target.value })}
                  />
                  <p className="text-xs text-gray-400 mt-2 font-medium">Şimdilik sadece resim linki yapıştırarak fotoğraf ekleyebilirsiniz.</p>
                </div>
                <div className="flex justify-end gap-4 pt-6">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-8 py-3.5 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition-all">İptal</button>
                  <button type="submit" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-200 transition-all active:scale-95">Değişiklikleri Kaydet ✓</button>
                </div>
              </form>
            </div>
          )}

          {/* İÇERİK SEKMELERİ (GLASMORPHISM & PİLLER) */}
          {!isEditing && (
            <>
              <div className="flex justify-center md:justify-start gap-2 mb-8 p-1 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 w-fit mx-auto md:mx-0">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'info' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/80'}`}
                >
                  Bilgiler
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-8 py-3 rounded-xl font-bold transition-all ${activeTab === 'activity' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-white/80'}`}
                >
                  Paylaşımlar
                </button>
                {isOwnProfile && (
                  <button
                    onClick={() => setActiveTab('favorites')}
                    className={`px-8 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${activeTab === 'favorites' ? 'bg-pink-500 text-white shadow-md shadow-pink-200' : 'text-gray-500 hover:text-pink-600 hover:bg-white/80'}`}
                  >
                    Favoriler
                  </button>
                )}
              </div>

              {/* SEKME İÇERİKLERİ */}
              <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">

                {/* BİLGİLER SEKMESİ */}
                {activeTab === 'info' && (
                  <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 md:p-10">
                    <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
                      <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">📋</span> Detaylı Bilgiler
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
                      <InfoCard icon="📅" label="Katılım Tarihi" value={new Date(profileData.created_at).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} />
                      <InfoCard icon="🏛️" label="Üniversite" value={profileData.university} />
                      <InfoCard icon="📚" label="Bölüm" value={profileData.department} />
                    </div>
                  </div>
                )}

                {/* PAYLAŞIMLAR SEKMESİ */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {activities.length === 0 ? (
                      <div className="bg-white p-16 rounded-[2rem] border border-dashed border-gray-300 text-center">
                        <div className="text-6xl mb-4 opacity-50">📭</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Henüz Paylaşım Yok</h3>
                        <p className="text-gray-500 font-medium">Bu kullanıcı henüz platformda bir içerik paylaşmamış.</p>
                      </div>
                    ) : (
                      activities.map((act) => (
                        <div
                          key={act.id}
                          onClick={() => {
                            const stateToPass = { from: location.pathname, tab: activeTab };
                            if (act.type === 'marketplace_listing') navigate(`/dashboard/marketplace/${act.id}`, { state: stateToPass });
                            else if (act.type === 'forum_topic') navigate(`/dashboard/forum/${act.id}`, { state: stateToPass });
                            else if (act.type === 'career_listing') navigate(`/dashboard/career/${act.id}`, { state: stateToPass });
                          }}
                          className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer"
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${act.type === 'marketplace_listing' ? 'bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600' :
                              act.type === 'forum_topic' ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' :
                                'bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600'
                              }`}>
                              {act.type === 'marketplace_listing' ? '🛒' : act.type === 'forum_topic' ? '💬' : '💼'}
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors line-clamp-1">{act.title}</h4>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${act.type === 'marketplace_listing' ? 'bg-teal-50 text-teal-700' :
                                  act.type === 'forum_topic' ? 'bg-blue-50 text-blue-700' :
                                    'bg-purple-50 text-purple-700'
                                  }`}>
                                  {act.type === 'marketplace_listing' ? 'Pazar İlanı' : act.type === 'forum_topic' ? 'Konu' : 'Kariyer İlanı'}
                                </span>
                                <span className="text-xs font-semibold text-gray-400">
                                  {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: tr })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-indigo-300 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all font-bold pr-2 -translate-x-4 group-hover:translate-x-0">
                            Görüntüle →
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* FAVORİLER SEKMESİ */}
                {activeTab === 'favorites' && isOwnProfile && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {favorites.length === 0 ? (
                      <div className="col-span-full bg-white p-16 rounded-[2rem] border border-dashed border-gray-300 text-center mt-4">
                        <div className="text-6xl mb-4 opacity-50">💔</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Henüz Favoriniz Yok</h3>
                        <p className="text-gray-500 font-medium text-sm">Pazar yerinden veya forumdan ilgini çeken paylaşımları kalple, hepsi burada biriksin!</p>
                      </div>
                    ) : (
                      favorites.map((fav) => (
                        <div
                          key={fav.favorite_id}
                          onClick={() => {
                            const stateToPass = { from: location.pathname, tab: activeTab };
                            if (fav.target_type === 'marketplace_listing') navigate(`/dashboard/marketplace/${fav.target_id}`, { state: stateToPass });
                            else if (fav.target_type === 'forum_topic') navigate(`/dashboard/forum/${fav.target_id}`, { state: stateToPass });
                            else if (fav.target_type === 'career_listing') navigate(`/dashboard/career/${fav.target_id}`, { state: stateToPass });
                          }}
                          className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-xl hover:shadow-pink-100/50 hover:border-pink-200 transition-all group flex items-center gap-4 cursor-pointer relative overflow-hidden"
                        >
                          {fav.image ? (
                            <img src={`http://localhost:8000${fav.image}`} alt="Fav" className="w-20 h-20 rounded-2xl object-cover bg-gray-50" />
                          ) : (
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${fav.target_type === 'marketplace_listing' ? 'bg-teal-50 text-teal-600' :
                              fav.target_type === 'forum_topic' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                              }`}>
                              {fav.target_type === 'marketplace_listing' ? '🛍️' : fav.target_type === 'forum_topic' ? '🗯️' : '💼'}
                            </div>
                          )}
                          <div className="flex-1 min-w-0 pr-6">
                            <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest bg-pink-50 px-2 py-0.5 rounded flex items-center w-fit mb-1.5 gap-1">
                              ❤️ {fav.target_type === 'marketplace_listing' ? 'Pazar' : fav.target_type === 'career_listing' ? 'Kariyer' : 'Forum'}
                            </span>
                            <h4 className="font-bold text-gray-900 line-clamp-2 leading-tight group-hover:text-pink-600 transition-colors text-sm mb-1">{fav.title}</h4>
                            {fav.price && <p className="text-indigo-600 font-black text-xs">{fav.price} TL</p>}
                          </div>

                          {/* İncele Butonu Hover efekti */}
                          <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-white via-white/90 to-transparent w-16 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end pr-4">
                            <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform font-bold shadow-sm">
                              ❯
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </div>
            </>
          )}

          {/* CROPPING MODAL */}
          {selectedImageSrc && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <div className="bg-white rounded-3xl overflow-hidden w-full max-w-lg flex flex-col shadow-2xl">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-gray-800">Fotoğrafı Kırp</h3>
                  <button onClick={() => setSelectedImageSrc(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="relative w-full h-80 bg-gray-100">
                  <Cropper
                    image={selectedImageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="rect"
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>

                <div className="p-6 bg-white space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-gray-500">Yakınlaştır</span>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      aria-labelledby="Zoom"
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setSelectedImageSrc(null)}
                      className="px-6 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleAvatarCropSave}
                      className="px-6 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      {isUploading ? 'Yükleniyor...' : 'Uygula'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </MainLayout>
  );
};

// Alt Bileşen: Bilgi Kartı
const InfoCard = ({ icon, label, value }: { icon: string; label: string; value?: string }) => (
  <div className="bg-gray-50/80 hover:bg-indigo-50/50 p-5 rounded-2xl border border-gray-100 transition-colors flex items-start gap-4">
    <div className="text-2xl mt-1 opacity-80">{icon}</div>
    <div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-bold text-gray-900 leading-tight">{value || 'Bilinmiyor'}</p>
    </div>
  </div>
);