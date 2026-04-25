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
} from 'lucide-react';

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
  grade?: string | null;
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
  const locationState = (location.state as ProfileLocationState | null) || null;

  // URL'deki isim boşsa veya senin isminle aynıysa "Kendi Profilim"dir
  const isOwnProfile = !username || username === currentUser?.username;
  const targetUsername = isOwnProfile ? currentUser?.username : username;

  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>(locationState?.tab || 'info');

  const [activities, setActivities] = useState<ActivityItem[]>([]);
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
    profile_picture_url: '',
    grade: ''
  });
  const [editInstitution, setEditInstitution] = useState<Partial<InstitutionSelection>>({
    universityName: '',
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

  useEffect(() => {
    if (!isEditing || !isOwnProfile || !currentUser) return;

    setEditInstitution((prev) => ({
      ...prev,
      universityName: currentUser.university || profileData?.university || '',
      departmentId: currentUser.department_id || prev.departmentId || '',
      departmentName: profileData?.department || prev.departmentName || '',
    }));
  }, [isEditing, isOwnProfile, currentUser, profileData?.department, profileData?.university]);

  useEffect(() => {
    if (!isEditing || !isOwnProfile || !currentUser?.department_id || !currentUser?.university) return;

    let cancelled = false;

    const resolveFacultyFromDepartment = async () => {
      try {
        const universities = await getUniversities();
        const matchedUniversity = universities.find(
          (u) => u.name.toLowerCase() === currentUser.university.toLowerCase()
        );
        if (!matchedUniversity) return;

        const faculties = await getFaculties(matchedUniversity.id);
        const departmentLists = await Promise.all(
          faculties.map((faculty) => getDepartments(faculty.id).catch(() => []))
        );
        const departments = departmentLists.flat();

        const matchedDepartment = departments.find((d) => d.id === currentUser.department_id);
        const facultyId = matchedDepartment?.faculty_id || '';
        const matchedFaculty = faculties.find((f) => f.id === facultyId);

        if (cancelled) return;

        setEditInstitution((prev) => ({
          ...prev,
          universityId: matchedUniversity.id,
          universityName: matchedUniversity.name,
          facultyId: matchedFaculty?.id || prev.facultyId || '',
          facultyName: matchedFaculty?.name || prev.facultyName || '',
          departmentId: matchedDepartment?.id || prev.departmentId || currentUser.department_id,
          departmentName: matchedDepartment?.name || prev.departmentName || '',
        }));
      } catch {
        // sessizce geç
      }
    };

    resolveFacultyFromDepartment();

    return () => {
      cancelled = true;
    };
  }, [isEditing, isOwnProfile, currentUser?.department_id, currentUser?.university]);

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
    try {
      const payload = {
        ...editForm,
        university: editInstitution.universityName,
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
              department: editInstitution.departmentName || prev.department,
              grade: editForm.grade || null,
            }
          : prev
      ));
      // Auth context'i güncelle (navbar'a vb. anında yansıması için)
      updateUser({
        bio: editForm.bio,
        profile_picture_url: editForm.profile_picture_url,
        grade: editForm.grade || null,
        university: editInstitution.universityName || currentUser?.university || '',
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
        <div className="h-28 bg-gradient-to-r from-slate-800 to-slate-700 w-full" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6">

          {/* Profile Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-visible">

            {/* Avatar + meta row */}
            <div className="px-6 pt-0 pb-5 flex flex-col sm:flex-row sm:items-end gap-4">

              {/* Avatar — overlaps the cover by -mt-12 */}
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
                  className={`w-20 h-20 rounded-xl overflow-hidden bg-[#0ea5e9] flex items-center justify-center text-white text-xl font-bold border-[3px] border-white shadow-lg relative ${isOwnProfile && !isEditing ? 'cursor-pointer' : ''}`}
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
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                  )}
                </label>
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0 sm:mb-1">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  {profileData.first_name} {profileData.last_name}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">@{profileData.username}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {profileData.university && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {profileData.university}
                    </span>
                  )}
                  {profileData.department && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      {profileData.department}
                    </span>
                  )}
                  {profileData.grade && (
                    <span className="px-2 py-0.5 bg-sky-50 text-[#0ea5e9] rounded text-xs font-medium border border-sky-100">
                      {profileData.grade}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 sm:mb-1 flex-shrink-0">
                {!isOwnProfile ? (
                  <button
                    onClick={() => navigate('/dashboard/messages')}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] hover:bg-sky-600 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Mesaj Gönder
                  </button>
                ) : (
                  !isEditing && (
                    <button
                      onClick={() => {
                        setEditInstitution({
                          universityName: currentUser?.university || profileData.university || '',
                          departmentId: currentUser?.department_id || '',
                          departmentName: profileData.department || '',
                        });
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                      Profili Düzenle
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Bio + Stats */}
            {!isEditing && (
              <div className="border-t border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <p className="flex-1 text-sm text-slate-600 leading-relaxed">
                  {profileData.bio || <span className="text-slate-400 italic">Henüz bir biyografi eklenmemiş.</span>}
                </p>
                <div className="flex items-center gap-6 sm:border-l sm:border-slate-100 sm:pl-6 flex-shrink-0">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900">{activities.length}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Paylaşım</p>
                  </div>
                  {isOwnProfile && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-slate-900">{favorites.length}</p>
                      <p className="text-xs text-slate-400 mt-0.5">Favori</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Edit Form */}
          {isEditing && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm mb-6 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-base font-semibold text-slate-900">Profili Düzenle</h3>
                <button onClick={() => setIsEditing(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="p-6 space-y-5 max-w-2xl">
                <CascadingInstitutionSelect
                  showDepartment
                  initialUniversityName={editInstitution.universityName}
                  initialUniversityId={editInstitution.universityId}
                  initialFacultyId={editInstitution.facultyId}
                  initialDepartmentId={editInstitution.departmentId}
                  onChange={(selection) => setEditInstitution((prev) => ({ ...prev, ...selection }))}
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sınıf</label>
                  <select
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                    value={editForm.grade}
                    onChange={(e) => setEditForm({ ...editForm, grade: e.target.value })}
                  >
                    {GRADE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hakkımda</label>
                  <textarea
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                    rows={4}
                    placeholder="Kendinizden, ilgi alanlarınızdan bahsedin..."
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Profil Fotoğrafı URL</label>
                  <input
                    type="url"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                    placeholder="https://example.com/photo.jpg"
                    value={editForm.profile_picture_url}
                    onChange={(e) => setEditForm({ ...editForm, profile_picture_url: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                    İptal
                  </button>
                  <button type="submit" className="px-5 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors">
                    Kaydet
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabs */}
          {!isEditing && (
            <>
              <div className="flex items-center gap-0 border-b border-slate-200 mb-6 bg-white rounded-t-lg px-2">
                {[
                  { key: 'info', label: 'Bilgiler', icon: FileText },
                  { key: 'activity', label: 'Paylaşımlar', icon: Layers },
                  ...(isOwnProfile ? [{ key: 'favorites', label: 'Favoriler', icon: Heart }] : []),
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as TabType)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                      activeTab === key
                        ? 'border-[#0ea5e9] text-[#0ea5e9]'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
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
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Detaylı Bilgiler</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoCard icon={GraduationCap} label="Üniversite" value={profileData.university} />
                      <InfoCard icon={BookOpen} label="Bölüm" value={profileData.department} />
                      <InfoCard icon={Layers} label="Sınıf" value={profileData.grade ?? undefined} />
                    </div>
                  </div>
                )}

                {/* PAYLAŞIMLAR */}
                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Layers className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-700">Henüz paylaşım yok</p>
                        <p className="text-xs text-slate-400 mt-1">Bu kullanıcı henüz içerik paylaşmamış.</p>
                      </div>
                    ) : (
                      activities.map((act) => {
                        const isMarket = act.type === 'marketplace_listing';
                        const isForum = act.type === 'forum_topic';
                        const ActIcon = isMarket ? ShoppingBag : isForum ? MessageSquare : Briefcase;
                        const label = isMarket ? 'Pazar' : isForum ? 'Forum' : 'Kariyer';
                        const color = isMarket ? 'text-emerald-600 bg-emerald-50' : isForum ? 'text-blue-600 bg-blue-50' : 'text-violet-600 bg-violet-50';
                        return (
                          <div
                            key={act.id}
                            onClick={() => {
                              const s = { from: location.pathname, tab: activeTab };
                              if (isMarket) navigate(`/dashboard/marketplace/${act.id}`, { state: s });
                              else if (isForum) navigate(`/dashboard/forum/${act.id}`, { state: s });
                              else navigate(`/dashboard/career/${act.id}`, { state: s });
                            }}
                            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                          >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                              <ActIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#0ea5e9] transition-colors">{act.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{label}</span>
                                <span className="text-xs text-slate-400">{formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: tr })}</span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
                          </div>
                        );
                      })
                    )}
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
                            className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer group"
                          >
                            {fav.image ? (
                              <img src={`http://localhost:8000${fav.image}`} alt="Fav" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                                <FavIcon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-[#0ea5e9] transition-colors">{fav.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{label}</span>
                                {fav.price && <span className="text-xs font-semibold text-slate-700">{fav.price} TL</span>}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
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
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
}) => (
  <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-lg">
    <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-slate-800 truncate">{value || 'Bilinmiyor'}</p>
    </div>
  </div>
);
