import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';
import {
  getContactHistory,
  submitContactMessage,
  type ContactMessageResponse,
} from '../api/contact';
import { useAuth } from '../hooks/useAuth';
import {
  Lock,
  Mail,
  Bell,
  Shield,
  Trash2,
  ChevronRight,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  HeadphonesIcon,
  Send,
  Clock,
} from 'lucide-react';

// ── Yardımcı bileşenler ─────────────────────────────────────────────────────

const Section: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title, description, children,
}) => (
  <div className="glass-card rounded-3xl border-slate-200/60 overflow-hidden mb-8">
    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
      <h3 className="text-lg font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{description}</p>
    </div>
    <div className="divide-y divide-slate-100">{children}</div>
  </div>
);

function usePasswordToggle() {
  const [show, setShow] = useState(false);
  const Icon = show ? EyeOff : Eye;
  return { show, Icon, toggle: () => setShow((v) => !v) };
}

// ── Ana Bileşen ─────────────────────────────────────────────────────────────

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  // Tab yönetimi
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'privacy' | 'support' | 'danger'>('account');

  // Şifre değiştirme
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const curPw = usePasswordToggle();
  const newPw = usePasswordToggle();
  const confPw = usePasswordToggle();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.new_password !== pwForm.confirm) {
      setPwMsg({ type: 'err', text: 'Yeni şifreler eşleşmiyor.' });
      return;
    }
    if (pwForm.new_password.length < 8) {
      setPwMsg({ type: 'err', text: 'Yeni şifre en az 8 karakter olmalı.' });
      return;
    }
    try {
      setPwLoading(true);
      await apiClient.post('/users/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwMsg({ type: 'ok', text: 'Şifreniz başarıyla güncellendi.' });
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setPwMsg({ type: 'err', text: msg || 'Bir hata oluştu.' });
    } finally {
      setPwLoading(false);
    }
  };

  // E-posta değiştirme
  const [emailForm, setEmailForm] = useState({ new_email: '', current_password: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const emailPw = usePasswordToggle();

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!emailForm.new_email.includes('@')) {
      setEmailMsg({ type: 'err', text: 'Geçerli bir e-posta adresi girin.' });
      return;
    }
    try {
      setEmailLoading(true);
      await apiClient.post('/users/change-email', emailForm);
      setEmailMsg({ type: 'ok', text: 'E-posta adresiniz güncellendi.' });
      setEmailForm({ new_email: '', current_password: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setEmailMsg({ type: 'err', text: msg || 'Bir hata oluştu.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // Bildirim tercihleri (sadece UI — local state)
  const [notifs, setNotifs] = useState({
    messages: true,
    listings: true,
    email: false,
  });

  // Hesap silme
  const [deleteForm, setDeleteForm] = useState({ current_password: '', confirmation: '' });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const deletePw = usePasswordToggle();
  const [showDeleteSection, setShowDeleteSection] = useState(false);

  // Destek & İletişim
  const [contactForm, setContactForm] = useState({ subject: '', message: '' });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactMsg, setContactMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [contactHistory, setContactHistory] = useState<ContactMessageResponse[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    getContactHistory()
      .then((res) => setContactHistory(res.messages))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactMsg(null);
    try {
      setContactLoading(true);
      const created = await submitContactMessage(contactForm);
      setContactHistory((prev) => [created, ...prev]);
      setContactMsg({ type: 'ok', text: 'Mesajınız iletildi. En kısa sürede yanıtlayacağız.' });
      setContactForm({ subject: '', message: '' });
    } catch {
      setContactMsg({ type: 'err', text: 'Mesaj gönderilemedi. Lütfen tekrar deneyin.' });
    } finally {
      setContactLoading(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteMsg(null);
    try {
      setDeleteLoading(true);
      await apiClient.delete('/users/account', { data: deleteForm });
      localStorage.clear();
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setDeleteMsg({ type: 'err', text: msg || 'Bir hata oluştu.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const TABS = [
    { id: 'account', label: 'Hesap & Güvenlik', icon: Lock },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'privacy', label: 'Gizlilik', icon: Shield },
    { id: 'support', label: 'Destek & İletişim', icon: HeadphonesIcon },
    { id: 'danger', label: 'Tehlike Bölgesi', icon: AlertTriangle },
  ] as const;

  return (
    <MainLayout>
      <div className="w-full min-h-full bg-mesh relative">
        {/* Background Decorative Blurs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-sky-500/10 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 relative z-10">
          {/* Page Header */}
          <div className="mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-1 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Kullanıcı Tercihleri</span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Ayarlar</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-3 space-y-2 overflow-x-auto lg:overflow-x-visible flex lg:flex-col pb-4 lg:pb-0 no-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                      ${isActive 
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200 translate-x-2' 
                        : 'bg-white/50 hover:bg-white text-slate-500 hover:text-slate-900 border border-transparent hover:border-white/80'}
                    `}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'opacity-60'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="lg:col-span-9 min-h-[600px]">
              <div className="animate-slide-up">

                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div className="glass-card rounded-3xl border-slate-200/60 overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Güvenlik Ayarları</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Şifre ve Hesap Erişimi</p>
                      </div>
                      
                      <div className="p-8 space-y-8">
                        {/* Şifre Değiştir */}
                        <div>
                          <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                              <Lock className="w-4 h-4 text-sky-600" />
                            </div>
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">Şifre Değiştir</span>
                          </div>
                          
                          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <PasswordInput
                              label="Mevcut Şifre"
                              value={pwForm.current_password}
                              onChange={(v) => setPwForm((f) => ({ ...f, current_password: v }))}
                              show={curPw.show}
                              Icon={curPw.Icon}
                              onToggle={curPw.toggle}
                            />
                            <div className="hidden md:block" />
                            <PasswordInput
                              label="Yeni Şifre"
                              value={pwForm.new_password}
                              onChange={(v) => setPwForm((f) => ({ ...f, new_password: v }))}
                              show={newPw.show}
                              Icon={newPw.Icon}
                              onToggle={newPw.toggle}
                            />
                            <PasswordInput
                              label="Yeni Şifre (Tekrar)"
                              value={pwForm.confirm}
                              onChange={(v) => setPwForm((f) => ({ ...f, confirm: v }))}
                              show={confPw.show}
                              Icon={confPw.Icon}
                              onToggle={confPw.toggle}
                            />
                            <div className="md:col-span-2">
                              {pwMsg && <FeedbackBanner type={pwMsg.type} text={pwMsg.text} />}
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                              <button
                                type="submit"
                                disabled={pwLoading}
                                className="btn-premium px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
                              >
                                {pwLoading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                              </button>
                            </div>
                          </form>
                        </div>

                        <div className="h-px bg-slate-100" />

                        {/* E-posta Değiştir */}
                        <div>
                          <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                              <Mail className="w-4 h-4 text-indigo-600" />
                            </div>
                            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">E-posta Değiştir</span>
                          </div>
                          
                          <form onSubmit={handleChangeEmail} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Yeni E-posta</label>
                              <input
                                type="email"
                                value={emailForm.new_email}
                                onChange={(e) => setEmailForm((f) => ({ ...f, new_email: e.target.value }))}
                                placeholder="yeni@ornek.com"
                                className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                              />
                            </div>
                            <PasswordInput
                              label="Mevcut Şifre"
                              value={emailForm.current_password}
                              onChange={(v) => setEmailForm((f) => ({ ...f, current_password: v }))}
                              show={emailPw.show}
                              Icon={emailPw.Icon}
                              onToggle={emailPw.toggle}
                            />
                            <div className="md:col-span-2">
                              {emailMsg && <FeedbackBanner type={emailMsg.type} text={emailMsg.text} />}
                            </div>
                            <div className="md:col-span-2 flex justify-end">
                              <button
                                type="submit"
                                disabled={emailLoading}
                                className="btn-premium px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
                              >
                                {emailLoading ? 'Güncelleniyor...' : 'E-postayı Güncelle'}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="glass-card rounded-3xl border-slate-200/60 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Bildirim Tercihleri</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Uygulama İçi ve E-posta</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      <Toggle
                        label="Mesaj Bildirimleri"
                        description="Yeni mesaj aldığınızda anlık bildirim göster."
                        checked={notifs.messages}
                        onChange={(v) => setNotifs((n) => ({ ...n, messages: v }))}
                      />
                      <Toggle
                        label="İlan Bildirimleri"
                        description="Pazar ve kariyer ilanlarındaki tüm güncellemeler."
                        checked={notifs.listings}
                        onChange={(v) => setNotifs((n) => ({ ...n, listings: v }))}
                      />
                      <Toggle
                        label="E-posta Bildirimleri"
                        description="Önemli duyuruları ve özetleri e-posta ile al."
                        checked={notifs.email}
                        onChange={(v) => setNotifs((n) => ({ ...n, email: v }))}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div className="glass-card rounded-3xl border-slate-200/60 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-lg font-black text-slate-900 tracking-tight">Gizlilik Ayarları</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Profil Görünürlüğü</p>
                    </div>
                    <div className="p-8">
                      <div className="space-y-4">
                        {[
                          { value: 'public', label: 'Tüm Öğrencilere Açık (Kampüs+)', desc: 'Profilinizi uygulamadaki tüm üniversite öğrencileri görebilir.' },
                          { value: 'private', label: `Sadece Aynı Üniversite (${user?.university || 'Kendi Üniversitem'})`, desc: 'Profilinizi sadece sizinle aynı üniversitedeki öğrenciler görebilir.' },
                        ].map((opt) => (
                          <label 
                            key={opt.value} 
                            className={`
                              flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all duration-300
                              ${(opt.value === 'private' ? user?.is_private : !user?.is_private) 
                                ? 'bg-sky-500/5 border-sky-200 shadow-sm' 
                                : 'bg-slate-50/50 border-slate-100 hover:border-slate-200'}
                            `}
                          >
                            <input 
                              type="radio" 
                              name="visibility" 
                              value={opt.value} 
                              checked={opt.value === 'private' ? user?.is_private === true : user?.is_private !== true}
                              onChange={async () => {
                                const is_private = opt.value === 'private';
                                try {
                                  await apiClient.put('/users/profile', { is_private });
                                  updateUser({ is_private });
                                } catch (err) {
                                  console.error("Gizlilik güncellenemedi", err);
                                }
                              }}
                              className="mt-1 w-4 h-4 accent-sky-500" 
                            />
                            <div>
                              <p className={`text-sm font-black transition-colors ${opt.value === 'private' ? (user?.is_private ? 'text-sky-900' : 'text-slate-800') : (!user?.is_private ? 'text-sky-900' : 'text-slate-800')}`}>
                                {opt.label}
                              </p>
                              <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      
                      <div className="mt-8 pt-8 border-t border-slate-100">
                        <button
                          className="w-full flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all duration-300 group"
                          onClick={() => navigate('/dashboard/profile')}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                              <Shield className="w-5 h-5 text-sky-400" />
                            </div>
                            <span className="text-sm font-black tracking-tight">Detaylı Profil Bilgilerini Düzenle</span>
                          </div>
                          <ChevronRight className="w-5 h-5 opacity-40 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'support' && (
                  <div className="space-y-8">
                    <div className="glass-card rounded-3xl border-slate-200/60 overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Destek & İletişim</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Geri Bildirim ve Yardım Talebi</p>
                      </div>
                      <div className="p-8">
                        <form onSubmit={handleSubmitContact} className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Konu</label>
                            <input
                              type="text"
                              value={contactForm.subject}
                              onChange={(e) => setContactForm((f) => ({ ...f, subject: e.target.value }))}
                              placeholder="Konuyu kısaca özetleyin"
                              maxLength={100}
                              required
                              className="w-full px-5 py-3.5 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Mesajınız</label>
                            <div className="relative">
                              <textarea
                                value={contactForm.message}
                                onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                                placeholder="Sorununuzu veya geri bildiriminizi detaylıca açıklayın..."
                                maxLength={2000}
                                required
                                rows={5}
                                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all resize-none"
                              />
                              <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-400 bg-white/80 px-2 py-1 rounded-lg">
                                {contactForm.message.length}/2000
                              </div>
                            </div>
                          </div>
                          {contactMsg && <FeedbackBanner type={contactMsg.type} text={contactMsg.text} />}
                          <div className="flex justify-end">
                            <button
                              type="submit"
                              disabled={contactLoading || contactForm.subject.length < 3 || contactForm.message.length < 10}
                              className="flex items-center gap-3 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-black rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50"
                            >
                              <Send className="w-4 h-4" />
                              {contactLoading ? 'Gönderiliyor...' : 'Mesajı İlet'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>

                    <div className="glass-card rounded-3xl border-slate-200/60 overflow-hidden">
                      <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase tracking-[0.1em]">Önceki Mesajlarım</h3>
                      </div>
                      <div className="p-4">
                        {historyLoading ? (
                          <div className="p-8 text-center">
                            <div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-3" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Yükleniyor...</p>
                          </div>
                        ) : contactHistory.length === 0 ? (
                          <div className="p-8 text-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Henüz mesaj göndermediniz.</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {contactHistory.map((item) => (
                              <ContactHistoryRow key={item.id} item={item} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'danger' && (
                  <div className="glass-card rounded-3xl border-rose-200/60 overflow-hidden">
                    <div className="px-8 py-6 border-b border-rose-100 bg-rose-50/50">
                      <h3 className="text-lg font-black text-rose-900 tracking-tight">Tehlike Bölgesi</h3>
                      <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mt-1">Hesap Kapatma ve Silme</p>
                    </div>
                    <div className="p-8">
                      {!showDeleteSection ? (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-rose-50/50 border border-rose-100 rounded-2xl">
                          <div>
                            <p className="text-sm font-black text-rose-900">Hesabımı Kalıcı Olarak Sil</p>
                            <p className="text-xs font-bold text-rose-400 mt-1 uppercase tracking-tight">Tüm verileriniz geri döndürülemez şekilde silinecektir.</p>
                          </div>
                          <button
                            onClick={() => setShowDeleteSection(true)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black rounded-xl shadow-lg shadow-rose-200 transition-all"
                          >
                            <Trash2 className="w-4 h-4" /> Hesabı Sil
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleDeleteAccount} className="space-y-6 animate-slide-up">
                          <div className="bg-rose-600 text-white rounded-2xl p-6 shadow-xl shadow-rose-200">
                            <div className="flex items-center gap-3 mb-3">
                              <AlertTriangle className="w-6 h-6" />
                              <p className="text-lg font-black tracking-tight">Kritik Uyarı!</p>
                            </div>
                            <p className="text-sm font-bold opacity-90 leading-relaxed">
                              Hesabınızla birlikte tüm ilanlarınız, mesajlarınız ve favori listeniz kalıcı olarak silinecek. 
                              Devam etmek için aşağıdaki kutuya <span className="underline decoration-2 underline-offset-4">HESABIMI SİL</span> yazın.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <PasswordInput
                              label="Mevcut Şifreniz"
                              value={deleteForm.current_password}
                              onChange={(v) => setDeleteForm((f) => ({ ...f, current_password: v }))}
                              show={deletePw.show}
                              Icon={deletePw.Icon}
                              onToggle={deletePw.toggle}
                            />
                            <div>
                              <label className="block text-[10px] font-black text-rose-400 uppercase tracking-[0.2em] mb-2 ml-1">Onay Kelimesi</label>
                              <input
                                type="text"
                                value={deleteForm.confirmation}
                                onChange={(e) => setDeleteForm((f) => ({ ...f, confirmation: e.target.value }))}
                                placeholder="HESABIMI SİL"
                                className="w-full px-5 py-3.5 bg-rose-50/50 border border-rose-200 rounded-2xl text-sm font-bold text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all placeholder:text-rose-200"
                              />
                            </div>
                          </div>

                          {deleteMsg && <FeedbackBanner type={deleteMsg.type} text={deleteMsg.text} />}
                          
                          <div className="flex gap-4 justify-end pt-4 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => { setShowDeleteSection(false); setDeleteMsg(null); }}
                              className="px-6 py-3 text-sm font-black text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                            >
                              İptal
                            </button>
                            <button
                              type="submit"
                              disabled={deleteLoading || deleteForm.confirmation !== 'HESABIMI SİL'}
                              className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-black rounded-xl shadow-lg shadow-rose-200 transition-all disabled:opacity-40"
                            >
                              {deleteLoading ? 'İşleniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
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

// ── Alt Bileşenler ──────────────────────────────────────────────────────────

const PasswordInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  Icon: React.ElementType;
  onToggle: () => void;
}> = ({ label, value, onChange, show, Icon, onToggle }) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">{label}</label>
    <div className="relative group">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-5 py-3.5 pr-12 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all group-hover:bg-white"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <Icon className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const Toggle: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between px-8 py-6 hover:bg-slate-50/50 transition-colors duration-300">
    <div className="max-w-[80%]">
      <p className="text-sm font-black text-slate-800 tracking-tight">{label}</p>
      <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight leading-relaxed">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-all duration-300 focus:outline-none shadow-sm
        ${checked ? 'bg-slate-900 ring-4 ring-slate-900/10' : 'bg-slate-200'}
      `}
    >
      <span
        className={`
          inline-block h-5 w-5 rounded-full bg-white shadow-lg transform transition-transform duration-300 mt-1
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  </div>
);

const FeedbackBanner: React.FC<{ type: 'ok' | 'err'; text: string }> = ({ type, text }) => (
  <div className={`
    flex items-center gap-3 text-sm font-bold px-5 py-4 rounded-2xl shadow-sm animate-slide-up
    ${type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}
  `}>
    {type === 'ok' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
    {text}
  </div>
);

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending:  { label: 'BEKLEMEDE',   className: 'bg-amber-50 text-amber-600 border-amber-100' },
  answered: { label: 'YANITLANDI', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  spam:     { label: 'SPAM',       className: 'bg-rose-50 text-rose-600 border-rose-100' },
};

const ContactHistoryRow: React.FC<{ item: ContactMessageResponse }> = ({ item }) => {
  const meta = STATUS_META[item.status] ?? STATUS_META.pending;
  const date = new Date(item.created_at).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  return (
    <div className="flex items-center justify-between gap-4 py-5 hover:bg-slate-50/50 px-4 -mx-4 rounded-2xl transition-all group">
      <div className="flex items-start gap-4 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
          <Clock className="w-5 h-5 text-slate-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-800 truncate tracking-tight">{item.subject}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{date}</p>
        </div>
      </div>
      <span className={`flex-shrink-0 text-[9px] font-black px-3 py-1 rounded-lg border ${meta.className} tracking-widest`}>
        {meta.label}
      </span>
    </div>
  );
};
