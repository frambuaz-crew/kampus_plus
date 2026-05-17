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

  // URL değiştiğinde (örn: geri/ileri tıklandığında) formu güncelle
  React.useEffect(() => {
    if (window.location.pathname === '/register') {
      setMode('register');
    } else {
      setMode('login');
    }
  }, [window.location.pathname]);

  const handleToggleMode = (newMode: 'login' | 'register') => {
    setMode(newMode);
    navigate(newMode === 'register' ? '/register' : '/login');
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-white">

      {/* ─── CSS Transitions ─── */}
      <style>{`
        .auth-panel {
          transition: left 1.1s cubic-bezier(0.76, 0, 0.24, 1),
                      border-radius 1.1s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .auth-form-pane {
          transition: opacity 0.45s ease;
        }
        .auth-form-pane.hidden-pane {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          z-index: 0;
        }
        .auth-form-pane.visible-pane {
          opacity: 1;
          pointer-events: auto;
          transition: opacity 0.5s ease 0.1s;
          z-index: 10;
        }
        @media (min-width: 1024px) {
          .auth-form-pane {
            transition: opacity 0.45s ease,
                        width 1.1s cubic-bezier(0.76, 0, 0.24, 1),
                        padding 1.1s cubic-bezier(0.76, 0, 0.24, 1);
          }
          .auth-form-pane.visible-pane {
            transition: opacity 0.5s ease 0.55s,
                        width 1.1s cubic-bezier(0.76, 0, 0.24, 1),
                        padding 1.1s cubic-bezier(0.76, 0, 0.24, 1);
          }
          .login-pane {
            width: 100%;
          }
          .login-pane.is-login {
            padding-left: calc(42% + 4%);
          }
          .login-pane.is-register {
            padding-left: 6%;
          }
          .register-pane {
            left: 0;
          }
          .register-pane.is-register {
            width: 58%;
          }
          .register-pane.is-login {
            width: 100%;
          }
        }
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>

      {/* ═══════════════════════════════════════════════
          Dark Panel — slides left↔right
      ═══════════════════════════════════════════════ */}
      <div
        className="auth-panel hidden lg:flex absolute top-0 bottom-0 w-[42%] z-20 bg-slate-900 flex-col justify-between p-12 overflow-hidden shadow-2xl"
        style={{
          left: isRegister ? '58%' : '0%',
          borderRadius: isRegister ? '48px 0 0 48px' : '0 48px 48px 0',
        }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] animate-pulse-slow delay-700" />
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-900/50 group-hover:scale-110 transition-transform">
              <span className="text-white font-black text-base">K+</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">KAMPUS<span className="text-sky-400">+</span></span>
          </button>
        </div>

        {/* Center content — changes based on mode */}
        <div className="relative space-y-10">
          <div>
            <h2 className="text-4xl font-extrabold text-white leading-[1.1] mb-5 tracking-tight animate-slide-up">
              {isRegister ? (
                <>Zaten hesabın<br /><span className="text-sky-400">var mı?</span></>
              ) : (
                <>Kampüs hayatın<br /><span className="text-sky-400">tek platformda.</span></>
              )}
            </h2>
            <p className="text-slate-400 text-base leading-relaxed max-w-xs font-medium animate-slide-up delay-100">
              {isRegister
                ? 'Giriş yaparak kaldığın yerden devam et, mesajlarına ve ilanlarına bak.'
                : "Türkiye'nin en kapsamlı üniversite öğrenci platformuna katıl."
              }
            </p>
          </div>

          {!isRegister && (
            <div className="space-y-4 animate-slide-up delay-200">
              {PANEL_FEATURES.map((f) => (
                <div key={f.text} className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-sky-500/20 transition-colors">
                    <f.icon className="w-5 h-5 text-sky-400" />
                  </div>
                  <span className="text-slate-300 text-sm font-medium">{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats (only in login mode) */}
          {!isRegister && (
            <div className="flex gap-12 pt-4 animate-slide-up delay-300">
              {[{ v: '12K+', l: 'Öğrenci' }, { v: '200+', l: 'Üniversite' }].map((s) => (
                <div key={s.l}>
                  <p className="text-white text-3xl font-extrabold tracking-tight">{s.v}</p>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative border-t border-white/5 pt-8">
          <p className="text-slate-600 text-xs font-bold uppercase tracking-widest">© 2026 KAMPUS+</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Login Form Pane
      ═══════════════════════════════════════════════ */}
      <div
        className={`auth-form-pane login-pane no-scrollbar flex flex-col items-center justify-center px-6 py-8 bg-white absolute top-0 bottom-0 left-0 right-0 lg:right-auto overflow-y-auto ${isRegister ? 'hidden-pane is-register' : 'visible-pane is-login'}`}
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
            <button onClick={() => handleToggleMode('register')} className="text-[#0ea5e9] font-semibold hover:underline">
              Kayıt ol
            </button>
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          Register Form Pane
      ═══════════════════════════════════════════════ */}
      <div
        className={`auth-form-pane register-pane no-scrollbar flex flex-col items-center justify-start px-6 py-8 bg-white absolute top-0 bottom-0 left-0 right-0 lg:right-auto overflow-y-auto ${isRegister ? 'visible-pane is-register' : 'hidden-pane is-login'}`}
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
            <button onClick={() => handleToggleMode('login')} className="text-[#0ea5e9] font-semibold hover:underline">
              Giriş yap
            </button>
          </p>
        </div>
      </div>

    </div>
  );
};

export default AuthPage;
