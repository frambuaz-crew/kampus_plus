import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { Bot, ShoppingBag, Briefcase, MessageSquare } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
}

const PANEL_FEATURES = [
  { icon: Bot, text: 'AI destekli akademik asistan' },
  { icon: MessageSquare, text: 'Binlerce öğrenciyle forum' },
  { icon: ShoppingBag, text: 'İkinci el pazar yeri' },
  { icon: Briefcase, text: 'Staj ve kariyer fırsatları' },
];

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode = 'login' }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">

      {/* ─── CSS Transitions ─── */}
      <style>{`
        .auth-panel {
          transition: left 1.1s cubic-bezier(0.76, 0, 0.24, 1),
                      border-radius 1.1s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .auth-form-pane {
          transition: opacity 0.45s ease,
                      width 1.1s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .auth-form-pane.hidden-pane {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .auth-form-pane.visible-pane {
          opacity: 1;
          pointer-events: auto;
          transition: opacity 0.5s ease 0.55s,
                      width 1.1s cubic-bezier(0.76, 0, 0.24, 1);
        }
      `}</style>

      {/* ═══════════════════════════════════════════════
          Dark Panel — slides left↔right
      ═══════════════════════════════════════════════ */}
      <div
        className="auth-panel hidden lg:flex absolute top-0 bottom-0 w-[42%] z-20 bg-slate-900 flex-col justify-between p-12 overflow-hidden"
        style={{
          left: isRegister ? '58%' : '0%',
          borderRadius: isRegister ? '48px 0 0 48px' : '0 48px 48px 0',
        }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0ea5e9]/10 rounded-full" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#0ea5e9]/5 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#0ea5e9] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">KAMPUS+</span>
          </button>
        </div>

        {/* Center content — changes based on mode */}
        <div className="relative space-y-8" style={{ transition: 'opacity 0.3s ease', opacity: 1 }}>
          <div>
            <h2 className="text-3xl font-extrabold text-white leading-tight mb-3">
              {isRegister ? (
                <>Zaten hesabın<br />var mı?</>
              ) : (
                <>Kampüs hayatın<br />tek platformda.</>
              )}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              {isRegister
                ? 'Giriş yaparak kaldığın yerden devam et, mesajlarına ve ilanlarına bak.'
                : "Türkiye'nin en kapsamlı üniversite öğrenci platformuna katıl."
              }
            </p>
          </div>

          {!isRegister && (
            <div className="space-y-3">
              {PANEL_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#0ea5e9]/15 rounded-lg flex items-center justify-center flex-shrink-0">
                    <f.icon className="w-4 h-4 text-[#0ea5e9]" />
                  </div>
                  <span className="text-slate-300 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats (only in login mode) */}
          {!isRegister && (
            <div className="flex gap-8">
              {[{ v: '12K+', l: 'Öğrenci' }, { v: '350+', l: 'Üniversite' }].map((s) => (
                <div key={s.l}>
                  <p className="text-[#0ea5e9] text-2xl font-extrabold">{s.v}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="relative text-slate-600 text-xs">© 2026 Kampus+. Tüm hakları saklıdır.</p>
      </div>

      {/* ═══════════════════════════════════════════════
          Login Form Pane
      ═══════════════════════════════════════════════ */}
      <div
        className={`auth-form-pane flex flex-col items-center justify-center px-6 py-12 bg-white absolute top-0 bottom-0 overflow-y-auto ${isRegister ? 'hidden-pane' : 'visible-pane'}`}
        style={{
          left: 0,
          width: '100%',
          paddingLeft: isRegister ? '6%' : 'calc(42% + 4%)',
        }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 w-full max-w-sm">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">KAMPUS+</span>
          </button>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Tekrar hoş geldin</h1>
            <p className="text-slate-500 text-sm">Hesabına giriş yap ve devam et</p>
          </div>

          <LoginForm
            onSuccess={(user) => {
              const target = user.role === 'admin' || user.role === 'university_admin'
                ? '/admin/dashboard' : '/dashboard';
              window.location.href = target;
            }}
          />

          <p className="mt-6 text-center text-sm text-slate-500">
            Hesabın yok mu?{' '}
            <button onClick={() => setMode('register')} className="text-[#0ea5e9] font-semibold hover:underline">
              Kayıt ol
            </button>
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Register Form Pane
      ═══════════════════════════════════════════════ */}
      <div
        className={`auth-form-pane flex flex-col items-center justify-start px-6 py-12 bg-white absolute top-0 bottom-0 overflow-y-auto ${isRegister ? 'visible-pane' : 'hidden-pane'}`}
        style={{
          left: 0,
          width: isRegister ? '58%' : '100%',
        }}
      >
        {/* Mobile logo */}
        <div className="lg:hidden mb-8 w-full max-w-sm">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0ea5e9] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">K+</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">KAMPUS+</span>
          </button>
        </div>

        <div className="w-full max-w-sm mt-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Hesap oluştur</h1>
            <p className="text-slate-500 text-sm">Üniversite e-postanla ücretsiz kayıt ol</p>
          </div>

          <RegisterForm />

          <p className="mt-4 text-center text-sm text-slate-500">
            Zaten hesabın var mı?{' '}
            <button onClick={() => setMode('login')} className="text-[#0ea5e9] font-semibold hover:underline">
              Giriş yap
            </button>
          </p>
        </div>
      </div>

    </div>
  );
};

export default AuthPage;
