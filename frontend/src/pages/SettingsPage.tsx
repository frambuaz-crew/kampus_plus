import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { apiClient } from '../api/config';
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
} from 'lucide-react';

// ── Yardımcı bileşenler ─────────────────────────────────────────────────────

const Section: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({
  title, description, children,
}) => (
  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
    <div className="px-6 py-4 border-b border-slate-100">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <div className="divide-y divide-slate-100">{children}</div>
  </div>
);

const Toggle: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between px-6 py-4">
    <div>
      <p className="text-sm font-medium text-slate-800">{label}</p>
      <p className="text-xs text-slate-500 mt-0.5">{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none ${checked ? 'bg-[#0ea5e9]' : 'bg-slate-200'}`}
    >
      <span
        className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </button>
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

  return (
    <MainLayout>
      <div className="w-full min-h-screen bg-slate-50 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

          {/* Başlık */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Ayarlar</h1>
            <p className="text-sm text-slate-500 mt-1">Hesap ve uygulama tercihlerinizi yönetin.</p>
          </div>

          <div className="space-y-5">

            {/* ── Hesap Güvenliği ── */}
            <Section title="Hesap Güvenliği" description="Şifre ve e-posta adresinizi güncelleyin.">

              {/* Şifre Değiştir */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">Şifre Değiştir</span>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <PasswordInput
                    label="Mevcut Şifre"
                    value={pwForm.current_password}
                    onChange={(v) => setPwForm((f) => ({ ...f, current_password: v }))}
                    show={curPw.show}
                    Icon={curPw.Icon}
                    onToggle={curPw.toggle}
                  />
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
                  {pwMsg && <FeedbackBanner type={pwMsg.type} text={pwMsg.text} />}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={pwLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {pwLoading ? 'Kaydediliyor...' : 'Şifreyi Güncelle'}
                    </button>
                  </div>
                </form>
              </div>

              {/* E-posta Değiştir */}
              <div className="px-6 py-5">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800">E-posta Değiştir</span>
                </div>
                <form onSubmit={handleChangeEmail} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Yeni E-posta</label>
                    <input
                      type="email"
                      value={emailForm.new_email}
                      onChange={(e) => setEmailForm((f) => ({ ...f, new_email: e.target.value }))}
                      placeholder="yeni@ornek.com"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
                    />
                  </div>
                  <PasswordInput
                    label="Mevcut Şifreniz (Doğrulama)"
                    value={emailForm.current_password}
                    onChange={(v) => setEmailForm((f) => ({ ...f, current_password: v }))}
                    show={emailPw.show}
                    Icon={emailPw.Icon}
                    onToggle={emailPw.toggle}
                  />
                  {emailMsg && <FeedbackBanner type={emailMsg.type} text={emailMsg.text} />}
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={emailLoading}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      {emailLoading ? 'Kaydediliyor...' : 'E-postayı Güncelle'}
                    </button>
                  </div>
                </form>
              </div>
            </Section>

            {/* ── Bildirimler ── */}
            <Section title="Bildirim Tercihleri" description="Hangi bildirimleri almak istediğinizi seçin.">
              <Toggle
                label="Mesaj Bildirimleri"
                description="Yeni mesaj aldığınızda bildirim göster."
                checked={notifs.messages}
                onChange={(v) => setNotifs((n) => ({ ...n, messages: v }))}
              />
              <Toggle
                label="İlan Bildirimleri"
                description="Pazar ve kariyer ilanlarındaki güncellemeler."
                checked={notifs.listings}
                onChange={(v) => setNotifs((n) => ({ ...n, listings: v }))}
              />
              <Toggle
                label="E-posta Bildirimleri"
                description="Önemli güncellemeleri e-posta ile al."
                checked={notifs.email}
                onChange={(v) => setNotifs((n) => ({ ...n, email: v }))}
              />
            </Section>

            {/* ── Gizlilik ── */}
            <Section title="Gizlilik" description="Profilinizin kim tarafından görüleceğini ayarlayın.">
              <div className="px-6 py-4">
                <p className="text-sm font-medium text-slate-800 mb-3">Profil Görünürlüğü</p>
                {[
                  { value: 'public', label: 'Herkese Açık', desc: 'Profilinizi herkes görebilir.' },
                  { value: 'users', label: 'Kayıtlı Kullanıcılar', desc: 'Sadece giriş yapanlar görebilir.' },
                  { value: 'private', label: 'Gizli', desc: 'Sadece siz görebilirsiniz.' },
                ].map((opt) => (
                  <label key={opt.value} className="flex items-start gap-3 py-2 cursor-pointer group">
                    <input type="radio" name="visibility" value={opt.value} defaultChecked={opt.value === 'public'}
                      className="mt-0.5 accent-[#0ea5e9]" />
                    <div>
                      <p className="text-sm font-medium text-slate-800 group-hover:text-[#0ea5e9] transition-colors">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                onClick={() => navigate('/dashboard/profile')}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Profil Bilgilerini Düzenle</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            </Section>

            {/* ── Tehlike Bölgesi ── */}
            <div className="bg-white border border-red-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-red-100">
                <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Tehlike Bölgesi
                </h2>
                <p className="text-xs text-red-500 mt-0.5">Bu işlemler geri alınamaz.</p>
              </div>
              <div className="px-6 py-5">
                {!showDeleteSection ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Hesabımı Sil</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Tüm verileriniz kalıcı olarak silinir.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowDeleteSection(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Sil
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-red-700 font-medium mb-1">Dikkat!</p>
                      <p className="text-xs text-red-600">
                        Hesabınız, tüm ilanlarınız, mesajlarınız ve favori listeniz kalıcı olarak silinecek.
                        Onaylamak için aşağıya <strong>HESABIMI SİL</strong> yazın.
                      </p>
                    </div>
                    <PasswordInput
                      label="Mevcut Şifreniz"
                      value={deleteForm.current_password}
                      onChange={(v) => setDeleteForm((f) => ({ ...f, current_password: v }))}
                      show={deletePw.show}
                      Icon={deletePw.Icon}
                      onToggle={deletePw.toggle}
                    />
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Onay: <span className="font-mono text-red-600">HESABIMI SİL</span> yazın
                      </label>
                      <input
                        type="text"
                        value={deleteForm.confirmation}
                        onChange={(e) => setDeleteForm((f) => ({ ...f, confirmation: e.target.value }))}
                        placeholder="HESABIMI SİL"
                        className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
                      />
                    </div>
                    {deleteMsg && <FeedbackBanner type={deleteMsg.type} text={deleteMsg.text} />}
                    <div className="flex gap-3 justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => { setShowDeleteSection(false); setDeleteMsg(null); }}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        İptal
                      </button>
                      <button
                        type="submit"
                        disabled={deleteLoading || deleteForm.confirmation !== 'HESABIMI SİL'}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40"
                      >
                        {deleteLoading ? 'Siliniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
                      </button>
                    </div>
                  </form>
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
    <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9] focus:border-transparent"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
      >
        <Icon className="w-4 h-4" />
      </button>
    </div>
  </div>
);

const FeedbackBanner: React.FC<{ type: 'ok' | 'err'; text: string }> = ({ type, text }) => (
  <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
    {type === 'ok' ? <Check className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
    {text}
  </div>
);
