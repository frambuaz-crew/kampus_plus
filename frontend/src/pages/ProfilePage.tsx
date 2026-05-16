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
import {
  CascadingInstitutionSelect,
  type InstitutionSelection,
} from '../components/institution/CascadingInstitutionSelect';
import {
  getDepartments,
  getFaculties,
  getUniversities,
} from '../api/institutions';
import {
  GraduationCap,
  BookOpen,
  Layers,
  MessageSquare,
  Edit3,
  Camera,
  ShoppingBag,
  Briefcase,
  Heart,
  FileText,
  X,
  ChevronRight,
  Lock,
} from 'lucide-react';

// Tab ve Liste Tipleri
type TabType = 'info' | 'activity' | 'favorites';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  content?: string;
  image_url?: string;
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
  university_id?: string | null;
  faculty_id?: string | null;
  department?: string;
  department_id?: string | null;
  grade?: string | null;
  profile_picture_url?: string | null;
  bio?: string | null;
  is_private?: boolean;
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
  const locationState = (location.state as ProfileLocationState | null) || null;

  // URL'deki isim boşsa veya senin isminle aynıysa "Kendi Profilim"dir
  const isOwnProfile = !username || username === currentUser?.username;
  const targetUsername = isOwnProfile ? currentUser?.username : username;

  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(locationState?.tab || 'info');

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState<'all' | 'forum_topic' | 'marketplace_listing' | 'career_listing'>('all');
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  // Düzenleme State'leri
  const GRADE_OPTIONS = [
    { value: '', label: '— Sınıf Seçin —' },
    { value: 'Hazırlık', label: 'Hazırlık' },
    { value: '1. Sınıf', label: '1. Sınıf' },
    { value: '2. Sınıf', label: '2. Sınıf' },
    { value: '3. Sınıf', label: '3. Sınıf' },
    { value: '4. Sınıf', label: '4. Sınıf' },
    { value: '5. Sınıf', label: '5. Sınıf' },
    { value: 'Yüksek Lisans', label: 'Yüksek Lisans' },
    { value: 'Doktora', label: 'Doktora' },
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    bio: '',
    grade: ''
  });
  const [editInstitution, setEditInstitution] = useState<Partial<InstitutionSelection>>({
    universityId: '',
    universityName: '',
    facultyId: '',
    facultyName: '',
    departmentId: '',
    departmentName: '',
  });

  // Profil Fotoğrafı Kırpma State'leri
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);


  useEffect(() => {
    if (locationState?.tab) {
      setActiveTab(locationState.tab);
    }
  }, [locationState?.tab]);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // 🚀 Form ilklendirme (Düzenleme modu açıldığında)
  useEffect(() => {
    if (!isEditing || !isOwnProfile || !currentUser) return;

    setEditForm({
      bio: profileData?.bio || '',
      grade: profileData?.grade || ''
    });

    setEditInstitution({
      universityId: currentUser.university_id || '',
      universityName: currentUser.university || profileData?.university || '',
      facultyId: currentUser.faculty_id || '',
      departmentId: currentUser.department_id || '',
      departmentName: profileData?.department || '',
    });
  }, [isEditing, isOwnProfile, currentUser, profileData]);

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
            profile_picture_url: userRes.data.profile_picture_url || '',
            grade: userRes.data.grade || ''
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

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basit Doğrulama
    if (!editInstitution.universityId || !editInstitution.departmentId) {
      alert("Lütfen üniversite ve bölüm seçiniz.");
      return;
    }

    try {
      const payload = {
        ...editForm,
        university: editInstitution.universityName,
        university_id: editInstitution.universityId,
        department_id: editInstitution.departmentId,
      };

      await apiClient.put(`/users/profile`, payload);
      // UI güncelle
      setProfileData((prev) => (
        prev
          ? {
            ...prev,
            ...editForm,
            university: editInstitution.universityName || prev.university,
            university_id: editInstitution.universityId || prev.university_id,
            faculty_id: editInstitution.facultyId || prev.faculty_id,
            department: editInstitution.departmentName || prev.department,
            department_id: editInstitution.departmentId || prev.department_id,
            grade: editForm.grade || null,
          }
          : prev
      ));
      // Auth context'i güncelle (navbar'a vb. anında yansıması için)
      updateUser({
        bio: editForm.bio,
        grade: editForm.grade || null,
        university: editInstitution.universityName || currentUser?.university || '',
        university_id: editInstitution.universityId || currentUser?.university_id || '',
        faculty_id: editInstitution.facultyId || currentUser?.faculty_id || '',
        department_id: editInstitution.departmentId || currentUser?.department_id || '',
        department: editInstitution.departmentName || currentUser?.department || null,
      });

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
      const cacheBustedUrl = `${newPicUrl}${newPicUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
      setProfileData((prev) => (prev ? { ...prev, profile_picture_url: cacheBustedUrl } : prev));
      updateUser({ profile_picture_url: cacheBustedUrl });

      setSelectedImageSrc(null);
    } catch (error) {
      console.error("Fotoğraf yükleme hatası:", error);
      alert("Fotoğraf yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!profileData) return;
    try {
      const res = await apiClient.post('/messages/direct', { receiver_id: profileData.id });
      if (res?.data?.conversation_id) {
        navigate(`/dashboard/messages/${res.data.conversation_id}`);
      }
    } catch (err) {
      console.error("Mesaj başlatılamadı:", err);
      alert("Mesaj başlatılamadı.");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!profileData) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-500">
          <p className="text-lg font-semibold">Kullanıcı bulunamadı.</p>
        </div>
      </MainLayout>
    );
  }

  const initials = `${profileData.first_name?.[0] ?? ''}${profileData.last_name?.[0] ?? ''}`.toUpperCase();

  return (
    <MainLayout>
      <div className="w-full min-h-screen bg-slate-50 pb-16">

        {/* Cover Banner */}
        <div className="h-40 bg-mesh relative overflow-hidden">
          <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Profile Card */}
          <div className="glass-card -mt-20 relative z-10 rounded-2xl p-0 mb-8 overflow-visible animate-slide-up">
            <div className="px-8 py-8 flex flex-col sm:flex-row sm:items-center gap-6">

              {/* Avatar */}
              <div className="relative -mt-12 flex-shrink-0 group">
                <input
                  type="file"
                  id="avatarUpload"
                  className="hidden"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor={isOwnProfile && !isEditing ? 'avatarUpload' : undefined}
                  className={`w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-2xl relative transition-transform duration-300 ${isOwnProfile && !isEditing ? 'cursor-pointer hover:scale-105' : ''}`}
                >
                  {profileData.profile_picture_url ? (
                    <img
                      src={getImageUrl(profileData.profile_picture_url)}
                      className="w-full h-full object-cover"
                      alt="Profile"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  {isOwnProfile && !isEditing && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-full backdrop-blur-[2px]">
                      <Camera className="w-8 h-8 text-white animate-pulse" />
                    </div>
                  )}
                </label>
                {/* Online Indicator (Fake for now) */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-lg" />
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 sm:-mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    <span className="text-gradient">{profileData.first_name} {profileData.last_name}</span>
                  </h1>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 flex-shrink-0 sm:-mt-2">
                {!isOwnProfile ? (
                  <button
                    onClick={handleSendMessage}
                    className="btn-premium flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg shadow-slate-200 transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Mesaj Gönder
                  </button>
                ) : (
                  !isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-premium flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 hover:border-sky-500 text-slate-700 hover:text-sky-600 text-sm font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Profili Düzenle
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Gizli Profil Kontrolü */}
            {profileData.is_private && !isOwnProfile && currentUser?.university_id !== profileData.university_id ? (
              <div className="border-t border-slate-100 px-6 py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Lock className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Bu hesap gizlidir.</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                  Bu profil sadece <strong>{profileData.university}</strong> öğrencilerine açıktır.
                </p>
              </div>
            ) : (
              <>
                {/* Bio + Stats */}
                {!isEditing && (
                  <div className="border-t border-slate-100 px-8 py-6 flex flex-col md:flex-row md:items-center gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Edit3 size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hakkında</span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {profileData.bio || <span className="text-slate-400 italic">Henüz bir biyografi eklenmemiş.</span>}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-10 md:border-l md:border-slate-100 md:pl-10 flex-shrink-0">
                      <div className="text-center group cursor-pointer">
                        <p className="text-2xl font-black text-slate-900 group-hover:text-sky-600 transition-colors">{activities.length}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Paylaşım</p>
                      </div>
                      {isOwnProfile && (
                        <div className="text-center group cursor-pointer">
                          <p className="text-2xl font-black text-slate-900 group-hover:text-rose-500 transition-colors">{favorites.length}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">Favori</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && isOwnProfile && (
            <div className="glass-card rounded-2xl border-slate-200/60 shadow-xl mb-8 overflow-hidden animate-slide-up">
              <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Profili Düzenle</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Kişisel Bilgilerini Güncelle</p>
                </div>
                <button onClick={() => setIsEditing(false)} className="p-2 rounded-xl hover:bg-white hover:shadow-md text-slate-400 hover:text-rose-500 transition-all duration-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-8 space-y-6 max-w-3xl">
                <CascadingInstitutionSelect
                  showDepartment
                  initialUniversityName={editInstitution.universityName}
                  initialUniversityId={editInstitution.universityId}
                  initialFacultyId={editInstitution.facultyId}
                  initialDepartmentId={editInstitution.departmentId}
                  onChange={(selection) => setEditInstitution((prev) => ({ ...prev, ...selection }))}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Sınıf</label>
                    <div className="relative group">
                      <select
                        className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none cursor-pointer group-hover:bg-white"
                        value={editForm.grade}
                        onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                      >
                        {GRADE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight className="w-4 h-4 rotate-90" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Diğer kolon boş kalsın veya başka bir şey gelirse buraya eklenebilir */}
                  <div className="hidden md:block" />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Hakkımda</label>
                  <div className="relative">
                    <div className="absolute left-4 top-4 text-slate-400">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <textarea
                      className="w-full pl-11 pr-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 resize-none focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all placeholder:text-slate-300 min-h-[120px]"
                      rows={4}
                      placeholder="Kendinizden, ilgi alanlarınızdan bahsedin..."
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)} 
                    className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    className="btn-premium px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg shadow-slate-200"
                  >
                    Değişiklikleri Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabs */}
          {(!profileData.is_private || isOwnProfile || currentUser?.university_id === profileData.university_id) && !isEditing && (
            <>
              <div className="flex items-center gap-1 mb-6 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 w-fit animate-slide-up delay-100">
                {[
                  { key: 'info', label: 'Bilgiler', icon: FileText },
                  { key: 'activity', label: 'Paylaşımlar', icon: Layers },
                  ...(isOwnProfile ? [{ key: 'favorites', label: 'Favoriler', icon: Heart }] : []),
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as TabType)}
                    className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold transition-all rounded-xl ${activeTab === key
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-200'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div>

                {/* BİLGİLER */}
                {activeTab === 'info' && (
                  <div className="animate-slide-up delay-200">
                    <div className="glass-card rounded-2xl p-8 border-slate-200/60 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-sky-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-900 tracking-tight">Akademik Bilgiler</h3>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Öğrenci Detayları</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <InfoCard icon={GraduationCap} label="Üniversite" value={profileData.university} variant="sky" />
                        <InfoCard icon={BookOpen} label="Bölüm" value={profileData.department} variant="indigo" />
                        <InfoCard icon={Layers} label="Sınıf" value={profileData.grade ?? undefined} variant="violet" />
                      </div>
                    </div>
                  </div>
                )}

                {/* PAYLAŞIMLAR */}
                {activeTab === 'activity' && (
                  <div className="space-y-4">
                    {/* Filtreler */}
                    <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: 'Tümü' },
                        { id: 'forum_topic', label: 'Forum' },
                        { id: 'marketplace_listing', label: 'Pazar' },
                        { id: 'career_listing', label: 'Kariyer' },
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setActivityFilter(f.id as any)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                            activityFilter === f.id
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      {activities.filter(a => activityFilter === 'all' || a.type === activityFilter).length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Layers className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm font-semibold text-slate-700">Sonuç bulunamadı</p>
                          <p className="text-xs text-slate-400 mt-1">Bu kategoride henüz bir paylaşım yok.</p>
                        </div>
                      ) : (
                        activities
                          .filter(a => activityFilter === 'all' || a.type === activityFilter)
                          .map((act) => {
                            const isMarket = act.type === 'marketplace_listing';
                            const isForum = act.type === 'forum_topic';
                            const label = isMarket ? 'Pazar' : isForum ? 'Forum' : 'Kariyer';
                            const color = isMarket ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : isForum ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-violet-600 bg-violet-50 border-violet-100';
                            
                            return (
                              <div
                                key={act.id}
                                onClick={() => {
                                  const s = { from: location.pathname, tab: activeTab };
                                  if (isMarket) navigate(`/dashboard/marketplace/${act.id}`, { state: s });
                                  else if (isForum) navigate(`/dashboard/forum/${act.id}`, { state: s });
                                  else navigate(`/dashboard/career/${act.id}`, { state: s });
                                }}
                                className="glass-card p-5 flex flex-col gap-4 hover:border-sky-500/30 hover:shadow-2xl hover:shadow-sky-500/5 transition-all cursor-pointer group animate-slide-up rounded-2xl"
                              >
                                <div className="flex justify-between items-start gap-6">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${color}`}>
                                        {label}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: tr })}
                                      </span>
                                    </div>
                                    <h4 className="text-base font-black text-slate-900 group-hover:text-sky-600 transition-colors leading-tight mb-2 tracking-tight">
                                      {act.title}
                                    </h4>
                                    {act.content && (
                                      <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-medium">
                                        {act.content}
                                      </p>
                                    )}
                                  </div>
                                  {act.image_url && (
                                    <div className="relative flex-shrink-0">
                                      <img 
                                        src={getImageUrl(act.image_url)} 
                                        alt="Thumbnail" 
                                        className="w-20 h-20 object-cover rounded-xl border border-slate-100 shadow-sm group-hover:scale-105 transition-transform duration-500" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                      />
                                      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}

                {/* FAVORİLER */}
                {activeTab === 'favorites' && isOwnProfile && (
                  <div className="space-y-3">
                    {favorites.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Heart className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Henüz favori yok</p>
                        <p className="text-xs text-slate-400 mt-1">Beğendiğin ilanları favorilere ekle.</p>
                      </div>
                    ) : (
                      favorites.map((fav) => {
                        const isMarket = fav.target_type === 'marketplace_listing';
                        const isForum = fav.target_type === 'forum_topic';
                        const FavIcon = isMarket ? ShoppingBag : isForum ? MessageSquare : Briefcase;
                        const label = isMarket ? 'Pazar' : isForum ? 'Forum' : 'Kariyer';
                        const color = isMarket ? 'text-emerald-600 bg-emerald-50' : isForum ? 'text-blue-600 bg-blue-50' : 'text-violet-600 bg-violet-50';
                        return (
                          <div
                            key={fav.favorite_id}
                            onClick={() => {
                              const s = { from: location.pathname, tab: activeTab };
                              if (isMarket) navigate(`/dashboard/marketplace/${fav.target_id}`, { state: s });
                              else if (isForum) navigate(`/dashboard/forum/${fav.target_id}`, { state: s });
                              else navigate(`/dashboard/career/${fav.target_id}`, { state: s });
                            }}
                            className="glass-card p-4 flex items-center gap-5 hover:border-rose-200 hover:shadow-2xl hover:shadow-rose-500/5 transition-all cursor-pointer group rounded-2xl animate-slide-up"
                          >
                            {fav.image ? (
                              <div className="relative flex-shrink-0">
                                <img src={`http://localhost:8000${fav.image}`} alt="Fav" className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />
                              </div>
                            ) : (
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${color}`}>
                                <FavIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${color.replace('bg-', 'bg-opacity-20 bg-')}`}>{label}</span>
                                 {fav.price && <span className="text-xs font-black text-slate-900">{fav.price} TL</span>}
                               </div>
                              <p className="text-sm font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors tracking-tight">{fav.title}</p>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-rose-50 group-hover:text-rose-500 transition-all">
                              <ChevronRight className="w-4 h-4" />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

              </div>
            </>
          )}

        </div>
      </div>

      {/* CROPPING MODAL */}
      {selectedImageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl overflow-hidden w-full max-w-md flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Fotoğrafı Kırp</h3>
              <button onClick={() => setSelectedImageSrc(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full h-72 bg-slate-100">
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
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-20">Yakınlaştır</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-[#0ea5e9]"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setSelectedImageSrc(null)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                  İptal
                </button>
                <button onClick={handleAvatarCropSave} className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  {isUploading ? 'Yükleniyor...' : 'Uygula'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

const InfoCard = ({
  icon: Icon,
  label,
  value,
  variant = 'sky',
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  variant?: 'sky' | 'indigo' | 'violet';
}) => {
  const colors = {
    sky: 'bg-sky-500/10 text-sky-600 border-sky-100',
    indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-100',
    violet: 'bg-violet-500/10 text-violet-600 border-violet-100',
  };

  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl border transition-all hover:shadow-md ${colors[variant]}`}>
      <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">{label}</p>
        <p className="text-sm font-black text-slate-900 leading-tight tracking-tight">{value || 'Bilinmiyor'}</p>
      </div>
    </div>
  );
};
